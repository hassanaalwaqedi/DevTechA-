export const MEETING_EMAIL_TEMPLATE_TYPES = [
  "meeting_confirmation",
  "meeting_reminder_24h",
  "meeting_reminder_1h",
  "meeting_reminder_custom",
  "meeting_rescheduled",
  "meeting_cancelled",
  "post_meeting_followup",
  "custom_email",
] as const;

export type MeetingEmailTemplateType = (typeof MEETING_EMAIL_TEMPLATE_TYPES)[number];

export const MEETING_EMAIL_TRIGGER_SOURCES = [
  "booking_auto",
  "scheduler_auto",
  "manual_staff",
  "reschedule_auto",
  "cancel_auto",
  "ai_assisted_manual",
] as const;

export type MeetingEmailTriggerSource = (typeof MEETING_EMAIL_TRIGGER_SOURCES)[number];

export const MEETING_EMAIL_STATUSES = [
  "draft",
  "queued",
  "processing",
  "submitted",
  "delivered",
  "failed",
  "bounced",
  "complained",
  "cancelled",
  "skipped",
] as const;

export type MeetingEmailStatus = (typeof MEETING_EMAIL_STATUSES)[number];

export const MEETING_TEMPLATE_LABELS: Record<
  MeetingEmailTemplateType,
  { label: string; shortLabel: string; description: string; isReminder: boolean }
> = {
  meeting_confirmation: {
    label: "Meeting Confirmation",
    shortLabel: "Confirmation",
    description: "Confirms booked date, time, timezone, meeting link, and calendar invite.",
    isReminder: false,
  },
  meeting_reminder_24h: {
    label: "Meeting Reminder — 24 Hours",
    shortLabel: "24h Reminder",
    description: "Pre-meeting reminder sent 24 hours before the scheduled discovery call.",
    isReminder: true,
  },
  meeting_reminder_1h: {
    label: "Meeting Reminder — 1 Hour",
    shortLabel: "1h Reminder",
    description: "Final reminder with joining link sent 1 hour before the call.",
    isReminder: true,
  },
  meeting_reminder_custom: {
    label: "Custom Meeting Reminder",
    shortLabel: "Custom Reminder",
    description: "Scheduled or manually sent reminder with live meeting details.",
    isReminder: true,
  },
  meeting_rescheduled: {
    label: "Meeting Rescheduled",
    shortLabel: "Rescheduled",
    description: "Notifies the client of the updated date, time, and refreshed calendar invite.",
    isReminder: false,
  },
  meeting_cancelled: {
    label: "Meeting Cancelled",
    shortLabel: "Cancelled",
    description: "Confirms meeting cancellation with an option to book a new slot.",
    isReminder: false,
  },
  post_meeting_followup: {
    label: "Post-Meeting Follow-Up",
    shortLabel: "Follow-Up",
    description: "Summarizes confirmed discussion points and next steps without fabricating terms.",
    isReminder: false,
  },
  custom_email: {
    label: "Custom Client Email",
    shortLabel: "Custom Email",
    description: "Compose a bespoke transactional email wrapped in HIRZEXA branding.",
    isReminder: false,
  },
};

export const DEFAULT_REMINDER_OFFSETS_MINUTES = [1440, 60] as const;

export interface MeetingCommunicationRecord {
  id: string;
  leadId: string;
  leadReferenceId: string;
  recipientEmail: string;
  recipientName: string;
  templateType: MeetingEmailTemplateType;
  triggerSource: MeetingEmailTriggerSource;
  locale: "en" | "ar";
  subject: string;
  bodyText: string;
  bodyHtml: string;
  meetingSlotIso: string | null;
  meetingTimezone: string;
  meetingLink: string | null;
  senderAddress: string;
  replyToAddress: string;
  initiatedByActorId: string | null;
  initiatedByEmail: string | null;
  initiatedByName: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  status: MeetingEmailStatus;
  idempotencyKey: string;
  provider: "resend";
  providerMessageId: string | null;
  lastWebhookEvent: string | null;
  failureReason: string | null;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingReminderConfig {
  leadId: string;
  enabled: boolean;
  offsetsMinutes: number[];
  updatedBy: string | null;
  updatedAt: string;
}

export interface MeetingCommunicationSummary {
  leadId: string;
  emailProviderReady: boolean;
  senderAddress: string;
  replyToAddress: string;
  confirmationStatus: MeetingEmailStatus | "not_sent";
  latestConfirmation: MeetingCommunicationRecord | null;
  nextScheduledReminder: MeetingCommunicationRecord | null;
  scheduledReminders: MeetingCommunicationRecord[];
  history: MeetingCommunicationRecord[];
  reminderConfig: MeetingReminderConfig;
  recentReminderWarning: string | null;
}

export interface RenderedMeetingEmail {
  templateType: MeetingEmailTemplateType;
  locale: "en" | "ar";
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  /** Editable plain-text core message shown in composer */
  editableBody: string;
  includeIcsAttachment: boolean;
}
