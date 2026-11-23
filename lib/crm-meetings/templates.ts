import { COMPANY_EMAILS } from "@/lib/company-emails";
import { buildCalendarLinks, createBookingIcsSignature } from "@/lib/crm";
import type { CrmLeadRecord } from "@/lib/crm-types";
import {
  canonicalizeUserFacingUrl,
  getMeetingsReplyToAddress,
  getMeetingsSenderAddress,
  OFFICIAL_WEBSITE_URL,
} from "@/lib/email/transactional";
import type { MeetingEmailTemplateType, RenderedMeetingEmail } from "@/lib/crm-meetings/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips CR/LF/NUL control characters to prevent email header injection. */
export function sanitizeHeaderField(value: string, maxLen = 220): string {
  return value
    .replace(/[\r\n\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Strips dangerous control chars while preserving clean paragraph line breaks. */
export function sanitizePlainBody(value: string, maxLen = 6000): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function isValidTimezone(tz: string | null | undefined): boolean {
  if (!tz || typeof tz !== "string" || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz.trim() }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(tz: string | null | undefined): string {
  return isValidTimezone(tz) ? tz!.trim() : "UTC";
}

export function formatMeetingDateTime(
  slotIso: string | null | undefined,
  timezone: string | null | undefined,
  locale: "en" | "ar" = "en"
): { display: string; utcDisplay: string; timezone: string } | null {
  if (!slotIso) return null;
  const date = new Date(slotIso);
  if (Number.isNaN(date.getTime())) return null;
  const tz = normalizeTimezone(timezone);
  const display = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short",
  }).format(date);
  const utcDisplay = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
  return { display, utcDisplay: `${utcDisplay} UTC`, timezone: tz };
}

/**
 * Returns a verified safe HTTP(S) meeting link only if it is an actual URL (never fabricated).
 * Distinguishes direct video/calendar joining links from generic booking reference links.
 */
export function normalizeConfirmedMeetingLink(rawLink: string | null | undefined): {
  url: string | null;
  isDirectJoinUrl: boolean;
} {
  const trimmed = (rawLink || "").trim();
  if (!trimmed) return { url: null, isDirectJoinUrl: false };
  try {
    const canonical = canonicalizeUserFacingUrl(trimmed);
    const parsed = new URL(canonical);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { url: null, isDirectJoinUrl: false };
    }
    const isGenericBookingFallback =
      parsed.hostname.toLowerCase().endsWith("hirzexa.com") &&
      parsed.pathname.toLowerCase().startsWith("/book");
    return {
      url: parsed.toString(),
      isDirectJoinUrl: !isGenericBookingFallback,
    };
  } catch {
    return { url: null, isDirectJoinUrl: false };
  }
}

function getSafeCanonicalOrigin(): string {
  const raw = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || OFFICIAL_WEBSITE_URL;
  try {
    const parsed = new URL(canonicalizeUserFacingUrl(raw));
    const host = parsed.hostname.toLowerCase();
    if (
      parsed.protocol === "https:" &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      host !== "0.0.0.0"
    ) {
      return parsed.origin.replace(/\/$/, "");
    }
  } catch {}
  return OFFICIAL_WEBSITE_URL;
}

function paragraphsToSafeHtml(plainText: string, ar: boolean): string {
  const blocks = plainText
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks
    .map((block) => {
      const escaped = escapeHtml(block).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.68;color:#1e293b;text-align:${ar ? "right" : "left"};">${escaped}</p>`;
    })
    .join("\n");
}

function buildMeetingTitle(lead: CrmLeadRecord, ar: boolean): string {
  if (lead.leadType === "discovery_call") {
    return ar
      ? `جلسة الاكتشاف الهندسية (${lead.durationMinutes} دقيقة) — ${lead.serviceTrack}`
      : `HIRZEXA Discovery Call (${lead.durationMinutes} min) — ${lead.serviceTrack}`;
  }
  return ar
    ? `مراجعة مشروع ${lead.serviceTrack} مع HIRZEXA`
    : `HIRZEXA Consultation — ${lead.serviceTrack}`;
}

export interface RenderMeetingEmailOptions {
  lead: CrmLeadRecord;
  templateType: MeetingEmailTemplateType;
  locale?: "en" | "ar";
  customSubject?: string;
  customBody?: string;
  previousSlotIso?: string | null;
  cancellationReason?: string;
  rescheduleReason?: string;
  senderName?: string | null;
}

/**
 * Generates responsive HIRZEXA-branded HTML + clean plain-text meeting emails.
 * Strictly escapes all dynamic inputs and never fabricates missing links,
 * employee identities, prices, or promises.
 */
export function renderMeetingEmailTemplate(
  options: RenderMeetingEmailOptions
): RenderedMeetingEmail {
  const { lead, templateType } = options;
  const locale: "en" | "ar" = options.locale || lead.locale || "en";
  const ar = locale === "ar";
  const origin = getSafeCanonicalOrigin();
  const from = getMeetingsSenderAddress();
  const replyTo = getMeetingsReplyToAddress();
  const meetingTitle = buildMeetingTitle(lead, ar);
  const formattedSlot = formatMeetingDateTime(lead.scheduledSlotIso, lead.timezone, locale);
  const previousFormatted = formatMeetingDateTime(options.previousSlotIso, lead.timezone, locale);
  const linkInfo = normalizeConfirmedMeetingLink(lead.meetingLink);
  const assignedOwnerDisplay = lead.ownerName?.trim() || null;

  const calendarLinks =
    lead.scheduledSlotIso && templateType !== "meeting_cancelled"
      ? buildCalendarLinks(lead)
      : null;
  const signedIcsUrl =
    lead.scheduledSlotIso && templateType !== "meeting_cancelled"
      ? `${origin}/api/bookings/ics?ref=${encodeURIComponent(lead.referenceId)}&sig=${encodeURIComponent(
          createBookingIcsSignature(lead.referenceId)
        )}`
      : null;

  const rescheduleMailto = `mailto:${COMPANY_EMAILS.business}?subject=${encodeURIComponent(
    `Reschedule Request — ${lead.referenceId}`
  )}`;
  const cancelMailto = `mailto:${COMPANY_EMAILS.business}?subject=${encodeURIComponent(
    `Cancel Meeting — ${lead.referenceId}`
  )}`;
  const bookNewUrl = `${origin}/book`;

  let badgeLabel = ar ? "تواصل الاجتماعات" : "MEETING COMMUNICATIONS";
  const headline = ar ? `مرحباً ${lead.fullName}` : `Hello ${lead.fullName},`;
  let defaultSubject = "";
  let defaultEditableBody = "";
  let showMeetingCard = Boolean(formattedSlot);
  let showCalendarActions = false;
  let includeIcsAttachment = false;

  switch (templateType) {
    case "meeting_confirmation": {
      badgeLabel = ar ? "تأكيد جلسة الاكتشاف" : "MEETING CONFIRMED";
      defaultSubject = ar
        ? `تأكيد الموعد: ${meetingTitle} (${lead.referenceId})`
        : `Confirmed: ${meetingTitle} (${lead.referenceId})`;
      defaultEditableBody = ar
        ? `شكراً لحجزك مع HIRZEXA. تم تأكيد موعد جلسة الاكتشاف الهندسية لمناقشة متطلبات ${lead.company || "مشروعكم"} في مسار ${lead.serviceTrack}.\n\nيرجى استخدام تفاصيل الاجتماع أدناه أو إضافة الموعد إلى تقويمك. إذا احتجت إلى تعديل الموعد أو إلغائه، يمكنك الرد مباشرة على هذا البريد.`
        : `Thank you for scheduling with HIRZEXA. Your engineering discovery call for ${lead.company || "your project"} (${lead.serviceTrack}) is confirmed.\n\nPlease review the meeting details below and add the session to your calendar. If you need to reschedule or cancel, simply reply to this email or use the links below.`;
      showMeetingCard = true;
      showCalendarActions = Boolean(formattedSlot);
      includeIcsAttachment = Boolean(formattedSlot);
      break;
    }

    case "meeting_reminder_24h": {
      badgeLabel = ar ? "تذكير قبل 24 ساعة" : "MEETING REMINDER · 24 HOURS";
      defaultSubject = ar
        ? `تذكير (خلال 24 ساعة): ${meetingTitle} (${lead.referenceId})`
        : `Reminder (Tomorrow): ${meetingTitle} — ${lead.referenceId}`;
      defaultEditableBody = ar
        ? `هذا تذكير ودي بأن جلسة الاكتشاف مع فريق HIRZEXA ستُعقد خلال 24 ساعة. نتطلع لمراجعة متطلبات مشروعكم والإجابة عن أسئلتكم الهندسية.\n\nإذا طرأ أي تغيير على جدولكم، يرجى الرد على هذا البريد لإعادة الجدولة.`
        : `This is a friendly reminder that your HIRZEXA Discovery Call is scheduled for tomorrow (in approximately 24 hours). We look forward to reviewing your objectives and technical requirements.\n\nIf anything changes in your schedule, reply directly to this email and we will gladly reschedule.`;
      showMeetingCard = true;
      showCalendarActions = Boolean(formattedSlot);
      includeIcsAttachment = false;
      break;
    }

    case "meeting_reminder_1h": {
      badgeLabel = ar ? "تذكير قبل ساعة واحدة" : "MEETING REMINDER · 1 HOUR";
      defaultSubject = ar
        ? `تذكير (خلال ساعة واحدة): ${meetingTitle} (${lead.referenceId})`
        : `Starting in 1 Hour: ${meetingTitle} — ${lead.referenceId}`;
      defaultEditableBody = ar
        ? `تذكير سريع بأن جلسة الاكتشاف مع فريق HIRZEXA ستبدأ خلال ساعة واحدة. يمكنك الانضمام باستخدام تفاصيل الاجتماع أدناه.`
        : `Quick reminder that your HIRZEXA Discovery Call starts in approximately 1 hour. You can join using the confirmed meeting details below.`;
      showMeetingCard = true;
      showCalendarActions = false;
      includeIcsAttachment = false;
      break;
    }

    case "meeting_reminder_custom": {
      badgeLabel = ar ? "تذكير بالموعد" : "UPCOMING MEETING REMINDER";
      defaultSubject = ar
        ? `تذكير بالموعد: ${meetingTitle} (${lead.referenceId})`
        : `Upcoming Meeting Reminder: ${meetingTitle} — ${lead.referenceId}`;
      defaultEditableBody = ar
        ? `نود تذكيركم بموعد جلستكم القادمة مع فريق HIRZEXA. تجدون تفاصيل الموعد أدناه، ويسعدنا تواصلكم عند الحاجة لأي تنسيق إضافي.`
        : `This is a reminder for your upcoming consultation with HIRZEXA. Your confirmed meeting details are included below. Please reply directly if you need any adjustments.`;
      showMeetingCard = true;
      showCalendarActions = Boolean(formattedSlot);
      includeIcsAttachment = false;
      break;
    }

    case "meeting_rescheduled": {
      badgeLabel = ar ? "تحديث موعد الاجتماع" : "MEETING RESCHEDULED";
      defaultSubject = ar
        ? `تحديث الموعد: ${meetingTitle} (${lead.referenceId})`
        : `Rescheduled: ${meetingTitle} — ${lead.referenceId}`;
      const reasonLine = options.rescheduleReason?.trim()
        ? ar
          ? `\n\nملاحظة: ${options.rescheduleReason.trim()}`
          : `\n\nNote: ${options.rescheduleReason.trim()}`
        : "";
      defaultEditableBody = ar
        ? `تم تحديث موعد جلسة الاكتشاف الخاصة بكم مع HIRZEXA. يرجى اعتماد الوقت الجديد الموضح أدناه واستخدام ملف التقويم المحدّث.${reasonLine}`
        : `Your HIRZEXA Discovery Call has been rescheduled to a new time. Please review the updated details below and refresh your calendar using the attached invitation.${reasonLine}`;
      showMeetingCard = true;
      showCalendarActions = Boolean(formattedSlot);
      includeIcsAttachment = Boolean(formattedSlot);
      break;
    }

    case "meeting_cancelled": {
      badgeLabel = ar ? "إلغاء الاجتماع" : "MEETING CANCELLED";
      defaultSubject = ar
        ? `إلغاء الموعد: ${meetingTitle} (${lead.referenceId})`
        : `Cancelled: ${meetingTitle} — ${lead.referenceId}`;
      const reasonLine = options.cancellationReason?.trim()
        ? ar
          ? `\n\nالسبب: ${options.cancellationReason.trim()}`
          : `\n\nReason: ${options.cancellationReason.trim()}`
        : "";
      defaultEditableBody = ar
        ? `نؤكد لكم إلغاء جلسة الاكتشاف الهندسية المرجعية (${lead.referenceId}) ولن يتم إرسال أي تذكيرات إضافية لهذا الموعد.${reasonLine}\n\nإذا رغبتم في حجز موعد بديل في أي وقت، يمكنكم اختيار وقت مناسب عبر صفحة الحجز أو الرد مباشرة على هذا البريد.`
        : `This confirms that your scheduled HIRZEXA Discovery Call (${lead.referenceId}) has been cancelled, and no further reminders will be sent for this slot.${reasonLine}\n\nWhenever you are ready to book a new time, you can select an open slot on our booking page or reply directly to this email.`;
      showMeetingCard = Boolean(previousFormatted || formattedSlot);
      showCalendarActions = false;
      includeIcsAttachment = false;
      break;
    }

    case "post_meeting_followup": {
      badgeLabel = ar ? "متابعة ما بعد الاجتماع" : "POST-MEETING FOLLOW-UP";
      defaultSubject = ar
        ? `متابعة جلستنا — ${lead.company || lead.fullName} × HIRZEXA (${lead.referenceId})`
        : `Thank you & Next Steps — ${lead.company || lead.fullName} × HIRZEXA (${lead.referenceId})`;
      const signer = options.senderName?.trim() || assignedOwnerDisplay || "HIRZEXA Engineering Team";
      defaultEditableBody = ar
        ? `شكراً لوقتك في مناقشة مشروع ${lead.company || "فريقكم"} ضمن مسار ${lead.serviceTrack}.\n\nبناءً على النطاق المسجل لدينا، سنقوم بمراجعة المتطلبات الفنية ومشاركة الخطوات التالية المقترحة. يرجى الرد بأي مستندات أو تفاصيل إضافية تودون إضافتها.\n\nمع خالص التحية،\n${signer}\nHIRZEXA`
        : `Thank you for taking the time to speak with us about ${lead.company || "your initiative"} (${lead.serviceTrack}).\n\nBased on the project requirements we reviewed, our team is organizing the next technical steps. Please reply with any additional context or questions you would like us to incorporate.\n\nBest regards,\n${signer}\nHIRZEXA`;
      showMeetingCard = false;
      showCalendarActions = false;
      includeIcsAttachment = false;
      break;
    }

    case "custom_email": {
      badgeLabel = ar ? "تواصل HIRZEXA" : "HIRZEXA CLIENT COMMUNICATION";
      defaultSubject = ar
        ? `تحديث بخصوص ${lead.company || lead.fullName} — HIRZEXA (${lead.referenceId})`
        : `Regarding ${lead.company || lead.fullName} — HIRZEXA (${lead.referenceId})`;
      const signer = options.senderName?.trim() || assignedOwnerDisplay || "HIRZEXA Team";
      defaultEditableBody = ar
        ? `نتواصل معكم بخصوص طلبكم (${lead.referenceId}) في مسار ${lead.serviceTrack}.\n\nيرجى إعلامنا بالوقت الأنسب لكم أو بأي متطلبات إضافية.\n\nمع التحية،\n${signer}\nHIRZEXA`
        : `We are reaching out regarding your ${lead.serviceTrack} inquiry (${lead.referenceId}).\n\nPlease let us know if you have any questions or updates we should review together.\n\nBest regards,\n${signer}\nHIRZEXA`;
      showMeetingCard = Boolean(formattedSlot);
      showCalendarActions = false;
      includeIcsAttachment = false;
      break;
    }
  }

  const subject = sanitizeHeaderField(options.customSubject?.trim() || defaultSubject);
  const editableBody = sanitizePlainBody(options.customBody?.trim() || defaultEditableBody);

  // Build structured meeting detail rows (only including real, confirmed facts — never fabricated)
  const detailRows: Array<{ label: string; value: string; href?: string; ltr?: boolean }> = [];
  if (showMeetingCard) {
    detailRows.push({
      label: ar ? "الاجتماع" : "Meeting",
      value: meetingTitle,
    });
    detailRows.push({
      label: ar ? "الرقم المرجعي" : "Reference ID",
      value: lead.referenceId,
      ltr: true,
    });
    if (templateType === "meeting_rescheduled" && previousFormatted) {
      detailRows.push({
        label: ar ? "الموعد السابق" : "Previous Time",
        value: `${previousFormatted.display} (${previousFormatted.timezone})`,
      });
    }
    if (templateType === "meeting_cancelled" && (previousFormatted || formattedSlot)) {
      const cancelledSlot = previousFormatted || formattedSlot!;
      detailRows.push({
        label: ar ? "الموعد الملغى" : "Cancelled Slot",
        value: `${cancelledSlot.display} (${cancelledSlot.timezone})`,
      });
    } else if (formattedSlot) {
      detailRows.push({
        label: ar ? "التاريخ والوقت" : "Date & Time",
        value: `${formattedSlot.display} (${formattedSlot.timezone}) · ${formattedSlot.utcDisplay}`,
      });
    } else if (lead.preferredWindow) {
      detailRows.push({
        label: ar ? "النافذة المفضلة" : "Preferred Window",
        value: `${lead.preferredWindow} (${normalizeTimezone(lead.timezone)})`,
      });
    }
    if (templateType !== "meeting_cancelled" && linkInfo.url && linkInfo.isDirectJoinUrl) {
      detailRows.push({
        label: ar ? "رابط الاجتماع" : "Joining Link",
        value: linkInfo.url,
        href: linkInfo.url,
        ltr: true,
      });
    }
    if (assignedOwnerDisplay) {
      detailRows.push({
        label: ar ? "المسؤول المعيّن" : "HIRZEXA Host",
        value: assignedOwnerDisplay,
      });
    }
  }

  const detailTableHtml =
    detailRows.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;border-collapse:separate;border-spacing:0;background:#f4f7ff;border:1px solid #d9e2fb;border-radius:12px;">
          ${detailRows
            .map(
              (row, idx) => `<tr>
                <td style="padding:11px 16px;font-size:13px;font-weight:600;color:#475569;width:34%;vertical-align:top;${
                  idx > 0 ? "border-top:1px solid #e2e8f6;" : ""
                }">${escapeHtml(row.label)}</td>
                <td style="padding:11px 16px;font-size:13.5px;font-weight:600;color:#0f172a;vertical-align:top;word-break:break-word;${
                  idx > 0 ? "border-top:1px solid #e2e8f6;" : ""
                }"${row.ltr ? ' dir="ltr"' : ""}>${
                  row.href
                    ? `<a href="${escapeHtml(row.href)}" style="color:#1050ff;text-decoration:underline;">${escapeHtml(row.value)}</a>`
                    : escapeHtml(row.value)
                }</td>
              </tr>`
            )
            .join("")}
        </table>`
      : "";

  const calendarButtonsHtml =
    showCalendarActions && calendarLinks
      ? `<div style="margin:20px 0 8px;">
          ${
            linkInfo.url && linkInfo.isDirectJoinUrl
              ? `<a href="${escapeHtml(linkInfo.url)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:9px;background:#1050ff;color:#ffffff;font-size:13.5px;font-weight:700;text-decoration:none;">${
                  ar ? "الانضمام للاجتماع" : "Join Meeting"
                }</a>`
              : ""
          }
          <a href="${escapeHtml(calendarLinks.googleUrl)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 15px;border-radius:9px;background:#0f172a;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">${
            ar ? "إضافة إلى تقويم Google" : "Add to Google Calendar"
          }</a>
          <a href="${escapeHtml(calendarLinks.outlookUrl)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 15px;border-radius:9px;background:#e8eefc;color:#1050ff;font-size:13px;font-weight:600;text-decoration:none;">${
            ar ? "إضافة إلى Outlook" : "Add to Outlook"
          }</a>
          ${
            signedIcsUrl
              ? `<a href="${escapeHtml(signedIcsUrl)}" style="display:inline-block;margin:0 0 8px 0;padding:10px 15px;border-radius:9px;border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;font-size:13px;font-weight:600;text-decoration:none;">${
                  ar ? "تنزيل ملف .ics" : "Download .ics"
                }</a>`
              : ""
          }
        </div>`
      : templateType === "meeting_cancelled"
      ? `<div style="margin:20px 0 8px;">
          <a href="${escapeHtml(bookNewUrl)}" style="display:inline-block;padding:11px 18px;border-radius:9px;background:#1050ff;color:#ffffff;font-size:13.5px;font-weight:700;text-decoration:none;">${
            ar ? "حجز موعد جديد" : "Book a New Time"
          }</a>
        </div>`
      : linkInfo.url && linkInfo.isDirectJoinUrl && templateType !== "post_meeting_followup" && templateType !== "custom_email"
      ? `<div style="margin:20px 0 8px;">
          <a href="${escapeHtml(linkInfo.url)}" style="display:inline-block;padding:11px 18px;border-radius:9px;background:#1050ff;color:#ffffff;font-size:13.5px;font-weight:700;text-decoration:none;">${
            ar ? "الانضمام للاجتماع" : "Join Meeting"
          }</a>
        </div>`
      : "";

  const manageLinksHtml =
    templateType === "meeting_confirmation" ||
    templateType === "meeting_rescheduled" ||
    templateType === "meeting_reminder_24h"
      ? `<p style="margin:14px 0 0;font-size:12.5px;color:#64748b;line-height:1.6;">${
          ar
            ? `تحتاج إلى تعديل الموعد؟ <a href="${escapeHtml(rescheduleMailto)}" style="color:#1050ff;">طلب إعادة جدولة</a> · <a href="${escapeHtml(cancelMailto)}" style="color:#64748b;">إلغاء الموعد</a>`
            : `Need to make a change? <a href="${escapeHtml(rescheduleMailto)}" style="color:#1050ff;">Request reschedule</a> · <a href="${escapeHtml(cancelMailto)}" style="color:#64748b;">Cancel meeting</a>`
        }</p>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${ar ? "rtl" : "ltr"}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#eef2fa;font-family:${ar ? "Tahoma,Arial,sans-serif" : "Inter,Segoe UI,Arial,sans-serif"};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2fa;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d9e1f2;">
          <tr>
            <td style="background:#080d21;padding:22px 28px;border-bottom:3px solid #1050ff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:17px;font-weight:800;letter-spacing:0.12em;color:#ffffff;">HIRZEXA</td>
                  <td align="${ar ? "left" : "right"}" style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#60a5fa;">${escapeHtml(badgeLabel)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#080d21;text-align:${ar ? "right" : "left"};">${escapeHtml(headline)}</h1>
              ${paragraphsToSafeHtml(editableBody, ar)}
              ${detailTableHtml}
              ${calendarButtonsHtml}
              ${manageLinksHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.6;">
              <strong style="color:#0f172a;">HIRZEXA</strong> — AI &amp; Software Engineering<br/>
              ${ar ? "البريد المباشر" : "Direct Reply"}: <a dir="ltr" href="mailto:${escapeHtml(replyTo)}" style="color:#1050ff;text-decoration:none;">${escapeHtml(replyTo)}</a> · <a dir="ltr" href="${escapeHtml(origin)}" style="color:#1050ff;text-decoration:none;">hirzexa.com</a><br/>
              <span style="color:#94a3b8;">${
                ar
                  ? "هذه رسالة معاملات مرتبطة باجتماعك المجدول لدى HIRZEXA وليست رسالة تسويقية."
                  : "This is a transactional meeting notification from HIRZEXA. You have not been added to any marketing list."
              }</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  // Plain-text alternative (clean, scannable, complete)
  const textLines: string[] = [
    `HIRZEXA — ${badgeLabel}`,
    "",
    headline,
    "",
    editableBody,
  ];
  if (detailRows.length > 0) {
    textLines.push("", ar ? "--- تفاصيل الاجتماع ---" : "--- Meeting Details ---");
    for (const row of detailRows) {
      textLines.push(`${row.label}: ${row.value}`);
    }
  }
  if (showCalendarActions && calendarLinks) {
    textLines.push(
      "",
      ar ? "إضافة إلى التقويم:" : "Add to Calendar:",
      `Google Calendar: ${calendarLinks.googleUrl}`,
      `Outlook: ${calendarLinks.outlookUrl}`,
      ...(signedIcsUrl ? [`ICS Download: ${signedIcsUrl}`] : [])
    );
  }
  if (templateType === "meeting_cancelled") {
    textLines.push("", `${ar ? "حجز موعد جديد" : "Book a new time"}: ${bookNewUrl}`);
  }
  if (
    templateType === "meeting_confirmation" ||
    templateType === "meeting_rescheduled" ||
    templateType === "meeting_reminder_24h"
  ) {
    textLines.push(
      "",
      ar
        ? `لإعادة الجدولة أو الإلغاء، يرجى الرد على هذا البريد أو مراسلة ${replyTo} مع الرقم المرجعي ${lead.referenceId}.`
        : `To reschedule or cancel, reply directly to this email or contact ${replyTo} referencing ${lead.referenceId}.`
    );
  }
  textLines.push(
    "",
    "---",
    `HIRZEXA — AI & Software Engineering | ${replyTo} | ${origin}`
  );

  return {
    templateType,
    locale,
    from,
    to: sanitizeHeaderField(lead.email.toLowerCase(), 254),
    replyTo: sanitizeHeaderField(replyTo, 254),
    subject,
    text: textLines.join("\n"),
    html,
    editableBody,
    includeIcsAttachment,
  };
}
