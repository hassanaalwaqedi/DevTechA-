import type { InvitationDeliveryStatus } from "@/lib/intelligence/types";

export const INTERVIEW_TYPES = [
  "initial_hr_screening",
  "technical_interview",
  "hiring_manager_interview",
  "final_interview",
] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, { en: string; ar: string }> = {
  initial_hr_screening: { en: "Initial HR Screening", ar: "مقابلة الموارد البشرية الأولية" },
  technical_interview: { en: "Technical Interview", ar: "المقابلة الفنية" },
  hiring_manager_interview: { en: "Hiring Manager Interview", ar: "مقابلة مدير التوظيف" },
  final_interview: { en: "Final Interview", ar: "المقابلة النهائية" },
};

export const INTERVIEW_FORMATS = ["online_video", "phone", "in_person"] as const;
export type InterviewFormat = (typeof INTERVIEW_FORMATS)[number];

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, { en: string; ar: string }> = {
  online_video: { en: "Online Video Interview", ar: "مقابلة فيديو عبر الإنترنت" },
  phone: { en: "Phone Interview", ar: "مقابلة هاتفية" },
  in_person: { en: "In-Person Interview", ar: "مقابلة حضورية" },
};

export const INTERVIEW_DURATIONS = [15, 20, 30, 45, 60, 90] as const;
export type InterviewDuration = (typeof INTERVIEW_DURATIONS)[number];

export type InterviewInvitationStatus =
  | "draft"
  | "pending_send"
  | "sent"
  | "scheduled"
  | "expired"
  | "revoked";

export type InterviewAppointmentStatus =
  | "confirmed"
  | "completed"
  | "canceled"
  | "no_show";

export type InterviewOutcome =
  | "pending"
  | "follow_up_required"
  | "advance"
  | "hold"
  | "decline";

export type InterviewTemplateKind =
  | "invitation"
  | "confirmation"
  | "reminder"
  | "rescheduled"
  | "canceled"
  | "expired";

export interface InterviewerAvailabilityRule {
  id: string;
  employeeId: string;
  timezone: string;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startMinute: number; // 0..1439
  endMinute: number; // 1..1440
  slotDurationMinutes: InterviewDuration;
  minNoticeHours: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  maxAdvanceDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewerAvailabilityException {
  id: string;
  employeeId: string;
  exceptionDate: string; // YYYY-MM-DD
  isUnavailable: boolean;
  startMinute?: number | null;
  endMinute?: number | null;
  reason: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface InterviewInvitationRecord {
  id: string;
  applicationId?: string | null;
  applicationReferenceId: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  interviewStage: string;
  interviewType: InterviewType;
  interviewFormat: InterviewFormat;
  durationMinutes: InterviewDuration;
  interviewerEmployeeId: string;
  interviewerName: string;
  interviewerEmail: string;
  interviewerTimezone: string;
  availabilityWindowStart?: string | null;
  availabilityWindowEnd?: string | null;
  meetingUrl?: string | null;
  locationDetails?: string | null;
  personalizedMessage: string;
  locale: "en" | "ar";
  tokenHash: string;
  status: InterviewInvitationStatus;
  emailDeliveryStatus: InvitationDeliveryStatus;
  providerMessageId?: string | null;
  deliveryError?: string | null;
  expiresAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  scheduledAt?: string | null;
  revokedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SafeInterviewInvitation = Omit<InterviewInvitationRecord, "tokenHash">;

export interface InterviewAppointmentRecord {
  id: string;
  invitationId: string;
  applicationId?: string | null;
  applicationReferenceId: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  interviewStage: string;
  interviewType: InterviewType;
  interviewFormat: InterviewFormat;
  durationMinutes: InterviewDuration;
  interviewerEmployeeId: string;
  interviewerName: string;
  interviewerEmail: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  candidateTimezone: string;
  interviewerTimezone: string;
  meetingUrl?: string | null;
  locationDetails?: string | null;
  status: InterviewAppointmentStatus;
  outcome: InterviewOutcome;
  outcomeNotes: string;
  rescheduleCount: number;
  canceledAt?: string | null;
  cancelReason?: string | null;
  externalCalendarProvider?: string | null;
  externalCalendarEventId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewActivityRecord {
  id: string;
  invitationId?: string | null;
  appointmentId?: string | null;
  applicationReferenceId: string;
  eventType:
    | "invitation_prepared"
    | "invitation_sent"
    | "invitation_resent"
    | "invitation_revoked"
    | "candidate_scheduled"
    | "confirmation_sent"
    | "reminder_sent"
    | "rescheduled"
    | "canceled"
    | "completed"
    | "no_show"
    | "outcome_recorded";
  actorRef: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface InterviewEmailEventRecord {
  id: string;
  invitationId?: string | null;
  appointmentId?: string | null;
  templateType: InterviewTemplateKind | "interviewer_notification";
  recipientEmail: string;
  idempotencyKey: string;
  provider: "resend";
  providerMessageId?: string | null;
  deliveryStatus: InvitationDeliveryStatus;
  lastWebhookEvent?: string | null;
  errorDetail?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewReminderRecord {
  id: string;
  appointmentId: string;
  reminderKind: "24h" | "1h";
  scheduledForUtc: string;
  status: "pending" | "sent" | "canceled" | "failed";
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  providerMessageId?: string | null;
  lastError?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableInterviewSlot {
  startUtc: string;
  endUtc: string;
  dateKeyCandidate: string; // YYYY-MM-DD in candidate's selected timezone
  labelCandidate: string;
  dateKeyInterviewer: string;
}

export interface InterviewStatistics {
  invitationsSent: number;
  awaitingScheduling: number;
  interviewsScheduled: number;
  interviewsToday: number;
  upcomingInterviews: number;
  canceledInterviews: number;
  completedInterviews: number;
}

export const COMMON_IANA_TIMEZONES = [
  "UTC",
  "Europe/Istanbul",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export function isValidIanaTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function formatUtcInTimezone(
  isoUtc: string,
  timeZone: string,
  locale: "en" | "ar" = "en"
): { dateLabel: string; timeLabel: string; fullLabel: string } {
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : "UTC";
  const date = new Date(isoUtc);
  const loc = locale === "ar" ? "ar-SA" : "en-US";
  const dateLabel = new Intl.DateTimeFormat(loc, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: safeTz,
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat(loc, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: safeTz,
    hour12: true,
  }).format(date);
  return {
    dateLabel,
    timeLabel,
    fullLabel: `${dateLabel} · ${timeLabel} (${safeTz})`,
  };
}
