import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
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

// Run strictly against an isolated temporary staging store — NEVER touches production Supabase!
const stagingDir = await mkdtemp(join(tmpdir(), "hirzexa-crm-scope-staging-"));
const originalCwd = process.cwd();
const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const savedAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const savedFallback = process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = "true";
process.chdir(stagingDir);

try {
  const {
    canActorAccessCrmLead,
    createCrmLead,
    getAuthorizedCrmLeadById,
    InvalidCrmOwnerError,
    listAuthorizedCrmLeads,
    resolveCanonicalCrmOwner,
    updateCrmLead,
  } = await import(pathToFileURL(resolve(root, "lib/crm.ts")).href);
  const {
    buildActorFromEmployee,
    createEmployeeWithInvitation,
    markInvitationConsumed,
    updateEmployeeRecord,
  } = await import(pathToFileURL(resolve(root, "lib/intelligence/employees.ts")).href);
  const {
    buildMorningBriefing,
    emitBusinessEvent,
    listBusinessEvents,
  } = await import(pathToFileURL(resolve(root, "lib/intelligence/events.ts")).href);
  const {
    confirmAndExecutePendingAction,
    executeAuthorizedTool,
  } = await import(pathToFileURL(resolve(root, "lib/intelligence/tools.ts")).href);
  const { runAgentTurn } = await import(
    pathToFileURL(resolve(root, "lib/intelligence/agent.ts")).href
  );
  const { canAccessScopedRecord } = await import(
    pathToFileURL(resolve(root, "lib/rbac.ts")).href
  );

  console.log("=== HIRZEXA Controlled Staging Verification: CRM Assigned/Team Scope ===");

  // Provision controlled staging employees with DISTINCT auth_user_id vs employees.id
  const superAdminAuthId = "10000000-0000-4000-8000-000000000001";
  const jesikaAuthId = "20000000-0000-4000-8000-000000000002";
  const repBAuthId = "30000000-0000-4000-8000-000000000003";
  const teamSalesAuthId = "40000000-0000-4000-8000-000000000004";
  const engAuthId = "50000000-0000-4000-8000-000000000005";

  const invAdmin = await createEmployeeWithInvitation({
    fullName: "Staging Super Admin",
    email: "admin@staging.hirzexa.test",
    jobTitle: "Founder",
    department: "Executive",
    roleKey: "super_admin",
    createdBy: superAdminAuthId,
  });
  await markInvitationConsumed(invAdmin.invitationId, invAdmin.employee.id, superAdminAuthId);

  const invJesika = await createEmployeeWithInvitation({
    fullName: "Jesika",
    email: "jesika@staging.hirzexa.test",
    jobTitle: "Sales Representative",
    department: "Sales",
    roleKey: "sales_rep",
    scopeOverride: null, // defaultScope = "assigned"
    createdBy: superAdminAuthId,
  });
  await markInvitationConsumed(invJesika.invitationId, invJesika.employee.id, jesikaAuthId);

  const invRepB = await createEmployeeWithInvitation({
    fullName: "Omar Rep",
    email: "omar@staging.hirzexa.test",
    jobTitle: "Sales Representative",
    department: "Sales",
    roleKey: "sales_rep",
    createdBy: superAdminAuthId,
  });
  await markInvitationConsumed(invRepB.invitationId, invRepB.employee.id, repBAuthId);

  const invTeamSales = await createEmployeeWithInvitation({
    fullName: "Maya Sales Team",
    email: "maya@staging.hirzexa.test",
    jobTitle: "Sales Team Lead",
    department: "Sales",
    roleKey: "sales_rep",
    scopeOverride: "team",
    createdBy: superAdminAuthId,
  });
  await markInvitationConsumed(invTeamSales.invitationId, invTeamSales.employee.id, teamSalesAuthId);

  const invEng = await createEmployeeWithInvitation({
    fullName: "Tariq Eng",
    email: "tariq@staging.hirzexa.test",
    jobTitle: "Solutions Engineer",
    department: "Engineering",
    roleKey: "sales_rep",
    createdBy: superAdminAuthId,
  });
  await markInvitationConsumed(invEng.invitationId, invEng.employee.id, engAuthId);

  const superAdmin = buildActorFromEmployee(
    { ...invAdmin.employee, authUserId: superAdminAuthId, status: "active" },
    superAdminAuthId
  );
  const jesika = buildActorFromEmployee(
    { ...invJesika.employee, authUserId: jesikaAuthId, status: "active" },
    jesikaAuthId
  );
  const repB = buildActorFromEmployee(
    { ...invRepB.employee, authUserId: repBAuthId, status: "active" },
    repBAuthId
  );
  const teamSales = buildActorFromEmployee(
    { ...invTeamSales.employee, authUserId: teamSalesAuthId, status: "active" },
    teamSalesAuthId
  );

  assert.equal(jesika.roleKey, "sales_rep");
  assert.equal(jesika.scope, "assigned", "Step 2: Jesika MUST remain on Assigned scope");
  assert.notEqual(
    jesika.id,
    jesika.employeeId,
    "auth.users.id and employees.id must be distinct UUIDs in staging test"
  );

  // Create controlled leads: Lead A (initially unassigned), Lead B (assigned to Rep B),
  // Lead U (remains Unassigned), Lead E (assigned to Engineering department)
  const { lead: leadAInitial } = await createCrmLead({
    leadType: "proposal_request",
    fullName: "Nadia Al-Mansoor",
    email: "nadia@acmecorp.test",
    company: "Acme Corp Staging",
    serviceTrack: "AI Engineering & Intelligent Agents",
    budgetRange: "$40k–$100k",
    durationMinutes: 30,
    timezone: "UTC",
    projectSummary: "Enterprise RAG and internal AI operations deployment for Acme Corp.",
    consent: true,
    locale: "en",
  });

  const { lead: leadB } = await createCrmLead({
    leadType: "proposal_request",
    fullName: "David Sterling",
    email: "david@globex.test",
    company: "Globex Industries Staging",
    serviceTrack: "Custom Software & SaaS Engineering",
    budgetRange: "$100k+",
    durationMinutes: 30,
    timezone: "UTC",
    projectSummary: "Confidential multi-tenant SaaS architecture owned by Rep B.",
    consent: true,
    locale: "en",
    ownerId: invRepB.employee.id,
    ownerEmail: invRepB.employee.email,
    ownerName: invRepB.employee.fullName,
    ownerDepartment: invRepB.employee.department,
  });

  const { lead: leadUnassigned } = await createCrmLead({
    leadType: "discovery_call",
    fullName: "Lina Prospect",
    email: "lina@unassigned.test",
    company: "Unassigned Prospect Co",
    serviceTrack: "Business Process Automation",
    durationMinutes: 30,
    timezone: "UTC",
    projectSummary: "Inbound public booking with no assigned owner yet.",
    consent: true,
    locale: "en",
  });

  const { lead: leadEng } = await createCrmLead({
    leadType: "proposal_request",
    fullName: "Samir CTO",
    email: "samir@engclient.test",
    company: "EngDept Systems",
    serviceTrack: "Cloud Architecture & Systems Integration",
    durationMinutes: 30,
    timezone: "UTC",
    projectSummary: "Cloud migration owned by Engineering department.",
    consent: true,
    locale: "en",
    ownerId: invEng.employee.id,
    ownerEmail: invEng.employee.email,
    ownerName: invEng.employee.fullName,
    ownerDepartment: invEng.employee.department,
  });

  // Emit business events for both Lead A and Lead B so event-feed isolation is tested too
  await emitBusinessEvent({
    eventType: "proposal.created",
    module: "crm",
    severity: "info",
    actorRef: leadAInitial.fullName,
    entityType: "lead",
    entityId: leadAInitial.id,
    title: `Proposal: ${leadAInitial.company}`,
    summary: `${leadAInitial.referenceId} assigned test event`,
    sourceHref: `/admin/crm?lead=${leadAInitial.id}`,
  });
  await emitBusinessEvent({
    eventType: "proposal.created",
    module: "crm",
    severity: "info",
    actorRef: leadB.fullName,
    entityType: "lead",
    entityId: leadB.id,
    title: `Proposal: ${leadB.company}`,
    summary: `${leadB.referenceId} confidential Rep B event`,
    sourceHref: `/admin/crm?lead=${leadB.id}`,
  });

  // Canonicalization check: passing auth_user_id must canonicalize to employees.id!
  const canonicalFromAuthId = await resolveCanonicalCrmOwner({ ownerId: jesikaAuthId });
  assert.equal(
    canonicalFromAuthId.ownerId,
    invJesika.employee.id,
    "resolveCanonicalCrmOwner must canonicalize auth.users.id -> employees.id"
  );
  assert.equal(canonicalFromAuthId.ownerEmail, "jesika@staging.hirzexa.test");
  assert.equal(canonicalFromAuthId.ownerDepartment, "Sales");

  // Reject invalid owner ID explicitly
  await assert.rejects(
    () => resolveCanonicalCrmOwner({ ownerId: "99999999-9999-4999-8999-999999999999" }),
    InvalidCrmOwnerError,
    "Nonexistent employee ownerId must be rejected"
  );

  // ============================================================================
  // STEP 1-4: Assign Lead A to Jesika (Assigned scope) & Verify Visibility
  // ============================================================================
  console.log("1-4) Assigning Lead A to Jesika (Assigned scope) and verifying CRM visibility...");
  const assignedLeadA = await updateCrmLead(leadAInitial.id, {
    ownerId: invJesika.employee.id,
    actorEmail: superAdmin.email,
  });
  assert.ok(assignedLeadA, "Lead A assignment must succeed");
  assert.equal(assignedLeadA.ownerId, invJesika.employee.id, "ownerId must be Jesika's employees.id");
  assert.equal(assignedLeadA.ownerName, "Jesika", "ownerName must be hydrated");
  assert.equal(assignedLeadA.ownerDepartment, "Sales", "ownerDepartment must be hydrated");
  assert.ok(
    assignedLeadA.activities.some((a) => a.summary.includes("Assigned lead owner to Jesika")),
    "Timeline must record ownership assignment"
  );

  const jesikaLeads = await listAuthorizedCrmLeads(jesika);
  assert.equal(jesikaLeads.length, 1, "Jesika (Assigned) must see exactly 1 lead (Lead A)");
  assert.equal(jesikaLeads[0].id, leadAInitial.id);
  assert.equal(jesikaLeads[0].ownerName, "Jesika");

  // Direct single-lead read allowed for Lead A, denied for Lead B & Unassigned
  const directA = await getAuthorizedCrmLeadById(jesika, leadAInitial.id);
  assert.equal(directA.denied, false);
  assert.equal(directA.lead?.id, leadAInitial.id);

  // Verify dashboard Morning Briefing counts match CRM list count identically
  const jesikaBriefing = await buildMorningBriefing(jesika);
  assert.equal(
    jesikaBriefing.counts.newLeads24h,
    1,
    "Dashboard Morning Briefing must match Jesika's authorized lead count (1)"
  );

  // Verify Business Events feed includes Lead A and excludes Lead B
  const jesikaEvents = await listBusinessEvents(jesika, { limit: 20 });
  assert.ok(
    jesikaEvents.some((e) => e.entityId === leadAInitial.id),
    "Activity feed must include Jesika's Lead A event"
  );
  assert.equal(
    jesikaEvents.some((e) => e.entityId === leadB.id),
    false,
    "Activity feed MUST NOT leak Rep B's Lead B event to Jesika"
  );

  // ============================================================================
  // STEP 5: Verify AI Agent can summarize Lead A
  // ============================================================================
  console.log("5) Verifying AI Agent summarizes Lead A for Jesika...");
  const agentHistoryA = await executeAuthorizedTool(
    jesika,
    "get_lead_history",
    { leadIdOrQuery: leadAInitial.referenceId },
    { conversationId: "conv-stage-1" }
  );
  assert.equal(agentHistoryA.ok, true);
  assert.ok(agentHistoryA.data && (agentHistoryA.data).id === leadAInitial.id);
  assert.equal((agentHistoryA.data).company, "Acme Corp Staging");

  const agentSummaryTurn = await runAgentTurn({
    actor: jesika,
    message: `Summarize this client (${leadAInitial.referenceId}) and suggest the next step.`,
    locale: "en",
    pageContext: {
      route: "/admin/crm",
      entityType: "lead",
      entityId: leadAInitial.id,
      entityLabel: leadAInitial.company,
    },
  });
  assert.ok(
    agentSummaryTurn.reply.content.includes("Acme Corp Staging") ||
      agentSummaryTurn.reply.citations?.some((c) => c.entityId === leadAInitial.id),
    "Agent response must reference Lead A (Acme Corp Staging)"
  );

  const agentPipeline = await executeAuthorizedTool(
    jesika,
    "get_pipeline_summary",
    {},
    { conversationId: "conv-stage-1" }
  );
  assert.equal(agentPipeline.ok, true);
  assert.equal(
    (agentPipeline.data).totalLeads,
    1,
    "Agent pipeline summary count must equal CRM list count (1)"
  );

  // Stage a pending stage-update action on Lead A while Jesika still owns it (to test TOCTOU after reassignment!)
  const stagedUpdate = await executeAuthorizedTool(
    jesika,
    "update_lead_stage",
    { leadIdOrQuery: leadAInitial.id, newStage: "discovery_completed", note: "Discovery done" },
    { conversationId: "conv-stage-1" }
  );
  assert.equal(stagedUpdate.ok, true);
  assert.ok(stagedUpdate.pendingAction?.id, "Staged stage update must create pendingAction");

  // ============================================================================
  // STEP 6: Verify Lead B (Rep B) & Unassigned Lead remain inaccessible to Jesika
  // ============================================================================
  console.log("6) Verifying Lead B (other rep) & Unassigned lead are strictly inaccessible...");
  const directB = await getAuthorizedCrmLeadById(jesika, leadB.id);
  assert.equal(directB.denied, true, "Direct GET for Lead B must be denied for Jesika");
  assert.equal(directB.lead, null);

  const directU = await getAuthorizedCrmLeadById(jesika, leadUnassigned.id);
  assert.equal(directU.denied, true, "Direct GET for Unassigned lead must be denied for Jesika");

  const agentHistoryB = await executeAuthorizedTool(
    jesika,
    "get_lead_history",
    { leadIdOrQuery: leadB.referenceId },
    { conversationId: "conv-stage-2" }
  );
  assert.equal(agentHistoryB.ok, true);
  assert.equal(agentHistoryB.data, null, "Agent get_lead_history MUST return null for Lead B");

  const agentSearchB = await executeAuthorizedTool(
    jesika,
    "list_sales_leads",
    { query: "Globex" },
    { conversationId: "conv-stage-2" }
  );
  assert.equal((agentSearchB.data).length, 0, "Agent list_sales_leads MUST return 0 rows for Lead B");

  // ============================================================================
  // BONUS CHECK: Verify Team Scope Isolation (NO Unassigned & NO Other Dept!)
  // ============================================================================
  console.log("6b) Verifying Team scope exposes Sales-owned leads ONLY (blocks Unassigned & Engineering)...");
  const teamSalesLeads = await listAuthorizedCrmLeads(teamSales);
  const teamSalesIds = new Set(teamSalesLeads.map((l) => l.id));
  assert.equal(teamSalesIds.has(leadAInitial.id), true, "Team Sales should see Sales-owned Lead A");
  assert.equal(teamSalesIds.has(leadB.id), true, "Team Sales should see Sales-owned Lead B");
  assert.equal(
    teamSalesIds.has(leadUnassigned.id),
    false,
    "Team scope MUST NOT expose Unassigned lead!"
  );
  assert.equal(
    teamSalesIds.has(leadEng.id),
    false,
    "Team scope MUST NOT expose Engineering department lead!"
  );
  assert.equal(
    canAccessScopedRecord(teamSales, { ownerId: null, ownerEmail: null, department: null }),
    false,
    "canAccessScopedRecord(team) must fail closed on unassigned records"
  );

  // ============================================================================
  // STEP 7 & 8: Reassign Lead A to Rep B -> Jesika loses access IMMEDIATELY
  // ============================================================================
  console.log("7-8) Reassigning Lead A to Rep B and verifying immediate revocation for Jesika...");
  const reassignedLeadA = await updateCrmLead(leadAInitial.id, {
    ownerId: invRepB.employee.id,
    actorEmail: superAdmin.email,
  });
  assert.equal(reassignedLeadA?.ownerId, invRepB.employee.id);

  // Jesika immediately sees 0 leads in CRM, dashboard, events, direct GET, and AI Agent!
  const jesikaLeadsAfter = await listAuthorizedCrmLeads(jesika);
  assert.equal(jesikaLeadsAfter.length, 0, "Jesika MUST have 0 leads immediately after reassignment");
  assert.equal(canActorAccessCrmLead(jesika, reassignedLeadA), false);

  const directAAfter = await getAuthorizedCrmLeadById(jesika, leadAInitial.id);
  assert.equal(directAAfter.denied, true, "Jesika direct GET on Lead A MUST be denied immediately");

  const jesikaBriefingAfter = await buildMorningBriefing(jesika);
  assert.equal(
    jesikaBriefingAfter.counts.newLeads24h,
    0,
    "Dashboard briefing count must drop to 0 immediately"
  );

  const jesikaEventsAfter = await listBusinessEvents(jesika, { limit: 20 });
  assert.equal(
    jesikaEventsAfter.some((e) => e.entityId === leadAInitial.id),
    false,
    "Lead A event must disappear from Jesika's activity feed immediately"
  );

  const agentHistoryAAfter = await executeAuthorizedTool(
    jesika,
    "get_lead_history",
    { leadIdOrQuery: leadAInitial.referenceId },
    { conversationId: "conv-stage-3" }
  );
  assert.equal(
    agentHistoryAAfter.data,
    null,
    "AI Agent must immediately lose access to Lead A after reassignment"
  );

  // TOCTOU protection: confirming the previously staged pending action MUST fail now!
  const toctouRes = await confirmAndExecutePendingAction(
    jesika,
    stagedUpdate.pendingAction.id,
    "approve"
  );
  assert.equal(
    toctouRes.ok,
    false,
    "Pending stage update staged before reassignment MUST be blocked on approval!"
  );

  // Rep B now sees BOTH Lead A and Lead B
  const repBLeads = await listAuthorizedCrmLeads(repB);
  assert.equal(repBLeads.length, 2, "Rep B must now see both Lead A and Lead B");

  // Suspended employee rejection check
  await updateEmployeeRecord(invRepB.employee.id, { status: "suspended" });
  await assert.rejects(
    () => resolveCanonicalCrmOwner({ ownerId: invRepB.employee.id }),
    InvalidCrmOwnerError,
    "Assigning to a suspended employee must be rejected"
  );

  // ============================================================================
  // STEP 9: Audit PostgreSQL RLS Migration & Independent Verification SQL
  // ============================================================================
  console.log("9) Auditing additive PostgreSQL RLS migration & rolled-back verification SQL...");
  const rlsFixSql = await readFile(
    resolve(root, "supabase/migrations/20261121_fix_crm_assignment_and_scope_rls.sql"),
    "utf8"
  );
  const rlsVerifySql = await readFile(
    resolve(root, "supabase/migrations/verify_20261121_crm_scope_rls.sql"),
    "utf8"
  );

  assert.ok(
    rlsFixSql.includes("public.hirzexa_actor_scope() = 'all'"),
    "RLS fix must separate 'all' from 'team' scope"
  );
  assert.ok(
    !rlsFixSql.includes("hirzexa_actor_scope() in ('all', 'team')"),
    "RLS fix must NOT equate 'team' with 'all'"
  );
  assert.ok(
    rlsFixSql.includes("p_owner_id is not null"),
    "RLS fix must reject NULL owner_employee_id for Assigned and Team scopes"
  );
  assert.ok(
    rlsFixSql.includes("create or replace function public.hirzexa_resolve_lead_owners("),
    "RLS fix must define hirzexa_resolve_lead_owners RPC"
  );
  assert.ok(
    rlsFixSql.includes("entity_type not in ('lead', 'booking')"),
    "RLS fix must scope business_events for lead/booking entities"
  );
  assert.ok(
    rlsVerifySql.includes("begin;") && rlsVerifySql.includes("rollback;"),
    "Independent RLS verification script must execute inside BEGIN ... ROLLBACK"
  );
  assert.ok(
    rlsVerifySql.includes("Team scope leaked Unassigned lead"),
    "Independent RLS verification script must explicitly assert Team scope blocks Unassigned leads"
  );

  console.log("\nALL 9 MANDATORY STAGING CRM ASSIGNED-SCOPE, TEAM-SCOPE, AGENT & RLS CHECKS PASSED.");
} finally {
  process.chdir(originalCwd);
  if (savedUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
  else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (savedAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedAnon;
  else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (savedFallback !== undefined) process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = savedFallback;
  else delete process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;
  await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
}
