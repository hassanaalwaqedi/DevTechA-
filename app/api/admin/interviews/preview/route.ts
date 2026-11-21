import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { isResendConfigured } from "@/lib/email/transactional";
import { renderInterviewTemplatePreview } from "@/lib/interviews/email-templates";
import type {
  InterviewFormat,
  InterviewTemplateKind,
  InterviewType,
} from "@/lib/interviews/types";
import { RbacDeniedError } from "@/lib/rbac";

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
    await requirePermissionApi("interviews", "view");
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

    if (body.sendTest) {
      return NextResponse.json(
        {
          error:
            "Email template previews contain placeholder fields and are blocked from production email delivery. To verify live Resend delivery end-to-end, create and send a real interview invitation for a controlled test candidate.",
        },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      template,
      isPreview: true,
      placeholderNotice:
        "Preview only — a unique, cryptographically secure scheduling link will be generated when sending a real invitation.",
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
