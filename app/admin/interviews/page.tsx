import { AdminInterviewsClient } from "@/components/admin-interviews-client";
import { AdminShell } from "@/components/admin-shell";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminInterviewsPage() {
  const { actor } = await requirePermission("interviews", "view");

  return (
    <AdminShell active="interviews">
      <AdminInterviewsClient
        actorEmail={actor.email}
        actorEmployeeId={actor.employeeId || ""}
        canCreate={hasPermission(actor, "interviews", "create")}
        canEdit={hasPermission(actor, "interviews", "edit")}
        canManage={hasPermission(actor, "interviews", "manage")}
      />
    </AdminShell>
  );
}
