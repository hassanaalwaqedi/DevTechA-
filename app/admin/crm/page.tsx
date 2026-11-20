import { AdminCrmClient } from "@/components/admin-crm-client";
import { AdminShell } from "@/components/admin-shell";
import { requirePermission } from "@/lib/auth";
import { listCrmLeads } from "@/lib/crm";
import { listEmployees } from "@/lib/intelligence/employees";
import { listTasks } from "@/lib/intelligence/tasks";
import { canAccessScopedRecord, hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { actor } = await requirePermission("crm", "view");
  const params = await searchParams;
  const rawLeads = await listCrmLeads();
  const leads = rawLeads.filter((lead) =>
    canAccessScopedRecord(actor, {
      ownerId: lead.ownerId,
      ownerEmail: lead.ownerEmail,
    })
  );

  const canCreate = hasPermission(actor, "crm", "create");
  const canEdit = hasPermission(actor, "crm", "edit");
  const canAssign = hasPermission(actor, "crm", "assign");
  const canUseAgent = hasPermission(actor, "agent", "view");
  const canCreateTask = hasPermission(actor, "tasks", "create");

  const [employees, tasks] = await Promise.all([
    canAssign ? listEmployees() : Promise.resolve([]),
    hasPermission(actor, "tasks", "view")
      ? listTasks(actor, { status: "all" })
      : Promise.resolve([]),
  ]);

  const activeOwners = employees
    .filter((emp) => emp.status !== "suspended")
    .map((emp) => ({
      id: emp.id,
      email: emp.email,
      fullName: emp.fullName,
      roleKey: emp.roleKey,
    }));

  return (
    <AdminShell active="crm">
      <AdminCrmClient
        initialLeads={leads}
        initialTasks={tasks}
        owners={activeOwners}
        initialLeadId={params.lead || null}
        actorScope={actor.scope}
        canCreate={canCreate}
        canEdit={canEdit}
        canAssign={canAssign}
        canUseAgent={canUseAgent}
        canCreateTask={canCreateTask}
        isSuperAdmin={actor.isSuperAdmin}
      />
    </AdminShell>
  );
}
