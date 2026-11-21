import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { isResendConfigured } from "@/lib/email/transactional";
import { RbacDeniedError } from "@/lib/rbac";
import { buildRecruitmentEmail } from "@/lib/recruitment/email-templates";
import {
  findDuplicateCandidates,
  getUnifiedCandidateTimeline,
  isValidSingleEmail,
  listRecruitmentCommunications,
  sendRecruitmentEmail,
} from "@/lib/recruitment/service";
import {
  RECRUITMENT_MESSAGE_TYPES,
  type RecruitmentMessageType,
} from "@/lib/recruitment/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleAuthError(err: unknown, fallback: string) {
  if (err instanceof RbacDeniedError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const msg = err instanceof Error ? err.message : "";
  if (/unauthor|session|suspend|sign in|login/i.test(msg)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("recruitment", "view");
    const applicationReferenceId =
      request.nextUrl.searchParams.get("applicationReferenceId")?.trim() || undefined;
    const recipientEmail = request.nextUrl.searchParams.get("email")?.trim() || undefined;
    const query = request.nextUrl.searchParams.get("q")?.trim() || undefined;

    const [timeline, communications] = await Promise.all([
      getUnifiedCandidateTimeline(actor, { applicationReferenceId, recipientEmail, query }),
      listRecruitmentCommunications(actor, { applicationReferenceId, recipientEmail, query }),
    ]);

    return NextResponse.json({
      timeline,
      communications,
      resendConfigured: isResendConfigured(),
    });
  } catch (err) {
    return handleAuthError(err, "Unable to load recruitment communications.");
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const mode = body.mode === "send" ? "send" : "preview";
    const { actor } = await requirePermissionApi(
      "recruitment",
      mode === "send" ? "edit" : "view"
    );

    const rawType = String(body.messageType || "general_recruitment") as RecruitmentMessageType;
    const messageType: RecruitmentMessageType = RECRUITMENT_MESSAGE_TYPES.includes(rawType)
      ? rawType
      : "general_recruitment";
    const locale: "en" | "ar" = body.locale === "ar" ? "ar" : "en";
    const recipientEmail = String(body.recipientEmail || "").trim();
    const recipientName = body.recipientName ? String(body.recipientName).trim() : null;
    const applicationReferenceId = body.applicationReferenceId
      ? String(body.applicationReferenceId).trim()
      : null;
    const positionTitle = body.positionTitle ? String(body.positionTitle).trim() : null;
    const subject = String(body.subject || "").trim();
    const bodyMarkdown = String(body.bodyMarkdown || "");

    if (mode === "preview") {
      const hasValidRecipient = isValidSingleEmail(recipientEmail);
      const isSamplePreview = !hasValidRecipient || bodyMarkdown.trim().length < 5;
      const matches = hasValidRecipient
        ? await findDuplicateCandidates(actor, { email: recipientEmail })
        : [];
      const built = buildRecruitmentEmail({
        recipientEmail: hasValidRecipient ? recipientEmail : "preview-candidate@hirzexa.com",
        recipientName,
        positionTitle,
        messageType,
        subject: subject || "HIRZEXA | Regarding Your Application",
        bodyMarkdown,
        locale,
        senderName: actor.fullName,
        isSamplePreview,
      });

      return NextResponse.json({
        template: built.template,
        isSamplePreview,
        isRealRecipient: hasValidRecipient,
        hasUnsafeLinksBlocked: built.hasUnsafeLinksBlocked,
        existingCandidate: matches[0] || null,
        resendConfigured: isResendConfigured(),
      });
    }

    // mode === "send"
    if (body.confirmed !== true) {
      return NextResponse.json(
        { error: "Explicit confirmation is required before sending a recruitment email." },
        { status: 400 }
      );
    }

    const allowSkipEmail =
      body.skipOutboundEmail === true &&
      process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK === "true";

    const result = await sendRecruitmentEmail(actor, {
      recipientEmail,
      recipientName,
      applicationReferenceId,
      positionTitle,
      messageType,
      locale,
      subject,
      bodyMarkdown,
      clientRequestId: body.clientRequestId ? String(body.clientRequestId) : undefined,
      skipOutboundEmail: allowSkipEmail,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || "Unable to send recruitment email.",
          communication: result.communication,
          delivery: result.delivery,
        },
        { status: result.delivery?.status === "delivery_failed" ? 502 : 400 }
      );
    }

    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (err) {
    return handleAuthError(err, "Unable to process recruitment email request.");
  }
}
