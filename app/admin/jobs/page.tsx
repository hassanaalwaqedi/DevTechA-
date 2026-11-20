import { AdminJobsClient } from "@/components/admin-jobs-client";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader, StatusBadge } from "@/components/admin-ui/primitives";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  await requirePermission("jobs", "view");
  return (
    <AdminShell active="jobs">
      <PageHeader
        eyebrow="Careers CMS"
        title="Open Positions & Jobs"
        description="Create, publish, and manage open engineering roles and hiring criteria."
        actions={<StatusBadge tone="blue">Live Careers</StatusBadge>}
      />
      <AdminJobsClient />
    </AdminShell>
  );
}
