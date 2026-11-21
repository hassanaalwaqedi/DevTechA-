import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  OFFICIAL_WEBSITE_URL,
  isResendConfigured,
  resolvePublicInvitationBaseUrl,
  sendTransactionalEmail,
} from "@/lib/email/transactional";
import {
  buildInterviewCanceledEmail,
  buildInterviewConfirmationEmail,
  buildInterviewExpiredEmail,
  buildInterviewInvitationEmail,
  buildInterviewReminderEmail,
  buildInterviewRescheduledEmail,
  buildInterviewerNotificationEmail,
} from "@/lib/interviews/email-templates";
import { computeAvailableInterviewSlots } from "@/lib/interviews/availability";
import { buildInterviewCalendarLinks, generateInterviewIcs } from "@/lib/interviews/ics";
import { getExternalCalendarAdapterStatus } from "@/lib/interviews/calendar-adapter";
import {
  INTERVIEW_DURATIONS,
  INTERVIEW_FORMATS,
  INTERVIEW_TYPES,
  isValidIanaTimezone,
  type AvailableInterviewSlot,
  type InterviewActivityRecord,
  type InterviewAppointmentRecord,
  type InterviewAppointmentStatus,
  type InterviewDuration,
  type InterviewEmailEventRecord,
  type InterviewFormat,
  type InterviewInvitationRecord,
  type InterviewOutcome,
  type InterviewReminderRecord,
  type InterviewStatistics,
  type InterviewType,
  type InterviewerAvailabilityException,
  type InterviewerAvailabilityRule,
  type SafeInterviewInvitation,
} from "@/lib/interviews/types";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import {
  isLocalFallbackAllowed,
  readLocalCollection,
  writeLocalCollection,
} from "@/lib/intelligence/store";
import { listEmployees } from "@/lib/intelligence/employees";
import type { InvitationDeliveryStatus } from "@/lib/intelligence/types";
import { hasPermission, type AuthActor } from "@/lib/rbac";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const COL_AVAILABILITY = "interviewer-availability";
const COL_EXCEPTIONS = "interviewer-availability-exceptions";
const COL_INVITATIONS = "interview-invitations";
const COL_APPOINTMENTS = "interview-appointments";
const COL_ACTIVITY = "interview-activity";
const COL_EMAIL_EVENTS = "interview-email-events";
const COL_REMINDERS = "interview-reminders";

// Per-interviewer in-process serialization mutex to eliminate local/staging race conditions
const interviewerLocks = new Map<string, Promise<void>>();

async function withInterviewerLock<T>(interviewerId: string, fn: () => Promise<T>): Promise<T> {
  const prev = interviewerLocks.get(interviewerId) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  interviewerLocks.set(interviewerId, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (interviewerLocks.get(interviewerId) === next) {
      interviewerLocks.delete(interviewerId);
    }
  }
}

export function generateInterviewToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInterviewToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function stripTokenHash(inv: InterviewInvitationRecord): SafeInterviewInvitation {
  const { tokenHash: _omit, ...safe } = inv;
  void _omit;
  return safe;
}

function getSafeSchedulingBaseUrl(): string {
  const resolved = resolvePublicInvitationBaseUrl();
  if (resolved.ok && resolved.baseUrl) return resolved.baseUrl;
  return OFFICIAL_WEBSITE_URL;
}

export function buildCandidateSchedulingUrl(rawToken: string, baseUrl?: string): string {
  const origin = (baseUrl || getSafeSchedulingBaseUrl()).replace(/\/$/, "");
  return `${origin}/interview/schedule?token=${encodeURIComponent(rawToken)}`;
}

export function canActorManageAllInterviews(actor: AuthActor): boolean {
  if (!hasPermission(actor, "interviews", "view")) return false;
  return (
    actor.roleKey === "super_admin" ||
    actor.roleKey === "administrator" ||
    actor.roleKey === "hr_manager" ||
    actor.scope === "all"
  );
}

export function canActorViewInterviewRecord(
  actor: AuthActor,
  interviewerEmployeeId: string
): boolean {
  if (!hasPermission(actor, "interviews", "view")) return false;
  if (canActorManageAllInterviews(actor)) return true;
  if (actor.employeeId && interviewerEmployeeId === actor.employeeId) return true;
  if (actor.id && interviewerEmployeeId === actor.id) return true;
  return false;
}

// ---------- Row mappers ----------

function mapAvailabilityRule(row: Record<string, unknown>): InterviewerAvailabilityRule {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    timezone: String(row.timezone || "UTC"),
    dayOfWeek: Number(row.day_of_week),
    startMinute: Number(row.start_minute),
    endMinute: Number(row.end_minute),
    slotDurationMinutes: Number(row.slot_duration_minutes || 45) as InterviewDuration,
    minNoticeHours: Number(row.min_notice_hours ?? 12),
    bufferBeforeMinutes: Number(row.buffer_before_minutes ?? 10),
    bufferAfterMinutes: Number(row.buffer_after_minutes ?? 10),
    maxAdvanceDays: Number(row.max_advance_days ?? 21),
    isActive: row.is_active !== false,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapException(row: Record<string, unknown>): InterviewerAvailabilityException {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    exceptionDate: String(row.exception_date),
    isUnavailable: row.is_unavailable !== false,
    startMinute: row.start_minute != null ? Number(row.start_minute) : null,
    endMinute: row.end_minute != null ? Number(row.end_minute) : null,
    reason: String(row.reason || ""),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapInvitation(row: Record<string, unknown>): InterviewInvitationRecord {
  return {
    id: String(row.id),
    applicationId: row.application_id ? String(row.application_id) : null,
    applicationReferenceId: String(row.application_reference_id),
    candidateName: String(row.candidate_name),
    candidateEmail: String(row.candidate_email),
    positionTitle: String(row.position_title),
    interviewStage: String(row.interview_stage || "Interview"),
    interviewType: String(row.interview_type) as InterviewType,
    interviewFormat: String(row.interview_format) as InterviewFormat,
    durationMinutes: Number(row.duration_minutes) as InterviewDuration,
    interviewerEmployeeId: String(row.interviewer_employee_id),
    interviewerName: String(row.interviewer_name),
    interviewerEmail: String(row.interviewer_email),
    interviewerTimezone: String(row.interviewer_timezone || "UTC"),
    availabilityWindowStart: row.availability_window_start
      ? String(row.availability_window_start)
      : null,
    availabilityWindowEnd: row.availability_window_end ? String(row.availability_window_end) : null,
    meetingUrl: row.meeting_url ? String(row.meeting_url) : null,
    locationDetails: row.location_details ? String(row.location_details) : null,
    personalizedMessage: String(row.personalized_message || ""),
    locale: row.locale === "ar" ? "ar" : "en",
    tokenHash: String(row.token_hash || ""),
    status: String(row.status) as InterviewInvitationRecord["status"],
    emailDeliveryStatus: String(
      row.email_delivery_status || "created"
    ) as InvitationDeliveryStatus,
    providerMessageId: row.provider_message_id ? String(row.provider_message_id) : null,
    deliveryError: row.delivery_error ? String(row.delivery_error) : null,
    expiresAt: String(row.expires_at),
    sentAt: row.sent_at ? String(row.sent_at) : null,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapAppointment(row: Record<string, unknown>): InterviewAppointmentRecord {
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    applicationId: row.application_id ? String(row.application_id) : null,
    applicationReferenceId: String(row.application_reference_id),
    candidateName: String(row.candidate_name),
    candidateEmail: String(row.candidate_email),
    positionTitle: String(row.position_title),
    interviewStage: String(row.interview_stage || "Interview"),
    interviewType: String(row.interview_type) as InterviewType,
    interviewFormat: String(row.interview_format) as InterviewFormat,
    durationMinutes: Number(row.duration_minutes) as InterviewDuration,
    interviewerEmployeeId: String(row.interviewer_employee_id),
    interviewerName: String(row.interviewer_name),
    interviewerEmail: String(row.interviewer_email),
    scheduledStartUtc: String(row.scheduled_start_utc),
    scheduledEndUtc: String(row.scheduled_end_utc),
    candidateTimezone: String(row.candidate_timezone || "UTC"),
    interviewerTimezone: String(row.interviewer_timezone || "UTC"),
    meetingUrl: row.meeting_url ? String(row.meeting_url) : null,
    locationDetails: row.location_details ? String(row.location_details) : null,
    status: String(row.status) as InterviewAppointmentStatus,
    outcome: String(row.outcome || "pending") as InterviewOutcome,
    outcomeNotes: String(row.outcome_notes || ""),
    rescheduleCount: Number(row.reschedule_count || 0),
    canceledAt: row.canceled_at ? String(row.canceled_at) : null,
    cancelReason: row.cancel_reason ? String(row.cancel_reason) : null,
    externalCalendarProvider: row.external_calendar_provider
      ? String(row.external_calendar_provider)
      : null,
    externalCalendarEventId: row.external_calendar_event_id
      ? String(row.external_calendar_event_id)
      : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapActivity(row: Record<string, unknown>): InterviewActivityRecord {
  return {
    id: String(row.id),
    invitationId: row.invitation_id ? String(row.invitation_id) : null,
    appointmentId: row.appointment_id ? String(row.appointment_id) : null,
    applicationReferenceId: String(row.application_reference_id),
    eventType: String(row.event_type) as InterviewActivityRecord["eventType"],
    actorRef: String(row.actor_ref),
    summary: String(row.summary),
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: String(row.created_at),
  };
}

// ---------- Internal Activity & Email Event Logging ----------

async function recordInterviewActivity(input: {
  invitationId?: string | null;
  appointmentId?: string | null;
  applicationReferenceId: string;
  eventType: InterviewActivityRecord["eventType"];
  actorRef: string;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<InterviewActivityRecord> {
  const record: InterviewActivityRecord = {
    id: randomUUID(),
    invitationId: input.invitationId || null,
    appointmentId: input.appointmentId || null,
    applicationReferenceId: input.applicationReferenceId,
    eventType: input.eventType,
    actorRef: input.actorRef,
    summary: input.summary,
    metadata: input.metadata || {},
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from("interview_activity_history").insert({
        id: record.id,
        invitation_id: record.invitationId,
        appointment_id: record.appointmentId,
        application_reference_id: record.applicationReferenceId,
        event_type: record.eventType,
        actor_ref: record.actorRef,
        summary: record.summary,
        metadata: record.metadata,
        created_at: record.createdAt,
      });
    } catch {
      // Non-fatal if migration pending
    }
  }

  if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<InterviewActivityRecord>(COL_ACTIVITY);
    await writeLocalCollection(COL_ACTIVITY, [record, ...existing].slice(0, 500));
  }
  return record;
}

async function recordInterviewEmailEvent(event: InterviewEmailEventRecord): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from("interview_email_events").upsert(
        {
          id: event.id,
          invitation_id: event.invitationId || null,
          appointment_id: event.appointmentId || null,
          template_type: event.templateType,
          recipient_email: event.recipientEmail,
          idempotency_key: event.idempotencyKey,
          provider: event.provider,
          provider_message_id: event.providerMessageId || null,
          delivery_status: event.deliveryStatus,
          last_webhook_event: event.lastWebhookEvent || null,
          error_detail: event.errorDetail || null,
          sent_at: event.sentAt || null,
          delivered_at: event.deliveredAt || null,
          created_at: event.createdAt,
          updated_at: event.updatedAt,
        },
        { onConflict: "idempotency_key" }
      );
    } catch {
      // Non-fatal
    }
  }

  if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<InterviewEmailEventRecord>(COL_EMAIL_EVENTS);
    const filtered = existing.filter((e) => e.idempotencyKey !== event.idempotencyKey);
    await writeLocalCollection(COL_EMAIL_EVENTS, [event, ...filtered].slice(0, 500));
  }
}

// ---------- Interviewer Availability Management ----------

export async function listInterviewerAvailability(
  employeeId?: string
): Promise<InterviewerAvailabilityRule[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      let query = supabase
        .from("interviewer_availability")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_minute", { ascending: true });
      if (employeeId) query = query.eq("employee_id", employeeId);
      const { data, error } = await query;
      if (!error && data) return data.map((r) => mapAvailabilityRule(r as Record<string, unknown>));
    } catch {
      // Fall through if fallback allowed
    }
  }

  if (isLocalFallbackAllowed()) {
    const local = await readLocalCollection<InterviewerAvailabilityRule>(COL_AVAILABILITY);
    return employeeId ? local.filter((r) => r.employeeId === employeeId) : local;
  }
  return [];
}

export async function saveInterviewerAvailability(
  actor: AuthActor,
  input: {
    employeeId: string;
    timezone: string;
    slotDurationMinutes: InterviewDuration;
    minNoticeHours: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    maxAdvanceDays: number;
    weeklyWindows: Array<{ dayOfWeek: number; startMinute: number; endMinute: number; isActive?: boolean }>;
  }
): Promise<{ ok: boolean; rules?: InterviewerAvailabilityRule[]; error?: string }> {
  const canManageAll = hasPermission(actor, "interviews", "manage");
  const isSelf = actor.employeeId === input.employeeId;
  if (!canManageAll && !(hasPermission(actor, "interviews", "view") && isSelf)) {
    return { ok: false, error: "Forbidden: insufficient permission to configure interviewer availability." };
  }
  if (!isValidIanaTimezone(input.timezone)) {
    return { ok: false, error: `Invalid IANA time zone: ${input.timezone}` };
  }
  if (!INTERVIEW_DURATIONS.includes(input.slotDurationMinutes)) {
    return { ok: false, error: "Unsupported default slot duration." };
  }

  const nowIso = new Date().toISOString();
  const normalizedRules: InterviewerAvailabilityRule[] = [];
  for (const w of input.weeklyWindows) {
    if (w.dayOfWeek < 0 || w.dayOfWeek > 6) continue;
    if (w.startMinute < 0 || w.endMinute > 1440 || w.endMinute <= w.startMinute) continue;
    normalizedRules.push({
      id: randomUUID(),
      employeeId: input.employeeId,
      timezone: input.timezone,
      dayOfWeek: w.dayOfWeek,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
      slotDurationMinutes: input.slotDurationMinutes,
      minNoticeHours: Math.max(0, Math.min(168, Math.round(input.minNoticeHours))),
      bufferBeforeMinutes: Math.max(0, Math.min(60, Math.round(input.bufferBeforeMinutes))),
      bufferAfterMinutes: Math.max(0, Math.min(60, Math.round(input.bufferAfterMinutes))),
      maxAdvanceDays: Math.max(1, Math.min(90, Math.round(input.maxAdvanceDays))),
      isActive: w.isActive !== false,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error: delErr } = await supabase
      .from("interviewer_availability")
      .delete()
      .eq("employee_id", input.employeeId);
    if (delErr) {
      return { ok: false, error: `Failed to update availability rules: ${delErr.message}` };
    }
    if (normalizedRules.length > 0) {
      const { error: insErr } = await supabase.from("interviewer_availability").insert(
        normalizedRules.map((r) => ({
          id: r.id,
          employee_id: r.employeeId,
          timezone: r.timezone,
          day_of_week: r.dayOfWeek,
          start_minute: r.startMinute,
          end_minute: r.endMinute,
          slot_duration_minutes: r.slotDurationMinutes,
          min_notice_hours: r.minNoticeHours,
          buffer_before_minutes: r.bufferBeforeMinutes,
          buffer_after_minutes: r.bufferAfterMinutes,
          max_advance_days: r.maxAdvanceDays,
          is_active: r.isActive,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
        }))
      );
      if (insErr) {
        return { ok: false, error: `Failed to save availability rules: ${insErr.message}` };
      }
    }
  } else if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<InterviewerAvailabilityRule>(COL_AVAILABILITY);
    const others = existing.filter((r) => r.employeeId !== input.employeeId);
    await writeLocalCollection(COL_AVAILABILITY, [...others, ...normalizedRules]);
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    action: "interviews.availability.updated",
    module: "interviews",
    entityType: "interviewer_availability",
    entityId: input.employeeId,
    outcome: "allowed",
    summary: `Updated interviewer availability (${normalizedRules.length} windows, ${input.timezone}).`,
    metadata: {
      timezone: input.timezone,
      windowCount: normalizedRules.length,
      slotDurationMinutes: input.slotDurationMinutes,
    },
  });

  return { ok: true, rules: normalizedRules };
}

export async function listAvailabilityExceptions(
  employeeId?: string
): Promise<InterviewerAvailabilityException[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      let query = supabase
        .from("interviewer_availability_exceptions")
        .select("*")
        .order("exception_date", { ascending: true });
      if (employeeId) query = query.eq("employee_id", employeeId);
      const { data, error } = await query;
      if (!error && data) return data.map((r) => mapException(r as Record<string, unknown>));
    } catch {
      // Fall through
    }
  }

  if (isLocalFallbackAllowed()) {
    const local = await readLocalCollection<InterviewerAvailabilityException>(COL_EXCEPTIONS);
    return employeeId ? local.filter((e) => e.employeeId === employeeId) : local;
  }
  return [];
}

export async function createAvailabilityException(
  actor: AuthActor,
  input: {
    employeeId: string;
    exceptionDate: string;
    isUnavailable?: boolean;
    startMinute?: number | null;
    endMinute?: number | null;
    reason?: string;
  }
): Promise<{ ok: boolean; exception?: InterviewerAvailabilityException; error?: string }> {
  const canManageAll = hasPermission(actor, "interviews", "manage");
  const isSelf = actor.employeeId === input.employeeId;
  if (!canManageAll && !(hasPermission(actor, "interviews", "view") && isSelf)) {
    return { ok: false, error: "Forbidden: insufficient permission to block availability dates." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.exceptionDate)) {
    return { ok: false, error: "exceptionDate must be formatted YYYY-MM-DD." };
  }

  const record: InterviewerAvailabilityException = {
    id: randomUUID(),
    employeeId: input.employeeId,
    exceptionDate: input.exceptionDate,
    isUnavailable: input.isUnavailable !== false,
    startMinute: input.startMinute ?? null,
    endMinute: input.endMinute ?? null,
    reason: (input.reason || "").trim().slice(0, 240),
    createdBy: actor.email,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("interviewer_availability_exceptions").insert({
      id: record.id,
      employee_id: record.employeeId,
      exception_date: record.exceptionDate,
      is_unavailable: record.isUnavailable,
      start_minute: record.startMinute,
      end_minute: record.endMinute,
      reason: record.reason,
      created_by: record.createdBy,
      created_at: record.createdAt,
    });
    if (error) return { ok: false, error: error.message };
  } else if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<InterviewerAvailabilityException>(COL_EXCEPTIONS);
    await writeLocalCollection(COL_EXCEPTIONS, [...existing, record]);
  }

  return { ok: true, exception: record };
}

export async function deleteAvailabilityException(
  actor: AuthActor,
  exceptionId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!hasPermission(actor, "interviews", "manage") && !hasPermission(actor, "interviews", "view")) {
    return { ok: false, error: "Forbidden" };
  }

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: target } = await supabase
      .from("interviewer_availability_exceptions")
      .select("employee_id")
      .eq("id", exceptionId)
      .maybeSingle();
    if (!target) return { ok: false, error: "Exception not found." };
    if (
      !hasPermission(actor, "interviews", "manage") &&
      String(target.employee_id) !== actor.employeeId
    ) {
      return { ok: false, error: "Forbidden" };
    }
    const { error } = await supabase
      .from("interviewer_availability_exceptions")
      .delete()
      .eq("id", exceptionId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<InterviewerAvailabilityException>(COL_EXCEPTIONS);
    const target = existing.find((e) => e.id === exceptionId);
    if (!target) return { ok: false, error: "Exception not found." };
    if (!hasPermission(actor, "interviews", "manage") && target.employeeId !== actor.employeeId) {
      return { ok: false, error: "Forbidden" };
    }
    await writeLocalCollection(
      COL_EXCEPTIONS,
      existing.filter((e) => e.id !== exceptionId)
    );
    return { ok: true };
  }
  return { ok: false, error: "Storage unavailable." };
}

async function listConfirmedAppointmentsForInterviewer(
  employeeId: string
): Promise<InterviewAppointmentRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("interview_appointments")
        .select("*")
        .eq("interviewer_employee_id", employeeId)
        .eq("status", "confirmed");
      if (!error && data) return data.map((r) => mapAppointment(r as Record<string, unknown>));
    } catch {
      // Fall through
    }
  }
  if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<InterviewAppointmentRecord>(COL_APPOINTMENTS);
    return all.filter((a) => a.interviewerEmployeeId === employeeId && a.status === "confirmed");
  }
  return [];
}

export async function getAvailableSlotsForInterviewer(params: {
  employeeId: string;
  durationMinutes: number;
  candidateTimezone: string;
  windowStartDate?: string | null;
  windowEndDate?: string | null;
  excludeAppointmentId?: string | null;
  locale?: "en" | "ar";
}): Promise<{
  slots: AvailableInterviewSlot[];
  hasConfiguredRules: boolean;
  interviewerTimezone: string;
  externalCalendar: ReturnType<typeof getExternalCalendarAdapterStatus>;
}> {
  const [rules, exceptions, confirmed] = await Promise.all([
    listInterviewerAvailability(params.employeeId),
    listAvailabilityExceptions(params.employeeId),
    listConfirmedAppointmentsForInterviewer(params.employeeId),
  ]);

  const activeRules = rules.filter((r) => r.isActive);
  const interviewerTimezone = activeRules[0]?.timezone || "UTC";
  const slots = computeAvailableInterviewSlots({
    rules: activeRules,
    exceptions,
    existingConfirmedAppointments: confirmed,
    durationMinutes: params.durationMinutes,
    candidateTimezone: params.candidateTimezone,
    windowStartDate: params.windowStartDate,
    windowEndDate: params.windowEndDate,
    excludeAppointmentId: params.excludeAppointmentId,
    locale: params.locale,
  });

  return {
    slots,
    hasConfiguredRules: activeRules.length > 0,
    interviewerTimezone,
    externalCalendar: getExternalCalendarAdapterStatus(),
  };
}

// ---------- Persistent Reminder Scheduling ----------

async function cancelPendingRemindersForAppointment(appointmentId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase
        .from("interview_reminders")
        .update({ status: "canceled", updated_at: nowIso })
        .eq("appointment_id", appointmentId)
        .eq("status", "pending");
    } catch {
      // Non-fatal
    }
  }
  if (isLocalFallbackAllowed()) {
    const reminders = await readLocalCollection<InterviewReminderRecord>(COL_REMINDERS);
    const updated = reminders.map((r) =>
      r.appointmentId === appointmentId && r.status === "pending"
        ? { ...r, status: "canceled" as const, updatedAt: nowIso }
        : r
    );
    await writeLocalCollection(COL_REMINDERS, updated);
  }
}

async function scheduleRemindersForAppointment(
  appointment: InterviewAppointmentRecord
): Promise<void> {
  await cancelPendingRemindersForAppointment(appointment.id);

  const startMs = new Date(appointment.scheduledStartUtc).getTime();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const specs: Array<{ kind: "24h" | "1h"; offsetMs: number }> = [
    { kind: "24h", offsetMs: 24 * 3600_000 },
    { kind: "1h", offsetMs: 1 * 3600_000 },
  ];

  const toInsert: InterviewReminderRecord[] = [];
  for (const spec of specs) {
    const scheduledForMs = startMs - spec.offsetMs;
    if (scheduledForMs <= nowMs + 60_000) continue; // Already passed
    toInsert.push({
      id: randomUUID(),
      appointmentId: appointment.id,
      reminderKind: spec.kind,
      scheduledForUtc: new Date(scheduledForMs).toISOString(),
      status: "pending",
      idempotencyKey: `rem-${appointment.id}-${spec.kind}-${appointment.rescheduleCount}`,
      attempts: 0,
      maxAttempts: 3,
      providerMessageId: null,
      lastError: null,
      sentAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (toInsert.length === 0) return;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from("interview_reminders").upsert(
        toInsert.map((r) => ({
          id: r.id,
          appointment_id: r.appointmentId,
          reminder_kind: r.reminderKind,
          scheduled_for_utc: r.scheduledForUtc,
          status: r.status,
          idempotency_key: r.idempotencyKey,
          attempts: r.attempts,
          max_attempts: r.maxAttempts,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
        })),
        { onConflict: "idempotency_key" }
      );
    } catch {
      // Non-fatal
    }
  }
  if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<InterviewReminderRecord>(COL_REMINDERS);
    const existingKeys = new Set(existing.map((r) => r.idempotencyKey));
    const fresh = toInsert.filter((r) => !existingKeys.has(r.idempotencyKey));
    await writeLocalCollection(COL_REMINDERS, [...existing, ...fresh]);
  }
}

// ---------- Non-Destructive Application Stage Sync ----------

async function advanceApplicationToInterviewIfEligible(
  applicationReferenceId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: app } = await supabase
      .from("job_applications")
      .select("id, status")
      .eq("reference_id", applicationReferenceId)
      .maybeSingle();
    if (!app) return;
    const currentStatus = String(app.status || "");
    if (["new", "reviewing", "shortlisted"].includes(currentStatus)) {
      await supabase
        .from("job_applications")
        .update({ status: "interview" })
        .eq("id", app.id);
    }
  } catch {
    // Non-fatal
  }
}

// ---------- Admin: Create & Send Interview Invitation ----------

export interface CreateInterviewInvitationInput {
  applicationReferenceId: string;
  applicationId?: string | null;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  interviewStage?: string;
  interviewType: InterviewType;
  interviewFormat: InterviewFormat;
  durationMinutes: InterviewDuration;
  interviewerEmployeeId: string;
  availabilityWindowStart?: string | null;
  availabilityWindowEnd?: string | null;
  meetingUrl?: string | null;
  locationDetails?: string | null;
  personalizedMessage?: string;
  locale?: "en" | "ar";
  expiresInDays?: number;
  skipOutboundEmail?: boolean; // For controlled automated tests that verify persistence without hitting Resend
}

export async function createAndSendInterviewInvitation(
  actor: AuthActor,
  input: CreateInterviewInvitationInput
): Promise<{
  ok: boolean;
  invitation?: SafeInterviewInvitation;
  schedulingUrl?: string;
  delivery?: {
    status: InvitationDeliveryStatus;
    messageId?: string;
    error?: string;
    notConfigured?: boolean;
  };
  error?: string;
}> {
  if (!hasPermission(actor, "interviews", "create")) {
    return { ok: false, error: "Forbidden: missing interviews:create permission." };
  }

  if (!INTERVIEW_TYPES.includes(input.interviewType)) {
    return { ok: false, error: "Invalid interview type." };
  }
  if (!INTERVIEW_FORMATS.includes(input.interviewFormat)) {
    return { ok: false, error: "Invalid interview format." };
  }
  if (!INTERVIEW_DURATIONS.includes(input.durationMinutes)) {
    return { ok: false, error: "Invalid interview duration." };
  }

  const candidateEmail = input.candidateEmail.trim().toLowerCase();
  if (!candidateEmail || !candidateEmail.includes("@")) {
    return { ok: false, error: "A valid candidate email address is required." };
  }

  // Resolve interviewer from real employee directory
  const employees = await listEmployees();
  const interviewer = employees.find((e) => e.id === input.interviewerEmployeeId);
  if (!interviewer) {
    return {
      ok: false,
      error: "Selected interviewer was not found in the active HIRZEXA employee directory.",
    };
  }

  const rules = await listInterviewerAvailability(interviewer.id);
  const activeRules = rules.filter((r) => r.isActive);
  if (activeRules.length === 0) {
    return {
      ok: false,
      error: `Interviewer ${interviewer.fullName} has no configured availability rules yet. Configure working hours in /admin/interviews before sending an invitation.`,
    };
  }

  const interviewerTimezone = activeRules[0].timezone || "UTC";
  const expiresInDays = Math.max(1, Math.min(30, Number(input.expiresInDays || 7)));
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresInDays * 86400_000).toISOString();
  const rawToken = generateInterviewToken();
  const tokenHash = hashInterviewToken(rawToken);
  const locale = input.locale === "ar" ? "ar" : "en";

  // Lookup application UUID if Supabase is configured and not explicitly provided
  let applicationId: string | null = input.applicationId || null;
  if (!applicationId && isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: appRow } = await supabase
        .from("job_applications")
        .select("id")
        .eq("reference_id", input.applicationReferenceId)
        .maybeSingle();
      if (appRow?.id) applicationId = String(appRow.id);
    } catch {
      // Keep nullable
    }
  }

  const invitation: InterviewInvitationRecord = {
    id: randomUUID(),
    applicationId,
    applicationReferenceId: input.applicationReferenceId.trim(),
    candidateName: input.candidateName.trim(),
    candidateEmail,
    positionTitle: input.positionTitle.trim(),
    interviewStage: (input.interviewStage || input.interviewType).trim(),
    interviewType: input.interviewType,
    interviewFormat: input.interviewFormat,
    durationMinutes: input.durationMinutes,
    interviewerEmployeeId: interviewer.id,
    interviewerName: interviewer.fullName,
    interviewerEmail: interviewer.email,
    interviewerTimezone,
    availabilityWindowStart: input.availabilityWindowStart || null,
    availabilityWindowEnd: input.availabilityWindowEnd || null,
    meetingUrl: input.meetingUrl?.trim() || null,
    locationDetails: input.locationDetails?.trim() || null,
    personalizedMessage: (input.personalizedMessage || "").trim().slice(0, 1500),
    locale,
    tokenHash,
    status: "pending_send",
    emailDeliveryStatus: "created",
    providerMessageId: null,
    deliveryError: null,
    expiresAt,
    sentAt: null,
    deliveredAt: null,
    scheduledAt: null,
    revokedAt: null,
    createdBy: actor.email,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const baseUrl = getSafeSchedulingBaseUrl();
  const schedulingUrl = buildCandidateSchedulingUrl(rawToken, baseUrl);
  const template = buildInterviewInvitationEmail({
    candidateName: invitation.candidateName,
    candidateEmail: invitation.candidateEmail,
    positionTitle: invitation.positionTitle,
    interviewType: invitation.interviewType,
    interviewFormat: invitation.interviewFormat,
    durationMinutes: invitation.durationMinutes,
    interviewerName: invitation.interviewerName,
    schedulingUrl,
    expiresAtUtc: invitation.expiresAt,
    personalizedMessage: invitation.personalizedMessage,
    locale: invitation.locale,
    publicBaseUrl: baseUrl,
  });

  // Send via existing Resend infrastructure (unless explicitly skipped in offline test)
  const idempotencyKey = `int-inv-${invitation.id}-initial`;
  let deliveryStatus: InvitationDeliveryStatus = "created";
  let providerMessageId: string | null = null;
  let deliveryError: string | null = null;
  let sentAt: string | null = null;
  let notConfigured = false;

  if (input.skipOutboundEmail) {
    deliveryStatus = "created";
    invitation.status = "sent";
    sentAt = nowIso;
  } else {
    const sendResult = await sendTransactionalEmail(template, {
      idempotencyKey,
      tags: [
        { name: "category", value: "interview_invitation" },
        { name: "invitation_id", value: invitation.id },
      ],
    });
    deliveryStatus = sendResult.status;
    providerMessageId = sendResult.messageId || null;
    deliveryError = sendResult.error || null;
    sentAt = sendResult.sentAt || null;
    notConfigured = Boolean(sendResult.notConfigured);
    invitation.status = sendResult.ok ? "sent" : "pending_send";
  }

  invitation.emailDeliveryStatus = deliveryStatus;
  invitation.providerMessageId = providerMessageId;
  invitation.deliveryError = deliveryError;
  invitation.sentAt = sentAt;
  invitation.updatedAt = new Date().toISOString();

  // Persist invitation
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("interview_invitations").insert({
      id: invitation.id,
      application_id: invitation.applicationId,
      application_reference_id: invitation.applicationReferenceId,
      candidate_name: invitation.candidateName,
      candidate_email: invitation.candidateEmail,
      position_title: invitation.positionTitle,
      interview_stage: invitation.interviewStage,
      interview_type: invitation.interviewType,
      interview_format: invitation.interviewFormat,
      duration_minutes: invitation.durationMinutes,
      interviewer_employee_id: invitation.interviewerEmployeeId,
      interviewer_name: invitation.interviewerName,
      interviewer_email: invitation.interviewerEmail,
      interviewer_timezone: invitation.interviewerTimezone,
      availability_window_start: invitation.availabilityWindowStart,
      availability_window_end: invitation.availabilityWindowEnd,
      meeting_url: invitation.meetingUrl,
      location_details: invitation.locationDetails,
      personalized_message: invitation.personalizedMessage,
      locale: invitation.locale,
      token_hash: invitation.tokenHash,
      status: invitation.status,
      email_delivery_status: invitation.emailDeliveryStatus,
      provider_message_id: invitation.providerMessageId,
      delivery_error: invitation.deliveryError,
      expires_at: invitation.expiresAt,
      sent_at: invitation.sentAt,
      created_by: invitation.createdBy,
      created_at: invitation.createdAt,
      updated_at: invitation.updatedAt,
    });
    if (error) {
      return { ok: false, error: `Database error storing invitation: ${error.message}` };
    }
  } else if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
    await writeLocalCollection(COL_INVITATIONS, [invitation, ...existing]);
  }

  await recordInterviewEmailEvent({
    id: randomUUID(),
    invitationId: invitation.id,
    appointmentId: null,
    templateType: "invitation",
    recipientEmail: invitation.candidateEmail,
    idempotencyKey,
    provider: "resend",
    providerMessageId,
    deliveryStatus,
    lastWebhookEvent: null,
    errorDetail: deliveryError,
    sentAt,
    deliveredAt: null,
    createdAt: nowIso,
    updatedAt: invitation.updatedAt,
  });

  await recordInterviewActivity({
    invitationId: invitation.id,
    applicationReferenceId: invitation.applicationReferenceId,
    eventType: "invitation_sent",
    actorRef: actor.email,
    summary: `Interview invitation created for ${invitation.candidateName} (${invitation.positionTitle}) — email status: ${deliveryStatus}.`,
    metadata: {
      interviewType: invitation.interviewType,
      interviewerEmployeeId: invitation.interviewerEmployeeId,
      deliveryStatus,
    },
  });

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    action: "interviews.invitation.created",
    module: "interviews",
    entityType: "interview_invitation",
    entityId: invitation.id,
    outcome: "allowed",
    summary: `Created interview invitation for ${invitation.candidateName} (${invitation.positionTitle}).`,
    metadata: {
      applicationReferenceId: invitation.applicationReferenceId,
      candidateEmail: invitation.candidateEmail,
      interviewerEmployeeId: invitation.interviewerEmployeeId,
      deliveryStatus,
    },
  });

  await emitBusinessEvent({
    eventType: "interview.invited",
    module: "interviews",
    actorRef: actor.email,
    entityType: "interview",
    entityId: invitation.id,
    title: `Interview invited: ${invitation.candidateName}`,
    summary: `${invitation.positionTitle} (${invitation.interviewType}) with ${invitation.interviewerName}.`,
    sourceHref: "/admin/interviews",
    idempotencyKey: `biz-int-inv-${invitation.id}`,
  });

  return {
    ok: true,
    invitation: stripTokenHash(invitation),
    schedulingUrl,
    delivery: {
      status: deliveryStatus,
      messageId: providerMessageId || undefined,
      error: deliveryError || undefined,
      notConfigured,
    },
  };
}

// ---------- Admin: Resend & Revoke Invitation ----------

async function findInvitationById(id: string): Promise<InterviewInvitationRecord | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("interview_invitations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? mapInvitation(data as Record<string, unknown>) : null;
  }
  if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
    return all.find((i) => i.id === id) || null;
  }
  return null;
}

export async function resendInterviewInvitation(
  actor: AuthActor,
  invitationId: string,
  options?: { expiresInDays?: number; skipOutboundEmail?: boolean }
): Promise<{
  ok: boolean;
  invitation?: SafeInterviewInvitation;
  schedulingUrl?: string;
  error?: string;
}> {
  if (!hasPermission(actor, "interviews", "edit") && !hasPermission(actor, "interviews", "create")) {
    return { ok: false, error: "Forbidden" };
  }
  const existing = await findInvitationById(invitationId);
  if (!existing) return { ok: false, error: "Interview invitation not found." };
  if (existing.status === "scheduled") {
    return { ok: false, error: "This invitation has already been scheduled." };
  }
  if (existing.status === "revoked") {
    return { ok: false, error: "Cannot resend a revoked invitation. Create a new invitation instead." };
  }

  const rawToken = generateInterviewToken();
  const tokenHash = hashInterviewToken(rawToken);
  const expiresAt = new Date(
    Date.now() + Math.max(1, Math.min(30, options?.expiresInDays || 7)) * 86400_000
  ).toISOString();
  const baseUrl = getSafeSchedulingBaseUrl();
  const schedulingUrl = buildCandidateSchedulingUrl(rawToken, baseUrl);
  const template = buildInterviewInvitationEmail({
    candidateName: existing.candidateName,
    candidateEmail: existing.candidateEmail,
    positionTitle: existing.positionTitle,
    interviewType: existing.interviewType,
    interviewFormat: existing.interviewFormat,
    durationMinutes: existing.durationMinutes,
    interviewerName: existing.interviewerName,
    schedulingUrl,
    expiresAtUtc: expiresAt,
    personalizedMessage: existing.personalizedMessage,
    locale: existing.locale,
    publicBaseUrl: baseUrl,
  });

  const resendNonce = randomUUID().slice(0, 8);
  const idempotencyKey = `int-inv-${existing.id}-resend-${resendNonce}`;
  let deliveryStatus: InvitationDeliveryStatus = "created";
  let providerMessageId: string | null = null;
  let deliveryError: string | null = null;
  let sentAt: string | null = new Date().toISOString();

  if (!options?.skipOutboundEmail) {
    const sendResult = await sendTransactionalEmail(template, {
      idempotencyKey,
      tags: [
        { name: "category", value: "interview_invitation_resend" },
        { name: "invitation_id", value: existing.id },
      ],
    });
    deliveryStatus = sendResult.status;
    providerMessageId = sendResult.messageId || null;
    deliveryError = sendResult.error || null;
    sentAt = sendResult.sentAt || null;
  }

  const nowIso = new Date().toISOString();
  const updated: InterviewInvitationRecord = {
    ...existing,
    tokenHash,
    status: deliveryStatus === "delivery_failed" ? "pending_send" : "sent",
    emailDeliveryStatus: deliveryStatus,
    providerMessageId,
    deliveryError,
    expiresAt,
    sentAt,
    updatedAt: nowIso,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("interview_invitations")
      .update({
        token_hash: updated.tokenHash,
        status: updated.status,
        email_delivery_status: updated.emailDeliveryStatus,
        provider_message_id: updated.providerMessageId,
        delivery_error: updated.deliveryError,
        expires_at: updated.expiresAt,
        sent_at: updated.sentAt,
        updated_at: updated.updatedAt,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
    await writeLocalCollection(
      COL_INVITATIONS,
      all.map((i) => (i.id === existing.id ? updated : i))
    );
  }

  await recordInterviewEmailEvent({
    id: randomUUID(),
    invitationId: existing.id,
    appointmentId: null,
    templateType: "invitation",
    recipientEmail: existing.candidateEmail,
    idempotencyKey,
    provider: "resend",
    providerMessageId,
    deliveryStatus,
    lastWebhookEvent: null,
    errorDetail: deliveryError,
    sentAt,
    deliveredAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await recordInterviewActivity({
    invitationId: existing.id,
    applicationReferenceId: existing.applicationReferenceId,
    eventType: "invitation_resent",
    actorRef: actor.email,
    summary: `Interview invitation resent with a freshly rotated scheduling link (${deliveryStatus}).`,
  });

  return { ok: true, invitation: stripTokenHash(updated), schedulingUrl };
}

export async function revokeInterviewInvitation(
  actor: AuthActor,
  invitationId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!hasPermission(actor, "interviews", "edit") && !hasPermission(actor, "interviews", "manage")) {
    return { ok: false, error: "Forbidden" };
  }
  const existing = await findInvitationById(invitationId);
  if (!existing) return { ok: false, error: "Interview invitation not found." };

  const nowIso = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("interview_invitations")
      .update({ status: "revoked", revoked_at: nowIso, updated_at: nowIso })
      .eq("id", invitationId);
    if (error) return { ok: false, error: error.message };
  } else if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
    await writeLocalCollection(
      COL_INVITATIONS,
      all.map((i) =>
        i.id === invitationId ? { ...i, status: "revoked" as const, revokedAt: nowIso, updatedAt: nowIso } : i
      )
    );
  }

  await recordInterviewActivity({
    invitationId,
    applicationReferenceId: existing.applicationReferenceId,
    eventType: "invitation_revoked",
    actorRef: actor.email,
    summary: `Interview invitation revoked${reason ? `: ${reason}` : "."}`,
  });

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    action: "interviews.invitation.revoked",
    module: "interviews",
    entityType: "interview_invitation",
    entityId: invitationId,
    outcome: "allowed",
    summary: `Revoked interview invitation ${invitationId}.`,
    metadata: { reason: reason || "" },
  });

  return { ok: true };
}

// ---------- Public Candidate Scheduling Lookup & Atomic Booking ----------

async function findInvitationByTokenHash(
  tokenHash: string
): Promise<{
  invitation: InterviewInvitationRecord | null;
  appointment: InterviewAppointmentRecord | null;
}> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("lookup_interview_invitation_by_hash", {
      p_token_hash: tokenHash,
    });
    if (!error && data && typeof data === "object") {
      const payload = data as {
        found?: boolean;
        invitation?: Record<string, unknown>;
        appointment?: Record<string, unknown> | null;
      };
      if (payload.found && payload.invitation) {
        return {
          invitation: mapInvitation({ ...payload.invitation, token_hash: tokenHash }),
          appointment: payload.appointment ? mapAppointment(payload.appointment) : null,
        };
      }
      return { invitation: null, appointment: null };
    }
  }

  if (isLocalFallbackAllowed()) {
    const invitations = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
    const invitation = invitations.find((i) => i.tokenHash === tokenHash) || null;
    if (!invitation) return { invitation: null, appointment: null };
    const appointments = await readLocalCollection<InterviewAppointmentRecord>(COL_APPOINTMENTS);
    const appointment =
      appointments
        .filter((a) => a.invitationId === invitation.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
    return { invitation, appointment };
  }

  return { invitation: null, appointment: null };
}

export async function lookupPublicInterviewByToken(
  rawToken: string,
  candidateTimezone?: string
): Promise<
  | { state: "invalid" }
  | { state: "revoked"; positionTitle: string; locale: "en" | "ar" }
  | { state: "expired"; positionTitle: string; locale: "en" | "ar" }
  | {
      state: "scheduled";
      invitation: {
        id: string;
        candidateName: string;
        positionTitle: string;
        interviewStage: string;
        interviewType: InterviewType;
        interviewFormat: InterviewFormat;
        durationMinutes: InterviewDuration;
        interviewerName: string;
        interviewerTimezone: string;
        personalizedMessage: string;
        locale: "en" | "ar";
        expiresAt: string;
      };
      appointment: {
        id: string;
        scheduledStartUtc: string;
        scheduledEndUtc: string;
        candidateTimezone: string;
        meetingUrl?: string | null;
        locationDetails?: string | null;
        status: InterviewAppointmentStatus;
        rescheduleCount: number;
      };
      calendarLinks: { googleUrl: string; outlookUrl: string };
      availableSlots: AvailableInterviewSlot[];
    }
  | {
      state: "open";
      invitation: {
        id: string;
        candidateName: string;
        positionTitle: string;
        interviewStage: string;
        interviewType: InterviewType;
        interviewFormat: InterviewFormat;
        durationMinutes: InterviewDuration;
        interviewerName: string;
        interviewerTimezone: string;
        personalizedMessage: string;
        locale: "en" | "ar";
        expiresAt: string;
      };
      availableSlots: AvailableInterviewSlot[];
      hasConfiguredAvailability: boolean;
    }
> {
  if (!rawToken || rawToken.trim().length < 16) {
    return { state: "invalid" };
  }
  const tokenHash = hashInterviewToken(rawToken);
  const { invitation, appointment } = await findInvitationByTokenHash(tokenHash);
  if (!invitation) return { state: "invalid" };

  if (invitation.status === "revoked") {
    return { state: "revoked", positionTitle: invitation.positionTitle, locale: invitation.locale };
  }

  const safeTz =
    candidateTimezone && isValidIanaTimezone(candidateTimezone)
      ? candidateTimezone
      : appointment?.candidateTimezone || invitation.interviewerTimezone || "UTC";

  const publicInvitation = {
    id: invitation.id,
    candidateName: invitation.candidateName,
    positionTitle: invitation.positionTitle,
    interviewStage: invitation.interviewStage,
    interviewType: invitation.interviewType,
    interviewFormat: invitation.interviewFormat,
    durationMinutes: invitation.durationMinutes,
    interviewerName: invitation.interviewerName,
    interviewerTimezone: invitation.interviewerTimezone,
    personalizedMessage: invitation.personalizedMessage,
    locale: invitation.locale,
    expiresAt: invitation.expiresAt,
  };

  // If already scheduled and not canceled, return scheduled state (+ reschedule slots)
  if (appointment && appointment.status === "confirmed") {
    const slotData = await getAvailableSlotsForInterviewer({
      employeeId: invitation.interviewerEmployeeId,
      durationMinutes: invitation.durationMinutes,
      candidateTimezone: safeTz,
      windowStartDate: invitation.availabilityWindowStart,
      windowEndDate: invitation.availabilityWindowEnd,
      excludeAppointmentId: appointment.id,
      locale: invitation.locale,
    });
    return {
      state: "scheduled",
      invitation: publicInvitation,
      appointment: {
        id: appointment.id,
        scheduledStartUtc: appointment.scheduledStartUtc,
        scheduledEndUtc: appointment.scheduledEndUtc,
        candidateTimezone: appointment.candidateTimezone,
        meetingUrl: appointment.meetingUrl || null,
        locationDetails: appointment.locationDetails || null,
        status: appointment.status,
        rescheduleCount: appointment.rescheduleCount,
      },
      calendarLinks: buildInterviewCalendarLinks(appointment),
      availableSlots: slotData.slots,
    };
  }

  // Check expiration for unscheduled invitations
  if (invitation.status === "expired" || new Date(invitation.expiresAt).getTime() <= Date.now()) {
    return { state: "expired", positionTitle: invitation.positionTitle, locale: invitation.locale };
  }

  const slotData = await getAvailableSlotsForInterviewer({
    employeeId: invitation.interviewerEmployeeId,
    durationMinutes: invitation.durationMinutes,
    candidateTimezone: safeTz,
    windowStartDate: invitation.availabilityWindowStart,
    windowEndDate: invitation.availabilityWindowEnd,
    locale: invitation.locale,
  });

  return {
    state: "open",
    invitation: publicInvitation,
    availableSlots: slotData.slots,
    hasConfiguredAvailability: slotData.hasConfiguredRules,
  };
}

export async function bookPublicInterviewSlot(input: {
  rawToken: string;
  slotStartUtc: string;
  candidateTimezone: string;
  skipOutboundEmail?: boolean;
}): Promise<{
  ok: boolean;
  code?: "INVALID_TOKEN" | "EXPIRED" | "REVOKED" | "SLOT_UNAVAILABLE" | "SLOT_CONFLICT" | "ERROR";
  idempotent?: boolean;
  appointment?: InterviewAppointmentRecord;
  calendarLinks?: { googleUrl: string; outlookUrl: string };
  error?: string;
}> {
  if (!input.rawToken || input.rawToken.trim().length < 16) {
    return { ok: false, code: "INVALID_TOKEN", error: "Invalid scheduling token." };
  }
  const safeTz = isValidIanaTimezone(input.candidateTimezone) ? input.candidateTimezone : "UTC";
  const tokenHash = hashInterviewToken(input.rawToken);
  const { invitation, appointment: existingAppt } = await findInvitationByTokenHash(tokenHash);
  if (!invitation) {
    return { ok: false, code: "INVALID_TOKEN", error: "This scheduling link is invalid." };
  }
  if (invitation.status === "revoked") {
    return { ok: false, code: "REVOKED", error: "This scheduling link is no longer active." };
  }

  // Idempotency: repeated click for the exact same confirmed slot returns existing appointment
  if (existingAppt && existingAppt.status === "confirmed") {
    const requestedMs = new Date(input.slotStartUtc).getTime();
    const existingMs = new Date(existingAppt.scheduledStartUtc).getTime();
    if (Math.abs(requestedMs - existingMs) < 1000) {
      return {
        ok: true,
        idempotent: true,
        appointment: existingAppt,
        calendarLinks: buildInterviewCalendarLinks(existingAppt),
      };
    }
    return {
      ok: false,
      code: "SLOT_CONFLICT",
      error: "This interview is already confirmed. Use the reschedule option to choose another time.",
    };
  }

  if (invitation.status === "expired" || new Date(invitation.expiresAt).getTime() <= Date.now()) {
    return { ok: false, code: "EXPIRED", error: "This scheduling link has expired." };
  }

  return withInterviewerLock(invitation.interviewerEmployeeId, async () => {
    // Re-verify slot is genuinely available under interviewer's rules, buffers, and bookings
    const slotData = await getAvailableSlotsForInterviewer({
      employeeId: invitation.interviewerEmployeeId,
      durationMinutes: invitation.durationMinutes,
      candidateTimezone: safeTz,
      windowStartDate: invitation.availabilityWindowStart,
      windowEndDate: invitation.availabilityWindowEnd,
      locale: invitation.locale,
    });

    const requestedStartMs = new Date(input.slotStartUtc).getTime();
    const matchedSlot = slotData.slots.find(
      (s) => Math.abs(new Date(s.startUtc).getTime() - requestedStartMs) < 1000
    );
    if (!matchedSlot) {
      return {
        ok: false,
        code: "SLOT_CONFLICT",
        error: "That time slot is no longer available. Please select another available slot.",
      };
    }

    const nowIso = new Date().toISOString();
    let createdAppointment: InterviewAppointmentRecord;

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("reserve_interview_slot_atomic", {
        p_token_hash: tokenHash,
        p_start_utc: matchedSlot.startUtc,
        p_end_utc: matchedSlot.endUtc,
        p_candidate_timezone: safeTz,
        p_reschedule_appointment_id: null,
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("SLOT_CONFLICT") || msg.includes("exclusion")) {
          return {
            ok: false,
            code: "SLOT_CONFLICT",
            error: "That time slot was just booked. Please select another available slot.",
          };
        }
        return { ok: false, code: "ERROR", error: "Unable to confirm slot right now." };
      }

      const rpcPayload = data as {
        ok?: boolean;
        error?: string;
        idempotent?: boolean;
        appointment?: Record<string, unknown>;
      };
      if (!rpcPayload?.ok || !rpcPayload.appointment) {
        const code = rpcPayload?.error === "SLOT_CONFLICT" ? "SLOT_CONFLICT" : "ERROR";
        return {
          ok: false,
          code,
          error:
            code === "SLOT_CONFLICT"
              ? "That time slot was just booked. Please select another available slot."
              : "Unable to confirm slot right now.",
        };
      }
      createdAppointment = mapAppointment(rpcPayload.appointment);
      if (rpcPayload.idempotent) {
        return {
          ok: true,
          idempotent: true,
          appointment: createdAppointment,
          calendarLinks: buildInterviewCalendarLinks(createdAppointment),
        };
      }
    } else if (isLocalFallbackAllowed()) {
      const allAppts = await readLocalCollection<InterviewAppointmentRecord>(COL_APPOINTMENTS);
      const startMs = new Date(matchedSlot.startUtc).getTime();
      const endMs = new Date(matchedSlot.endUtc).getTime();

      // Re-check overlap inside mutex
      const overlap = allAppts.some(
        (a) =>
          a.interviewerEmployeeId === invitation.interviewerEmployeeId &&
          a.status === "confirmed" &&
          new Date(a.scheduledStartUtc).getTime() < endMs &&
          new Date(a.scheduledEndUtc).getTime() > startMs
      );
      if (overlap) {
        return {
          ok: false,
          code: "SLOT_CONFLICT",
          error: "That time slot was just booked. Please select another available slot.",
        };
      }

      createdAppointment = {
        id: randomUUID(),
        invitationId: invitation.id,
        applicationId: invitation.applicationId || null,
        applicationReferenceId: invitation.applicationReferenceId,
        candidateName: invitation.candidateName,
        candidateEmail: invitation.candidateEmail,
        positionTitle: invitation.positionTitle,
        interviewStage: invitation.interviewStage,
        interviewType: invitation.interviewType,
        interviewFormat: invitation.interviewFormat,
        durationMinutes: invitation.durationMinutes,
        interviewerEmployeeId: invitation.interviewerEmployeeId,
        interviewerName: invitation.interviewerName,
        interviewerEmail: invitation.interviewerEmail,
        scheduledStartUtc: matchedSlot.startUtc,
        scheduledEndUtc: matchedSlot.endUtc,
        candidateTimezone: safeTz,
        interviewerTimezone: invitation.interviewerTimezone,
        meetingUrl: invitation.meetingUrl || null,
        locationDetails: invitation.locationDetails || null,
        status: "confirmed",
        outcome: "pending",
        outcomeNotes: "",
        rescheduleCount: 0,
        canceledAt: null,
        cancelReason: null,
        externalCalendarProvider: null,
        externalCalendarEventId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await writeLocalCollection(COL_APPOINTMENTS, [createdAppointment, ...allAppts]);

      const allInvs = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
      await writeLocalCollection(
        COL_INVITATIONS,
        allInvs.map((inv) =>
          inv.id === invitation.id
            ? { ...inv, status: "scheduled" as const, scheduledAt: nowIso, updatedAt: nowIso }
            : inv
        )
      );
    } else {
      return { ok: false, code: "ERROR", error: "Storage backend unavailable." };
    }

    // Advance application stage safely (never overwrites accepted/rejected)
    await advanceApplicationToInterviewIfEligible(createdAppointment.applicationReferenceId);

    // Schedule persistent 24h & 1h reminders
    await scheduleRemindersForAppointment(createdAppointment);

    // Send confirmation email to candidate (with .ics) + notification to interviewer
    const baseUrl = getSafeSchedulingBaseUrl();
    const manageUrl = buildCandidateSchedulingUrl(input.rawToken, baseUrl);
    const icsContent = generateInterviewIcs(createdAppointment, "REQUEST");
    const icsAttachment = {
      filename: "hirzexa-interview.ics",
      content: Buffer.from(icsContent, "utf8").toString("base64"),
      content_type: "text/calendar; charset=utf-8; method=REQUEST",
    };

    if (!input.skipOutboundEmail) {
      const candidateConfirmTemplate = buildInterviewConfirmationEmail({
        candidateName: createdAppointment.candidateName,
        candidateEmail: createdAppointment.candidateEmail,
        positionTitle: createdAppointment.positionTitle,
        interviewType: createdAppointment.interviewType,
        interviewFormat: createdAppointment.interviewFormat,
        durationMinutes: createdAppointment.durationMinutes,
        interviewerName: createdAppointment.interviewerName,
        scheduledStartUtc: createdAppointment.scheduledStartUtc,
        candidateTimezone: createdAppointment.candidateTimezone,
        manageUrl,
        meetingUrl: createdAppointment.meetingUrl,
        locationDetails: createdAppointment.locationDetails,
        locale: invitation.locale,
        publicBaseUrl: baseUrl,
      });

      const confirmKey = `int-conf-${createdAppointment.id}-0`;
      const confirmRes = await sendTransactionalEmail(candidateConfirmTemplate, {
        idempotencyKey: confirmKey,
        attachments: [icsAttachment],
        tags: [
          { name: "category", value: "interview_confirmation" },
          { name: "appointment_id", value: createdAppointment.id },
        ],
      });

      await recordInterviewEmailEvent({
        id: randomUUID(),
        invitationId: invitation.id,
        appointmentId: createdAppointment.id,
        templateType: "confirmation",
        recipientEmail: createdAppointment.candidateEmail,
        idempotencyKey: confirmKey,
        provider: "resend",
        providerMessageId: confirmRes.messageId || null,
        deliveryStatus: confirmRes.status,
        lastWebhookEvent: null,
        errorDetail: confirmRes.error || null,
        sentAt: confirmRes.sentAt || null,
        deliveredAt: null,
        createdAt: nowIso,
        updatedAt: new Date().toISOString(),
      });

      const interviewerTemplate = buildInterviewerNotificationEmail({
        event: "scheduled",
        interviewerName: createdAppointment.interviewerName,
        interviewerEmail: createdAppointment.interviewerEmail,
        interviewerTimezone: createdAppointment.interviewerTimezone,
        candidateName: createdAppointment.candidateName,
        candidateEmail: createdAppointment.candidateEmail,
        positionTitle: createdAppointment.positionTitle,
        interviewType: createdAppointment.interviewType,
        interviewFormat: createdAppointment.interviewFormat,
        durationMinutes: createdAppointment.durationMinutes,
        scheduledStartUtc: createdAppointment.scheduledStartUtc,
        applicationReferenceId: createdAppointment.applicationReferenceId,
        meetingUrl: createdAppointment.meetingUrl,
        locationDetails: createdAppointment.locationDetails,
        publicBaseUrl: baseUrl,
      });

      const intKey = `int-notif-${createdAppointment.id}-scheduled`;
      const intRes = await sendTransactionalEmail(interviewerTemplate, {
        idempotencyKey: intKey,
        attachments: [icsAttachment],
        tags: [
          { name: "category", value: "interviewer_notification" },
          { name: "appointment_id", value: createdAppointment.id },
        ],
      });

      await recordInterviewEmailEvent({
        id: randomUUID(),
        invitationId: invitation.id,
        appointmentId: createdAppointment.id,
        templateType: "interviewer_notification",
        recipientEmail: createdAppointment.interviewerEmail,
        idempotencyKey: intKey,
        provider: "resend",
        providerMessageId: intRes.messageId || null,
        deliveryStatus: intRes.status,
        lastWebhookEvent: null,
        errorDetail: intRes.error || null,
        sentAt: intRes.sentAt || null,
        deliveredAt: null,
        createdAt: nowIso,
        updatedAt: new Date().toISOString(),
      });
    }

    await recordInterviewActivity({
      invitationId: invitation.id,
      appointmentId: createdAppointment.id,
      applicationReferenceId: createdAppointment.applicationReferenceId,
      eventType: "candidate_scheduled",
      actorRef: createdAppointment.candidateEmail,
      summary: `${createdAppointment.candidateName} confirmed interview slot (${createdAppointment.scheduledStartUtc}, ${createdAppointment.candidateTimezone}).`,
    });

    await emitBusinessEvent({
      eventType: "interview.scheduled",
      module: "interviews",
      actorRef: createdAppointment.candidateEmail,
      entityType: "interview",
      entityId: createdAppointment.id,
      title: `Interview confirmed: ${createdAppointment.candidateName}`,
      summary: `${createdAppointment.positionTitle} scheduled for ${createdAppointment.scheduledStartUtc}.`,
      sourceHref: "/admin/interviews",
      idempotencyKey: `biz-int-sched-${createdAppointment.id}`,
    });

    return {
      ok: true,
      appointment: createdAppointment,
      calendarLinks: buildInterviewCalendarLinks(createdAppointment),
    };
  });
}

// ---------- Reschedule & Cancel (Candidate OR Authorized Admin) ----------

export async function rescheduleInterviewAppointment(params: {
  rawToken?: string;
  actor?: AuthActor;
  appointmentId?: string;
  newSlotStartUtc: string;
  candidateTimezone?: string;
  skipOutboundEmail?: boolean;
}): Promise<{
  ok: boolean;
  code?: "UNAUTHORIZED" | "NOT_FOUND" | "SLOT_CONFLICT" | "ERROR";
  appointment?: InterviewAppointmentRecord;
  calendarLinks?: { googleUrl: string; outlookUrl: string };
  error?: string;
}> {
  let invitation: InterviewInvitationRecord | null = null;
  let appointment: InterviewAppointmentRecord | null = null;
  let actorRef = "candidate";

  if (params.rawToken) {
    const tokenHash = hashInterviewToken(params.rawToken);
    const lookup = await findInvitationByTokenHash(tokenHash);
    invitation = lookup.invitation;
    appointment = lookup.appointment;
    if (!invitation || !appointment || appointment.status !== "confirmed") {
      return { ok: false, code: "NOT_FOUND", error: "Active interview appointment not found." };
    }
    actorRef = appointment.candidateEmail;
  } else if (params.actor && params.appointmentId) {
    if (!hasPermission(params.actor, "interviews", "edit") && !hasPermission(params.actor, "interviews", "manage")) {
      return { ok: false, code: "UNAUTHORIZED", error: "Forbidden" };
    }
    appointment = await findAppointmentById(params.appointmentId);
    if (!appointment) return { ok: false, code: "NOT_FOUND", error: "Appointment not found." };
    invitation = await findInvitationById(appointment.invitationId);
    actorRef = params.actor.email;
  } else {
    return { ok: false, code: "UNAUTHORIZED", error: "Authentication or token required." };
  }

  const targetAppt = appointment;
  const targetInv = invitation;
  const safeTz =
    params.candidateTimezone && isValidIanaTimezone(params.candidateTimezone)
      ? params.candidateTimezone
      : targetAppt.candidateTimezone;

  return withInterviewerLock(targetAppt.interviewerEmployeeId, async () => {
    const slotData = await getAvailableSlotsForInterviewer({
      employeeId: targetAppt.interviewerEmployeeId,
      durationMinutes: targetAppt.durationMinutes,
      candidateTimezone: safeTz,
      windowStartDate: targetInv?.availabilityWindowStart,
      windowEndDate: targetInv?.availabilityWindowEnd,
      excludeAppointmentId: targetAppt.id,
      locale: targetInv?.locale || "en",
    });

    const requestedMs = new Date(params.newSlotStartUtc).getTime();
    const matched = slotData.slots.find(
      (s) => Math.abs(new Date(s.startUtc).getTime() - requestedMs) < 1000
    );
    if (!matched) {
      return {
        ok: false,
        code: "SLOT_CONFLICT",
        error: "Selected replacement slot is not available.",
      };
    }

    const nowIso = new Date().toISOString();
    const nextRescheduleCount = targetAppt.rescheduleCount + 1;
    let updatedAppt: InterviewAppointmentRecord;

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (params.rawToken) {
        const { data, error } = await supabase.rpc("reserve_interview_slot_atomic", {
          p_token_hash: hashInterviewToken(params.rawToken),
          p_start_utc: matched.startUtc,
          p_end_utc: matched.endUtc,
          p_candidate_timezone: safeTz,
          p_reschedule_appointment_id: targetAppt.id,
        });
        const payload = data as { ok?: boolean; error?: string; appointment?: Record<string, unknown> };
        if (error || !payload?.ok || !payload.appointment) {
          return {
            ok: false,
            code: "SLOT_CONFLICT",
            error: "Unable to reschedule to that slot because it is no longer available.",
          };
        }
        updatedAppt = mapAppointment(payload.appointment);
      } else {
        const { data, error } = await supabase
          .from("interview_appointments")
          .update({
            scheduled_start_utc: matched.startUtc,
            scheduled_end_utc: matched.endUtc,
            candidate_timezone: safeTz,
            reschedule_count: nextRescheduleCount,
            updated_at: nowIso,
          })
          .eq("id", targetAppt.id)
          .select("*")
          .single();
        if (error || !data) {
          return { ok: false, code: "SLOT_CONFLICT", error: error?.message || "Slot conflict." };
        }
        updatedAppt = mapAppointment(data as Record<string, unknown>);
      }
    } else if (isLocalFallbackAllowed()) {
      const allAppts = await readLocalCollection<InterviewAppointmentRecord>(COL_APPOINTMENTS);
      const startMs = new Date(matched.startUtc).getTime();
      const endMs = new Date(matched.endUtc).getTime();
      const overlap = allAppts.some(
        (a) =>
          a.id !== targetAppt.id &&
          a.interviewerEmployeeId === targetAppt.interviewerEmployeeId &&
          a.status === "confirmed" &&
          new Date(a.scheduledStartUtc).getTime() < endMs &&
          new Date(a.scheduledEndUtc).getTime() > startMs
      );
      if (overlap) {
        return { ok: false, code: "SLOT_CONFLICT", error: "Selected slot conflicts with another booking." };
      }

      updatedAppt = {
        ...targetAppt,
        scheduledStartUtc: matched.startUtc,
        scheduledEndUtc: matched.endUtc,
        candidateTimezone: safeTz,
        rescheduleCount: nextRescheduleCount,
        updatedAt: nowIso,
      };
      await writeLocalCollection(
        COL_APPOINTMENTS,
        allAppts.map((a) => (a.id === targetAppt.id ? updatedAppt : a))
      );
    } else {
      return { ok: false, code: "ERROR", error: "Storage unavailable." };
    }

    await scheduleRemindersForAppointment(updatedAppt);

    if (!params.skipOutboundEmail) {
      const baseUrl = getSafeSchedulingBaseUrl();
      const manageUrl = params.rawToken
        ? buildCandidateSchedulingUrl(params.rawToken, baseUrl)
        : `${baseUrl}/interview/schedule`;
      const ics = generateInterviewIcs(updatedAppt, "REQUEST");
      const attachment = {
        filename: "hirzexa-interview-updated.ics",
        content: Buffer.from(ics, "utf8").toString("base64"),
        content_type: "text/calendar; charset=utf-8; method=REQUEST",
      };

      const candidateTemplate = buildInterviewRescheduledEmail({
        candidateName: updatedAppt.candidateName,
        candidateEmail: updatedAppt.candidateEmail,
        positionTitle: updatedAppt.positionTitle,
        interviewType: updatedAppt.interviewType,
        interviewFormat: updatedAppt.interviewFormat,
        durationMinutes: updatedAppt.durationMinutes,
        interviewerName: updatedAppt.interviewerName,
        scheduledStartUtc: updatedAppt.scheduledStartUtc,
        candidateTimezone: updatedAppt.candidateTimezone,
        manageUrl,
        meetingUrl: updatedAppt.meetingUrl,
        locationDetails: updatedAppt.locationDetails,
        locale: targetInv?.locale || "en",
        publicBaseUrl: baseUrl,
      });

      const key = `int-resched-${updatedAppt.id}-${updatedAppt.rescheduleCount}`;
      const res = await sendTransactionalEmail(candidateTemplate, {
        idempotencyKey: key,
        attachments: [attachment],
        tags: [{ name: "category", value: "interview_rescheduled" }],
      });
      await recordInterviewEmailEvent({
        id: randomUUID(),
        invitationId: updatedAppt.invitationId,
        appointmentId: updatedAppt.id,
        templateType: "rescheduled",
        recipientEmail: updatedAppt.candidateEmail,
        idempotencyKey: key,
        provider: "resend",
        providerMessageId: res.messageId || null,
        deliveryStatus: res.status,
        lastWebhookEvent: null,
        errorDetail: res.error || null,
        sentAt: res.sentAt || null,
        deliveredAt: null,
        createdAt: nowIso,
        updatedAt: new Date().toISOString(),
      });

      const interviewerTemplate = buildInterviewerNotificationEmail({
        event: "rescheduled",
        interviewerName: updatedAppt.interviewerName,
        interviewerEmail: updatedAppt.interviewerEmail,
        interviewerTimezone: updatedAppt.interviewerTimezone,
        candidateName: updatedAppt.candidateName,
        candidateEmail: updatedAppt.candidateEmail,
        positionTitle: updatedAppt.positionTitle,
        interviewType: updatedAppt.interviewType,
        interviewFormat: updatedAppt.interviewFormat,
        durationMinutes: updatedAppt.durationMinutes,
        scheduledStartUtc: updatedAppt.scheduledStartUtc,
        applicationReferenceId: updatedAppt.applicationReferenceId,
        meetingUrl: updatedAppt.meetingUrl,
        locationDetails: updatedAppt.locationDetails,
        publicBaseUrl: baseUrl,
      });
      await sendTransactionalEmail(interviewerTemplate, {
        idempotencyKey: `int-notif-${updatedAppt.id}-resched-${updatedAppt.rescheduleCount}`,
        attachments: [attachment],
      });
    }

    await recordInterviewActivity({
      invitationId: updatedAppt.invitationId,
      appointmentId: updatedAppt.id,
      applicationReferenceId: updatedAppt.applicationReferenceId,
      eventType: "rescheduled",
      actorRef,
      summary: `Interview rescheduled to ${updatedAppt.scheduledStartUtc} (${updatedAppt.candidateTimezone}).`,
    });

    await emitBusinessEvent({
      eventType: "interview.rescheduled",
      module: "interviews",
      actorRef,
      entityType: "interview",
      entityId: updatedAppt.id,
      title: `Interview rescheduled: ${updatedAppt.candidateName}`,
      summary: `Moved to ${updatedAppt.scheduledStartUtc}.`,
      sourceHref: "/admin/interviews",
    });

    return {
      ok: true,
      appointment: updatedAppt,
      calendarLinks: buildInterviewCalendarLinks(updatedAppt),
    };
  });
}

export async function cancelInterviewAppointment(params: {
  rawToken?: string;
  actor?: AuthActor;
  appointmentId?: string;
  reason?: string;
  skipOutboundEmail?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  let invitation: InterviewInvitationRecord | null = null;
  let appointment: InterviewAppointmentRecord | null = null;
  let actorRef = "candidate";

  if (params.rawToken) {
    const lookup = await findInvitationByTokenHash(hashInterviewToken(params.rawToken));
    invitation = lookup.invitation;
    appointment = lookup.appointment;
    if (!invitation || !appointment) {
      return { ok: false, error: "Interview appointment not found." };
    }
    actorRef = appointment.candidateEmail;
  } else if (params.actor && params.appointmentId) {
    if (!hasPermission(params.actor, "interviews", "edit") && !hasPermission(params.actor, "interviews", "manage")) {
      return { ok: false, error: "Forbidden" };
    }
    appointment = await findAppointmentById(params.appointmentId);
    if (!appointment) return { ok: false, error: "Appointment not found." };
    invitation = await findInvitationById(appointment.invitationId);
    actorRef = params.actor.email;
  } else {
    return { ok: false, error: "Unauthorized" };
  }

  if (appointment.status === "canceled") {
    return { ok: true };
  }

  const nowIso = new Date().toISOString();
  const reason = (params.reason || "").trim().slice(0, 400);

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("interview_appointments")
      .update({
        status: "canceled",
        canceled_at: nowIso,
        cancel_reason: reason || null,
        updated_at: nowIso,
      })
      .eq("id", appointment.id);
    if (error) return { ok: false, error: error.message };
  } else if (isLocalFallbackAllowed()) {
    const allAppts = await readLocalCollection<InterviewAppointmentRecord>(COL_APPOINTMENTS);
    await writeLocalCollection(
      COL_APPOINTMENTS,
      allAppts.map((a) =>
        a.id === appointment!.id
          ? { ...a, status: "canceled" as const, canceledAt: nowIso, cancelReason: reason || null, updatedAt: nowIso }
          : a
      )
    );
  }

  // Immediately cancel pending reminders!
  await cancelPendingRemindersForAppointment(appointment.id);

  if (!params.skipOutboundEmail) {
    const baseUrl = getSafeSchedulingBaseUrl();
    const cancelIcs = generateInterviewIcs(appointment, "CANCEL");
    const attachment = {
      filename: "hirzexa-interview-canceled.ics",
      content: Buffer.from(cancelIcs, "utf8").toString("base64"),
      content_type: "text/calendar; charset=utf-8; method=CANCEL",
    };

    const candTemplate = buildInterviewCanceledEmail({
      candidateName: appointment.candidateName,
      candidateEmail: appointment.candidateEmail,
      positionTitle: appointment.positionTitle,
      interviewType: appointment.interviewType,
      reason: reason || null,
      rescheduleUrl: params.rawToken ? buildCandidateSchedulingUrl(params.rawToken, baseUrl) : null,
      locale: invitation?.locale || "en",
      publicBaseUrl: baseUrl,
    });
    const key = `int-cancel-${appointment.id}`;
    const res = await sendTransactionalEmail(candTemplate, {
      idempotencyKey: key,
      attachments: [attachment],
      tags: [{ name: "category", value: "interview_canceled" }],
    });
    await recordInterviewEmailEvent({
      id: randomUUID(),
      invitationId: appointment.invitationId,
      appointmentId: appointment.id,
      templateType: "canceled",
      recipientEmail: appointment.candidateEmail,
      idempotencyKey: key,
      provider: "resend",
      providerMessageId: res.messageId || null,
      deliveryStatus: res.status,
      lastWebhookEvent: null,
      errorDetail: res.error || null,
      sentAt: res.sentAt || null,
      deliveredAt: null,
      createdAt: nowIso,
      updatedAt: new Date().toISOString(),
    });

    const interviewerTemplate = buildInterviewerNotificationEmail({
      event: "canceled",
      interviewerName: appointment.interviewerName,
      interviewerEmail: appointment.interviewerEmail,
      interviewerTimezone: appointment.interviewerTimezone,
      candidateName: appointment.candidateName,
      candidateEmail: appointment.candidateEmail,
      positionTitle: appointment.positionTitle,
      interviewType: appointment.interviewType,
      interviewFormat: appointment.interviewFormat,
      durationMinutes: appointment.durationMinutes,
      scheduledStartUtc: appointment.scheduledStartUtc,
      applicationReferenceId: appointment.applicationReferenceId,
      reason: reason || null,
      publicBaseUrl: baseUrl,
    });
    await sendTransactionalEmail(interviewerTemplate, {
      idempotencyKey: `int-notif-${appointment.id}-canceled`,
      attachments: [attachment],
    });
  }

  await recordInterviewActivity({
    invitationId: appointment.invitationId,
    appointmentId: appointment.id,
    applicationReferenceId: appointment.applicationReferenceId,
    eventType: "canceled",
    actorRef,
    summary: `Interview canceled${reason ? ` (${reason})` : "."}`,
  });

  await emitBusinessEvent({
    eventType: "interview.canceled",
    module: "interviews",
    actorRef,
    entityType: "interview",
    entityId: appointment.id,
    title: `Interview canceled: ${appointment.candidateName}`,
    summary: reason || `Canceled for ${appointment.positionTitle}.`,
    sourceHref: "/admin/interviews",
  });

  return { ok: true };
}

export async function updateInterviewAppointmentOutcome(
  actor: AuthActor,
  appointmentId: string,
  input: {
    status?: "completed" | "no_show";
    outcome?: InterviewOutcome;
    outcomeNotes?: string;
  }
): Promise<{ ok: boolean; appointment?: InterviewAppointmentRecord; error?: string }> {
  const existing = await findAppointmentById(appointmentId);
  if (!existing) return { ok: false, error: "Appointment not found." };

  const canEdit =
    hasPermission(actor, "interviews", "edit") ||
    hasPermission(actor, "interviews", "manage") ||
    (hasPermission(actor, "interviews", "view") &&
      canActorViewInterviewRecord(actor, existing.interviewerEmployeeId));
  if (!canEdit) return { ok: false, error: "Forbidden" };

  const nowIso = new Date().toISOString();
  const nextStatus = input.status || existing.status;
  const nextOutcome = input.outcome || existing.outcome;
  const nextNotes = input.outcomeNotes !== undefined ? input.outcomeNotes.trim().slice(0, 2000) : existing.outcomeNotes;

  if (nextStatus === "completed" || nextStatus === "no_show") {
    await cancelPendingRemindersForAppointment(appointmentId);
  }

  let updated: InterviewAppointmentRecord = {
    ...existing,
    status: nextStatus,
    outcome: nextOutcome,
    outcomeNotes: nextNotes,
    updatedAt: nowIso,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("interview_appointments")
      .update({
        status: nextStatus,
        outcome: nextOutcome,
        outcome_notes: nextNotes,
        updated_at: nowIso,
      })
      .eq("id", appointmentId)
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    updated = mapAppointment(data as Record<string, unknown>);
  } else if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<InterviewAppointmentRecord>(COL_APPOINTMENTS);
    await writeLocalCollection(
      COL_APPOINTMENTS,
      all.map((a) => (a.id === appointmentId ? updated : a))
    );
  }

  await recordInterviewActivity({
    invitationId: existing.invitationId,
    appointmentId,
    applicationReferenceId: existing.applicationReferenceId,
    eventType:
      nextStatus === "completed"
        ? "completed"
        : nextStatus === "no_show"
          ? "no_show"
          : "outcome_recorded",
    actorRef: actor.email,
    summary: `Interview updated: status=${nextStatus}, outcome=${nextOutcome}.`,
  });

  if (nextStatus === "completed") {
    await emitBusinessEvent({
      eventType: "interview.completed",
      module: "interviews",
      actorRef: actor.email,
      entityType: "interview",
      entityId: appointmentId,
      title: `Interview completed: ${existing.candidateName}`,
      summary: `Outcome: ${nextOutcome} (${existing.positionTitle}).`,
      sourceHref: "/admin/interviews",
    });
  }

  return { ok: true, appointment: updated };
}

// ---------- Authorized Queries & Statistics ----------

async function findAppointmentById(id: string): Promise<InterviewAppointmentRecord | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("interview_appointments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? mapAppointment(data as Record<string, unknown>) : null;
  }
  if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<InterviewAppointmentRecord>(COL_APPOINTMENTS);
    return all.find((a) => a.id === id) || null;
  }
  return null;
}

export async function listAuthorizedInterviewInvitations(
  actor: AuthActor,
  options?: { applicationReferenceId?: string }
): Promise<SafeInterviewInvitation[]> {
  if (!hasPermission(actor, "interviews", "view")) return [];

  let all: InterviewInvitationRecord[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      let query = supabase
        .from("interview_invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (options?.applicationReferenceId) {
        query = query.eq("application_reference_id", options.applicationReferenceId);
      }
      const { data, error } = await query;
      if (!error && data) {
        all = data.map((r) => mapInvitation(r as Record<string, unknown>));
      }
    } catch {
      all = [];
    }
  } else if (isLocalFallbackAllowed()) {
    all = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
    if (options?.applicationReferenceId) {
      all = all.filter((i) => i.applicationReferenceId === options.applicationReferenceId);
    }
  }

  const nowMs = Date.now();
  return all
    .filter((i) => canActorViewInterviewRecord(actor, i.interviewerEmployeeId))
    .map((inv) => {
      const effectiveStatus =
        inv.status === "sent" && new Date(inv.expiresAt).getTime() <= nowMs
          ? ("expired" as const)
          : inv.status;
      return stripTokenHash({ ...inv, status: effectiveStatus });
    });
}

export async function listAuthorizedInterviewAppointments(
  actor: AuthActor,
  options?: { applicationReferenceId?: string; status?: InterviewAppointmentStatus }
): Promise<InterviewAppointmentRecord[]> {
  if (!hasPermission(actor, "interviews", "view")) return [];

  let all: InterviewAppointmentRecord[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      let query = supabase
        .from("interview_appointments")
        .select("*")
        .order("scheduled_start_utc", { ascending: true });
      if (options?.applicationReferenceId) {
        query = query.eq("application_reference_id", options.applicationReferenceId);
      }
      if (options?.status) {
        query = query.eq("status", options.status);
      }
      const { data, error } = await query;
      if (!error && data) {
        all = data.map((r) => mapAppointment(r as Record<string, unknown>));
      }
    } catch {
      all = [];
    }
  } else if (isLocalFallbackAllowed()) {
    all = await readLocalCollection<InterviewAppointmentRecord>(COL_APPOINTMENTS);
    if (options?.applicationReferenceId) {
      all = all.filter((a) => a.applicationReferenceId === options.applicationReferenceId);
    }
    if (options?.status) {
      all = all.filter((a) => a.status === options.status);
    }
  }

  return all
    .filter((a) => canActorViewInterviewRecord(actor, a.interviewerEmployeeId))
    .sort(
      (a, b) =>
        new Date(a.scheduledStartUtc).getTime() - new Date(b.scheduledStartUtc).getTime()
    );
}

export async function listInterviewActivity(
  actor: AuthActor,
  applicationReferenceId?: string
): Promise<InterviewActivityRecord[]> {
  if (!hasPermission(actor, "interviews", "view")) return [];

  // Scope activity strictly to authorized invitations/appointments
  const [authInvs, authAppts] = await Promise.all([
    listAuthorizedInterviewInvitations(actor, applicationReferenceId ? { applicationReferenceId } : undefined),
    listAuthorizedInterviewAppointments(actor, applicationReferenceId ? { applicationReferenceId } : undefined),
  ]);
  const allowedInvIds = new Set(authInvs.map((i) => i.id));
  const allowedApptIds = new Set(authAppts.map((a) => a.id));

  let all: InterviewActivityRecord[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      let query = supabase
        .from("interview_activity_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (applicationReferenceId) {
        query = query.eq("application_reference_id", applicationReferenceId);
      }
      const { data, error } = await query;
      if (!error && data) {
        all = data.map((r) => mapActivity(r as Record<string, unknown>));
      }
    } catch {
      all = [];
    }
  } else if (isLocalFallbackAllowed()) {
    all = await readLocalCollection<InterviewActivityRecord>(COL_ACTIVITY);
    if (applicationReferenceId) {
      all = all.filter((e) => e.applicationReferenceId === applicationReferenceId);
    }
  }

  if (canActorManageAllInterviews(actor)) return all;
  return all.filter(
    (e) =>
      (e.invitationId && allowedInvIds.has(e.invitationId)) ||
      (e.appointmentId && allowedApptIds.has(e.appointmentId))
  );
}

export async function getInterviewStatistics(actor: AuthActor): Promise<InterviewStatistics> {
  if (!hasPermission(actor, "interviews", "view")) {
    return {
      invitationsSent: 0,
      awaitingScheduling: 0,
      interviewsScheduled: 0,
      interviewsToday: 0,
      upcomingInterviews: 0,
      canceledInterviews: 0,
      completedInterviews: 0,
    };
  }

  const [invitations, appointments] = await Promise.all([
    listAuthorizedInterviewInvitations(actor),
    listAuthorizedInterviewAppointments(actor),
  ]);

  const nowMs = Date.now();
  const todayUtc = new Date().toISOString().slice(0, 10);

  return {
    invitationsSent: invitations.length,
    awaitingScheduling: invitations.filter(
      (i) => i.status === "sent" || i.status === "pending_send"
    ).length,
    interviewsScheduled: appointments.filter((a) => a.status === "confirmed").length,
    interviewsToday: appointments.filter(
      (a) => a.status === "confirmed" && a.scheduledStartUtc.slice(0, 10) === todayUtc
    ).length,
    upcomingInterviews: appointments.filter(
      (a) => a.status === "confirmed" && new Date(a.scheduledStartUtc).getTime() >= nowMs
    ).length,
    canceledInterviews: appointments.filter((a) => a.status === "canceled").length,
    completedInterviews: appointments.filter((a) => a.status === "completed").length,
  };
}

// ---------- Persistent Idempotent Reminder Dispatcher ----------

export async function dispatchDueInterviewReminders(options?: {
  now?: Date;
  skipOutboundEmail?: boolean;
}): Promise<{
  processed: number;
  sent: number;
  canceled: number;
  failed: number;
  expiredNoticesSent: number;
}> {
  const now = options?.now || new Date();
  const nowIso = now.toISOString();
  let processed = 0;
  let sent = 0;
  let canceled = 0;
  let failed = 0;
  let expiredNoticesSent = 0;

  let dueReminders: InterviewReminderRecord[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("interview_reminders")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for_utc", nowIso)
        .limit(50);
      dueReminders = (data || []).map((r) => ({
        id: String(r.id),
        appointmentId: String(r.appointment_id),
        reminderKind: String(r.reminder_kind) as "24h" | "1h",
        scheduledForUtc: String(r.scheduled_for_utc),
        status: String(r.status) as InterviewReminderRecord["status"],
        idempotencyKey: String(r.idempotency_key),
        attempts: Number(r.attempts || 0),
        maxAttempts: Number(r.max_attempts || 3),
        providerMessageId: r.provider_message_id ? String(r.provider_message_id) : null,
        lastError: r.last_error ? String(r.last_error) : null,
        sentAt: r.sent_at ? String(r.sent_at) : null,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      }));
    } catch {
      dueReminders = [];
    }
  } else if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<InterviewReminderRecord>(COL_REMINDERS);
    dueReminders = all.filter(
      (r) => r.status === "pending" && new Date(r.scheduledForUtc).getTime() <= now.getTime()
    );
  }

  const baseUrl = getSafeSchedulingBaseUrl();

  for (const rem of dueReminders) {
    processed += 1;
    const appt = await findAppointmentById(rem.appointmentId);

    // Never send reminders for canceled, completed, no-show, or past appointments
    if (
      !appt ||
      appt.status !== "confirmed" ||
      new Date(appt.scheduledStartUtc).getTime() <= now.getTime()
    ) {
      canceled += 1;
      await updateReminderRow(rem.id, { status: "canceled", updatedAt: nowIso });
      continue;
    }

    if (rem.attempts >= rem.maxAttempts) {
      failed += 1;
      await updateReminderRow(rem.id, { status: "failed", updatedAt: nowIso });
      continue;
    }

    const inv = await findInvitationById(appt.invitationId);
    const template = buildInterviewReminderEmail({
      candidateName: appt.candidateName,
      candidateEmail: appt.candidateEmail,
      positionTitle: appt.positionTitle,
      interviewType: appt.interviewType,
      interviewFormat: appt.interviewFormat,
      durationMinutes: appt.durationMinutes,
      interviewerName: appt.interviewerName,
      scheduledStartUtc: appt.scheduledStartUtc,
      candidateTimezone: appt.candidateTimezone,
      manageUrl: `${baseUrl}/interview/schedule`,
      meetingUrl: appt.meetingUrl,
      locationDetails: appt.locationDetails,
      reminderKind: rem.reminderKind,
      locale: inv?.locale || "en",
      publicBaseUrl: baseUrl,
    });

    if (options?.skipOutboundEmail) {
      sent += 1;
      await updateReminderRow(rem.id, {
        status: "sent",
        attempts: rem.attempts + 1,
        sentAt: nowIso,
        updatedAt: nowIso,
      });
      continue;
    }

    const res = await sendTransactionalEmail(template, {
      idempotencyKey: rem.idempotencyKey,
      tags: [
        { name: "category", value: `interview_reminder_${rem.reminderKind}` },
        { name: "appointment_id", value: appt.id },
      ],
    });

    const nextAttempts = rem.attempts + 1;
    if (res.ok) {
      sent += 1;
      await updateReminderRow(rem.id, {
        status: "sent",
        attempts: nextAttempts,
        providerMessageId: res.messageId || null,
        sentAt: res.sentAt || nowIso,
        updatedAt: nowIso,
      });
      await recordInterviewEmailEvent({
        id: randomUUID(),
        invitationId: appt.invitationId,
        appointmentId: appt.id,
        templateType: "reminder",
        recipientEmail: appt.candidateEmail,
        idempotencyKey: rem.idempotencyKey,
        provider: "resend",
        providerMessageId: res.messageId || null,
        deliveryStatus: res.status,
        lastWebhookEvent: null,
        errorDetail: null,
        sentAt: res.sentAt || nowIso,
        deliveredAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await recordInterviewActivity({
        invitationId: appt.invitationId,
        appointmentId: appt.id,
        applicationReferenceId: appt.applicationReferenceId,
        eventType: "reminder_sent",
        actorRef: "system:reminder-dispatcher",
        summary: `Sent ${rem.reminderKind} interview reminder to ${appt.candidateEmail}.`,
      });
    } else {
      failed += 1;
      await updateReminderRow(rem.id, {
        status: nextAttempts >= rem.maxAttempts ? "failed" : "pending",
        attempts: nextAttempts,
        lastError: res.error || "Delivery failed",
        updatedAt: nowIso,
      });
    }
  }

  // Also mark expired invitations cleanly (and send optional expired link notice once)
  if (isLocalFallbackAllowed()) {
    const allInvs = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
    let mutated = false;
    const updatedInvs = await Promise.all(
      allInvs.map(async (inv) => {
        if (inv.status === "sent" && new Date(inv.expiresAt).getTime() <= now.getTime()) {
          mutated = true;
          if (!options?.skipOutboundEmail && isResendConfigured()) {
            const expTemplate = buildInterviewExpiredEmail({
              candidateName: inv.candidateName,
              candidateEmail: inv.candidateEmail,
              positionTitle: inv.positionTitle,
              interviewType: inv.interviewType,
              locale: inv.locale,
              publicBaseUrl: baseUrl,
            });
            await sendTransactionalEmail(expTemplate, {
              idempotencyKey: `int-expired-${inv.id}`,
            });
            expiredNoticesSent += 1;
          }
          return { ...inv, status: "expired" as const, updatedAt: nowIso };
        }
        return inv;
      })
    );
    if (mutated) {
      await writeLocalCollection(COL_INVITATIONS, updatedInvs);
    }
  }

  return { processed, sent, canceled, failed, expiredNoticesSent };
}

async function updateReminderRow(
  reminderId: string,
  patch: Partial<InterviewReminderRecord>
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase
        .from("interview_reminders")
        .update({
          status: patch.status,
          attempts: patch.attempts,
          provider_message_id: patch.providerMessageId,
          last_error: patch.lastError,
          sent_at: patch.sentAt,
          updated_at: patch.updatedAt || new Date().toISOString(),
        })
        .eq("id", reminderId);
    } catch {
      // Non-fatal
    }
  }
  if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<InterviewReminderRecord>(COL_REMINDERS);
    await writeLocalCollection(
      COL_REMINDERS,
      all.map((r) => (r.id === reminderId ? { ...r, ...patch } : r))
    );
  }
}

// ---------- Idempotent Resend Webhook Synchronization ----------

export async function recordInterviewWebhookUpdate(params: {
  providerMessageId: string;
  eventType: string;
  detail?: string;
}): Promise<{ matched: boolean; deliveryStatus?: InvitationDeliveryStatus }> {
  const statusMap: Record<string, InvitationDeliveryStatus> = {
    "email.sent": "accepted_by_provider",
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.delivery_delayed": "accepted_by_provider",
    "email.failed": "delivery_failed",
  };
  const mappedStatus = statusMap[params.eventType];
  if (!mappedStatus || !params.providerMessageId) {
    return { matched: false };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("record_interview_email_webhook", {
        p_provider_message_id: params.providerMessageId,
        p_delivery_status: mappedStatus,
        p_webhook_event: params.eventType,
        p_error_detail: params.detail || null,
      });
      if (!error && data && typeof data === "object" && (data as { matched?: boolean }).matched) {
        return { matched: true, deliveryStatus: mappedStatus };
      }
    } catch {
      // Fall through if local fallback enabled
    }
  }

  if (isLocalFallbackAllowed()) {
    const nowIso = new Date().toISOString();
    const events = await readLocalCollection<InterviewEmailEventRecord>(COL_EMAIL_EVENTS);
    let matched = false;
    const nextEvents = events.map((e) => {
      if (e.providerMessageId !== params.providerMessageId) return e;
      matched = true;
      return {
        ...e,
        deliveryStatus: mappedStatus,
        lastWebhookEvent: params.eventType,
        errorDetail: params.detail || e.errorDetail,
        deliveredAt: mappedStatus === "delivered" ? e.deliveredAt || nowIso : e.deliveredAt,
        updatedAt: nowIso,
      };
    });
    if (matched) {
      await writeLocalCollection(COL_EMAIL_EVENTS, nextEvents);
    }

    const invs = await readLocalCollection<InterviewInvitationRecord>(COL_INVITATIONS);
    let invMatched = false;
    const nextInvs = invs.map((inv) => {
      if (inv.providerMessageId !== params.providerMessageId) return inv;
      invMatched = true;
      return {
        ...inv,
        emailDeliveryStatus: mappedStatus,
        deliveryError: params.detail || inv.deliveryError,
        deliveredAt: mappedStatus === "delivered" ? inv.deliveredAt || nowIso : inv.deliveredAt,
        updatedAt: nowIso,
      };
    });
    if (invMatched) {
      await writeLocalCollection(COL_INVITATIONS, nextInvs);
    }

    return { matched: matched || invMatched, deliveryStatus: mappedStatus };
  }

  return { matched: false };
}

export async function getPublicInterviewIcsByToken(rawToken: string): Promise<{
  ok: boolean;
  ics?: string;
  filename?: string;
}> {
  if (!rawToken || rawToken.trim().length < 16) return { ok: false };
  const { appointment } = await findInvitationByTokenHash(hashInterviewToken(rawToken));
  if (!appointment) return { ok: false };
  const method = appointment.status === "canceled" ? "CANCEL" : "REQUEST";
  return {
    ok: true,
    ics: generateInterviewIcs(appointment, method),
    filename: `hirzexa-interview-${appointment.applicationReferenceId.toLowerCase()}.ics`,
  };
}
