import { AdminApplicationsClient } from "@/components/admin-applications-client";
import { AdminShell } from "@/components/admin-shell";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { actor } = await requirePermission("recruitment", "view");
  const params = await searchParams;
  return (
    <AdminShell active="applications">
      <AdminApplicationsClient
        initialQuery={params.q || ""}
        canEdit={hasPermission(actor, "recruitment", "edit")}
        canUseAgent={hasPermission(actor, "agent", "view")}
      />
    </AdminShell>
  );
}
