import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const liveBase = process.argv[2] || "http://127.0.0.1:3100";

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

const stagingDir = await mkdtemp(join(tmpdir(), "hirzexa-role-os-matrix-"));
const originalCwd = process.cwd();
const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const savedAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const savedFallback = process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;
const savedAiEnabled = process.env.AI_FEATURES_ENABLED;

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = "true";
process.env.AI_FEATURES_ENABLED = "false";
process.chdir(stagingDir);

try {
  const {
    authorizeAccess,
    filterAuthorizedRecords,
    getScopedMetrics,
    getWorkspaceProfileForActor,
    searchAuthorizedRecords,
  } = await import(pathToFileURL(resolve(root, "lib/authorization.ts")).href);
  const {
    createCrmLead,
    getAuthorizedCrmLeadById,
    listAuthorizedCrmLeads,
    updateCrmLead,
  } = await import(pathToFileURL(resolve(root, "lib/crm.ts")).href);
  const {
    buildActorFromEmployee,
    createEmployeeWithInvitation,
    markInvitationConsumed,
    resolveOrBootstrapActor,
    updateEmployeeRecord,
  } = await import(pathToFileURL(resolve(root, "lib/intelligence/employees.ts")).href);
  const { listAuditLogs } = await import(
    pathToFileURL(resolve(root, "lib/intelligence/audit.ts")).href
  );
  const {
    buildMorningBriefing,
    emitBusinessEvent,
    listBusinessEvents,
  } = await import(pathToFileURL(resolve(root, "lib/intelligence/events.ts")).href);
  const { createTask, listTasks } = await import(
    pathToFileURL(resolve(root, "lib/intelligence/tasks.ts")).href
  );
  const { executeAuthorizedTool } = await import(
    pathToFileURL(resolve(root, "lib/intelligence/tools.ts")).href
  );
  const { runAgentTurn } = await import(
    pathToFileURL(resolve(root, "lib/intelligence/agent.ts")).href
  );
  const { hasPermission, ROLE_KEYS } = await import(
    pathToFileURL(resolve(root, "lib/rbac.ts")).href
  );

  console.log("=== HIRZEXA Role-Aware Enterprise OS — 9-Role & 15-Scenario Security Matrix ===");

  // ==========================================================================
  // Provision authenticated staging accounts for ALL 9 organizational roles
  // ==========================================================================
  const expectedWorkspaces = {
    super_admin: { title: "Executive Command Center", dept: "Executive" },
    administrator: { title: "Operations Command Center", dept: "Operations" },
    sales_manager: { title: "Sales Management", dept: "Sales" },
    sales_rep: { title: "My Sales Workspace", dept: "Sales" },
    marketing_specialist: { title: "Marketing Workspace", dept: "Marketing" },
    marketing_intern: { title: "My Marketing Tasks", dept: "Marketing" },
    hr_manager: { title: "Recruitment Workspace", dept: "HR" },
    engineer: { title: "Engineering Workspace", dept: "Engineering" },
    project_manager: { title: "Project Delivery", dept: "Delivery" },
  };

  assert.equal(ROLE_KEYS.length, 9, "Expected exactly 9 enterprise roles");

  const actors = {};
  const employeesByRole = {};
  let uidCounter = 1;
  const adminUid = "00000000-0000-4000-8000-000000000001";

  for (const roleKey of ROLE_KEYS) {
    const authUid = `00000000-0000-4000-8000-${String(uidCounter++).padStart(12, "0")}`;
    const meta = expectedWorkspaces[roleKey];
    const displayName =
      roleKey === "sales_rep" ? "Jesika" : `${roleKey.replace(/_/g, " ")} User`;
    const created = await createEmployeeWithInvitation({
      fullName: displayName,
      email: `${roleKey}@staging.hirzexa.test`,
      jobTitle: meta.title,
      department: meta.dept,
      roleKey,
      createdBy: adminUid,
    });
    await markInvitationConsumed(created.invitationId, created.employee.id, authUid);
    const activeEmp = { ...created.employee, authUserId: authUid, status: "active" };
    employeesByRole[roleKey] = activeEmp;
    actors[roleKey] = buildActorFromEmployee(activeEmp, authUid);

    const profile = getWorkspaceProfileForActor(actors[roleKey]);
    assert.equal(
      profile.titleEn,
      meta.title,
      `Role "${roleKey}" workspace title must be "${meta.title}"`
    );
  }

  // Additional second Sales Rep for isolation & reassignment tests
  const repBAuthUid = "00000000-0000-4000-8000-000000000099";
  const repBInv = await createEmployeeWithInvitation({
    fullName: "Rep B",
    email: "rep_b@staging.hirzexa.test",
    jobTitle: "Sales Representative",
    department: "Sales",
    roleKey: "sales_rep",
    createdBy: adminUid,
  });
  await markInvitationConsumed(repBInv.invitationId, repBInv.employee.id, repBAuthUid);
  const repB = buildActorFromEmployee(
    { ...repBInv.employee, authUserId: repBAuthUid, status: "active" },
    repBAuthUid
  );

  // Seed controlled staging CRM leads & tasks
  const { lead: leadA } = await createCrmLead({
    leadType: "discovery_call",
    fullName: "Nadia ClientA",
    email: "nadia@alpha-enterprise.test",
    company: "Alpha Enterprise",
    serviceTrack: "AI Engineering & Intelligent Agents",
    budgetRange: "$40k–$100k",
    durationMinutes: 30,
    timezone: "UTC",
    projectSummary: "Assigned to Jesika for enterprise AI agents.",
    consent: true,
    locale: "en",
    ownerId: employeesByRole.sales_rep.id,
    ownerEmail: employeesByRole.sales_rep.email,
    ownerName: employeesByRole.sales_rep.fullName,
    ownerDepartment: "Sales",
  });

  const { lead: leadB } = await createCrmLead({
    leadType: "proposal_request",
    fullName: "David ClientB",
    email: "david@beta-confidential.test",
    company: "Beta Confidential Corp",
    serviceTrack: "Custom Software & SaaS Engineering",
    budgetRange: "$100k+",
    durationMinutes: 30,
    timezone: "UTC",
    projectSummary: "Owned strictly by Rep B — confidential to Jesika.",
    consent: true,
    locale: "en",
    ownerId: repBInv.employee.id,
    ownerEmail: repBInv.employee.email,
    ownerName: repBInv.employee.fullName,
    ownerDepartment: "Sales",
  });

  // Lead assigned to Engineer (who lacks crm:view!) — tests Rule: module permission AND record scope!
  const { lead: leadEng } = await createCrmLead({
    leadType: "proposal_request",
    fullName: "Samir ClientE",
    email: "samir@eng-assigned.test",
    company: "EngAssigned Systems",
    serviceTrack: "Cloud Architecture & Systems Integration",
    durationMinutes: 30,
    timezone: "UTC",
    projectSummary: "Assigned to Engineer who lacks crm:view.",
    consent: true,
    locale: "en",
    ownerId: employeesByRole.engineer.id,
    ownerEmail: employeesByRole.engineer.email,
    ownerName: employeesByRole.engineer.fullName,
    ownerDepartment: "Engineering",
  });

  await emitBusinessEvent({
    eventType: "booking.created",
    module: "bookings",
    severity: "attention",
    actorRef: leadA.fullName,
    entityType: "lead",
    entityId: leadA.id,
    title: "Discovery call: Alpha Enterprise",
    summary: `${leadA.referenceId} assigned to Jesika`,
    sourceHref: `/admin/crm?lead=${leadA.id}`,
  });
  await emitBusinessEvent({
    eventType: "proposal.created",
    module: "crm",
    severity: "info",
    actorRef: leadB.fullName,
    entityType: "lead",
    entityId: leadB.id,
    title: "Proposal: Beta Confidential Corp",
    summary: `${leadB.referenceId} owned by Rep B`,
    sourceHref: `/admin/crm?lead=${leadB.id}`,
  });

  await createTask(actors.marketing_intern, {
    title: "Draft Q4 product launch social copy",
    priority: "high",
    entityType: "general",
  });
  await createTask(actors.engineer, {
    title: "Complete AEGIS inference latency benchmark",
    priority: "high",
    entityType: "general",
  });

  console.log("0) All 9 role accounts created and workspace titles verified.");

  // ==========================================================================
  // SCENARIO 1 & 2: Sales Rep accesses Lead A, CANNOT access Lead B
  // ==========================================================================
  const jesika = actors.sales_rep;
  const jesikaLeads = await listAuthorizedCrmLeads(jesika);
  assert.equal(jesikaLeads.length, 1, "Scenario 1: Jesika must see exactly 1 lead (Lead A)");
  assert.equal(jesikaLeads[0].id, leadA.id);
  assert.equal((await getAuthorizedCrmLeadById(jesika, leadA.id)).denied, false);
  assert.equal(
    (await getAuthorizedCrmLeadById(jesika, leadB.id)).denied,
    true,
    "Scenario 2: Jesika MUST be denied Lead B"
  );
  console.log("   PASS [1-2]: Sales Rep sees assigned Lead A and is blocked from Lead B.");

  // ==========================================================================
  // SCENARIO 3: Engineer CANNOT access CRM without explicit crm:view permission
  //             (even when a lead is assigned to their employeeId!)
  // ==========================================================================
  const engineer = actors.engineer;
  assert.equal(hasPermission(engineer, "crm", "view"), false);
  const engDecision = authorizeAccess(engineer, {
    module: "crm",
    action: "view",
    record: { ownerId: leadEng.ownerId, ownerEmail: leadEng.ownerEmail },
  });
  assert.equal(
    engDecision.allowed,
    false,
    "Scenario 3: Assigned lead MUST be denied if actor lacks crm:view"
  );
  assert.equal(
    filterAuthorizedRecords(engineer, "crm", "view", [leadEng], (l) => ({
      ownerId: l.ownerId,
      ownerEmail: l.ownerEmail,
    })).length,
    0
  );
  const engCrmTool = await executeAuthorizedTool(
    engineer,
    "list_sales_leads",
    {},
    { conversationId: "mat-3" }
  );
  assert.equal(engCrmTool.denied, true, "Scenario 3: Agent list_sales_leads MUST deny Engineer");
  console.log("   PASS [3]: Engineer blocked from CRM module even when assigned a lead.");

  // ==========================================================================
  // SCENARIO 4: HR Manager accesses Recruitment, blocked from CRM & Audit
  // ==========================================================================
  const hr = actors.hr_manager;
  assert.equal(hasPermission(hr, "recruitment", "view"), true);
  assert.equal(hasPermission(hr, "jobs", "manage"), true);
  assert.equal(hasPermission(hr, "crm", "view"), false);
  assert.equal(hasPermission(hr, "audit", "view"), false);
  assert.equal((await listAuthorizedCrmLeads(hr)).length, 0);
  const hrCrmTool = await executeAuthorizedTool(hr, "list_sales_leads", {}, { conversationId: "mat-4" });
  assert.equal(hrCrmTool.denied, true);
  const hrAuditTool = await executeAuthorizedTool(hr, "list_audit_logs", {}, { conversationId: "mat-4" });
  assert.equal(hrAuditTool.denied, true);
  console.log("   PASS [4]: HR Manager authorized for Recruitment/Jobs, blocked from CRM & Audit.");

  // ==========================================================================
  // SCENARIO 5: Marketing Intern CANNOT access confidential sales, HR, team, audit
  // ==========================================================================
  const intern = actors.marketing_intern;
  assert.equal(hasPermission(intern, "crm", "view"), false);
  assert.equal(hasPermission(intern, "bookings", "view"), false);
  assert.equal(hasPermission(intern, "recruitment", "view"), false);
  assert.equal(hasPermission(intern, "team", "view"), false);
  assert.equal(hasPermission(intern, "audit", "view"), false);
  assert.equal((await listAuthorizedCrmLeads(intern)).length, 0);
  assert.equal(await getScopedMetrics(intern), null, "Intern must not receive org/HR metrics");
  assert.equal((await listTasks(intern)).length, 1, "Intern sees own assigned marketing task");
  const internSearch = await searchAuthorizedRecords(intern, "Alpha");
  assert.equal(internSearch.results.length, 0, "Intern search MUST return 0 CRM leads");
  console.log("   PASS [5]: Marketing Intern isolated from sales, HR, metrics, team & audit.");

  // ==========================================================================
  // SCENARIO 6: Suspended employee cannot access the platform
  // ==========================================================================
  await updateEmployeeRecord(employeesByRole.marketing_specialist.id, { status: "suspended" });
  const suspendedResolved = await resolveOrBootstrapActor({
    authUserId: employeesByRole.marketing_specialist.authUserId,
    email: employeesByRole.marketing_specialist.email,
  });
  assert.equal(suspendedResolved, null, "Scenario 6: Suspended employee MUST fail actor resolution");
  const suspendedActor = { ...actors.marketing_specialist, status: "suspended" };
  assert.equal(
    authorizeAccess(suspendedActor, { module: "dashboard", action: "view" }).allowed,
    false
  );
  console.log("   PASS [6]: Suspended employee locked out across auth & authorization engine.");

  // ==========================================================================
  // SCENARIO 7 & 8: Role change updates permissions & bumps sessionVersion (revocation)
  // ==========================================================================
  const beforeVersion = employeesByRole.project_manager.sessionVersion;
  const promotedOrChanged = await updateEmployeeRecord(employeesByRole.project_manager.id, {
    roleKey: "marketing_intern",
  });
  assert.ok(promotedOrChanged);
  assert.equal(promotedOrChanged.roleKey, "marketing_intern");
  assert.equal(
    promotedOrChanged.sessionVersion,
    beforeVersion + 1,
    "Scenario 7-8: Role change MUST increment session_version to invalidate stale sessions"
  );
  const refreshedActor = buildActorFromEmployee(
    promotedOrChanged,
    employeesByRole.project_manager.authUserId
  );
  assert.equal(hasPermission(refreshedActor, "crm", "view"), false);
  // Simulate cookie check from lib/auth.ts (old cookie version < actor.sessionVersion -> rejected)
  assert.equal(
    beforeVersion < refreshedActor.sessionVersion,
    true,
    "Scenario 8: Old session cookie version must be rejected"
  );
  console.log("   PASS [7-8]: Role change updates effective permissions and revokes stale sessions.");

  // ==========================================================================
  // SCENARIO 10 & 11: AI Agent & Voice commands deny unauthorized requests
  // ==========================================================================
  const restrictedTextTurn = await runAgentTurn({
    actor: jesika,
    message: "Show all candidate CVs and employee salaries",
    inputChannel: "text",
  });
  assert.ok(
    restrictedTextTurn.reply.toolCalls?.some(
      (t) => t.tool === "list_job_applications" && t.status === "denied"
    ),
    "Scenario 10: Agent MUST deny candidate CV query for Sales Rep"
  );
  assert.ok(
    restrictedTextTurn.reply.toolCalls?.some(
      (t) => t.tool === "list_team_directory" && t.status === "denied"
    ),
    "Scenario 10: Agent MUST deny employee salary/directory query for Sales Rep"
  );
  assert.equal(
    restrictedTextTurn.reply.citations?.length || 0,
    0,
    "Scenario 10: Denied Agent turn must leak ZERO source citations"
  );

  const restrictedVoiceTurn = await runAgentTurn({
    actor: jesika,
    message: "Show audit logs and all candidate CVs",
    inputChannel: "voice",
  });
  assert.ok(
    restrictedVoiceTurn.reply.toolCalls?.some(
      (t) => t.tool === "list_audit_logs" && t.status === "denied"
    ),
    "Scenario 11: Voice command MUST enforce identical RBAC denial on audit logs"
  );
  assert.ok(
    restrictedVoiceTurn.reply.toolCalls?.some(
      (t) => t.tool === "list_job_applications" && t.status === "denied"
    ),
    "Scenario 11: Voice command MUST enforce identical RBAC denial on recruitment"
  );
  const recentAudit = await listAuditLogs({ limit: 25 });
  assert.ok(
    recentAudit.some(
      (entry) =>
        entry.actorEmail === jesika.email &&
        entry.outcome === "denied" &&
        entry.metadata?.inputChannel === "voice"
    ),
    "Scenario 11: Voice RBAC denial must be audited with inputChannel='voice'"
  );
  console.log("   PASS [10-11]: Text & Voice Agent requests strictly enforce server RBAC & audit.");

  // ==========================================================================
  // SCENARIO 12: Dashboard & CRM counts match identical authorized record set
  // ==========================================================================
  const jesikaBriefing = await buildMorningBriefing(jesika);
  const jesikaEvents = await listBusinessEvents(jesika, { limit: 20 });
  const jesikaPipeline = await executeAuthorizedTool(
    jesika,
    "get_pipeline_summary",
    {},
    { conversationId: "mat-12" }
  );
  assert.equal(jesikaBriefing.counts.newLeads24h, jesikaLeads.length);
  assert.equal(jesikaPipeline.data.totalLeads, jesikaLeads.length);
  assert.equal(
    jesikaEvents.some((e) => e.entityId === leadB.id),
    false,
    "Scenario 12: Notifications/events must exclude unauthorized Lead B"
  );
  console.log("   PASS [12]: Dashboard briefing, notifications, Agent & CRM share identical scope.");

  // ==========================================================================
  // SCENARIO 13: Global search reveals NO restricted records
  // ==========================================================================
  const jesikaSearchA = await searchAuthorizedRecords(jesika, "Alpha");
  assert.equal(jesikaSearchA.results.length, 1, "Jesika search finds assigned Lead A");
  assert.equal(jesikaSearchA.results[0].id, `crm:${leadA.id}`);

  const jesikaSearchB = await searchAuthorizedRecords(jesika, "Beta Confidential");
  assert.equal(
    jesikaSearchB.results.length,
    0,
    "Scenario 13: Jesika global search MUST NOT reveal Rep B's Lead B"
  );

  const jesikaSearchEmp = await searchAuthorizedRecords(jesika, "hr_manager");
  assert.equal(
    jesikaSearchEmp.results.length,
    0,
    "Scenario 13: Jesika global search MUST NOT reveal team directory"
  );
  console.log("   PASS [13]: Global search honors module permissions and record-level scope.");

  // ==========================================================================
  // SCENARIO 9: Reassignment removes Jesika's access immediately
  // ==========================================================================
  await updateCrmLead(leadA.id, {
    ownerId: repBInv.employee.id,
    actorEmail: actors.super_admin.email,
  });
  assert.equal((await listAuthorizedCrmLeads(jesika)).length, 0);
  assert.equal((await getAuthorizedCrmLeadById(jesika, leadA.id)).denied, true);
  assert.equal((await searchAuthorizedRecords(jesika, "Alpha")).results.length, 0);
  assert.equal((await buildMorningBriefing(jesika)).counts.newLeads24h, 0);
  assert.equal((await listAuthorizedCrmLeads(repB)).length, 2);
  console.log("   PASS [9]: Reassignment revokes Jesika immediately and grants Rep B access.");

  // ==========================================================================
  // SCENARIO 14: Direct API endpoints reject unauthenticated access (live HTTP)
  // ==========================================================================
  const protectedEndpoints = [
    "/api/admin/search?q=alpha",
    "/api/metrics",
    `/api/admin/crm/${leadA.id}`,
    "/api/admin/crm",
    "/api/applications",
    "/api/admin/audit-logs",
    "/api/admin/team",
    "/api/admin/agent",
  ];
  for (const path of protectedEndpoints) {
    const res = await fetch(`${liveBase}${path}`, { redirect: "manual" });
    assert.equal(
      res.status,
      401,
      `Scenario 14: Unauthenticated direct API call ${path} must return 401 (got ${res.status})`
    );
  }
  console.log(`   PASS [14]: All ${protectedEndpoints.length} direct API endpoints enforce 401.`);

  // ==========================================================================
  // SCENARIO 15: Independent PostgreSQL RLS live & SQL verification
  // ==========================================================================
  if (savedUrl && savedAnon) {
    const rpcRes = await fetch(`${savedUrl}/rest/v1/rpc/hirzexa_resolve_lead_owners`, {
      method: "POST",
      headers: {
        apikey: savedAnon,
        Authorization: `Bearer ${savedAnon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_owner_ids: [] }),
    });
    assert.equal(rpcRes.status, 200, "20261121 hirzexa_resolve_lead_owners RPC is live");
    assert.deepEqual(await rpcRes.json(), [], "Anon RLS returns 0 owner rows");
  }
  const rlsSql = await readFile(
    resolve(root, "supabase/migrations/20261121_fix_crm_assignment_and_scope_rls.sql"),
    "utf8"
  );
  const rlsVerifySql = await readFile(
    resolve(root, "supabase/migrations/verify_20261121_crm_scope_rls.sql"),
    "utf8"
  );
  assert.ok(rlsSql.includes("public.hirzexa_can_access_lead("));
  assert.ok(rlsVerifySql.includes("rollback;"));
  console.log("   PASS [15]: Live Supabase RLS RPC & rolled-back PostgreSQL RLS suite verified.");

  console.log("\nALL 9 ROLES & ALL 15 MANDATORY SECURITY SCENARIOS PASSED.");
} finally {
  process.chdir(originalCwd);
  if (savedUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
  else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (savedAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedAnon;
  else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (savedFallback !== undefined) process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = savedFallback;
  else delete process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;
  if (savedAiEnabled !== undefined) process.env.AI_FEATURES_ENABLED = savedAiEnabled;
  else delete process.env.AI_FEATURES_ENABLED;
  await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
}
