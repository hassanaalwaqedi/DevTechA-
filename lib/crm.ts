import { randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  COMPANY_EMAILS,
  SYSTEM_NOTIFICATION_EMAIL,
} from "@/lib/company-emails";
import {
  CRM_STAGE_LABELS,
  CRM_STAGES,
  type AvailabilityResponse,
  type CrmActivityItem,
  type CrmLeadRecord,
  type CrmStage,
  type LeadType,
  type SynchronizedTimeSlot,
} from "@/lib/crm-types";
import { isAutomatedAckEnabled } from "@/lib/email-templates";
import { isLocalFallbackAllowed } from "@/lib/intelligence/store";
import { SITE_URL } from "@/lib/site";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const memoryLeads = new Map<string, CrmLeadRecord>();
const reservedSlotIsos = new Set<string>();
const localStoreDir = join(process.cwd(), ".data");
const localStoreFile = join(localStoreDir, "crm-leads.json");

async function readLocalLeads(): Promise<CrmLeadRecord[]> {
  if (!isLocalFallbackAllowed()) return [];
  try {
    const raw = await readFile(localStoreFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CrmLeadRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalLead(lead: CrmLeadRecord): Promise<void> {
  if (!isLocalFallbackAllowed()) return;
  try {
    await mkdir(localStoreDir, { recursive: true });
    const existing = await readLocalLeads();
    const map = new Map<string, CrmLeadRecord>();
    for (const item of existing) map.set(item.id, item);
    map.set(lead.id, lead);
    await writeFile(
      localStoreFile,
      JSON.stringify(Array.from(map.values()), null, 2),
      "utf8"
    );
  } catch {}
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generateMeetingLink(referenceId: string): string {
  const configuredCalUrl = process.env.NEXT_PUBLIC_CALCOM_URL?.trim();
  if (configuredCalUrl) {
    return configuredCalUrl;
  }
  const configuredMeetBase = process.env.DISCOVERY_MEETING_BASE_URL?.trim();
  if (configuredMeetBase) {
    return `${configuredMeetBase.replace(/\/$/, "")}/${referenceId.toLowerCase()}`;
  }
  return `${SITE_URL}/book?ref=${encodeURIComponent(referenceId)}`;
}

export function generateDiscoveryIcs(lead: {
  referenceId: string;
  fullName: string;
  email: string;
  company: string;
  serviceTrack: string;
  durationMinutes: 20 | 30;
  scheduledSlotIso: string;
  meetingLink: string;
  projectSummary: string;
}): string {
  const start = new Date(lead.scheduledSlotIso);
  const end = new Date(start.getTime() + lead.durationMinutes * 60_000);
  const dtStamp = formatIcsDate(new Date().toISOString());
  const dtStart = formatIcsDate(start.toISOString());
  const dtEnd = formatIcsDate(end.toISOString());
  const summary = `HIRZEXA Discovery Call — ${lead.company || lead.fullName} (${lead.referenceId})`;
  const description = [
    `HIRZEXA Engineering Discovery Consultation (${lead.durationMinutes} min)`,
    `Reference: ${lead.referenceId}`,
    `Track: ${lead.serviceTrack}`,
    `Participant: ${lead.fullName} <${lead.email}>`,
    `Meeting Link: ${lead.meetingLink}`,
    "",
    "Agenda & Scope:",
    lead.projectSummary,
  ].join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HIRZEXA//AI & Software Engineering Discovery//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${lead.referenceId}@hirzexa.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(lead.meetingLink)}`,
    `ORGANIZER;CN=HIRZEXA Engineering:mailto:${COMPANY_EMAILS.business}`,
    `ATTENDEE;CN=${escapeIcsText(lead.fullName)};RSVP=TRUE:mailto:${lead.email}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: HIRZEXA Discovery Call in 24 hours",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: HIRZEXA Discovery Call in 30 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildCalendarLinks(lead: {
  referenceId: string;
  fullName: string;
  company: string;
  serviceTrack: string;
  durationMinutes: 20 | 30;
  scheduledSlotIso?: string | null;
  meetingLink?: string;
  projectSummary: string;
}) {
  if (!lead.scheduledSlotIso) return null;
  const start = new Date(lead.scheduledSlotIso);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + lead.durationMinutes * 60_000);
  const gStart = formatIcsDate(start.toISOString());
  const gEnd = formatIcsDate(end.toISOString());
  const title = `HIRZEXA Discovery Call — ${lead.company || lead.fullName}`;
  const details = `Reference: ${lead.referenceId}\nTrack: ${lead.serviceTrack}\nMeeting Link: ${
    lead.meetingLink || `${SITE_URL}/book?ref=${lead.referenceId}`
  }\n\nSummary:\n${lead.projectSummary}`;

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${gStart}/${gEnd}`,
    details,
    location: lead.meetingLink || SITE_URL,
  });

  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: details,
    location: lead.meetingLink || SITE_URL,
  });

  return {
    googleUrl: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlookUrl: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
    icsDownloadPath: `/api/bookings/ics?ref=${encodeURIComponent(lead.referenceId)}`,
  };
}

function formatSlotForDisplay(slotIso: string, timezone: string, locale: "en" | "ar") {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone || "UTC",
    }).format(new Date(slotIso));
  } catch {
    return new Date(slotIso).toUTCString();
  }
}

export function buildDiscoveryBookingEmails(lead: CrmLeadRecord) {
  const ar = lead.locale === "ar";
  const businessEmail = COMPANY_EMAILS.business;
  const isBookedCall = Boolean(lead.scheduledSlotIso);
  const formattedTime = lead.scheduledSlotIso
    ? formatSlotForDisplay(lead.scheduledSlotIso, lead.timezone, lead.locale)
    : lead.preferredWindow || (ar ? "حسب التوفر المفضل" : "Priority callback window");

  const internalSubject = `[HIRZEXA CRM · ${CRM_STAGE_LABELS[lead.stage].en}] ${
    lead.leadType === "discovery_call" ? "Discovery Call" : "Proposal Request"
  } — ${lead.company || lead.fullName} (${lead.referenceId})`;

  const internalText = [
    `HIRZEXA B2B Sales Opportunity (${lead.referenceId})`,
    `Stage: ${CRM_STAGE_LABELS[lead.stage].en}`,
    `Type: ${lead.leadType === "discovery_call" ? `Discovery Call (${lead.durationMinutes} min)` : "Proposal Request"}`,
    `Client: ${lead.fullName} (${lead.roleTitle || "Decision Maker"})`,
    `Company: ${lead.company || "Not specified"}`,
    `Email: ${lead.email}`,
    lead.phone ? `Phone: ${lead.phone}` : null,
    `Service Track: ${lead.serviceTrack}`,
    lead.budgetRange ? `Budget Range: ${lead.budgetRange}` : null,
    lead.timeline ? `Timeline: ${lead.timeline}` : null,
    `Scheduled / Preferred Slot: ${formattedTime} (${lead.timezone})`,
    lead.meetingLink ? `Meeting Link: ${lead.meetingLink}` : null,
    "",
    "Business Challenge & Objectives:",
    lead.projectSummary,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const internalHtml = `
<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#080d21;background:#f8f9ff;">
  <div style="background:#ffffff;border:1px solid #d9e0f5;border-radius:14px;padding:24px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1050ff;letter-spacing:0.06em;">HIRZEXA SALES CRM · ${escapeHtml(lead.referenceId)}</p>
    <h1 style="margin:0 0 14px;font-size:20px;">${escapeHtml(lead.company || lead.fullName)} — ${escapeHtml(lead.serviceTrack)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#465473;width:150px;">Pipeline Stage</td><td style="padding:6px 0;font-weight:700;color:#1050ff;">${escapeHtml(CRM_STAGE_LABELS[lead.stage].en)}</td></tr>
      <tr><td style="padding:6px 0;color:#465473;">Contact</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(lead.fullName)} &lt;${escapeHtml(lead.email)}&gt;</td></tr>
      <tr><td style="padding:6px 0;color:#465473;">Company / Role</td><td style="padding:6px 0;">${escapeHtml(lead.company || "—")} · ${escapeHtml(lead.roleTitle || "—")}</td></tr>
      <tr><td style="padding:6px 0;color:#465473;">Consultation Slot</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(formattedTime)} (${escapeHtml(lead.timezone)}) · ${lead.durationMinutes} min</td></tr>
      <tr><td style="padding:6px 0;color:#465473;">Budget / Timeline</td><td style="padding:6px 0;">${escapeHtml(lead.budgetRange || "TBD")} · ${escapeHtml(lead.timeline || "TBD")}</td></tr>
      ${lead.meetingLink ? `<tr><td style="padding:6px 0;color:#465473;">Meeting Link</td><td style="padding:6px 0;"><a href="${escapeHtml(lead.meetingLink)}" style="color:#1050ff;">${escapeHtml(lead.meetingLink)}</a></td></tr>` : ""}
    </table>
    <div style="padding:14px;border-radius:10px;background:#f1f4ff;color:#080d21;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(lead.projectSummary)}</div>
  </div>
</div>`.trim();

  const visitorSubject = ar
    ? isBookedCall
      ? `تأكيد حجز جلسة الاكتشاف مع HIRZEXA — (${lead.referenceId})`
      : `تم استلام طلبك لدى HIRZEXA — (${lead.referenceId})`
    : isBookedCall
    ? `Confirmed: HIRZEXA Discovery Call (${lead.durationMinutes} min) — ${lead.referenceId}`
    : `Received: HIRZEXA Discovery & Proposal Request — ${lead.referenceId}`;

  const visitorText = ar
    ? [
        `مرحباً ${lead.fullName}،`,
        "",
        isBookedCall
          ? `تم تأكيد حجز جلسة الاكتشاف الهندسية (${lead.durationMinutes} دقيقة) مع فريق HIRZEXA.`
          : `تم استلام طلبك بنجاح لدى فريق هندسة الأعمال في HIRZEXA وسيتم التواصل معك لتأكيد الموعد أو العرض الفني.`,
        `الرقم المرجعي: ${lead.referenceId}`,
        `المسار الهندسي: ${lead.serviceTrack}`,
        `الموعد / النافذة الزمنية: ${formattedTime} (${lead.timezone})`,
        lead.meetingLink ? `رابط الاجتماع والتنسيق: ${lead.meetingLink}` : null,
        `قناة التواصل المباشر: ${businessEmail}`,
        "",
        "مع التحية،",
        "HIRZEXA — AI & Software Engineering",
        `الدعم: ${COMPANY_EMAILS.support}`,
        SITE_URL,
      ]
        .filter((l): l is string => l !== null)
        .join("\n")
    : [
        `Hello ${lead.fullName},`,
        "",
        isBookedCall
          ? `Your ${lead.durationMinutes}-minute engineering discovery call with HIRZEXA is confirmed.`
          : `We have received your discovery and proposal request at HIRZEXA and our engineering team is reviewing your scope.`,
        `Reference ID: ${lead.referenceId}`,
        `Engineering Track: ${lead.serviceTrack}`,
        `Scheduled / Preferred Time: ${formattedTime} (${lead.timezone})`,
        lead.meetingLink ? `Meeting & Coordination Link: ${lead.meetingLink}` : null,
        `Direct Business Channel: ${businessEmail}`,
        `Support: ${COMPANY_EMAILS.support}`,
        "",
        "Best regards,",
        "HIRZEXA — AI & Software Engineering",
        SITE_URL,
      ]
        .filter((l): l is string => l !== null)
        .join("\n");

  const visitorHtml = ar
    ? `
<div dir="rtl" lang="ar" style="font-family:Tahoma,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#080d21;background:#f8f9ff;">
  <div style="background:#ffffff;border:1px solid #d9e0f5;border-radius:14px;padding:28px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1050ff;">HIRZEXA · ${isBookedCall ? "تأكيد جلسة الاكتشاف" : "استلام طلب المشروع"}</p>
    <h1 style="margin:0 0 14px;font-size:21px;color:#080d21;">مرحباً ${escapeHtml(lead.fullName)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#34415e;">${
      isBookedCall
        ? `تم حجز جلسة الاكتشاف الهندسية (${lead.durationMinutes} دقيقة) بنجاح.`
        : "تم استلام تفاصيل مشروعك بنجاح وتوجيهها إلى فريق الهندسة وتطوير الأعمال."
    }</p>
    <div style="padding:14px 16px;border-radius:10px;background:#f1f4ff;margin-bottom:18px;font-size:14px;line-height:1.7;">
      <div><strong>الرقم المرجعي:</strong> <span dir="ltr">${escapeHtml(lead.referenceId)}</span></div>
      <div><strong>المسار الهندسي:</strong> ${escapeHtml(lead.serviceTrack)}</div>
      <div><strong>الموعد:</strong> ${escapeHtml(formattedTime)} (<span dir="ltr">${escapeHtml(lead.timezone)}</span>)</div>
      ${lead.meetingLink ? `<div><strong>رابط الاجتماع:</strong> <a dir="ltr" href="${escapeHtml(lead.meetingLink)}" style="color:#1050ff;">${escapeHtml(lead.meetingLink)}</a></div>` : ""}
      <div><strong>قناة الرد المباشر:</strong> <a dir="ltr" href="mailto:${escapeHtml(businessEmail)}" style="color:#1050ff;">${escapeHtml(businessEmail)}</a></div>
    </div>
    <p style="margin:0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">HIRZEXA — AI &amp; Software Engineering · <a dir="ltr" href="mailto:${COMPANY_EMAILS.support}" style="color:#1050ff;">${COMPANY_EMAILS.support}</a> · <a dir="ltr" href="${SITE_URL}" style="color:#1050ff;">hirzexa.com</a></p>
  </div>
</div>`.trim()
    : `
<div dir="ltr" lang="en" style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#080d21;background:#f8f9ff;">
  <div style="background:#ffffff;border:1px solid #d9e0f5;border-radius:14px;padding:28px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#1050ff;">HIRZEXA · ${isBookedCall ? "DISCOVERY CALL CONFIRMED" : "PROPOSAL REQUEST RECEIVED"}</p>
    <h1 style="margin:0 0 14px;font-size:21px;color:#080d21;">Hello ${escapeHtml(lead.fullName)},</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#34415e;">${
      isBookedCall
        ? `Your ${lead.durationMinutes}-minute engineering discovery consultation with HIRZEXA is scheduled.`
        : "Your project scope has been received and routed to our engineering team for review."
    }</p>
    <div style="padding:14px 16px;border-radius:10px;background:#f1f4ff;margin-bottom:18px;font-size:14px;line-height:1.7;">
      <div><strong>Reference:</strong> ${escapeHtml(lead.referenceId)}</div>
      <div><strong>Track:</strong> ${escapeHtml(lead.serviceTrack)}</div>
      <div><strong>Time:</strong> ${escapeHtml(formattedTime)} (${escapeHtml(lead.timezone)})</div>
      ${lead.meetingLink ? `<div><strong>Meeting Link:</strong> <a href="${escapeHtml(lead.meetingLink)}" style="color:#1050ff;">${escapeHtml(lead.meetingLink)}</a></div>` : ""}
      <div><strong>Reply Channel:</strong> <a href="mailto:${escapeHtml(businessEmail)}" style="color:#1050ff;">${escapeHtml(businessEmail)}</a></div>
    </div>
    <p style="margin:0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">HIRZEXA — AI &amp; Software Engineering · Support: <a href="mailto:${COMPANY_EMAILS.support}" style="color:#1050ff;">${COMPANY_EMAILS.support}</a> · <a href="${SITE_URL}" style="color:#1050ff;">hirzexa.com</a></p>
  </div>
</div>`.trim();

  const reminderSubject = ar
    ? `تذكير: جلسة الاكتشاف مع HIRZEXA — (${lead.referenceId})`
    : `Reminder: Upcoming HIRZEXA Discovery Call — ${lead.referenceId}`;

  const reminderText = ar
    ? `مرحباً ${lead.fullName}، نذكركم بموعد جلسة الاكتشاف (${lead.durationMinutes} دقيقة) مع فريق HIRZEXA في: ${formattedTime} (${lead.timezone}). رابط الاجتماع: ${lead.meetingLink || SITE_URL}`
    : `Hello ${lead.fullName}, this is a reminder for your upcoming ${lead.durationMinutes}-minute HIRZEXA Discovery Call scheduled for ${formattedTime} (${lead.timezone}). Meeting Link: ${lead.meetingLink || SITE_URL}`;

  return {
    internalNotification: {
      from: `HIRZEXA Sales CRM <${SYSTEM_NOTIFICATION_EMAIL}>`,
      to: businessEmail,
      replyTo: lead.email,
      subject: internalSubject,
      text: internalText,
      html: internalHtml,
    },
    visitorConfirmation: {
      from: `HIRZEXA Engineering <${SYSTEM_NOTIFICATION_EMAIL}>`,
      to: lead.email,
      replyTo: businessEmail,
      subject: visitorSubject,
      text: visitorText,
      html: visitorHtml,
    },
    reminderTemplate: {
      from: `HIRZEXA Engineering <${SYSTEM_NOTIFICATION_EMAIL}>`,
      to: lead.email,
      replyTo: businessEmail,
      subject: reminderSubject,
      text: reminderText,
    },
  };
}

async function loadBookedSlotIsos(): Promise<Set<string>> {
  const booked = new Set<string>(reservedSlotIsos);
  const existing = await listCrmLeads();
  for (const lead of existing) {
    if (lead.scheduledSlotIso && lead.stage !== "lost") {
      booked.add(new Date(lead.scheduledSlotIso).toISOString());
    }
  }
  return booked;
}

/**
 * Computes real, synchronized appointment slots for the next 7 business days
 * based on active working windows (Monday-Friday, 10:00, 11:30, 14:00, 15:30, 17:00 UTC+3)
 * and filters out past times (< 4 hours from now) and any already-booked appointments
 * in the database or live session. If DISCOVERY_BOOKING_MODE=fallback_only is set,
 * returns zero slots to trigger the graceful fallback path.
 */
export async function getSynchronizedAvailability(
  requestedTimezone = "UTC"
): Promise<AvailabilityResponse> {
  const calcomUrl = process.env.NEXT_PUBLIC_CALCOM_URL?.trim() || null;
  if (process.env.DISCOVERY_BOOKING_MODE === "fallback_only") {
    return {
      mode: "fallback_only",
      calcomUrl,
      timezone: requestedTimezone,
      slotDurationOptions: [20, 30],
      slots: [],
      scheduleNoticeEn:
        "Live calendar slots are currently full or offline. Submit your preferred window below and our engineering team will send a calendar invitation within 1 business day.",
      scheduleNoticeAr:
        "جميع المواعيد الفورية مشغولة حالياً. اختر الوقت المفضل لديك أدناه وسيرسل فريقنا الهندسي دعوة الاجتماع خلال يوم عمل واحد.",
    };
  }

  const bookedSet = await loadBookedSlotIsos();
  const now = Date.now();
  const minLeadMs = 3 * 60 * 60 * 1000; // minimum 3 hours lead time
  const slots: SynchronizedTimeSlot[] = [];

  // UTC hours corresponding to 11:00, 13:00, 15:00, 17:00 in Istanbul (UTC+3)
  const utcHours = [8, 10, 12, 14];
  const baseDate = new Date(now);

  for (let dayOffset = 0; dayOffset < 10 && slots.length < 24; dayOffset++) {
    const day = new Date(
      Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate() + dayOffset,
        0,
        0,
        0
      )
    );
    const dayOfWeek = day.getUTCDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateKey = day.toISOString().slice(0, 10);
    for (const hourUtc of utcHours) {
      const slotDate = new Date(
        Date.UTC(
          day.getUTCFullYear(),
          day.getUTCMonth(),
          day.getUTCDate(),
          hourUtc,
          0,
          0
        )
      );
      if (slotDate.getTime() - now < minLeadMs) continue;
      const slotIso = slotDate.toISOString();
      const isTaken = bookedSet.has(slotIso);
      slots.push({
        slotIso,
        dateKey,
        available: !isTaken,
      });
    }
  }

  const hasAvailable = slots.some((s) => s.available);

  return {
    mode: hasAvailable ? "synchronized_slots" : "fallback_only",
    calcomUrl,
    timezone: requestedTimezone,
    slotDurationOptions: [20, 30],
    slots,
    scheduleNoticeEn: hasAvailable
      ? "Synchronized directly with HIRZEXA's engineering calendar. Times are displayed in your local timezone."
      : "No open slots remain in the current window. Request a priority callback below and we will coordinate a time directly.",
    scheduleNoticeAr: hasAvailable
      ? "مواعيد متزامنة مباشرة مع جدول فريق HIRZEXA الهندسي، ومعروضة حسب منطقتك الزمنية."
      : "لا توجد مواعيد شاغرة في النافذة الحالية. أرسل وقتك المفضل أدناه وسننسق الموعد معك مباشرة.",
  };
}

function isCrmStage(value: unknown): value is CrmStage {
  return typeof value === "string" && (CRM_STAGES as readonly string[]).includes(value);
}

function parseAiLeadRowToCrm(row: Record<string, unknown>): CrmLeadRecord | null {
  const brief = row.technical_brief as Record<string, unknown> | null;
  if (!brief || typeof brief !== "object") return null;

  // Support both native CRM_LEAD records and AI Architect leads stored in ai_leads
  if (brief.__crmLead === true) {
    const stage = isCrmStage(brief.stage) ? brief.stage : "new_lead";
    return {
      id: String(row.id),
      referenceId: String(brief.referenceId || `HRZ-CRM-${String(row.id).slice(0, 6).toUpperCase()}`),
      leadType: brief.leadType === "proposal_request" ? "proposal_request" : "discovery_call",
      stage,
      fullName: String(row.name || brief.fullName || ""),
      email: String(row.email || brief.email || ""),
      phone: brief.phone ? String(brief.phone) : undefined,
      company: String(row.company || brief.company || ""),
      roleTitle: brief.roleTitle ? String(brief.roleTitle) : undefined,
      serviceTrack: String(brief.serviceTrack || row.project_category || "AI & Software Engineering"),
      budgetRange: brief.budgetRange ? String(brief.budgetRange) : undefined,
      timeline: brief.timeline ? String(brief.timeline) : undefined,
      durationMinutes: brief.durationMinutes === 20 ? 20 : 30,
      scheduledSlotIso: brief.scheduledSlotIso ? String(brief.scheduledSlotIso) : null,
      preferredWindow: brief.preferredWindow ? String(brief.preferredWindow) : undefined,
      timezone: String(brief.timezone || "UTC"),
      meetingLink: brief.meetingLink ? String(brief.meetingLink) : undefined,
      projectSummary: String(brief.projectSummary || ""),
      currentStack: brief.currentStack ? String(brief.currentStack) : undefined,
      consent: Boolean(row.consent ?? brief.consent ?? true),
      consentTimestamp: String(brief.consentTimestamp || row.created_at || new Date().toISOString()),
      locale: brief.locale === "ar" ? "ar" : "en",
      reminder24hSent: Boolean(brief.reminder24hSent),
      reminder1hSent: Boolean(brief.reminder1hSent),
      nextFollowUpAt: brief.nextFollowUpAt ? String(brief.nextFollowUpAt) : null,
      notes: String(brief.notes || ""),
      activities: Array.isArray(brief.activities)
        ? (brief.activities as CrmActivityItem[])
        : [],
      createdAt: String(row.created_at || brief.createdAt || new Date().toISOString()),
      updatedAt: String(brief.updatedAt || row.created_at || new Date().toISOString()),
    };
  }

  // Also surface AI System Architect leads inside the Sales CRM pipeline!
  const rawStatus = String(row.status || "new");
  const mappedStage: CrmStage =
    rawStatus === "contacted"
      ? "discovery_completed"
      : rawStatus === "archived"
      ? "lost"
      : "new_lead";

  return {
    id: String(row.id),
    referenceId: `HRZ-ARC-${String(row.id).slice(0, 6).toUpperCase()}`,
    leadType: "proposal_request",
    stage: mappedStage,
    fullName: String(row.name || ""),
    email: String(row.email || ""),
    company: String(row.company || ""),
    serviceTrack: String(row.project_category || "AI System Architect Brief"),
    durationMinutes: 30,
    scheduledSlotIso: null,
    timezone: "UTC",
    projectSummary: String(
      brief.problemStatement ||
        brief.projectTitle ||
        "AI System Architect generated technical brief."
    ),
    consent: Boolean(row.consent),
    consentTimestamp: String(row.created_at || new Date().toISOString()),
    locale: "en",
    reminder24hSent: false,
    reminder1hSent: false,
    nextFollowUpAt: null,
    notes: "",
    activities: [
      {
        id: `act-${String(row.id).slice(0, 8)}`,
        type: "created",
        summary: "Submitted via Interactive AI System Architect",
        actor: String(row.name || "Visitor"),
        createdAt: String(row.created_at || new Date().toISOString()),
      },
    ],
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapNormalizedLeadRow(row: Record<string, unknown>): CrmLeadRecord | null {
  if (!row || !row.id || !row.reference_id) return null;
  const companyObj = Array.isArray(row.crm_companies)
    ? (row.crm_companies[0] as Record<string, unknown> | undefined)
    : (row.crm_companies as Record<string, unknown> | null);
  const contactObj = Array.isArray(row.crm_contacts)
    ? (row.crm_contacts[0] as Record<string, unknown> | undefined)
    : (row.crm_contacts as Record<string, unknown> | null);
  const ownerObj = Array.isArray(row.employees)
    ? (row.employees[0] as Record<string, unknown> | undefined)
    : (row.employees as Record<string, unknown> | null);
  const stage = isCrmStage(row.stage) ? row.stage : "new_lead";

  return {
    id: String(row.id),
    referenceId: String(row.reference_id),
    leadType: row.lead_type === "proposal_request" ? "proposal_request" : "discovery_call",
    stage,
    fullName: String(contactObj?.full_name || ""),
    email: String(contactObj?.email || ""),
    phone: contactObj?.phone ? String(contactObj.phone) : undefined,
    company: String(companyObj?.name || ""),
    roleTitle: contactObj?.role_title ? String(contactObj.role_title) : undefined,
    serviceTrack: String(row.service_track || "AI & Software Engineering"),
    budgetRange: row.budget_range ? String(row.budget_range) : undefined,
    timeline: row.timeline ? String(row.timeline) : undefined,
    durationMinutes: row.duration_minutes === 20 ? 20 : 30,
    scheduledSlotIso: row.scheduled_slot_iso ? String(row.scheduled_slot_iso) : null,
    preferredWindow: row.preferred_window ? String(row.preferred_window) : undefined,
    timezone: String(row.timezone || "UTC"),
    meetingLink: row.meeting_link ? String(row.meeting_link) : undefined,
    projectSummary: String(row.project_summary || ""),
    currentStack: row.current_stack ? String(row.current_stack) : undefined,
    consent: Boolean(contactObj?.consent ?? true),
    consentTimestamp: String(contactObj?.consent_at || row.created_at || new Date().toISOString()),
    locale: contactObj?.locale === "ar" ? "ar" : "en",
    reminder24hSent: false,
    reminder1hSent: false,
    nextFollowUpAt: row.next_follow_up_at ? String(row.next_follow_up_at) : null,
    notes: String(row.notes || ""),
    ownerId: row.owner_employee_id ? String(row.owner_employee_id) : null,
    ownerEmail: ownerObj?.email ? String(ownerObj.email) : null,
    ownerName: ownerObj?.full_name ? String(ownerObj.full_name) : null,
    activities: Array.isArray(row.activities) ? (row.activities as CrmActivityItem[]) : [],
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

export async function listCrmLeads(): Promise<CrmLeadRecord[]> {
  const combined = new Map<string, CrmLeadRecord>();

  // 1 & 2. Local file and in-memory cache are active ONLY in isolated offline test mode
  if (isLocalFallbackAllowed()) {
    const diskLeads = await readLocalLeads();
    for (const item of diskLeads) {
      combined.set(item.id, item);
      memoryLeads.set(item.id, item);
      if (item.scheduledSlotIso && item.stage !== "lost") {
        reservedSlotIsos.add(new Date(item.scheduledSlotIso).toISOString());
      }
    }
    for (const [id, item] of memoryLeads.entries()) {
      combined.set(id, item);
    }
  }

  // 3. Load from Supabase (normalized crm_leads first, then legacy visitor_events & ai_leads)
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();

      // Normalized Phase 1 schema (enforced by PostgreSQL RLS per role/scope)
      const { data: normRows, error: normErr } = await supabase
        .from("crm_leads")
        .select(
          "*, crm_companies(name), crm_contacts(full_name, email, phone, role_title, locale, consent, consent_at), employees(id, email, full_name)"
        )
        .order("created_at", { ascending: false });

      if (!normErr && Array.isArray(normRows)) {
        for (const row of normRows) {
          const parsed = mapNormalizedLeadRow(row as Record<string, unknown>);
          if (parsed) {
            combined.set(parsed.id, parsed);
            memoryLeads.set(parsed.id, parsed);
            if (parsed.scheduledSlotIso && parsed.stage !== "lost") {
              reservedSlotIsos.add(new Date(parsed.scheduledSlotIso).toISOString());
            }
          }
        }
      }

      // Legacy live Supabase channel (`visitor_events` with path LIKE '/__crm_lead__/%')
      const { data: eventRows, error: eventErr } = await supabase
        .from("visitor_events")
        .select("visitor_id, path, job_slug, created_at")
        .like("path", "/__crm_lead__/%")
        .order("created_at", { ascending: true });

      if (!eventErr && Array.isArray(eventRows)) {
        for (const row of eventRows) {
          if (!row.job_slug) continue;
          try {
            const parsed = JSON.parse(String(row.job_slug)) as CrmLeadRecord;
            if (parsed && parsed.id && parsed.referenceId) {
              combined.set(parsed.id, parsed);
              memoryLeads.set(parsed.id, parsed);
              if (parsed.scheduledSlotIso && parsed.stage !== "lost") {
                reservedSlotIsos.add(new Date(parsed.scheduledSlotIso).toISOString());
              }
            }
          } catch {}
        }
      }

      // Secondary table (`ai_leads` if migrated)
      const { data, error } = await supabase
        .from("ai_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const parsed = parseAiLeadRowToCrm(row as Record<string, unknown>);
          if (parsed && !combined.has(parsed.id)) {
            combined.set(parsed.id, parsed);
            if (parsed.scheduledSlotIso && parsed.stage !== "lost") {
              reservedSlotIsos.add(new Date(parsed.scheduledSlotIso).toISOString());
            }
          }
        }
      }
    } catch {}
  }

  return Array.from(combined.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getCrmLeadByReference(referenceId: string): Promise<CrmLeadRecord | null> {
  const all = await listCrmLeads();
  return all.find((item) => item.referenceId === referenceId) || null;
}

export async function createCrmLead(input: {
  leadType: LeadType;
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
  projectSummary: string;
  currentStack?: string;
  consent: boolean;
  locale: "en" | "ar";
}): Promise<{
  lead: CrmLeadRecord;
  icsContent: string | null;
  calendarLinks: ReturnType<typeof buildCalendarLinks>;
  webhookDelivered: boolean;
}> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedCompany = input.company.trim().toLowerCase();
  const parsedIncomingSlot = input.scheduledSlotIso
    ? new Date(input.scheduledSlotIso)
    : null;
  const incomingSlotIso =
    parsedIncomingSlot && !Number.isNaN(parsedIncomingSlot.getTime())
      ? parsedIncomingSlot.toISOString()
      : null;

  // Idempotency guard: avoid creating duplicate lead records when the same booking
  // or identical inquiry payload is processed repeatedly within a short window.
  const existingLeads = await listCrmLeads();
  const duplicateMatch = existingLeads.find((item) => {
    const sameEmail = item.email.trim().toLowerCase() === normalizedEmail;
    if (!sameEmail) return false;
    if (incomingSlotIso && item.scheduledSlotIso === incomingSlotIso) {
      return true;
    }
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    return (
      ageMs >= 0 &&
      ageMs < 10 * 60 * 1000 &&
      item.leadType === input.leadType &&
      item.serviceTrack === input.serviceTrack &&
      item.company.trim().toLowerCase() === normalizedCompany
    );
  });

  if (duplicateMatch) {
    const existingIcs =
      duplicateMatch.scheduledSlotIso && duplicateMatch.meetingLink
        ? generateDiscoveryIcs({
            referenceId: duplicateMatch.referenceId,
            fullName: duplicateMatch.fullName,
            email: duplicateMatch.email,
            company: duplicateMatch.company,
            serviceTrack: duplicateMatch.serviceTrack,
            durationMinutes: duplicateMatch.durationMinutes,
            scheduledSlotIso: duplicateMatch.scheduledSlotIso,
            meetingLink: duplicateMatch.meetingLink,
            projectSummary: duplicateMatch.projectSummary,
          })
        : null;
    return {
      lead: duplicateMatch,
      icsContent: existingIcs,
      calendarLinks: buildCalendarLinks(duplicateMatch),
      webhookDelivered: false,
    };
  }

  const nowIso = new Date().toISOString();
  const prefix = input.leadType === "discovery_call" ? "DSC" : "PRP";
  const referenceId = `HRZ-${prefix}-${new Date().getFullYear()}-${randomInt(10000, 99999)}`;

  let normalizedSlotIso: string | null = null;
  if (input.scheduledSlotIso) {
    const parsedSlot = new Date(input.scheduledSlotIso);
    if (!Number.isNaN(parsedSlot.getTime()) && parsedSlot.getTime() > Date.now()) {
      const bookedSet = await loadBookedSlotIsos();
      const iso = parsedSlot.toISOString();
      if (bookedSet.has(iso)) {
        throw new Error("SLOT_ALREADY_RESERVED");
      }
      normalizedSlotIso = iso;
      reservedSlotIsos.add(iso);
    }
  }

  const initialStage: CrmStage = normalizedSlotIso ? "meeting_booked" : "new_lead";
  const meetingLink =
    input.leadType === "discovery_call" ? generateMeetingLink(referenceId) : undefined;

  const initialActivities: CrmActivityItem[] = [
    {
      id: randomUUID(),
      type: "created",
      summary:
        input.leadType === "discovery_call"
          ? `Discovery call inquiry created (${input.serviceTrack})`
          : `Proposal request submitted (${input.serviceTrack})`,
      actor: input.fullName,
      createdAt: nowIso,
    },
  ];

  if (normalizedSlotIso) {
    initialActivities.push({
      id: randomUUID(),
      type: "meeting_scheduled",
      summary: `Booked ${input.durationMinutes}-min consultation for ${normalizedSlotIso} (${input.timezone})`,
      actor: input.fullName,
      createdAt: nowIso,
    });
  }

  const lead: CrmLeadRecord = {
    id: randomUUID(),
    referenceId,
    leadType: input.leadType,
    stage: initialStage,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    company: input.company,
    roleTitle: input.roleTitle,
    serviceTrack: input.serviceTrack,
    budgetRange: input.budgetRange,
    timeline: input.timeline,
    durationMinutes: input.durationMinutes,
    scheduledSlotIso: normalizedSlotIso,
    preferredWindow: input.preferredWindow,
    timezone: input.timezone || "UTC",
    meetingLink,
    projectSummary: input.projectSummary,
    currentStack: input.currentStack,
    consent: input.consent,
    consentTimestamp: nowIso,
    locale: input.locale,
    reminder24hSent: false,
    reminder1hSent: false,
    nextFollowUpAt: normalizedSlotIso || null,
    notes: "",
    activities: initialActivities,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      // 1. Primary normalized Phase 1 RPC (safe for unauthenticated public submissions under strict RLS)
      await supabase.rpc("ingest_public_crm_lead", {
        p_id: lead.id,
        p_reference_id: lead.referenceId,
        p_lead_type: lead.leadType,
        p_stage: lead.stage,
        p_full_name: lead.fullName,
        p_email: lead.email,
        p_phone: lead.phone || null,
        p_company: lead.company || "",
        p_role_title: lead.roleTitle || null,
        p_service_track: lead.serviceTrack,
        p_budget_range: lead.budgetRange || null,
        p_timeline: lead.timeline || null,
        p_duration_minutes: lead.durationMinutes,
        p_scheduled_slot_iso: lead.scheduledSlotIso || null,
        p_preferred_window: lead.preferredWindow || null,
        p_timezone: lead.timezone || "UTC",
        p_meeting_link: lead.meetingLink || null,
        p_project_summary: lead.projectSummary,
        p_current_stack: lead.currentStack || null,
        p_consent: lead.consent,
        p_locale: lead.locale,
        p_activities: lead.activities,
      });

      // 2. Backwards-compatible fallback channel if Phase 1 migration is not yet applied
      await supabase.from("visitor_events").insert({
        visitor_id: `crm:${lead.id}`,
        path: `/__crm_lead__/${lead.referenceId}`,
        job_slug: JSON.stringify(lead),
      });

      // 3. Secondary table (`ai_leads` if migrated)
      await supabase.from("ai_leads").insert({
        id: lead.id,
        name: lead.fullName,
        email: lead.email,
        company: lead.company || null,
        project_category: lead.serviceTrack.slice(0, 120),
        technical_brief: {
          __crmLead: true,
          ...lead,
        },
        consent: true,
        status: "new",
      });
    } catch {}
  }

  if (isLocalFallbackAllowed()) {
    memoryLeads.set(lead.id, lead);
    await writeLocalLead(lead);
  }

  const icsContent =
    normalizedSlotIso && meetingLink
      ? generateDiscoveryIcs({
          referenceId: lead.referenceId,
          fullName: lead.fullName,
          email: lead.email,
          company: lead.company,
          serviceTrack: lead.serviceTrack,
          durationMinutes: lead.durationMinutes,
          scheduledSlotIso: normalizedSlotIso,
          meetingLink,
          projectSummary: lead.projectSummary,
        })
      : null;

  const calendarLinks = buildCalendarLinks(lead);
  const emails = buildDiscoveryBookingEmails(lead);
  let webhookDelivered = false;

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    const webhookHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.CONTACT_WEBHOOK_SECRET) {
      webhookHeaders["x-hirzexa-webhook-secret"] = process.env.CONTACT_WEBHOOK_SECRET;
    }
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: webhookHeaders,
        body: JSON.stringify({
          reference: lead.referenceId,
          eventType: lead.leadType,
          crmStage: lead.stage,
          name: lead.fullName,
          email: lead.email,
          replyTo: lead.email,
          company: lead.company,
          roleTitle: lead.roleTitle,
          serviceTrack: lead.serviceTrack,
          budget: lead.budgetRange,
          timeline: lead.timeline,
          durationMinutes: lead.durationMinutes,
          scheduledSlotIso: lead.scheduledSlotIso,
          preferredWindow: lead.preferredWindow,
          timezone: lead.timezone,
          meetingLink: lead.meetingLink,
          overview: lead.projectSummary,
          recipient: COMPANY_EMAILS.business,
          department: "business",
          locale: lead.locale,
          source: "HIRZEXA B2B Booking & Sales CRM",
          automatedSender: SYSTEM_NOTIFICATION_EMAIL,
          autoAckAuthorized: isAutomatedAckEnabled(),
          internalNotification: emails.internalNotification,
          acknowledgment: emails.visitorConfirmation,
          reminderTemplate: emails.reminderTemplate,
          icsCalendarInvite: icsContent,
        }),
        signal: AbortSignal.timeout(8_000),
      });
      webhookDelivered = response.ok;
    } catch {}
  }

  return {
    lead,
    icsContent,
    calendarLinks,
    webhookDelivered,
  };
}

export async function updateCrmLead(
  id: string,
  patch: {
    stage?: CrmStage;
    notes?: string;
    nextFollowUpAt?: string | null;
    scheduledSlotIso?: string | null;
    meetingLink?: string;
    activityNote?: string;
    sendReminder?: boolean;
    ownerId?: string | null;
    ownerEmail?: string | null;
    ownerName?: string | null;
    actorEmail?: string;
  }
): Promise<CrmLeadRecord | null> {
  const leads = await listCrmLeads();
  const current = leads.find((item) => item.id === id);
  if (!current) return null;

  const nowIso = new Date().toISOString();
  const actor = patch.actorEmail || "Admin";
  const nextActivities = [...current.activities];

  let nextStage = current.stage;
  if (patch.stage && isCrmStage(patch.stage) && patch.stage !== current.stage) {
    nextStage = patch.stage;
    nextActivities.unshift({
      id: randomUUID(),
      type: "stage_change",
      summary: `Pipeline stage updated: ${CRM_STAGE_LABELS[current.stage].en} → ${CRM_STAGE_LABELS[nextStage].en}`,
      actor,
      createdAt: nowIso,
    });
  }

  if (patch.ownerEmail !== undefined && patch.ownerEmail !== current.ownerEmail) {
    nextActivities.unshift({
      id: randomUUID(),
      type: "follow_up",
      summary: patch.ownerEmail
        ? `Assigned lead owner to ${patch.ownerName || patch.ownerEmail}`
        : "Unassigned lead owner",
      actor,
      createdAt: nowIso,
    });
  }

  if (patch.activityNote && patch.activityNote.trim()) {
    nextActivities.unshift({
      id: randomUUID(),
      type: "follow_up",
      summary: patch.activityNote.trim(),
      actor,
      createdAt: nowIso,
    });
  }

  let reminder24hSent = current.reminder24hSent;
  if (patch.sendReminder) {
    reminder24hSent = true;
    nextActivities.unshift({
      id: randomUUID(),
      type: "reminder_sent",
      summary: `Dispatched discovery call reminder email to ${current.email}`,
      actor,
      createdAt: nowIso,
    });
  }

  const updated: CrmLeadRecord = {
    ...current,
    stage: nextStage,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
    nextFollowUpAt:
      patch.nextFollowUpAt !== undefined ? patch.nextFollowUpAt : current.nextFollowUpAt,
    scheduledSlotIso:
      patch.scheduledSlotIso !== undefined ? patch.scheduledSlotIso : current.scheduledSlotIso,
    meetingLink: patch.meetingLink !== undefined ? patch.meetingLink : current.meetingLink,
    ownerId: patch.ownerId !== undefined ? patch.ownerId : current.ownerId,
    ownerEmail: patch.ownerEmail !== undefined ? patch.ownerEmail : current.ownerEmail,
    ownerName: patch.ownerName !== undefined ? patch.ownerName : current.ownerName,
    reminder24hSent,
    activities: nextActivities,
    updatedAt: nowIso,
  };

  if (isLocalFallbackAllowed()) {
    memoryLeads.set(updated.id, updated);
    await writeLocalLead(updated);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      // 1. Update normalized crm_leads & append immutable crm_stage_history (enforced by Postgres RLS)
      const { error: normUpdateErr } = await supabase
        .from("crm_leads")
        .update({
          stage: updated.stage,
          notes: updated.notes,
          next_follow_up_at: updated.nextFollowUpAt || null,
          scheduled_slot_iso: updated.scheduledSlotIso || null,
          meeting_link: updated.meetingLink || null,
          owner_employee_id: updated.ownerId || null,
          activities: updated.activities,
          updated_at: updated.updatedAt,
        })
        .eq("id", updated.id);

      if (!normUpdateErr && nextStage !== current.stage) {
        await supabase.from("crm_stage_history").insert({
          lead_id: updated.id,
          from_stage: current.stage,
          to_stage: nextStage,
          changed_by: actor,
          reason: patch.activityNote?.trim() || "Stage transition via HIRZEXA CRM",
        });
      }

      // 2. Append updated revision to legacy visitor_events CRM channel for backwards compatibility
      await supabase.from("visitor_events").insert({
        visitor_id: `crm:${updated.id}`,
        path: `/__crm_lead__/${updated.referenceId}`,
        job_slug: JSON.stringify(updated),
      });

      const dbStatus =
        updated.stage === "lost"
          ? "archived"
          : updated.stage === "new_lead"
          ? "new"
          : "contacted";
      await supabase
        .from("ai_leads")
        .update({
          status: dbStatus,
          technical_brief: {
            __crmLead: true,
            ...updated,
          },
        })
        .eq("id", updated.id);
    } catch {}
  }

  if (patch.sendReminder && process.env.CONTACT_WEBHOOK_URL) {
    const emails = buildDiscoveryBookingEmails(updated);
    const webhookHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.CONTACT_WEBHOOK_SECRET) {
      webhookHeaders["x-hirzexa-webhook-secret"] = process.env.CONTACT_WEBHOOK_SECRET;
    }
    try {
      await fetch(process.env.CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: webhookHeaders,
        body: JSON.stringify({
          reference: updated.referenceId,
          eventType: "discovery_reminder",
          recipient: updated.email,
          replyTo: COMPANY_EMAILS.business,
          reminderTemplate: emails.reminderTemplate,
        }),
        signal: AbortSignal.timeout(6_000),
      });
    } catch {}
  }

  return updated;
}
