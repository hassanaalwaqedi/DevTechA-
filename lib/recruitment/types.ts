import type { CandidateSource } from "@/lib/data";

export const CANDIDATE_SOURCES: CandidateSource[] = [
  "website",
  "linkedin",
  "email",
  "referral",
  "other",
];

export const CANDIDATE_SOURCE_LABELS: Record<
  CandidateSource,
  { en: string; ar: string; tone: "blue" | "violet" | "emerald" | "amber" | "neutral" }
> = {
  website: { en: "HIRZEXA Website", ar: "موقع HIRZEXA", tone: "blue" },
  linkedin: { en: "LinkedIn", ar: "لينكدإن", tone: "violet" },
  email: { en: "Email", ar: "بريد إلكتروني", tone: "emerald" },
  referral: { en: "Referral", ar: "توصية", tone: "amber" },
  other: { en: "Other", ar: "مصدر آخر", tone: "neutral" },
};

export const RECRUITMENT_MESSAGE_TYPES = [
  "application_thank_you",
  "general_recruitment",
  "interview_invitation",
  "interview_follow_up",
  "request_info",
  "application_update",
  "custom",
] as const;

export type RecruitmentMessageType = (typeof RECRUITMENT_MESSAGE_TYPES)[number];

export const RECRUITMENT_MESSAGE_TYPE_LABELS: Record<
  RecruitmentMessageType,
  { en: string; ar: string; description: string }
> = {
  application_thank_you: {
    en: "Thank You for Applying",
    ar: "شكرًا لتقدمك للوظيفة",
    description: "Warm, executive HIRZEXA acknowledgement thanking a candidate for applying and outlining the review process.",
  },
  general_recruitment: {
    en: "General Recruitment Message",
    ar: "رسالة توظيف عامة",
    description: "Professional outreach or response regarding a candidate's application or profile.",
  },
  interview_invitation: {
    en: "Interview Invitation",
    ar: "دعوة لمقابلة عمل",
    description: "Connects directly to the live HIRZEXA Interview Scheduling workflow with a real secure booking link.",
  },
  interview_follow_up: {
    en: "Interview Follow-up",
    ar: "متابعة بعد المقابلة",
    description: "Thank a candidate after an interview and outline next communication steps.",
  },
  request_info: {
    en: "Request Additional Information",
    ar: "طلب معلومات إضافية",
    description: "Ask for portfolio details, availability, work authorization, or clarifications.",
  },
  application_update: {
    en: "Application Update",
    ar: "تحديث حول طلب التوظيف",
    description: "Share a neutral status update without implying a hiring decision not yet finalized.",
  },
  custom: {
    en: "Custom Message",
    ar: "رسالة مخصصة",
    description: "Write a completely custom HIRZEXA-branded email with zero pre-filled hiring statements.",
  },
};

export type RecruitmentDeliveryStatus =
  | "draft"
  | "queued"
  | "accepted_by_provider"
  | "delivered"
  | "delivery_failed"
  | "bounced"
  | "complained";

export const RECRUITMENT_DELIVERY_LABELS: Record<
  RecruitmentDeliveryStatus,
  { label: string; tone: "emerald" | "blue" | "amber" | "rose" | "neutral" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  queued: { label: "Queued", tone: "amber" },
  accepted_by_provider: { label: "Accepted by Provider", tone: "blue" },
  delivered: { label: "Delivered", tone: "emerald" },
  delivery_failed: { label: "Failed", tone: "rose" },
  bounced: { label: "Bounced", tone: "rose" },
  complained: { label: "Complained", tone: "rose" },
};

export interface RecruitmentCommunicationRecord {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  applicationId: string | null;
  applicationReferenceId: string | null;
  interviewInvitationId: string | null;
  messageType: RecruitmentMessageType;
  locale: "en" | "ar";
  subject: string;
  bodyText: string;
  bodyHtmlSafe: string;
  senderAuthUserId: string | null;
  senderEmployeeId: string | null;
  senderEmail: string;
  senderName: string;
  idempotencyKey: string;
  provider: string;
  providerMessageId: string | null;
  deliveryStatus: RecruitmentDeliveryStatus;
  lastWebhookEvent: string | null;
  errorDetail: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateDuplicateMatch {
  referenceId: string;
  dbId?: string;
  fullName: string;
  email: string;
  jobId: string;
  jobTitle: string;
  source: CandidateSource;
  status: string;
  createdAt: string;
  isExactJobMatch: boolean;
}

export interface UnifiedCandidateTimelineItem {
  id: string;
  kind:
    | "manual_email"
    | "interview_invitation"
    | "interview_appointment"
    | "scheduling_event";
  title: string;
  subtitle: string;
  messageType?: RecruitmentMessageType;
  recipientEmail?: string;
  senderName?: string;
  senderEmail?: string;
  status: string;
  statusTone: "emerald" | "blue" | "amber" | "rose" | "violet" | "neutral";
  bodyPreview?: string;
  errorDetail?: string | null;
  providerMessageId?: string | null;
  createdAt: string;
}
