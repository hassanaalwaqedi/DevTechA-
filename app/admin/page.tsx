import { AdminShell } from "@/components/admin-shell";
import { AdminCommandCenterClient } from "@/components/admin-command-center-client";
import { requirePermission } from "@/lib/auth";
import {
  getScopedMetrics,
  getWorkspaceProfileForActor,
} from "@/lib/authorization";
import { listAuthorizedCrmLeads } from "@/lib/crm";
import { getAdminJobs, getAdminProducts, getApplications } from "@/lib/db";
import { listEmployees } from "@/lib/intelligence/employees";
import { buildMorningBriefing, listBusinessEvents } from "@/lib/intelligence/events";
import { listTasks } from "@/lib/intelligence/tasks";
import { hasPermission } from "@/lib/rbac";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const [{ actor }, resolvedSearch] = await Promise.all([
    requirePermission("dashboard", "view"),
    searchParams,
  ]);

  const workspace = getWorkspaceProfileForActor(actor);

  const canCrm = hasPermission(actor, "crm", "view");
  const canCrmAssign = hasPermission(actor, "crm", "assign");
  const canBookings = hasPermission(actor, "bookings", "view");
  const canRecruitment = hasPermission(actor, "recruitment", "view");
  const canJobs = hasPermission(actor, "jobs", "view");
  const canProducts = hasPermission(actor, "products", "view");
  const canDemonstrations = hasPermission(actor, "demonstrations", "view");
  const canTasks = hasPermission(actor, "tasks", "view");
  const canTeam = hasPermission(actor, "team", "view");
  const canAudit = hasPermission(actor, "audit", "view");
  const canAgent = hasPermission(actor, "agent", "view");
  const canSettings = hasPermission(actor, "settings", "view");

  // Fetch strictly ONLY the data the authenticated actor is permitted to view.
  // Never serialize prohibited records or metrics into the page payload.
  const [
    briefing,
    tasks,
    events,
    rawLeads,
    metrics,
    applications,
    jobs,
    products,
    employees,
  ] = await Promise.all([
    buildMorningBriefing(actor),
    canTasks ? listTasks(actor, { status: "all" }) : Promise.resolve([]),
    listBusinessEvents(actor, { limit: 14 }),
    canCrm || canBookings ? listAuthorizedCrmLeads(actor) : Promise.resolve([]),
    getScopedMetrics(actor),
    canRecruitment ? getApplications().catch(() => []) : Promise.resolve([]),
    canJobs ? getAdminJobs().catch(() => []) : Promise.resolve([]),
    canProducts ? getAdminProducts().catch(() => []) : Promise.resolve([]),
    canTeam ? listEmployees().catch(() => []) : Promise.resolve([]),
  ]);

  // Scrub confidential commercial values/notes for roles with hideCommercialValues (e.g. Marketing)
  const leads = workspace.hideCommercialValues
    ? rawLeads.map((l) => ({
        ...l,
        budgetRange: undefined,
        notes: "",
      }))
    : rawLeads;

  const applicationSummaries = applications.slice(0, 8).map((a) => ({
    id: a.id,
    name: a.name,
    jobTitle: a.jobTitle,
    status: a.status,
    experience: a.experience,
    country: a.country,
    createdAt: a.createdAt,
  }));

  const jobSummaries = jobs.slice(0, 8).map((j) => ({
    id: j.id,
    title: j.title,
    department: j.department,
    status: j.status,
    location: j.location,
  }));

  const productSummaries = products.slice(0, 8).map((p) => ({
    slug: p.slug,
    name: p.name,
    status: p.status,
    eyebrow: p.eyebrow,
  }));

  const teamSummary = canTeam
    ? {
        total: employees.length,
        active: employees.filter((e) => e.status === "active").length,
        invited: employees.filter((e) => e.status === "invited").length,
        suspended: employees.filter((e) => e.status === "suspended").length,
      }
    : null;

  const deniedParam = resolvedSearch.denied?.trim();
  const deniedModuleLabel =
    deniedParam && deniedParam !== "1" ? deniedParam.replace(/[^a-z0-9_-]/gi, "") : null;

  return (
    <AdminShell active="overview">
      {deniedParam ? (
        <div
          className="hz-alert-error"
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span>
            <strong>Access Denied:</strong> Your role ({actor.roleLabel},{" "}
            {actor.scope} scope) does not have permission to access{" "}
            {deniedModuleLabel ? `the "${deniedModuleLabel}" module` : "that workspace"}. This
            attempt was logged to the security audit trail.
          </span>
        </div>
      ) : null}

      <AdminCommandCenterClient
        actorName={actor.fullName}
        actorRole={actor.roleLabel}
        actorRoleKey={actor.roleKey}
        actorScope={actor.scope}
        actorDepartment={actor.department}
        workspace={workspace}
        supabaseConnected={isSupabaseConfigured()}
        aiConfigured={Boolean(
          process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        )}
        initialBriefing={briefing}
        initialTasks={tasks}
        initialEvents={events}
        leads={leads}
        applications={applicationSummaries}
        jobs={jobSummaries}
        products={productSummaries}
        teamSummary={teamSummary}
        metrics={metrics}
        permissions={{
          crm: canCrm,
          crmAssign: canCrmAssign,
          bookings: canBookings,
          recruitment: canRecruitment,
          jobs: canJobs,
          products: canProducts,
          demonstrations: canDemonstrations,
          tasksView: canTasks,
          tasksCreate: hasPermission(actor, "tasks", "create"),
          tasksEdit: hasPermission(actor, "tasks", "edit"),
          team: canTeam,
          audit: canAudit,
          agent: canAgent,
          settings: canSettings,
        }}
      />
    </AdminShell>
  );
}
