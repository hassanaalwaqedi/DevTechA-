import { AdminShell } from "@/components/admin-shell";
import { AdminTeamClient } from "@/components/admin-team-client";
import { requirePermission } from "@/lib/auth";
import {
  isResendConfigured,
  resolvePublicInvitationBaseUrl,
} from "@/lib/email/transactional";
import { listAuditLogs } from "@/lib/intelligence/audit";
import {
  listEmployees,
  listLatestInvitationsByEmployee,
} from "@/lib/intelligence/employees";
import { hasPermission, ROLE_TEMPLATES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const { actor } = await requirePermission("team", "view");
  const canViewAudit = hasPermission(actor, "audit", "view");
  const canUseAgent = hasPermission(actor, "agent", "view");

  const [employees, invitationsByEmployee, auditLogs] = await Promise.all([
    listEmployees(),
    listLatestInvitationsByEmployee(),
    canViewAudit ? listAuditLogs({ limit: 80 }).catch(() => []) : Promise.resolve([]),
  ]);

  const baseUrlStatus = resolvePublicInvitationBaseUrl();

  return (
    <AdminShell active="team">
      <AdminTeamClient
        initialEmployees={employees}
        initialInvitations={invitationsByEmployee}
        initialAuditLogs={auditLogs}
        roles={Object.values(ROLE_TEMPLATES)}
        currentActorId={actor.employeeId}
        isSuperAdmin={actor.isSuperAdmin}
        canCreate={hasPermission(actor, "team", "create")}
        canEdit={hasPermission(actor, "team", "edit")}
        canUseAgent={canUseAgent}
        canViewAudit={canViewAudit}
        emailDeliveryReady={isResendConfigured() && baseUrlStatus.ok}
        emailConfigWarning={
          !isResendConfigured()
            ? "RESEND_API_KEY is not configured on this server. Invitations will generate secure 48h links, but outbound emails will report Delivery Failed until Resend is configured."
            : !baseUrlStatus.ok
            ? baseUrlStatus.error || "APP_BASE_URL must be set to a public HTTPS domain."
            : null
        }
      />
    </AdminShell>
  );
}
