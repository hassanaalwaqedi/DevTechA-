import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { buildEmployeeInvitationEmail } from "@/lib/email-templates";
import {
  canonicalizeUserFacingUrl,
  getInvitationReplyToAddress,
  getInvitationSenderAddress,
  resolvePublicInvitationBaseUrl,
  sendTransactionalEmail,
} from "@/lib/email/transactional";
import { recordAuditLog } from "@/lib/intelligence/audit";
import {
  reissueEmployeeInvitation,
  updateInvitationDeliveryStatus,
} from "@/lib/intelligence/employees";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import { checkRateLimit } from "@/lib/rate-limit";
import { RbacDeniedError, ROLE_TEMPLATES } from "@/lib/rbac";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("team", "edit"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Prevent rapid duplicate uncontrolled resends: 1 resend per 90s cooldown + max 3 per hour per employee
  if (!checkRateLimit(`resend-cooldown:${id}`, 1, 90 * 1000)) {
    return NextResponse.json(
      { error: "Please wait 90 seconds before resending another invitation to this employee." },
      { status: 429 }
    );
  }
  if (!checkRateLimit(`resend-hourly:${id}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Hourly resend limit reached (3 invitations per hour for this employee)." },
      { status: 429 }
    );
  }

  try {
    const { employee, invitationId, invitationToken, expiresAt, revokedCount } =
      await reissueEmployeeInvitation({
        employeeId: id,
        createdBy: actor.id,
      });

    const activationPath = `/admin/activate?token=${encodeURIComponent(invitationToken)}`;
    const baseCheck = resolvePublicInvitationBaseUrl();
    const requestOrigin = canonicalizeUserFacingUrl(
      request.headers.get("origin") || SITE_URL
    );
    const displayActivationUrl = `${(baseCheck.baseUrl || requestOrigin).replace(/\/$/, "")}${activationPath}`;

    let deliveryStatus: "accepted_by_provider" | "delivery_failed" = "delivery_failed";
    let providerMessageId: string | null = null;
    let deliveryError: string | null = null;
    let sentAt: string | null = null;

    if (!baseCheck.ok || !baseCheck.baseUrl) {
      deliveryError =
        baseCheck.error || "APP_BASE_URL is not configured as a public HTTPS origin.";
      await updateInvitationDeliveryStatus(invitationId, {
        deliveryStatus: "delivery_failed",
        emailProvider: "resend",
        deliveryError,
      });
    } else {
      const publicActivationUrl = `${baseCheck.baseUrl}${activationPath}`;
      const template = buildEmployeeInvitationEmail({
        employeeName: employee.fullName,
        employeeEmail: employee.email,
        roleLabel: ROLE_TEMPLATES[employee.roleKey].label,
        department: employee.department,
        invitedByName: actor.fullName,
        activationUrl: publicActivationUrl,
        expiresAt,
        publicBaseUrl: baseCheck.baseUrl,
        fromAddress: getInvitationSenderAddress(),
        replyToAddress: getInvitationReplyToAddress(),
      });

      await updateInvitationDeliveryStatus(invitationId, {
        deliveryStatus: "sending",
        emailProvider: "resend",
      });

      const sendResult = await sendTransactionalEmail(template, {
        idempotencyKey: `resend-${invitationId}`,
        tags: [
          { name: "category", value: "employee_invitation_resend" },
          { name: "employee_id", value: employee.id },
        ],
      });

      deliveryStatus = sendResult.status;
      providerMessageId = sendResult.messageId || null;
      deliveryError = sendResult.error || null;
      sentAt = sendResult.sentAt || null;

      await updateInvitationDeliveryStatus(invitationId, {
        deliveryStatus,
        emailProvider: "resend",
        providerMessageId,
        deliveryError,
        sentAt,
      });
    }

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "team",
      action: "resend_invitation",
      entityType: "employee",
      entityId: employee.id,
      outcome: deliveryStatus === "accepted_by_provider" ? "allowed" : "error",
      summary: `Resent invitation to ${employee.email} (revoked ${revokedCount} prior token${revokedCount === 1 ? "" : "s"}). Delivery: ${deliveryStatus}.`,
      metadata: {
        invitationId,
        revokedCount,
        deliveryStatus,
        providerMessageId,
        deliveryError,
      },
    });

    try {
      await emitBusinessEvent({
        eventType: "employee.invited",
        module: "team",
        severity: deliveryStatus === "delivery_failed" ? "attention" : "info",
        actorRef: actor.email,
        entityType: "employee",
        entityId: employee.id,
        title: `Invitation resent: ${employee.fullName}`,
        summary: `Previous token revoked and new 48h link issued for ${employee.email}. Email status: ${deliveryStatus}.`,
        sourceHref: "/admin/team",
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      employee,
      revokedCount,
      invitation: {
        id: invitationId,
        activationPath,
        activationUrl: displayActivationUrl,
        expiresAt,
        singleUse: true,
        deliveryStatus,
        emailProvider: "resend",
        providerMessageId,
        deliveryError,
        sentAt,
      },
      invitationSummary: {
        id: invitationId,
        employeeId: employee.id,
        email: employee.email,
        expiresAt,
        consumedAt: null,
        revokedAt: null,
        deliveryStatus,
        emailProvider: "resend",
        providerMessageId,
        deliveryError,
        sentAt,
        deliveredAt: null,
        lastWebhookEvent: null,
        lastWebhookAt: null,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to resend invitation." },
      { status: 400 }
    );
  }
}
