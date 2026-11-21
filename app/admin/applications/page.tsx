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
  const canEditRecruitment = hasPermission(actor, "recruitment", "edit");
  const canCreateRecruitment =
    hasPermission(actor, "recruitment", "create") || canEditRecruitment;

  return (
    <AdminShell active="applications">
      <AdminApplicationsClient
        initialQuery={params.q || ""}
        canEdit={canEditRecruitment}
        canAddCandidate={canCreateRecruitment}
        canSendEmail={canCreateRecruitment}
        canUseAgent={hasPermission(actor, "agent", "view")}
        canInviteInterview={hasPermission(actor, "interviews", "create")}
        canViewInterviews={hasPermission(actor, "interviews", "view")}
      />
    </AdminShell>
  );
}
