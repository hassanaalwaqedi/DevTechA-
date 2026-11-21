import { AdminShell } from "@/components/admin-shell";
import { AdminCommandCenterClient } from "@/components/admin-command-center-client";
import { requireAdmin } from "@/lib/auth";
import { listAuthorizedCrmLeads } from "@/lib/crm";
import { getMetrics } from "@/lib/db";
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
    requireAdmin(),
    searchParams,
  ]);

  const canCrm =
    hasPermission(actor, "crm", "view") || hasPermission(actor, "bookings", "view");
  const canRecruitment = hasPermission(actor, "recruitment", "view");
  const canTasks = hasPermission(actor, "tasks", "view");

  const [briefing, tasks, events, leads, metrics] = await Promise.all([
    buildMorningBriefing(actor),
    canTasks ? listTasks(actor, { status: "all" }) : Promise.resolve([]),
    listBusinessEvents(actor, { limit: 14 }),
    canCrm ? listAuthorizedCrmLeads(actor) : Promise.resolve([]),
    getMetrics().catch(() => null),
  ]);

  return (
    <AdminShell active="overview">
      {resolvedSearch.denied === "1" ? (
        <p className="hz-alert-error">
          Access denied: your current role ({actor.roleLabel}) does not have permission to open that module. This attempt was logged.
        </p>
      ) : null}

      <AdminCommandCenterClient
        actorName={actor.fullName}
        actorRole={actor.roleLabel}
        supabaseConnected={isSupabaseConfigured()}
        aiConfigured={Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)}
        initialBriefing={briefing}
        initialTasks={tasks}
        initialEvents={events}
        leads={leads}
        metrics={metrics}
        permissions={{
          crm: canCrm,
          recruitment: canRecruitment,
          tasksCreate: hasPermission(actor, "tasks", "create"),
          tasksEdit: hasPermission(actor, "tasks", "edit"),
          agent: hasPermission(actor, "agent", "view"),
        }}
      />
    </AdminShell>
  );
}
