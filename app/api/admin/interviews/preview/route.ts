import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { isResendConfigured, sendTransactionalEmail } from "@/lib/email/transactional";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { renderInterviewTemplatePreview } from "@/lib/interviews/email-templates";
import type {
  InterviewFormat,
  InterviewTemplateKind,
  InterviewType,
} from "@/lib/interviews/types";
import { hasPermission, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KINDS: InterviewTemplateKind[] = [
  "invitation",
  "confirmation",
  "reminder",
  "rescheduled",
  "canceled",
  "expired",
];

export async function POST(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("interviews", "view");
    const body = (await request.json()) as {
      kind?: InterviewTemplateKind;
      locale?: "en" | "ar";
      candidateName?: string;
      candidateEmail?: string;
      positionTitle?: string;
      interviewType?: InterviewType;
      interviewFormat?: InterviewFormat;
      durationMinutes?: number;
      interviewerName?: string;
      personalizedMessage?: string;
      meetingUrl?: string | null;
      locationDetails?: string | null;
      candidateTimezone?: string;
      expiresInDays?: number;
      sendTest?: boolean;
      testRecipientEmail?: string;
    };

    const kind: InterviewTemplateKind =
      body.kind && ALLOWED_KINDS.includes(body.kind) ? body.kind : "invitation";
    const locale: "en" | "ar" = body.locale === "ar" ? "ar" : "en";

    const template = renderInterviewTemplatePreview({
      kind,
      locale,
      candidateName: body.candidateName,
      candidateEmail: body.candidateEmail,
      positionTitle: body.positionTitle,
      interviewType: body.interviewType,
      interviewFormat: body.interviewFormat,
      durationMinutes: body.durationMinutes,
      interviewerName: body.interviewerName,
      personalizedMessage: body.personalizedMessage,
      meetingUrl: body.meetingUrl,
      locationDetails: body.locationDetails,
      candidateTimezone: body.candidateTimezone,
      expiresInDays: body.expiresInDays,
    });

    if (body.sendTest) {
      if (!hasPermission(actor, "interviews", "create")) {
        return NextResponse.json(
          { error: "Forbidden: interviews:create permission required to send test emails." },
          { status: 403 }
        );
      }

      const recipient = (body.testRecipientEmail || actor.email).trim().toLowerCase();
      const isSelf = recipient === actor.email.toLowerCase();
      const isHirzexaInternal = recipient.endsWith("@hirzexa.com");
      if (!isSelf && !isHirzexaInternal) {
        return NextResponse.json(
          {
            error:
              "Controlled test emails may only be sent to your own signed-in email address or an internal @hirzexa.com address.",
          },
          { status: 400 }
        );
      }

      const result = await sendTransactionalEmail(
        {
          ...template,
          to: recipient,
          subject: `[TEST PREVIEW] ${template.subject}`,
        },
        {
          tags: [
            { name: "category", value: "interview_template_test" },
            { name: "template_kind", value: kind },
          ],
        }
      );

      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.roleKey,
        module: "interviews",
        action: "interviews.template.test_sent",
        entityType: "interview_template",
        entityId: kind,
        outcome: result.ok ? "allowed" : "error",
        summary: `Sent controlled ${kind} (${locale}) test email to ${recipient}.`,
        metadata: { recipient, deliveryStatus: result.status },
      });

      return NextResponse.json({
        template,
        testDelivery: result,
        resendConfigured: isResendConfigured(),
      });
    }

    return NextResponse.json({
      template,
      resendConfigured: isResendConfigured(),
    });
  } catch (err) {
    if (err instanceof RbacDeniedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "";
    if (/unauthor|session|suspend|sign in|login/i.test(msg)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to render email preview." }, { status: 500 });
  }
}
