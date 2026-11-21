import { NextResponse } from "next/server";
import { verifyResendWebhookSignature } from "@/lib/email/transactional";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { recordInvitationWebhookUpdate } from "@/lib/intelligence/employees";
import { recordInterviewWebhookUpdate } from "@/lib/interviews/service";
import { recordRecruitmentWebhookUpdate } from "@/lib/recruitment/service";
import type { InvitationDeliveryStatus } from "@/lib/intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapResendEventToStatus(eventType: string): InvitationDeliveryStatus | null {
  switch (eventType) {
    case "email.sent":
      return "accepted_by_provider";
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.delivery_delayed":
    case "email.failed":
      return "delivery_failed";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET is not configured." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const valid = verifyResendWebhookSignature({
    rawBody,
    svixId: request.headers.get("svix-id"),
    svixTimestamp: request.headers.get("svix-timestamp"),
    svixSignature: request.headers.get("svix-signature"),
  });

  if (!valid) {
    return NextResponse.json(
      { error: "Invalid Resend webhook signature." },
      { status: 401 }
    );
  }

  let payload: {
    type?: string;
    data?: {
      email_id?: string;
      to?: string[];
      bounce?: { message?: string; type?: string };
      error?: string;
    };
  };

  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const eventType = String(payload.type || "");
  const messageId = String(payload.data?.email_id || "").trim();
  const mappedStatus = mapResendEventToStatus(eventType);

  if (!messageId || !mappedStatus) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const errorDetail =
    payload.data?.bounce?.message ||
    payload.data?.error ||
    (mappedStatus === "bounced"
      ? "Recipient mail server bounced the invitation email."
      : mappedStatus === "complained"
      ? "Recipient marked the message as spam."
      : null);

  const result = await recordInvitationWebhookUpdate({
    providerMessageId: messageId,
    deliveryStatus: mappedStatus,
    eventType,
    error: errorDetail,
  });

  if (result.matched && result.employeeId) {
    await recordAuditLog({
      actorId: "system:resend-webhook",
      actorEmail: "webhooks@resend.com",
      actorRole: "system",
      module: "team",
      action: "invitation_webhook",
      entityType: "employee",
      entityId: result.employeeId,
      outcome:
        mappedStatus === "bounced" ||
        mappedStatus === "complained" ||
        mappedStatus === "delivery_failed"
          ? "error"
          : "allowed",
      summary: `Resend webhook (${eventType}) updated invitation for ${result.email || result.employeeId} to "${mappedStatus}".`,
      metadata: {
        providerMessageId: messageId,
        eventType,
        deliveryStatus: mappedStatus,
        errorDetail,
      },
    });
    return NextResponse.json({ ok: true, matched: true, scope: "employee", status: mappedStatus });
  }

  const interviewRes = await recordInterviewWebhookUpdate({
    providerMessageId: messageId,
    eventType,
    detail: errorDetail || undefined,
  });

  if (interviewRes.matched) {
    await recordAuditLog({
      actorId: "system:resend-webhook",
      actorEmail: "webhooks@resend.com",
      actorRole: "system",
      module: "interviews",
      action: "interview_email_webhook",
      entityType: "interview_email",
      entityId: messageId,
      outcome:
        mappedStatus === "bounced" ||
        mappedStatus === "complained" ||
        mappedStatus === "delivery_failed"
          ? "error"
          : "allowed",
      summary: `Resend webhook (${eventType}) updated interview email ${messageId} to "${mappedStatus}".`,
      metadata: {
        providerMessageId: messageId,
        eventType,
        deliveryStatus: mappedStatus,
        errorDetail,
      },
    });
    return NextResponse.json({
      ok: true,
      matched: true,
      scope: "interview",
      status: mappedStatus,
    });
  }

  const recruitmentRes = await recordRecruitmentWebhookUpdate({
    providerMessageId: messageId,
    eventType,
    detail: errorDetail || undefined,
  });

  if (recruitmentRes.matched) {
    await recordAuditLog({
      actorId: "system:resend-webhook",
      actorEmail: "webhooks@resend.com",
      actorRole: "system",
      module: "recruitment",
      action: "recruitment_email_webhook",
      entityType: "recruitment_communication",
      entityId: messageId,
      outcome:
        mappedStatus === "bounced" ||
        mappedStatus === "complained" ||
        mappedStatus === "delivery_failed"
          ? "error"
          : "allowed",
      summary: `Resend webhook (${eventType}) updated recruitment email ${messageId} to "${mappedStatus}".`,
      metadata: {
        providerMessageId: messageId,
        eventType,
        deliveryStatus: mappedStatus,
        errorDetail,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    matched: result.matched || interviewRes.matched || recruitmentRes.matched,
    scope: recruitmentRes.matched ? "recruitment" : "none",
    status: mappedStatus,
  });
}
