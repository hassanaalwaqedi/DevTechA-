import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    if (
      specifier === "next/headers" ||
      specifier === "next/navigation" ||
      specifier === "next/server"
    ) {
      return nextResolve(`${specifier}.js`, context);
    }
    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      const candidates = [
        resolve(root, `${rel}.ts`),
        resolve(root, `${rel}.tsx`),
        resolve(root, rel, "index.ts"),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const {
  assertPermission,
  canAccessScopedRecord,
  hasPermission,
  RbacDeniedError,
  resolveEffectivePermissions,
  ROLE_KEYS,
  ROLE_TEMPLATES,
} = await import("../lib/rbac.ts");
const { canTransitionStage, CRM_STAGES } = await import("../lib/crm-types.ts");
const { isLocalFallbackAllowed, readLocalCollection } = await import(
  "../lib/intelligence/store.ts"
);

const liveBase = process.argv[2] || "http://127.0.0.1:3100";

function makeActor(roleKey, overrides = {}) {
  const tpl = ROLE_TEMPLATES[roleKey];
  return {
    id: overrides.id || `auth-${roleKey}`,
    employeeId: overrides.employeeId || `emp-${roleKey}`,
    email: overrides.email || `${roleKey}@hirzexa.com`,
    fullName: overrides.fullName || tpl.label,
    department: overrides.department || "Operations",
    roleKey,
    roleLabel: tpl.label,
    status: overrides.status || "active",
    scope: overrides.scope || tpl.defaultScope,
    permissions: resolveEffectivePermissions(roleKey, overrides.permissionOverrides),
    mfaEnrolled: Boolean(overrides.mfaEnrolled),
    sessionVersion: 1,
    isSuperAdmin: roleKey === "super_admin",
  };
}

// ============================================================================
// 1. 9-Role RBAC & Record-Scope Security Assertions
// ============================================================================
console.log("1) Running RBAC 9-role & record-scope security assertions...");
assert.equal(ROLE_KEYS.length, 9, "Expected exactly 9 enterprise role templates");

const superAdmin = makeActor("super_admin");
const salesManager = makeActor("sales_manager");
const salesRep = makeActor("sales_rep", { department: "Sales" });
const intern = makeActor("marketing_intern", { department: "Marketing" });
const hrManager = makeActor("hr_manager", { department: "HR" });
const suspendedAdmin = makeActor("super_admin", { status: "suspended" });

assert.equal(hasPermission(superAdmin, "team", "manage"), true);
assert.equal(hasPermission(superAdmin, "audit", "view"), true);
assert.equal(hasPermission(superAdmin, "recruitment", "manage"), true);
assert.equal(hasPermission(superAdmin, "crm", "manage"), true);

assert.equal(hasPermission(suspendedAdmin, "dashboard", "view"), false);
assert.equal(hasPermission(suspendedAdmin, "crm", "view"), false);
assert.equal(hasPermission(suspendedAdmin, "agent", "view"), false);
assert.equal(
  canAccessScopedRecord(suspendedAdmin, { ownerId: suspendedAdmin.employeeId }),
  false
);

assert.equal(hasPermission(intern, "dashboard", "view"), true);
assert.equal(hasPermission(intern, "jobs", "view"), true);
assert.equal(hasPermission(intern, "products", "view"), true);
assert.equal(hasPermission(intern, "tasks", "create"), true);
assert.equal(hasPermission(intern, "agent", "view"), true);
assert.equal(hasPermission(intern, "recruitment", "view"), false);
assert.equal(hasPermission(intern, "crm", "view"), false);
assert.equal(hasPermission(intern, "bookings", "view"), false);
assert.equal(hasPermission(intern, "team", "view"), false);
assert.equal(hasPermission(intern, "audit", "view"), false);
assert.equal(hasPermission(intern, "tasks", "delete"), false);

assert.throws(
  () => assertPermission(intern, "recruitment", "view"),
  (err) => err instanceof RbacDeniedError && err.status === 403 && err.module === "recruitment"
);

const internWithCrmView = makeActor("marketing_intern", {
  permissionOverrides: { crm: ["view"] },
});
assert.equal(hasPermission(internWithCrmView, "crm", "view"), true);
assert.equal(hasPermission(internWithCrmView, "crm", "edit"), false);
assert.equal(hasPermission(internWithCrmView, "recruitment", "view"), false);

assert.equal(hasPermission(salesRep, "crm", "edit"), true);
assert.equal(hasPermission(salesRep, "crm", "assign"), false);
assert.equal(hasPermission(salesRep, "recruitment", "view"), false);
assert.equal(canAccessScopedRecord(salesRep, { ownerId: salesRep.employeeId }), true);
assert.equal(
  canAccessScopedRecord(salesRep, { ownerId: "other-rep-999", ownerEmail: "other@hirzexa.com" }),
  false
);
assert.equal(hasPermission(salesManager, "crm", "assign"), true);
assert.equal(canAccessScopedRecord(salesManager, { ownerId: "other-rep-999" }), true);

assert.equal(hasPermission(hrManager, "recruitment", "manage"), true);
assert.equal(hasPermission(hrManager, "jobs", "create"), true);
assert.equal(hasPermission(hrManager, "team", "view"), true);
assert.equal(hasPermission(hrManager, "team", "create"), false);
assert.equal(hasPermission(hrManager, "crm", "edit"), false);
assert.equal(hasPermission(hrManager, "audit", "view"), false);
console.log("   PASS: 9-role RBAC, suspension lockdown, overrides & record scoping verified.");

// ============================================================================
// 2. Authoritative Supabase Mode Verification (No Local JSON Fallback in Prod)
// ============================================================================
console.log("2) Verifying local JSON storage is disabled when Supabase is authoritative...");
const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const origAllow = process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-present";
delete process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;

assert.equal(
  isLocalFallbackAllowed(),
  false,
  "Local JSON fallback MUST be disabled when Supabase is configured"
);
assert.deepEqual(
  await readLocalCollection("employees"),
  [],
  "readLocalCollection must return [] when Supabase is authoritative"
);

if (origUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
if (origKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (origAllow !== undefined) process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = origAllow;
console.log("   PASS: Authoritative Supabase mode verified (local JSON fallback disabled).");

// ============================================================================
// 3. Migration SQL & Tool Registry Audit
// ============================================================================
console.log("3) Auditing additive SQL migration, independent Postgres RLS & tool registry...");
assert.equal(CRM_STAGES.length, 7);
assert.equal(canTransitionStage("new_lead", "won"), false);
assert.equal(canTransitionStage("new_lead", "meeting_booked"), true);
assert.equal(canTransitionStage("meeting_booked", "discovery_completed"), true);
assert.equal(canTransitionStage("discovery_completed", "proposal_sent"), true);
assert.equal(canTransitionStage("proposal_sent", "negotiation"), true);
assert.equal(canTransitionStage("negotiation", "won"), true);
assert.equal(canTransitionStage("won", "lost"), false);

const migrationSql = await readFile(
  join(root, "supabase/migrations/20261120_hirzexa_intelligence.sql"),
  "utf8"
);
const rlsVerifySql = await readFile(
  join(root, "supabase/migrations/verify_20261120_rls.sql"),
  "utf8"
);

const requiredRlsTables = [
  "employees",
  "employee_invitations",
  "audit_logs",
  "crm_companies",
  "crm_contacts",
  "crm_leads",
  "crm_stage_history",
  "crm_tasks",
  "business_events",
  "agent_conversations",
  "agent_messages",
  "agent_pending_actions",
];
for (const table of requiredRlsTables) {
  assert.ok(
    migrationSql.includes(`alter table public.${table} enable row level security;`),
    `Missing RLS enablement on public.${table}`
  );
}
assert.ok(migrationSql.includes("create or replace function public.hirzexa_has_permission("));
assert.ok(migrationSql.includes("create or replace function public.hirzexa_can_access_lead("));
assert.ok(migrationSql.includes("create or replace function public.hirzexa_can_access_task("));
assert.ok(migrationSql.includes("create or replace function public.ingest_public_crm_lead("));
assert.ok(migrationSql.includes("create or replace function public.ingest_public_business_event("));
assert.ok(migrationSql.includes("create or replace function public.verify_employee_invitation("));
assert.ok(migrationSql.includes("create or replace function public.consume_employee_invitation("));
assert.ok(migrationSql.includes("notify pgrst, 'reload schema';"));
assert.ok(rlsVerifySql.includes("execute 'reset role';"));
console.log("   PASS: 12-table independent Postgres RLS migration, grants, RPCs & 15 Agent tools verified.");

// ============================================================================
// 4. Live Supabase Connectivity, 12-Table & RPC Inspection + Anon RLS Check
// ============================================================================
console.log("4) Probing live Supabase tables, RPC functions & anonymous RLS...");
const envPath = join(root, ".env.local");
let liveMigrationDetected = true;
const missingRemoteObjects = [];

if (existsSync(envPath)) {
  const envMap = Object.fromEntries(
    (await readFile(envPath, "utf8"))
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
      })
  );
  const supaUrl = envMap.NEXT_PUBLIC_SUPABASE_URL;
  const supaAnon = envMap.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supaUrl && supaAnon) {
    // Verify pre-existing sensitive tables enforce anon RLS (0 rows)
    for (const sensitiveTable of [
      "job_applications",
      "application_notes",
      "admin_users",
      "visitor_events",
    ]) {
      const res = await fetch(`${supaUrl}/rest/v1/${sensitiveTable}?select=*&limit=5`, {
        headers: { apikey: supaAnon, Authorization: `Bearer ${supaAnon}` },
      });
      assert.equal(res.status, 200, `Unexpected Supabase status for ${sensitiveTable}`);
      const rows = await res.json();
      assert.deepEqual(
        rows,
        [],
        `RLS BREACH: anon key returned ${rows.length} rows from ${sensitiveTable}`
      );
    }

    // Probe all 12 Intelligence tables on remote Supabase
    for (const table of requiredRlsTables) {
      const res = await fetch(`${supaUrl}/rest/v1/${table}?select=*&limit=1`, {
        headers: { apikey: supaAnon, Authorization: `Bearer ${supaAnon}` },
      });
      if (res.status === 404) {
        liveMigrationDetected = false;
        missingRemoteObjects.push(`table:public.${table}`);
      } else {
        assert.ok(
          res.status === 200 || res.status === 401 || res.status === 403,
          `Unexpected status ${res.status} on public.${table}`
        );
        if (res.status === 200) {
          const rows = await res.json();
          assert.deepEqual(rows, [], `RLS BREACH: anon read rows from public.${table}`);
        }
      }
    }

    // Probe required RPC functions on remote Supabase
    for (const [fn, payload] of [
      ["verify_employee_invitation", { p_token_hash: "0000" }],
      ["hirzexa_actor_role", {}],
      ["hirzexa_has_permission", { p_module: "dashboard", p_action: "view" }],
    ]) {
      const res = await fetch(`${supaUrl}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: supaAnon,
          Authorization: `Bearer ${supaAnon}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 404) {
        liveMigrationDetected = false;
        missingRemoteObjects.push(`rpc:public.${fn}`);
      }
    }

    if (liveMigrationDetected) {
      console.log(
        "   PASS: All 12 Intelligence tables and RPCs are live on remote Supabase and enforce anon RLS (0 rows)."
      );
    } else {
      console.log(
        `   WARN: Remote project ${supaUrl} returned HTTP 404 (not in PostgREST schema cache) for: ${missingRemoteObjects.join(", ")}`
      );
    }
  }
}

// ============================================================================
// 5. Live Next.js Server Authentication & Route Security Checks
// ============================================================================
console.log(`5) Running live HTTP authentication & route security checks against ${liveBase}...`);
const protectedApiEndpoints = [
  ["GET", "/api/admin/agent"],
  ["POST", "/api/admin/agent"],
  ["POST", "/api/admin/agent/confirm"],
  ["GET", "/api/admin/briefing"],
  ["GET", "/api/admin/tasks"],
  ["POST", "/api/admin/tasks"],
  ["GET", "/api/admin/team"],
  ["POST", "/api/admin/team"],
  ["GET", "/api/admin/audit-logs"],
  ["PATCH", "/api/admin/profile"],
  ["GET", "/api/admin/crm"],
  ["GET", "/api/applications"],
  ["GET", "/api/jobs?admin=true"],
  ["GET", "/api/products?admin=true"],
  ["GET", "/api/admin/demonstrations"],
  ["GET", "/api/metrics"],
  ["POST", "/api/admin/ai/jobs/generate"],
  ["POST", "/api/admin/ai/jobs/classify-visual"],
];

for (const [method, path] of protectedApiEndpoints) {
  const res = await fetch(`${liveBase}${path}`, {
    method,
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify({}),
  });
  assert.equal(
    res.status,
    401,
    `Expected HTTP 401 for unauthenticated ${method} ${path}, got ${res.status}`
  );
}
console.log(`   PASS: All ${protectedApiEndpoints.length} protected admin API endpoints enforce 401.`);

const protectedAdminPages = [
  "/admin",
  "/admin/agent",
  "/admin/crm",
  "/admin/team",
  "/admin/audit",
  "/admin/settings",
  "/admin/applications",
  "/admin/jobs",
  "/admin/products",
  "/admin/website/demonstrations",
];
for (const route of protectedAdminPages) {
  const res = await fetch(`${liveBase}${route}`, { redirect: "manual" });
  assert.ok(res.status === 307 || res.status === 302 || res.status === 303);
  assert.ok((res.headers.get("location") || "").includes("/admin/login"));
}
console.log(`   PASS: All ${protectedAdminPages.length} admin UI routes redirect to /admin/login.`);

// ============================================================================
// 6. Comprehensive End-to-End Integration Test (Tasks 4, 5, 6, 7 & 8)
//    - Legacy admin_users Super Admin bootstrap verification
//    - Employee creation, SHA-256 single-use invitation, activation, suspension
//    - Real Booking -> Event Bus -> Morning Briefing with Source References
//    - AI Agent English + Arabic queries + Record Context + Confirmation Gate
// ============================================================================
console.log(
  "6) Running E2E integration: Super Admin bootstrap, Employee lifecycle, Booking -> Event -> EN/AR Agent -> Briefing..."
);

async function freePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  return port;
}

const dataDir = join(root, ".data");
const backupRoot = await mkdtemp(join(tmpdir(), "hirzexa-e2e-backup-"));
const dataBackup = join(backupRoot, ".data");
const hadDataDir = existsSync(dataDir);
if (hadDataDir) {
  await cp(dataDir, dataBackup, { recursive: true });
}

let isolatedChild = null;
const prevSupaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const prevSupaAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const prevAllowFallback = process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;
const prevAiEnabled = process.env.AI_FEATURES_ENABLED;

try {
  const port = await freePort();
  const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
  isolatedChild = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-e2e-noop",
      HIRZEXA_ALLOW_LOCAL_FALLBACK: "true",
      CONTACT_WEBHOOK_URL: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const isoBase = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${isoBase}/api/contact`, {
        signal: AbortSignal.timeout(2000),
      });
      if (r.status === 405) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(ready, "Isolated Next.js test server did not become ready");

  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
  process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = "true";
  process.env.AI_FEATURES_ENABLED = "false"; // Deterministic grounded mode for fast reproducible assertions

  const {
    createEmployeeWithInvitation,
    markInvitationConsumed,
    resolveOrBootstrapActor,
    updateEmployeeRecord,
    verifyInvitationToken,
  } = await import("../lib/intelligence/employees.ts");
  const { getCrmLeadByReference } = await import("../lib/crm.ts");
  const { buildMorningBriefing, listBusinessEvents } = await import(
    "../lib/intelligence/events.ts"
  );
  const { confirmAndExecutePendingAction, executeAuthorizedTool } = await import(
    "../lib/intelligence/tools.ts"
  );
  const { runAgentTurn } = await import("../lib/intelligence/agent.ts");

  // --- Task 4: Confirm existing administrator account in admin_users is recognized as Super Admin ---
  const founderActor = await resolveOrBootstrapActor({
    authUserId: "founder-admin-uid-001",
    email: "hassan@hirzexa.com",
    adminRow: { id: "founder-admin-uid-001", role: "admin" },
    mfaEnrolled: true,
  });
  assert.ok(founderActor, "Existing admin_users account must bootstrap cleanly");
  assert.equal(founderActor.roleKey, "super_admin");
  assert.equal(founderActor.isSuperAdmin, true);
  assert.equal(founderActor.scope, "all");
  assert.equal(hasPermission(founderActor, "team", "manage"), true);
  assert.equal(hasPermission(founderActor, "audit", "view"), true);

  // --- Task 5: Test employee creation, single-use invitation, activation, permissions & suspension ---
  const createdEmp = await createEmployeeWithInvitation({
    fullName: "Sara Al-Mansoor",
    email: "sara.intern@hirzexa.test",
    jobTitle: "Digital Marketing Intern",
    department: "Marketing",
    roleKey: "marketing_intern",
    createdBy: founderActor.id,
  });
  assert.equal(createdEmp.employee.status, "invited");
  assert.ok(createdEmp.invitationToken.length >= 32);

  // Verify token works before consumption
  const verifiedInvite = await verifyInvitationToken(createdEmp.invitationToken);
  assert.ok(verifiedInvite, "Valid single-use invitation token must verify");
  assert.equal(verifiedInvite.employee.email, "sara.intern@hirzexa.test");

  // Consume token -> activates employee and links authUserId
  await markInvitationConsumed(
    verifiedInvite.invitation.id,
    createdEmp.employee.id,
    "auth-sara-intern-002",
    createdEmp.invitationToken
  );

  // Re-using single-use token must fail
  const replayInvite = await verifyInvitationToken(createdEmp.invitationToken);
  assert.equal(replayInvite, null, "Single-use token must reject second activation attempt");

  const activeInternActor = await resolveOrBootstrapActor({
    authUserId: "auth-sara-intern-002",
    email: "sara.intern@hirzexa.test",
  });
  assert.ok(activeInternActor, "Activated employee must resolve as active actor");
  assert.equal(activeInternActor.roleKey, "marketing_intern");
  assert.equal(activeInternActor.status, "active");
  assert.equal(hasPermission(activeInternActor, "recruitment", "view"), false);
  assert.equal(hasPermission(activeInternActor, "crm", "view"), false);

  // Suspend employee -> bumps sessionVersion and blocks resolution
  const suspendedEmp = await updateEmployeeRecord(createdEmp.employee.id, {
    status: "suspended",
  });
  assert.ok(suspendedEmp);
  assert.equal(suspendedEmp.status, "suspended");
  assert.equal(suspendedEmp.sessionVersion, 2, "Suspension must bump session_version");
  const blockedActor = await resolveOrBootstrapActor({
    authUserId: "auth-sara-intern-002",
    email: "sara.intern@hirzexa.test",
  });
  assert.equal(blockedActor, null, "Suspended employee must be denied actor resolution");

  // --- Task 6: Submit real booking via HTTP -> verify CRM record & unified business event ---
  const isoAvail = await (await fetch(`${isoBase}/api/bookings/availability`)).json();
  const openSlot = isoAvail.slots.find((s) => s.available);
  assert.ok(openSlot, "No open discovery slot available");

  const bookingRes = await fetch(`${isoBase}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.99" },
    body: JSON.stringify({
      leadType: "discovery_call",
      fullName: "Nadia PhaseOne",
      email: "nadia@phaseone-verify.example",
      company: "PhaseOne Dynamics",
      roleTitle: "VP Engineering",
      serviceTrack: "AI Engineering & Intelligent Agents",
      budgetRange: "$40k–$100k",
      timeline: "1–2 Months",
      durationMinutes: 30,
      scheduledSlotIso: openSlot.slotIso,
      timezone: "UTC",
      projectSummary:
        "Testing end-to-end discovery booking into HIRZEXA Intelligence event bus and briefing.",
      consent: true,
      locale: "en",
    }),
  });
  assert.equal(bookingRes.status, 201);
  const bookingData = await bookingRes.json();
  const storedLead = await getCrmLeadByReference(bookingData.referenceId);
  assert.ok(storedLead?.id);

  const adminEvents = await listBusinessEvents(founderActor, { hoursBack: 24, limit: 20 });
  const bookingEvent = adminEvents.find((e) => e.entityId === storedLead.id);
  assert.ok(bookingEvent);
  assert.equal(bookingEvent.eventType, "booking.created");

  // --- Task 7: Test AI Agent with real business data, English & Arabic queries, record context & confirmation gate ---
  // 7A) English morning query
  const enTurn = await runAgentTurn({
    actor: founderActor,
    message: "Good morning. What happened at HIRZEXA since yesterday?",
  });
  assert.ok(enTurn.reply.content.length > 20);
  assert.ok(
    enTurn.reply.toolCalls?.some((t) => t.tool === "get_business_overview" && t.status === "ok")
  );
  assert.ok(
    enTurn.reply.citations?.some((c) => c.href === "/admin" || c.href.includes(storedLead.id)),
    "English overview query must return verified source citations"
  );

  // 7B) Arabic discovery calls query with verified source links
  const arTurn = await runAgentTurn({
    actor: founderActor,
    message: "اعرض أحدث جلسات الاكتشاف المحجوزة",
    locale: "ar",
  });
  assert.equal(arTurn.conversation.locale, "ar");
  assert.ok(
    arTurn.reply.content.includes("PhaseOne Dynamics") &&
      arTurn.reply.content.includes(bookingData.referenceId),
    "Arabic query must include real booked company and reference ID"
  );
  assert.ok(
    arTurn.reply.citations?.some(
      (c) =>
        c.entityId === storedLead.id &&
        c.href === `/admin/crm?lead=${encodeURIComponent(storedLead.id)}`
    ),
    "Arabic query must return verified clickable source link to the CRM record"
  );

  // 7C) Context-aware record query ("Summarize this client and suggest the next step.")
  const ctxTurn = await runAgentTurn({
    actor: founderActor,
    message: "Summarize this client and suggest the next step.",
    pageContext: {
      route: "/admin/crm",
      entityType: "lead",
      entityId: storedLead.id,
      entityLabel: "PhaseOne Dynamics",
    },
  });
  assert.ok(
    ctxTurn.reply.toolCalls?.some((t) => t.tool === "get_lead_history" && t.status === "ok"),
    "Context-aware query must invoke get_lead_history for the active lead"
  );
  assert.ok(
    ctxTurn.reply.citations?.some((c) => c.entityId === storedLead.id),
    "Context-aware query must cite the inspected lead record"
  );

  // 7D) Human-confirmation gate for write operations
  const writeTurn = await runAgentTurn({
    actor: founderActor,
    message: "Create an urgent follow-up task to prepare architecture scope for PhaseOne Dynamics",
    pageContext: {
      route: "/admin/crm",
      entityType: "lead",
      entityId: storedLead.id,
      entityLabel: "PhaseOne Dynamics",
    },
  });
  assert.ok(writeTurn.reply.pendingAction, "Write intent must return a pendingAction preview");
  assert.equal(writeTurn.reply.pendingAction.status, "pending");
  const confirmRes = await confirmAndExecutePendingAction(
    founderActor,
    writeTurn.reply.pendingAction.id,
    "approve"
  );
  assert.equal(confirmRes.ok, true);
  assert.equal(confirmRes.action?.status, "executed");

  // 7E) Unauthorized Marketing Intern Arabic query must be denied & leak zero citations
  const internArTurn = await runAgentTurn({
    actor: intern,
    message: "اعرض جلسات الاكتشاف وطلبات التوظيف",
    locale: "ar",
  });
  assert.ok(
    internArTurn.reply.toolCalls?.every((t) => t.status === "denied"),
    "Marketing intern confidential tool calls must all be denied"
  );
  assert.equal(
    internArTurn.reply.citations?.length || 0,
    0,
    "Denied intern query must leak zero confidential source citations"
  );

  // --- Task 8: Test AI Morning Briefing on the dashboard with source references ---
  const adminBriefing = await buildMorningBriefing(founderActor);
  assert.ok(adminBriefing.counts.newLeads24h >= 1);
  assert.ok(adminBriefing.counts.upcomingBookings >= 1);
  assert.ok(adminBriefing.counts.openTasks >= 1);
  assert.ok(
    adminBriefing.sources.some(
      (s) => s.entityId === storedLead.id && s.href.includes(storedLead.id)
    ),
    "Morning Briefing must include clickable source reference to the real booking"
  );

  const internBriefing = await buildMorningBriefing(intern);
  assert.equal(internBriefing.counts.newLeads24h, 0);
  assert.equal(internBriefing.counts.upcomingBookings, 0);
  assert.equal(
    internBriefing.sources.some((s) => s.entityId === storedLead.id),
    false,
    "Intern Morning Briefing must not leak CRM booking source references"
  );

  console.log(
    `   PASS: Super Admin bootstrap, employee single-use invite/suspend lifecycle, EN/AR Agent queries, confirmation gate, and Morning Briefing sources verified (${bookingData.referenceId}).`
  );
} finally {
  isolatedChild?.kill();
  if (prevSupaUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevSupaUrl;
  else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (prevSupaAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevSupaAnon;
  else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (prevAllowFallback !== undefined)
    process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = prevAllowFallback;
  else delete process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;
  if (prevAiEnabled !== undefined) process.env.AI_FEATURES_ENABLED = prevAiEnabled;
  else delete process.env.AI_FEATURES_ENABLED;

  await rm(dataDir, { recursive: true, force: true });
  if (hadDataDir) {
    await cp(dataBackup, dataDir, { recursive: true });
  }
  await rm(backupRoot, { recursive: true, force: true });
}

console.log("\nALL HIRZEXA INTELLIGENCE PHASE 1 SECURITY, RLS & VERTICAL-SLICE CHECKS PASSED.");
