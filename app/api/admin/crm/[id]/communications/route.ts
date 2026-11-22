import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import { getAuthorizedCrmLeadById } from "@/lib/crm";
import {
  cancelLeadMeeting,
  cancelScheduledReminderJob,
  generateAiFollowUpDraft,
  getLeadMeetingCommunications,
  rescheduleLeadMeeting,
  sendManualMeetingEmail,
  updateLeadReminderSchedule,
} from "@/lib/crm-meetings/service";
import { renderMeetingEmailTemplate } from "@/lib/crm-meetings/templates";
import { MEETING_EMAIL_TEMPLATE_TYPES } from "@/lib/crm-meetings/types";
import { MfaRequiredError, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const templateEnum = z.enum(MEETING_EMAIL_TEMPLATE_TYPES);

const previewSchema = z.object({
  action: z.literal("preview"),
  templateType: templateEnum,
  subject: z.string().max(220).optional(),
  bodyText: z.string().max(6000).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  rescheduleReason: z.string().max(400).optional(),
  cancellationReason: z.string().max(400).optional(),
});

const sendSchema = z.object({
  action: z.enum(["send_email", "send_reminder"]),
  templateType: templateEnum,
  subject: z.string().max(220).optional(),
  bodyText: z.string().max(6000).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  confirmed: z.boolean(),
  allowDuplicateOverride: z.boolean().optional(),
  aiAssisted: z.boolean().optional(),
  clientIdempotencyKey: z.string().max(80).optional(),
});

const scheduleReminderSchema = z.object({
  action: z.literal("schedule_reminder"),
  enabled: z.boolean().optional(),
  offsetsMinutes: z.array(z.number().int().min(5).max(30 * 24 * 60)).max(5).optional(),
  customScheduledForIso: z.string().max(64).optional(),
  customSubject: z.string().max(220).optional(),
  customBody: z.string().max(6000).optional(),
  locale: z.enum(["en", "ar"]).optional(),
});

const cancelReminderSchema = z.object({
  action: z.literal("cancel_reminder"),
  jobId: z.string().min(8).max(80),
});

const rescheduleMeetingSchema = z.object({
  action: z.literal("reschedule_meeting"),
  newScheduledSlotIso: z.string().min(10).max(64),
  timezone: z.string().max(80).optional(),
  meetingLink: z.string().max(400).optional(),
  reason: z.string().max(400).optional(),
  notifyClient: z.boolean().optional(),
});

const cancelMeetingSchema = z.object({
  action: z.literal("cancel_meeting"),
  reason: z.string().max(400).optional(),
  notifyClient: z.boolean().optional(),
});

const aiDraftSchema = z.object({
  action: z.literal("ai_draft_followup"),
  locale: z.enum(["en", "ar"]).optional(),
  guidance: z.string().max(400).optional(),
});

const postActionSchema = z.discriminatedUnion("action", [
  previewSchema,
  sendSchema,
  scheduleReminderSchema,
  cancelReminderSchema,
  rescheduleMeetingSchema,
  cancelMeetingSchema,
  aiDraftSchema,
]);

function authErrorResponse(error: unknown) {
  if (error instanceof MfaRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "MFA_REQUIRED" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (error instanceof RbacDeniedError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("crm", "view"));
  } catch (error) {
    return authErrorResponse(error);
  }

  const { id } = await params;
  const result = await getLeadMeetingCommunications(actor, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { ok: true, summary: result.summary },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = postActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request parameters.",
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const { id } = await params;

  // Read-only preview and AI draft require crm:view (+ agent:view for AI draft)
  if (data.action === "preview") {
    let actor;
    try {
      ({ actor } = await requirePermissionApi("crm", "view"));
    } catch (error) {
      return authErrorResponse(error);
    }

    const scoped = await getAuthorizedCrmLeadById(actor, id);
    if (scoped.denied) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (!scoped.lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const preview = renderMeetingEmailTemplate({
      lead: scoped.lead,
      templateType: data.templateType,
      locale: data.locale || scoped.lead.locale,
      customSubject: data.subject,
      customBody: data.bodyText,
      rescheduleReason: data.rescheduleReason,
      cancellationReason: data.cancellationReason,
      senderName: actor.fullName,
    });
    return NextResponse.json(
      { ok: true, preview },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (data.action === "ai_draft_followup") {
    let actor;
    try {
      ({ actor } = await requirePermissionApi("crm", "view"));
    } catch (error) {
      return authErrorResponse(error);
    }
    try {
      const result = await generateAiFollowUpDraft(actor, id, {
        locale: data.locale,
        guidance: data.guidance,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json(
        { ok: true, draft: result.draft },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      return authErrorResponse(error);
    }
  }

  // All mutating / email-sending actions strictly require crm:edit
  let actor;
  try {
    ({ actor } = await requirePermissionApi("crm", "edit"));
  } catch (error) {
    return authErrorResponse(error);
  }

  if (data.action === "send_email" || data.action === "send_reminder") {
    const result = await sendManualMeetingEmail(actor, id, {
      templateType: data.templateType,
      subject: data.subject,
      bodyText: data.bodyText,
      locale: data.locale,
      confirmed: data.confirmed,
      allowDuplicateOverride: data.allowDuplicateOverride,
      triggerSource: data.aiAssisted ? "ai_assisted_manual" : "manual_staff",
      clientIdempotencyKey: data.clientIdempotencyKey,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code, communication: result.communication },
        { status: result.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    const refreshed = await getLeadMeetingCommunications(actor, id);
    return NextResponse.json(
      { ok: true, communication: result.communication, summary: refreshed.summary },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (data.action === "schedule_reminder") {
    const result = await updateLeadReminderSchedule(actor, id, {
      enabled: data.enabled,
      offsetsMinutes: data.offsetsMinutes,
      customScheduledForIso: data.customScheduledForIso,
      customSubject: data.customSubject,
      customBody: data.customBody,
      locale: data.locale,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const refreshed = await getLeadMeetingCommunications(actor, id);
    return NextResponse.json(
      {
        ok: true,
        config: result.config,
        scheduledJobs: result.scheduledJobs,
        skippedOffsets: result.skippedOffsets,
        summary: refreshed.summary,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (data.action === "cancel_reminder") {
    const result = await cancelScheduledReminderJob(actor, id, data.jobId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const refreshed = await getLeadMeetingCommunications(actor, id);
    return NextResponse.json(
      { ok: true, summary: refreshed.summary },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (data.action === "reschedule_meeting") {
    const result = await rescheduleLeadMeeting(actor, id, {
      newScheduledSlotIso: data.newScheduledSlotIso,
      timezone: data.timezone,
      meetingLink: data.meetingLink,
      reason: data.reason,
      notifyClient: data.notifyClient,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const refreshed = await getLeadMeetingCommunications(actor, id);
    return NextResponse.json(
      {
        ok: true,
        lead: result.lead,
        cancelledCount: result.cancelledCount,
        scheduledReminders: result.scheduledReminders,
        notification: result.notification,
        summary: refreshed.summary,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (data.action === "cancel_meeting") {
    const result = await cancelLeadMeeting(actor, id, {
      reason: data.reason,
      notifyClient: data.notifyClient,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const refreshed = await getLeadMeetingCommunications(actor, id);
    return NextResponse.json(
      {
        ok: true,
        lead: result.lead,
        cancelledCount: result.cancelledCount,
        notification: result.notification,
        summary: refreshed.summary,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
