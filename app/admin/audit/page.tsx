import { AdminAuditClient } from "@/components/admin-audit-client";
import { AdminShell } from "@/components/admin-shell";
import { requirePermission } from "@/lib/auth";
import { listAuditLogs } from "@/lib/intelligence/audit";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requirePermission("audit", "view");
  const logs = await listAuditLogs({ limit: 150 });

  return (
    <AdminShell active="audit">
      <AdminAuditClient initialLogs={logs} />
    </AdminShell>
  );
}
