import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
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
import { listEmployees } from "@/lib/intelligence/employees";
import { isLocalFallbackAllowed } from "@/lib/intelligence/store";
import { canAccessScopedRecord, hasPermission, type AuthActor } from "@/lib/rbac";
import { SITE_URL } from "@/lib/site";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createPrivilegedOrServerSupabaseClient } from "@/lib/supabase/service-role";

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
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function sanitizeIcsToken(value: string): string {
  return value.replace(/[^A-Za-z0-9._@-]/g, "").slice(0, 120);
}

function getBookingIcsSigningSecret(): string {
  return (
    process.env.SESSION_SIGNING_SECRET?.trim() ||
    process.env.CONTACT_WEBHOOK_SECRET?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "hirzexa-booking-ics-signing-key"
  );
}

export function createBookingIcsSignature(referenceId: string): string {
  return createHmac("sha256", getBookingIcsSigningSecret())
    .update(`booking-ics:${referenceId.trim()}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}

export function verifyBookingIcsSignature(
  referenceId: string,
  signature: string | null | undefined
): boolean {
  if (!referenceId || !signature) return false;
  const expected = createBookingIcsSignature(referenceId);
  const a = Buffer.from(signature.trim(), "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
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
    `UID:${sanitizeIcsToken(lead.referenceId) || "booking"}@hirzexa.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(lead.meetingLink)}`,
    `ORGANIZER;CN=HIRZEXA Engineering:mailto:${COMPANY_EMAILS.business}`,
    `ATTENDEE;CN=${escapeIcsText(lead.fullName)};RSVP=TRUE:mailto:${sanitizeIcsToken(lead.email)}`,
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
    icsDownloadPath: `/api/bookings/ics?ref=${encodeURIComponent(lead.referenceId)}&sig=${encodeURIComponent(createBookingIcsSignature(lead.referenceId))}`,
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
      ownerId: brief.ownerId ? String(brief.ownerId) : null,
      ownerEmail: brief.ownerEmail ? String(brief.ownerEmail) : null,
      ownerName: brief.ownerName ? String(brief.ownerName) : null,
      ownerDepartment: brief.ownerDepartment ? String(brief.ownerDepartment) : null,
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
    ownerDepartment: ownerObj?.department ? String(ownerObj.department) : null,
    activities: Array.isArray(row.activities) ? (row.activities as CrmActivityItem[]) : [],
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

export function canActorAccessCrmLead(actor: AuthActor, lead: CrmLeadRecord): boolean {
  return canAccessScopedRecord(actor, {
    ownerId: lead.ownerId,
    ownerEmail: lead.ownerEmail,
    department: lead.ownerDepartment,
  });
}

export async function listAuthorizedCrmLeads(actor: AuthActor): Promise<CrmLeadRecord[]> {
  if (
    !hasPermission(actor, "crm", "view") &&
    !hasPermission(actor, "bookings", "view")
  ) {
    return [];
  }
  const leads = await listCrmLeads();
  return leads.filter((lead) => canActorAccessCrmLead(actor, lead));
}

export async function getAuthorizedCrmLeadById(
  actor: AuthActor,
  id: string
): Promise<{ lead: CrmLeadRecord | null; denied: boolean }> {
  if (
    !hasPermission(actor, "crm", "view") &&
    !hasPermission(actor, "bookings", "view")
  ) {
    return { lead: null, denied: true };
  }
  const leads = await listCrmLeads();
  const match = leads.find((item) => item.id === id) || null;
  if (!match) {
    return { lead: null, denied: false };
  }
  if (!canActorAccessCrmLead(actor, match)) {
    return { lead: null, denied: true };
  }
  return { lead: match, denied: false };
}

export class InvalidCrmOwnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCrmOwnerError";
  }
}

export class CrmPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmPersistenceError";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveCanonicalCrmOwner(input: {
  ownerId?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  ownerDepartment?: string | null;
}): Promise<{
  ownerId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerDepartment: string | null;
}> {
  const rawId = typeof input.ownerId === "string" ? input.ownerId.trim() : input.ownerId;
  const rawEmail =
    typeof input.ownerEmail === "string" ? input.ownerEmail.trim().toLowerCase() : input.ownerEmail;

  if (!rawId && !rawEmail) {
    return { ownerId: null, ownerEmail: null, ownerName: null, ownerDepartment: null };
  }

  const employees = await listEmployees().catch(() => []);
  const matched =
    (rawId
      ? employees.find((emp) => emp.id === rawId || emp.authUserId === rawId)
      : undefined) ||
    (rawEmail ? employees.find((emp) => emp.email.toLowerCase() === rawEmail) : undefined);

  if (matched) {
    if (matched.status === "suspended") {
      throw new InvalidCrmOwnerError(
        `Cannot assign lead to suspended employee account (${matched.email}).`
      );
    }
    return {
      ownerId: matched.id,
      ownerEmail: matched.email,
      ownerName: matched.fullName,
      ownerDepartment: matched.department,
    };
  }

  // If the caller has visibility into the employee directory (or in offline staging mode)
  // and no employee matched, reject invalid owner IDs explicitly instead of silently failing FK.
  if (employees.length > 1 || isLocalFallbackAllowed()) {
    throw new InvalidCrmOwnerError(
      `Invalid lead owner: no active employee matched "${rawId || rawEmail}".`
    );
  }

  if (rawId && !UUID_PATTERN.test(rawId)) {
    throw new InvalidCrmOwnerError(`Invalid owner identifier "${rawId}".`);
  }

  return {
    ownerId: rawId || null,
    ownerEmail: rawEmail || null,
    ownerName: input.ownerName?.trim() || null,
    ownerDepartment: input.ownerDepartment?.trim() || null,
  };
}

export async function listCrmLeads(): Promise<CrmLeadRecord[]> {
  const combined = new Map<string, CrmLeadRecord>();
  const normalizedIds = new Set<string>();
  const normalizedRefs = new Set<string>();

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
    // Hydrate owner metadata (including department for Team scope) in isolated staging/test mode
    const localEmployees = await listEmployees().catch(() => []);
    if (localEmployees.length > 0) {
      for (const [id, item] of combined.entries()) {
        if (!item.ownerId && !item.ownerEmail) continue;
        const emp =
          (item.ownerId
            ? localEmployees.find((e) => e.id === item.ownerId || e.authUserId === item.ownerId)
            : undefined) ||
          (item.ownerEmail
            ? localEmployees.find(
                (e) => e.email.toLowerCase() === item.ownerEmail!.toLowerCase()
              )
            : undefined);
        if (emp) {
          combined.set(id, {
            ...item,
            ownerId: emp.id,
            ownerEmail: emp.email,
            ownerName: emp.fullName,
            ownerDepartment: emp.department,
          });
        }
      }
    }
  }

  // 3. Load from Supabase (normalized crm_leads is authoritative; legacy channels only supply unmigrated rows)
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();

      // Normalized Phase 1 schema (enforced by PostgreSQL RLS per role/scope)
      const { data: normRows, error: normErr } = await supabase
        .from("crm_leads")
        .select(
          "*, crm_companies(name), crm_contacts(full_name, email, phone, role_title, locale, consent, consent_at), employees(id, email, full_name, department)"
        )
        .order("created_at", { ascending: false });

      if (!normErr && Array.isArray(normRows)) {
        const missingOwnerIds = new Set<string>();
        for (const row of normRows) {
          const parsed = mapNormalizedLeadRow(row as Record<string, unknown>);
          if (parsed) {
            combined.set(parsed.id, parsed);
            normalizedIds.add(parsed.id);
            normalizedRefs.add(parsed.referenceId);
            if (parsed.ownerId && (!parsed.ownerName || !parsed.ownerDepartment)) {
              missingOwnerIds.add(parsed.ownerId);
            }
            if (parsed.scheduledSlotIso && parsed.stage !== "lost") {
              reservedSlotIsos.add(new Date(parsed.scheduledSlotIso).toISOString());
            }
          }
        }

        // Resolve owner display metadata for authorized leads when caller lacks team:view
        // (avoids falsely rendering "Owner: Unassigned" due to employees_select_rbac).
        if (missingOwnerIds.size > 0) {
          try {
            const { data: ownerMeta, error: ownerMetaErr } = await supabase.rpc(
              "hirzexa_resolve_lead_owners",
              { p_owner_ids: Array.from(missingOwnerIds) }
            );
            if (!ownerMetaErr && Array.isArray(ownerMeta)) {
              const ownerById = new Map<
                string,
                { fullName: string; email: string; department: string }
              >();
              for (const rawOwner of ownerMeta as Array<Record<string, unknown>>) {
                if (rawOwner.id) {
                  ownerById.set(String(rawOwner.id), {
                    fullName: String(rawOwner.full_name || ""),
                    email: String(rawOwner.email || ""),
                    department: String(rawOwner.department || ""),
                  });
                }
              }
              for (const [id, lead] of combined.entries()) {
                if (lead.ownerId && ownerById.has(lead.ownerId)) {
                  const meta = ownerById.get(lead.ownerId)!;
                  combined.set(id, {
                    ...lead,
                    ownerName: lead.ownerName || meta.fullName || null,
                    ownerEmail: lead.ownerEmail || meta.email || null,
                    ownerDepartment: lead.ownerDepartment || meta.department || null,
                  });
                }
              }
            }
          } catch {
            // Optional RPC before 20261121 SQL migration is applied.
          }
        }
      }

      // Legacy live Supabase channel (`visitor_events` with path LIKE '/__crm_lead__/%')
      // NEVER overwrite normalized crm_leads rows; only supply unmigrated legacy records.
      const { data: eventRows, error: eventErr } = await supabase
        .from("visitor_events")
        .select("visitor_id, path, job_slug, created_at")
        .like("path", "/__crm_lead__/%")
        .order("created_at", { ascending: true });

      if (!eventErr && Array.isArray(eventRows)) {
        const legacyById = new Map<string, CrmLeadRecord>();
        for (const row of eventRows) {
          if (!row.job_slug) continue;
          try {
            const parsed = JSON.parse(String(row.job_slug)) as CrmLeadRecord;
            if (
              parsed &&
              parsed.id &&
              parsed.referenceId &&
              !normalizedIds.has(parsed.id) &&
              !normalizedRefs.has(parsed.referenceId)
            ) {
              legacyById.set(parsed.id, parsed);
            }
          } catch {}
        }
        for (const [id, parsed] of legacyById.entries()) {
          combined.set(id, parsed);
          if (parsed.scheduledSlotIso && parsed.stage !== "lost") {
            reservedSlotIsos.add(new Date(parsed.scheduledSlotIso).toISOString());
          }
        }
      }

      // Secondary table (`ai_leads` if migrated) — never overwrite normalized crm_leads
      const { data, error } = await supabase
        .from("ai_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const parsed = parseAiLeadRowToCrm(row as Record<string, unknown>);
          if (
            parsed &&
            !combined.has(parsed.id) &&
            !normalizedRefs.has(parsed.referenceId)
          ) {
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
  ownerId?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  ownerDepartment?: string | null;
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

  const resolvedInitialOwner =
    input.ownerId !== undefined || input.ownerEmail !== undefined
      ? await resolveCanonicalCrmOwner({
          ownerId: input.ownerId,
          ownerEmail: input.ownerEmail,
          ownerName: input.ownerName,
          ownerDepartment: input.ownerDepartment,
        })
      : { ownerId: null, ownerEmail: null, ownerName: null, ownerDepartment: null };

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
    ownerId: resolvedInitialOwner.ownerId,
    ownerEmail: resolvedInitialOwner.ownerEmail,
    ownerName: resolvedInitialOwner.ownerName,
    ownerDepartment: resolvedInitialOwner.ownerDepartment,
    notes: "",
    activities: initialActivities,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    let insertedNormalizedWithOwner = false;

    // When an authenticated staff member creates an owned CRM opportunity, insert directly
    // into normalized crm_leads with owner_employee_id set atomically so Assigned-scope reps
    // never create an unowned row blocked by their own RLS SELECT/UPDATE policy.
    if (lead.ownerId) {
      try {
        let companyId: string | null = null;
        const normCompName = lead.company.trim().toLowerCase().replace(/\s+/g, " ");
        if (normCompName) {
          const { data: compRow } = await supabase
            .from("crm_companies")
            .upsert(
              { name: lead.company.trim(), normalized_name: normCompName, updated_at: nowIso },
              { onConflict: "normalized_name" }
            )
            .select("id")
            .maybeSingle();
          companyId = compRow?.id ? String(compRow.id) : null;
        }

        const { data: contactRow } = await supabase
          .from("crm_contacts")
          .upsert(
            {
              company_id: companyId,
              full_name: lead.fullName.trim(),
              email: lead.email.toLowerCase(),
              phone: lead.phone || null,
              role_title: lead.roleTitle || null,
              locale: lead.locale,
              consent: lead.consent,
              consent_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "email" }
          )
          .select("id")
          .maybeSingle();
        const contactId = contactRow?.id ? String(contactRow.id) : null;

        const { error: directLeadErr } = await supabase.from("crm_leads").insert({
          id: lead.id,
          reference_id: lead.referenceId,
          company_id: companyId,
          contact_id: contactId,
          owner_employee_id: lead.ownerId,
          lead_type: lead.leadType,
          stage: lead.stage,
          service_track: lead.serviceTrack,
          budget_range: lead.budgetRange || null,
          timeline: lead.timeline || null,
          duration_minutes: lead.durationMinutes,
          scheduled_slot_iso: lead.scheduledSlotIso || null,
          preferred_window: lead.preferredWindow || null,
          timezone: lead.timezone || "UTC",
          meeting_link: lead.meetingLink || null,
          project_summary: lead.projectSummary,
          current_stack: lead.currentStack || null,
          next_follow_up_at: lead.nextFollowUpAt || null,
          notes: lead.notes,
          activities: lead.activities,
        });

        if (!directLeadErr) {
          insertedNormalizedWithOwner = true;
          try {
            await supabase.from("crm_stage_history").insert({
              lead_id: lead.id,
              from_stage: null,
              to_stage: lead.stage,
              changed_by: lead.ownerEmail || lead.email,
              reason: "Created in HIRZEXA Sales CRM",
            });
          } catch {}
        }
      } catch {}
    }

    let persistedNormalized = insertedNormalizedWithOwner;

    if (!insertedNormalizedWithOwner) {
      try {
        // 1. Primary normalized Phase 1 RPC (safe for unauthenticated public submissions under strict RLS)
        const { error: rpcErr } = await supabase.rpc("ingest_public_crm_lead", {
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

        if (!rpcErr) {
          persistedNormalized = true;
        }

        if (lead.ownerId) {
          await supabase
            .from("crm_leads")
            .update({ owner_employee_id: lead.ownerId })
            .eq("id", lead.id);
        }
      } catch {}
    }

    // 2. Legacy visitor_events fallback ONLY if normalized crm_leads persistence failed
    //    (prevents duplicating customer PII into visitor_events once Phase 1 schema is active)
    if (!persistedNormalized) {
      try {
        await supabase.from("visitor_events").insert({
          visitor_id: `crm:${lead.id}`,
          path: `/__crm_lead__/${lead.referenceId}`,
          job_slug: JSON.stringify(lead),
        });
      } catch {}
    }

    // 3. Secondary table (`ai_leads` if migrated)
    try {
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
    timezone?: string;
    meetingLink?: string;
    activityNote?: string;
    sendReminder?: boolean;
    ownerId?: string | null;
    ownerEmail?: string | null;
    ownerName?: string | null;
    ownerDepartment?: string | null;
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

  let nextOwnerId = current.ownerId ?? null;
  let nextOwnerEmail = current.ownerEmail ?? null;
  let nextOwnerName = current.ownerName ?? null;
  let nextOwnerDepartment = current.ownerDepartment ?? null;

  if (patch.ownerId !== undefined || patch.ownerEmail !== undefined) {
    if (patch.ownerId === null && (patch.ownerEmail === undefined || patch.ownerEmail === null)) {
      nextOwnerId = null;
      nextOwnerEmail = null;
      nextOwnerName = null;
      nextOwnerDepartment = null;
    } else {
      const resolvedOwner = await resolveCanonicalCrmOwner({
        ownerId: patch.ownerId !== undefined ? patch.ownerId : current.ownerId,
        ownerEmail: patch.ownerEmail !== undefined ? patch.ownerEmail : current.ownerEmail,
        ownerName: patch.ownerName !== undefined ? patch.ownerName : current.ownerName,
        ownerDepartment:
          patch.ownerDepartment !== undefined ? patch.ownerDepartment : current.ownerDepartment,
      });
      nextOwnerId = resolvedOwner.ownerId;
      nextOwnerEmail = resolvedOwner.ownerEmail;
      nextOwnerName = resolvedOwner.ownerName;
      nextOwnerDepartment = resolvedOwner.ownerDepartment;
    }

    const ownerChanged =
      nextOwnerId !== (current.ownerId ?? null) ||
      (nextOwnerEmail || null) !== (current.ownerEmail || null);
    if (ownerChanged) {
      nextActivities.unshift({
        id: randomUUID(),
        type: "follow_up",
        summary: nextOwnerId
          ? `Assigned lead owner to ${nextOwnerName || nextOwnerEmail || nextOwnerId}`
          : "Unassigned lead owner",
        actor,
        createdAt: nowIso,
      });
    }
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

  if (patch.sendReminder) {
    // Internal CRM reminder logging ONLY — never claim a client email was sent here.
    nextActivities.unshift({
      id: randomUUID(),
      type: "note",
      summary: "Internal CRM follow-up reminder logged (internal task/note only — no email sent to client).",
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
    timezone: patch.timezone !== undefined && patch.timezone.trim() ? patch.timezone.trim() : current.timezone,
    meetingLink: patch.meetingLink !== undefined ? patch.meetingLink : current.meetingLink,
    ownerId: nextOwnerId,
    ownerEmail: nextOwnerEmail,
    ownerName: nextOwnerName,
    ownerDepartment: nextOwnerDepartment,
    reminder24hSent: current.reminder24hSent,
    activities: nextActivities,
    updatedAt: nowIso,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const updatePayload = {
      stage: updated.stage,
      notes: updated.notes,
      next_follow_up_at: updated.nextFollowUpAt || null,
      scheduled_slot_iso: updated.scheduledSlotIso || null,
      timezone: updated.timezone || "UTC",
      meeting_link: updated.meetingLink || null,
      owner_employee_id: updated.ownerId || null,
      activities: updated.activities,
      updated_at: updated.updatedAt,
    };

    // 1. Authoritative update on normalized public.crm_leads (enforced by PostgreSQL RLS)
    let { data: updatedRows, error: normUpdateErr } = await supabase
      .from("crm_leads")
      .update(updatePayload)
      .eq("id", updated.id)
      .select("id, owner_employee_id");

    if (normUpdateErr) {
      throw new CrmPersistenceError(
        `Failed to update normalized CRM lead (${normUpdateErr.code || "DB_ERROR"}): ${normUpdateErr.message}`
      );
    }

    // If 0 rows matched in crm_leads, this lead originated in legacy visitor_events or ai_leads.
    // Promote it cleanly into normalized public.crm_leads so Assigned/Team RLS works immediately.
    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      const { error: promoteErr } = await supabase.rpc("ingest_public_crm_lead", {
        p_id: updated.id,
        p_reference_id: updated.referenceId,
        p_lead_type: updated.leadType,
        p_stage: updated.scheduledSlotIso ? "meeting_booked" : "new_lead",
        p_full_name: updated.fullName || "Client Contact",
        p_email: updated.email || "unknown@hirzexa.com",
        p_phone: updated.phone || null,
        p_company: updated.company || "",
        p_role_title: updated.roleTitle || null,
        p_service_track: updated.serviceTrack || "AI & Software Engineering",
        p_budget_range: updated.budgetRange || null,
        p_timeline: updated.timeline || null,
        p_duration_minutes: updated.durationMinutes,
        p_scheduled_slot_iso: updated.scheduledSlotIso || null,
        p_preferred_window: updated.preferredWindow || null,
        p_timezone: updated.timezone || "UTC",
        p_meeting_link: updated.meetingLink || null,
        p_project_summary: updated.projectSummary || "",
        p_current_stack: updated.currentStack || null,
        p_consent: updated.consent ?? true,
        p_locale: updated.locale || "en",
        p_activities: updated.activities,
      });

      if (promoteErr) {
        throw new CrmPersistenceError(
          `Unable to normalize legacy CRM lead into crm_leads: ${promoteErr.message}`
        );
      }

      const retryRes = await supabase
        .from("crm_leads")
        .update(updatePayload)
        .eq("id", updated.id)
        .select("id, owner_employee_id");

      updatedRows = retryRes.data;
      normUpdateErr = retryRes.error;

      if (normUpdateErr || !Array.isArray(updatedRows) || updatedRows.length === 0) {
        throw new CrmPersistenceError(
          normUpdateErr
            ? `Failed to persist CRM lead update after normalization: ${normUpdateErr.message}`
            : "CRM lead update affected 0 rows (blocked by RLS or record does not exist)."
        );
      }
    }

    if (nextStage !== current.stage) {
      try {
        await supabase.from("crm_stage_history").insert({
          lead_id: updated.id,
          from_stage: current.stage,
          to_stage: nextStage,
          changed_by: actor,
          reason: patch.activityNote?.trim() || "Stage transition via HIRZEXA CRM",
        });
      } catch {}
    }

    // 2. Best-effort backwards-compatible mirrors (never authoritative over crm_leads)
    try {
      await supabase.from("visitor_events").insert({
        visitor_id: `crm:${updated.id}`,
        path: `/__crm_lead__/${updated.referenceId}`,
        job_slug: JSON.stringify(updated),
      });
    } catch {}

    try {
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

  if (isLocalFallbackAllowed()) {
    memoryLeads.set(updated.id, updated);
    await writeLocalLead(updated);
  }

  return updated;
}

/**
 * Appends a single truthful activity timeline entry to a CRM lead.
 * Uses the privileged service client when available so booking automation
 * and background reminder workers can record verified email events safely.
 */
export async function appendLeadActivityEvent(
  leadId: string,
  entry: {
    type: CrmActivityItem["type"];
    summary: string;
    actor: string;
  }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const item: CrmActivityItem = {
    id: randomUUID(),
    type: entry.type,
    summary: entry.summary.slice(0, 400),
    actor: entry.actor.slice(0, 120),
    createdAt: nowIso,
  };

  if (isSupabaseConfigured()) {
    try {
      const client = await createPrivilegedOrServerSupabaseClient();
      const { data } = await client
        .from("crm_leads")
        .select("activities")
        .eq("id", leadId)
        .maybeSingle();
      if (data) {
        const current = Array.isArray(data.activities)
          ? (data.activities as CrmActivityItem[])
          : [];
        await client
          .from("crm_leads")
          .update({
            activities: [item, ...current].slice(0, 150),
            updated_at: nowIso,
          })
          .eq("id", leadId);
      }
    } catch {}
  }

  if (isLocalFallbackAllowed()) {
    const leads = await readLocalLeads();
    const existing = leads.find((l) => l.id === leadId) || memoryLeads.get(leadId);
    if (existing) {
      const next: CrmLeadRecord = {
        ...existing,
        activities: [item, ...existing.activities].slice(0, 150),
        updatedAt: nowIso,
      };
      memoryLeads.set(next.id, next);
      await writeLocalLead(next);
    }
  }
}
