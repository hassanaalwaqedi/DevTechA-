import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import { buildEmployeeInvitationEmail } from "@/lib/email-templates";
import {
  getInvitationReplyToAddress,
  getInvitationSenderAddress,
  isResendConfigured,
  resolvePublicInvitationBaseUrl,
  sendTransactionalEmail,
} from "@/lib/email/transactional";
import { recordAuditLog } from "@/lib/intelligence/audit";
import {
  createEmployeeWithInvitation,
  listEmployees,
  listLatestInvitationsByEmployee,
  updateInvitationDeliveryStatus,
} from "@/lib/intelligence/employees";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ACCESS_SCOPES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  RbacDeniedError,
  ROLE_KEYS,
  ROLE_TEMPLATES,
} from "@/lib/rbac";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  jobTitle: z.string().trim().max(120).optional().default(""),
  department: z.string().trim().max(80).optional().default("Operations"),
  roleKey: z.enum(ROLE_KEYS),
  scopeOverride: z.enum(ACCESS_SCOPES).nullable().optional(),
  permissionOverrides: z
    .record(z.enum(PERMISSION_MODULES), z.array(z.enum(PERMISSION_ACTIONS)))
    .optional(),
});

export async function GET() {
  try {
    const { actor } = await requirePermissionApi("team", "view");
    const [employees, invitationsByEmployee] = await Promise.all([
      listEmployees(),
      listLatestInvitationsByEmployee(),
    ]);
    return NextResponse.json({
      ok: true,
      actorRole: actor.roleKey,
      roles: Object.values(ROLE_TEMPLATES),
      employees,
      invitationsByEmployee,
      emailProviderConfigured: isResendConfigured(),
    });
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("team", "create"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(`team-invite:${actor.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Invitation rate limit reached (20 per hour). Please wait before inviting more accounts." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  if (parsed.data.roleKey === "super_admin" && !actor.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only a Super Admin can create another Super Admin account." },
      { status: 403 }
    );
  }

  try {
    const { employee, invitationId, invitationToken, expiresAt } =
      await createEmployeeWithInvitation({
        ...parsed.data,
        createdBy: actor.id,
      });

    const activationPath = `/admin/activate?token=${encodeURIComponent(invitationToken)}`;
    const baseCheck = resolvePublicInvitationBaseUrl();
    const requestOrigin = (request.headers.get("origin") || SITE_URL).replace(/\/$/, "");
    const displayActivationUrl = `${(baseCheck.baseUrl || requestOrigin).replace(/\/$/, "")}${activationPath}`;

    let deliveryStatus: "created" | "accepted_by_provider" | "delivery_failed" = "created";
    let providerMessageId: string | null = null;
    let deliveryError: string | null = null;
    let sentAt: string | null = null;
    let emailProvider: string | null = "resend";

    if (!baseCheck.ok || !baseCheck.baseUrl) {
      deliveryStatus = "delivery_failed";
      deliveryError = baseCheck.error || "APP_BASE_URL is not configured as a public HTTPS origin.";
      await updateInvitationDeliveryStatus(invitationId, {
        deliveryStatus,
        emailProvider,
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
        idempotencyKey: `invite-${invitationId}`,
        tags: [
          { name: "category", value: "employee_invitation" },
          { name: "employee_id", value: employee.id },
        ],
      });

      deliveryStatus = sendResult.status;
      providerMessageId = sendResult.messageId || null;
      deliveryError = sendResult.error || null;
      sentAt = sendResult.sentAt || null;
      emailProvider = sendResult.provider;

      await updateInvitationDeliveryStatus(invitationId, {
        deliveryStatus,
        emailProvider,
        providerMessageId,
        deliveryError,
        sentAt,
      });
    }

    // Audit log NEVER stores plaintext activation tokens or raw activation URLs
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "team",
      action: "create",
      entityType: "employee",
      entityId: employee.id,
      outcome: "allowed",
      summary: `Invited ${employee.fullName} (${employee.email}) as ${ROLE_TEMPLATES[employee.roleKey].label}. Email status: ${deliveryStatus}.`,
      metadata: {
        roleKey: employee.roleKey,
        department: employee.department,
        invitationId,
        deliveryStatus,
        emailProvider,
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
        title: `Employee invited: ${employee.fullName}`,
        summary: `Assigned ${ROLE_TEMPLATES[employee.roleKey].label} (${employee.department}). Invitation email: ${deliveryStatus}${providerMessageId ? ` (${providerMessageId})` : ""}.`,
        sourceHref: "/admin/team",
      });
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        employee,
        invitation: {
          id: invitationId,
          activationPath,
          activationUrl: displayActivationUrl,
          expiresAt,
          singleUse: true,
          deliveryStatus,
          emailProvider,
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
          emailProvider,
          providerMessageId,
          deliveryError,
          sentAt,
          deliveredAt: null,
          lastWebhookEvent: null,
          lastWebhookAt: null,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create employee." },
      { status: 409 }
    );
  }
}
