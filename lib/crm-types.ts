export const CRM_STAGES = [
  "new_lead",
  "meeting_booked",
  "discovery_completed",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export type CrmStage = (typeof CRM_STAGES)[number];

export const CRM_STAGE_LABELS: Record<
  CrmStage,
  { en: string; ar: string; color: string }
> = {
  new_lead: {
    en: "New Lead",
    ar: "عميل محتمل جديد",
    color: "#35BEFF",
  },
  meeting_booked: {
    en: "Meeting Booked",
    ar: "تم حجز الاجتماع",
    color: "#1050FF",
  },
  discovery_completed: {
    en: "Discovery Completed",
    ar: "اكتملت جلسة الاكتشاف",
    color: "#873BFF",
  },
  proposal_sent: {
    en: "Proposal Sent",
    ar: "تم إرسال العرض",
    color: "#F59E0B",
  },
  negotiation: {
    en: "Negotiation",
    ar: "مرحلة التفاوض",
    color: "#EC4899",
  },
  won: {
    en: "Won",
    ar: "تم التعاقد (Won)",
    color: "#10B981",
  },
  lost: {
    en: "Lost",
    ar: "لم يكتمل (Lost)",
    color: "#6B7280",
  },
};

export const B2B_SERVICE_TRACKS = [
  {
    id: "ai-engineering",
    en: "AI Engineering & Intelligent Agents",
    ar: "هندسة الذكاء الاصطناعي والوكلاء الأذكياء",
  },
  {
    id: "custom-software",
    en: "Custom Software & SaaS Engineering",
    ar: "هندسة البرمجيات المخصصة ومنصات SaaS",
  },
  {
    id: "process-automation",
    en: "Business Process Automation",
    ar: "أتمتة العمليات التجارية وسير العمل",
  },
  {
    id: "cloud-integration",
    en: "Cloud Architecture & Systems Integration",
    ar: "المعمارية السحابية وتكامل الأنظمة",
  },
  {
    id: "aegis-vision",
    en: "AEGIS Visual Safety & Computer Vision",
    ar: "منتج AEGIS للسلامة البصرية والرؤية الحاسوبية",
  },
] as const;

export const B2B_BUDGET_RANGES = [
  { value: "Under $15k", en: "Under $15k (Scoped Pilot / MVP)", ar: "أقل من 15 ألف دولار (مشروع أولي / MVP)" },
  { value: "$15k–$40k", en: "$15k–$40k (Production System)", ar: "15 إلى 40 ألف دولار (نظام إنتاجي)" },
  { value: "$40k–$100k", en: "$40k–$100k (Enterprise Platform)", ar: "40 إلى 100 ألف دولار (منصة مؤسسية)" },
  { value: "$100k+", en: "$100k+ (Multi-Phase Transformation)", ar: "أكثر من 100 ألف دولار (تحول رقمي متعدد المراحل)" },
  { value: "Need architecture scoping", en: "Need architecture scoping first", ar: "نحتاج تحديد النطاق والمعمارية أولاً" },
] as const;

export const B2B_TIMELINES = [
  { value: "Immediate (Within 2 weeks)", en: "Immediate (Within 2 weeks)", ar: "فوري (خلال أسبوعين)" },
  { value: "1–2 Months", en: "1–2 Months", ar: "خلال شهر إلى شهرين" },
  { value: "Quarter Roadmap (3+ Months)", en: "Quarter Roadmap (3+ Months)", ar: "خطة ربع سنوية (3 أشهر فأكثر)" },
  { value: "Exploratory / Architecture Review", en: "Exploratory / Architecture Review", ar: "استكشافي / مراجعة معمارية" },
] as const;

export type LeadType = "discovery_call" | "proposal_request";

export interface CrmActivityItem {
  id: string;
  type:
    | "created"
    | "stage_change"
    | "note"
    | "meeting_scheduled"
    | "reminder_sent"
    | "follow_up";
  summary: string;
  actor: string;
  createdAt: string;
}

export interface CrmLeadRecord {
  id: string;
  referenceId: string;
  leadType: LeadType;
  stage: CrmStage;
  fullName: string;
  email: string;
  phone?: string;
  company: string;
  roleTitle?: string;
  serviceTrack: string;
  budgetRange?: string;
  timeline?: string;
  durationMinutes: 20 | 30;
  scheduledSlotIso?: string | null;
  preferredWindow?: string;
  timezone: string;
  meetingLink?: string;
  projectSummary: string;
  currentStack?: string;
  consent: boolean;
  consentTimestamp: string;
  locale: "en" | "ar";
  reminder24hSent: boolean;
  reminder1hSent: boolean;
  nextFollowUpAt?: string | null;
  ownerId?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  notes: string;
  activities: CrmActivityItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Documented B2B sales pipeline stage transitions.
 * Prevents accidental invalid jumps (e.g., jumping straight from new_lead to won
 * without discovery or proposal) while allowing controlled re-opening of lost leads.
 */
export const CRM_STAGE_TRANSITIONS: Record<CrmStage, readonly CrmStage[]> = {
  new_lead: ["meeting_booked", "discovery_completed", "proposal_sent", "lost"],
  meeting_booked: ["new_lead", "discovery_completed", "proposal_sent", "lost"],
  discovery_completed: ["meeting_booked", "proposal_sent", "negotiation", "lost"],
  proposal_sent: ["discovery_completed", "negotiation", "won", "lost"],
  negotiation: ["proposal_sent", "won", "lost"],
  won: ["negotiation"],
  lost: ["new_lead", "meeting_booked", "discovery_completed"],
};

export function canTransitionStage(from: CrmStage, to: CrmStage): boolean {
  if (from === to) return true;
  return CRM_STAGE_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface SynchronizedTimeSlot {
  slotIso: string;
  dateKey: string;
  available: boolean;
}

export interface AvailabilityResponse {
  mode: "calcom_embed" | "synchronized_slots" | "fallback_only";
  calcomUrl?: string | null;
  timezone: string;
  slotDurationOptions: readonly [20, 30];
  slots: SynchronizedTimeSlot[];
  scheduleNoticeEn: string;
  scheduleNoticeAr: string;
}
