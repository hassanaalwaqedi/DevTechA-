import type { EmailMessageTemplate } from "@/lib/email-templates";
import {
  OFFICIAL_CAREERS_EMAIL,
  OFFICIAL_SUPPORT_EMAIL,
  OFFICIAL_WEBSITE_URL,
  canonicalizeUserFacingUrl,
  getCareersReplyToAddress,
  getCareersSenderAddress,
} from "@/lib/email/transactional";
import {
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_TYPE_LABELS,
  formatUtcInTimezone,
  type InterviewFormat,
  type InterviewTemplateKind,
  type InterviewType,
} from "@/lib/interviews/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safePublicBaseUrl(raw?: string | null): string {
  if (!raw?.trim()) return OFFICIAL_WEBSITE_URL;
  const canonical = canonicalizeUserFacingUrl(raw.trim());
  try {
    const parsed = new URL(canonical);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local") ||
      parsed.protocol !== "https:"
    ) {
      return OFFICIAL_WEBSITE_URL;
    }
    return parsed.origin.replace(/\/$/, "");
  } catch {
    return OFFICIAL_WEBSITE_URL;
  }
}

function safeExternalUrl(raw?: string | null): string {
  if (!raw?.trim()) return "";
  const canonical = canonicalizeUserFacingUrl(raw.trim());
  try {
    const parsed = new URL(canonical);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

interface SummaryRow {
  label: string;
  value: string;
  isLink?: boolean;
}

function renderEmailShell(params: {
  locale: "en" | "ar";
  preheader: string;
  eyebrow: string;
  title: string;
  greeting: string;
  introParagraphs: string[];
  summaryRows?: SummaryRow[];
  personalizedNote?: string;
  personalizedNoteTitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaHelperText?: string;
  secondaryLinkLabel?: string;
  secondaryLinkUrl?: string;
  fallbackUrlLabel?: string;
  fallbackUrl?: string;
  closingParagraphs?: string[];
  logoUrl: string;
}): string {
  const isAr = params.locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";
  const fontFamily = isAr
    ? "'Segoe UI', Tahoma, Arial, sans-serif"
    : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

  const summaryHtml =
    params.summaryRows && params.summaryRows.length > 0
      ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background-color:#F8FAFC;border:1px solid #E5EAF2;border-radius:10px;border-collapse:separate;">
        <tr>
          <td style="padding:18px 20px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              ${params.summaryRows
                .map((row, idx) => {
                  const borderTop = idx === 0 ? "" : "border-top:1px solid #E5EAF2;";
                  const valueMarkup =
                    row.isLink && row.value
                      ? `<a href="${escapeHtml(row.value)}" target="_blank" rel="noopener noreferrer" style="color:#315CDA;text-decoration:underline;word-break:break-all;">${escapeHtml(row.value)}</a>`
                      : escapeHtml(row.value);
                  return `
              <tr>
                <td style="${borderTop}padding:10px 0;width:38%;vertical-align:top;font-size:13px;font-weight:600;color:#667085;text-align:${align};">
                  ${escapeHtml(row.label)}
                </td>
                <td style="${borderTop}padding:10px 0;width:62%;vertical-align:top;font-size:13.5px;font-weight:600;color:#182230;text-align:${align};">
                  ${valueMarkup}
                </td>
              </tr>`;
                })
                .join("")}
            </table>
          </td>
        </tr>
      </table>`
      : "";

  const personalizedNoteHtml = params.personalizedNote?.trim()
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background-color:#FFFFFF;border:1px solid #E5EAF2;border-${isAr ? "right" : "left"}:3px solid #315CDA;border-radius:8px;">
        <tr>
          <td style="padding:14px 18px;text-align:${align};">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#315CDA;margin-bottom:6px;">
              ${escapeHtml(
                params.personalizedNoteTitle ||
                  (isAr ? "ملاحظة من فريق استقطاب الكفاءات" : "Note from Talent Acquisition")
              )}
            </div>
            <div style="font-size:14px;line-height:1.65;color:#182230;white-space:pre-line;">
              ${escapeHtml(params.personalizedNote.trim())}
            </div>
          </td>
        </tr>
      </table>`
    : "";

  const ctaHtml =
    params.ctaLabel && params.ctaUrl
      ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 8px;">
        <tr>
          <td align="${align}">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius:8px;background-color:#315CDA;">
                  <a href="${escapeHtml(params.ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 28px;font-family:${fontFamily};font-size:14.5px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;letter-spacing:0.01em;">
                    ${escapeHtml(params.ctaLabel)}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${
          params.ctaHelperText
            ? `<tr><td style="padding-top:10px;font-size:12.5px;color:#667085;text-align:${align};">${escapeHtml(params.ctaHelperText)}</td></tr>`
            : ""
        }
      </table>`
      : "";

  const secondaryLinkHtml =
    params.secondaryLinkLabel && params.secondaryLinkUrl
      ? `<p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#667085;text-align:${align};">
           <a href="${escapeHtml(params.secondaryLinkUrl)}" target="_blank" rel="noopener noreferrer" style="color:#315CDA;font-weight:600;text-decoration:underline;">
             ${escapeHtml(params.secondaryLinkLabel)}
           </a>
         </p>`
      : "";

  const fallbackHtml =
    params.fallbackUrl && params.fallbackUrlLabel
      ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;background-color:#F8FAFC;border:1px solid #E5EAF2;border-radius:8px;">
        <tr>
          <td style="padding:12px 16px;text-align:${align};">
            <div style="font-size:12px;color:#667085;margin-bottom:4px;">${escapeHtml(params.fallbackUrlLabel)}</div>
            <div style="font-size:12px;line-height:1.5;word-break:break-all;">
              <a href="${escapeHtml(params.fallbackUrl)}" target="_blank" rel="noopener noreferrer" style="color:#315CDA;text-decoration:none;">${escapeHtml(params.fallbackUrl)}</a>
            </div>
          </td>
        </tr>
      </table>`
      : "";

  const brandSubtitle = isAr ? "الذكاء الاصطناعي وهندسة البرمجيات" : "AI & SOFTWARE ENGINEERING";
  const departmentBadge = isAr ? "استقطاب الكفاءات" : "TALENT ACQUISITION";
  const footerLine = isAr
    ? "HIRZEXA — الذكاء الاصطناعي وهندسة البرمجيات"
    : "HIRZEXA — AI & Software Engineering";
  const careersLabel = isAr ? "التوظيف" : "Careers";
  const supportLabel = isAr ? "الدعم" : "Support";

  return `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F6F8FC;font-family:${fontFamily};color:#182230;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(params.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" dir="${dir}" style="background-color:#F6F8FC;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E5EAF2;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B1122;padding:24px 32px;border-bottom:1px solid #1E293B;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;text-align:${align};">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="display:inline-table;">
                      <tr>
                        <td style="vertical-align:middle;padding-${isAr ? "left" : "right"}:12px;">
                          <img src="${escapeHtml(params.logoUrl)}" alt="HIRZEXA" width="34" height="34" style="display:block;border-radius:8px;border:1px solid #243252;" />
                        </td>
                        <td style="vertical-align:middle;text-align:${align};">
                          <div style="font-size:15px;font-weight:800;letter-spacing:0.08em;color:#FFFFFF;line-height:1.15;">HIRZEXA</div>
                          <div style="font-size:10px;font-weight:600;letter-spacing:0.12em;color:#94A3B8;margin-top:3px;">${escapeHtml(brandSubtitle)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align:middle;text-align:${isAr ? "left" : "right"};">
                    <span style="display:inline-block;padding:5px 10px;border-radius:999px;background-color:#15203B;border:1px solid #27375D;font-size:10px;font-weight:700;letter-spacing:0.1em;color:#BFDBFE;">
                      ${escapeHtml(departmentBadge)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 26px;text-align:${align};">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#315CDA;margin-bottom:8px;">
                ${escapeHtml(params.eyebrow)}
              </div>
              <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:700;color:#182230;">
                ${escapeHtml(params.title)}
              </h1>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#182230;font-weight:600;">
                ${escapeHtml(params.greeting)}
              </p>
              ${params.introParagraphs
                .map(
                  (p) =>
                    `<p style="margin:0 0 14px;font-size:14.5px;line-height:1.7;color:#475467;">${escapeHtml(p)}</p>`
                )
                .join("")}
              ${summaryHtml}
              ${personalizedNoteHtml}
              ${ctaHtml}
              ${secondaryLinkHtml}
              ${fallbackHtml}
              ${(params.closingParagraphs || [])
                .map(
                  (p) =>
                    `<p style="margin:18px 0 0;font-size:13.5px;line-height:1.65;color:#667085;">${escapeHtml(p)}</p>`
                )
                .join("")}
            </td>
          </tr>
          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E5EAF2;padding:20px 32px;text-align:${align};">
              <div style="font-size:12.5px;font-weight:700;color:#182230;margin-bottom:4px;">
                ${escapeHtml(footerLine)}
              </div>
              <div style="font-size:12px;line-height:1.6;color:#667085;">
                ${escapeHtml(careersLabel)}: <a href="mailto:${OFFICIAL_CAREERS_EMAIL}" style="color:#315CDA;text-decoration:none;">${OFFICIAL_CAREERS_EMAIL}</a>
                &nbsp;·&nbsp;
                ${escapeHtml(supportLabel)}: <a href="mailto:${OFFICIAL_SUPPORT_EMAIL}" style="color:#315CDA;text-decoration:none;">${OFFICIAL_SUPPORT_EMAIL}</a>
                &nbsp;·&nbsp;
                <a href="${OFFICIAL_WEBSITE_URL}" target="_blank" rel="noopener noreferrer" style="color:#315CDA;text-decoration:none;">hirzexa.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export interface InterviewInvitationEmailParams {
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  interviewType: InterviewType;
  interviewFormat: InterviewFormat;
  durationMinutes: number;
  interviewerName: string;
  schedulingUrl: string;
  expiresAtUtc: string;
  personalizedMessage?: string;
  locale?: "en" | "ar";
  publicBaseUrl?: string;
}

/**
 * Template 1 — Interview Invitation Email
 * Invites candidate to self-schedule. Never displays a confirmed appointment date/time.
 */
export function buildInterviewInvitationEmail(
  params: InterviewInvitationEmailParams
): EmailMessageTemplate {
  const locale = params.locale === "ar" ? "ar" : "en";
  const baseUrl = safePublicBaseUrl(params.publicBaseUrl);
  const logoUrl = `${baseUrl}/brand/hirzexa-mark.png`;
  const schedulingUrl = safeExternalUrl(params.schedulingUrl) || `${baseUrl}/interview/schedule`;
  const typeLabel = INTERVIEW_TYPE_LABELS[params.interviewType]?.[locale] || "Interview";
  const formatLabel = INTERVIEW_FORMAT_LABELS[params.interviewFormat]?.[locale] || "Interview";
  const expiryFormatted = formatUtcInTimezone(params.expiresAtUtc, "UTC", locale);

  const isAr = locale === "ar";
  const subject = isAr
    ? `HIRZEXA | دعوة لمقابلة عمل — ${params.positionTitle}`
    : `HIRZEXA | Interview Invitation — ${params.positionTitle}`;

  const summaryRows: SummaryRow[] = [
    { label: isAr ? "الوظيفة" : "Position", value: params.positionTitle },
    { label: isAr ? "مرحلة المقابلة" : "Interview Stage", value: typeLabel },
    { label: isAr ? "المدة" : "Duration", value: isAr ? `${params.durationMinutes} دقيقة` : `${params.durationMinutes} minutes` },
    { label: isAr ? "طريقة المقابلة" : "Format", value: formatLabel },
    { label: isAr ? "المحاور" : "Interviewer", value: params.interviewerName },
    {
      label: isAr ? "صلاحية الرابط حتى" : "Link Valid Until",
      value: expiryFormatted.fullLabel,
    },
  ];

  const html = renderEmailShell({
    locale,
    preheader: isAr
      ? `تمت دعوتك لاختيار موعد مقابلتك لوظيفة ${params.positionTitle} في HIRZEXA.`
      : `Select your preferred time for your ${params.positionTitle} interview at HIRZEXA.`,
    eyebrow: isAr ? "دعوة لمقابلة عمل" : "INTERVIEW INVITATION",
    title: isAr ? `دعوة لمقابلة وظيفة ${params.positionTitle}` : `Interview Invitation — ${params.positionTitle}`,
    greeting: isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    introParagraphs: isAr
      ? [
          `نشكرك على اهتمامك بالانضمام إلى HIRZEXA وتقدمك لوظيفة ${params.positionTitle}. بعد مراجعة طلبك، يسعدنا دعوتك إلى مرحلة ${typeLabel}.`,
          "يرجى استخدام رابط الجدولة الآمن أدناه لاختيار التاريخ والوقت المناسبين لك وفق منطقتك الزمنية.",
        ]
      : [
          `Thank you for applying for the ${params.positionTitle} role at HIRZEXA. Following a careful review of your application, we are pleased to invite you to the ${typeLabel}.`,
          "Please use the secure scheduling link below to select a date and time that works best for you in your local time zone.",
        ],
    summaryRows,
    personalizedNote: params.personalizedMessage,
    ctaLabel: isAr ? "اختر موعد المقابلة" : "Schedule Your Interview",
    ctaUrl: schedulingUrl,
    ctaHelperText: isAr
      ? "جدولة آمنة. لا يتطلب إنشاء حساب."
      : "Secure scheduling. No account required.",
    fallbackUrlLabel: isAr
      ? "إذا لم يعمل الزر أعلاه، انسخ الرابط التالي والصقه في متصفحك:"
      : "If the button above does not open, copy and paste this link into your browser:",
    fallbackUrl: schedulingUrl,
    closingParagraphs: isAr
      ? [
          `إذا كانت لديك أي استفسارات أو لم تجد وقتًا مناسبًا، يرجى الرد على هذه الرسالة أو التواصل معنا عبر ${OFFICIAL_CAREERS_EMAIL}.`,
        ]
      : [
          `If you have any questions or need assistance selecting a time, simply reply to this email or contact ${OFFICIAL_CAREERS_EMAIL}.`,
        ],
    logoUrl,
  });

  const text = [
    subject,
    "",
    isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    "",
    isAr
      ? `يسعدنا دعوتك إلى مرحلة ${typeLabel} لوظيفة ${params.positionTitle} في HIRZEXA.`
      : `We are pleased to invite you to the ${typeLabel} for the ${params.positionTitle} position at HIRZEXA.`,
    "",
    `${isAr ? "الوظيفة" : "Position"}: ${params.positionTitle}`,
    `${isAr ? "المرحلة" : "Interview Stage"}: ${typeLabel}`,
    `${isAr ? "المدة" : "Duration"}: ${params.durationMinutes} min`,
    `${isAr ? "الطريقة" : "Format"}: ${formatLabel}`,
    `${isAr ? "المحاور" : "Interviewer"}: ${params.interviewerName}`,
    `${isAr ? "صلاحية الرابط حتى" : "Link Valid Until"}: ${expiryFormatted.fullLabel}`,
    params.personalizedMessage?.trim()
      ? `\n${isAr ? "ملاحظة إضافية" : "Note from Talent Acquisition"}:\n${params.personalizedMessage.trim()}`
      : null,
    "",
    `${isAr ? "اختر موعد المقابلة (جدولة آمنة، لا يتطلب حساب)" : "Schedule Your Interview (Secure scheduling. No account required.)"}:`,
    schedulingUrl,
    "",
    `${isAr ? "للتواصل" : "Careers"}: ${OFFICIAL_CAREERS_EMAIL}`,
    `${isAr ? "الدعم" : "Support"}: ${OFFICIAL_SUPPORT_EMAIL}`,
    `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return {
    from: getCareersSenderAddress(),
    to: params.candidateEmail,
    replyTo: getCareersReplyToAddress(),
    subject,
    text,
    html,
  };
}

export interface InterviewAppointmentEmailParams {
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  interviewType: InterviewType;
  interviewFormat: InterviewFormat;
  durationMinutes: number;
  interviewerName: string;
  scheduledStartUtc: string;
  candidateTimezone: string;
  manageUrl: string;
  meetingUrl?: string | null;
  locationDetails?: string | null;
  locale?: "en" | "ar";
  publicBaseUrl?: string;
}

function buildAppointmentSummaryRows(
  params: InterviewAppointmentEmailParams,
  locale: "en" | "ar"
): SummaryRow[] {
  const isAr = locale === "ar";
  const typeLabel = INTERVIEW_TYPE_LABELS[params.interviewType]?.[locale] || "Interview";
  const formatLabel = INTERVIEW_FORMAT_LABELS[params.interviewFormat]?.[locale] || "Interview";
  const formatted = formatUtcInTimezone(params.scheduledStartUtc, params.candidateTimezone, locale);
  const safeMeet = safeExternalUrl(params.meetingUrl);

  const rows: SummaryRow[] = [
    { label: isAr ? "الوظيفة" : "Position", value: params.positionTitle },
    { label: isAr ? "مرحلة المقابلة" : "Interview Stage", value: typeLabel },
    { label: isAr ? "التاريخ" : "Date", value: formatted.dateLabel },
    { label: isAr ? "الوقت المحلي" : "Local Time", value: formatted.timeLabel },
    { label: isAr ? "المنطقة الزمنية" : "Time Zone", value: params.candidateTimezone },
    { label: isAr ? "المدة" : "Duration", value: isAr ? `${params.durationMinutes} دقيقة` : `${params.durationMinutes} minutes` },
    { label: isAr ? "طريقة المقابلة" : "Format", value: formatLabel },
    { label: isAr ? "المحاور" : "Interviewer", value: params.interviewerName },
  ];

  if (safeMeet) {
    rows.push({
      label: isAr ? "رابط الاجتماع" : "Meeting Link",
      value: safeMeet,
      isLink: true,
    });
  }
  if (params.locationDetails?.trim()) {
    rows.push({
      label: isAr ? "الموقع / التعليمات" : "Location / Instructions",
      value: params.locationDetails.trim(),
    });
  }

  return rows;
}

/**
 * Template 2 — Interview Confirmation Email (with .ics calendar attachment)
 */
export function buildInterviewConfirmationEmail(
  params: InterviewAppointmentEmailParams
): EmailMessageTemplate {
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";
  const baseUrl = safePublicBaseUrl(params.publicBaseUrl);
  const logoUrl = `${baseUrl}/brand/hirzexa-mark.png`;
  const manageUrl = safeExternalUrl(params.manageUrl) || `${baseUrl}/interview/schedule`;
  const formatted = formatUtcInTimezone(params.scheduledStartUtc, params.candidateTimezone, locale);
  const rows = buildAppointmentSummaryRows(params, locale);

  const subject = isAr
    ? `HIRZEXA | تم تأكيد موعد مقابلتك — ${params.positionTitle}`
    : `HIRZEXA | Your Interview Is Confirmed — ${params.positionTitle}`;

  const html = renderEmailShell({
    locale,
    preheader: isAr
      ? `تم تأكيد مقابلتك في ${formatted.fullLabel}.`
      : `Your interview is confirmed for ${formatted.fullLabel}.`,
    eyebrow: isAr ? "تأكيد المقابلة" : "INTERVIEW CONFIRMED",
    title: isAr ? `تم تأكيد موعد مقابلتك — ${params.positionTitle}` : `Your Interview Is Confirmed — ${params.positionTitle}`,
    greeting: isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    introParagraphs: isAr
      ? [
          "تم تأكيد موعد مقابلتك بنجاح. أرفقنا ملف دعوة تقويم (.ics) مع هذه الرسالة لتتمكن من إضافة الموعد مباشرة إلى تقويمك.",
        ]
      : [
          "Your interview appointment with HIRZEXA has been confirmed. A calendar invitation (.ics) is attached to this email so you can add the session directly to your calendar.",
        ],
    summaryRows: rows,
    ctaLabel: isAr ? "عرض تفاصيل المقابلة" : "View Interview Details",
    ctaUrl: manageUrl,
    ctaHelperText: isAr
      ? "يمكنك عرض الموعد أو تنزيل دعوة التقويم أو إعادة الجدولة من خلال الرابط الآمن أعلاه."
      : "Use the secure link above to view your appointment details, download the calendar invite, or reschedule if needed.",
    fallbackUrlLabel: isAr ? "الرابط المباشر لتفاصيل المقابلة:" : "Direct link to your interview details:",
    fallbackUrl: manageUrl,
    closingParagraphs: isAr
      ? [
          "نتطلع إلى التحدث معك قريبًا.",
        ]
      : [
          "We look forward to speaking with you.",
        ],
    logoUrl,
  });

  const text = [
    subject,
    "",
    isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
    "",
    `${isAr ? "عرض تفاصيل المقابلة / إعادة الجدولة" : "View Interview Details / Reschedule"}: ${manageUrl}`,
    `${isAr ? "للتواصل" : "Careers"}: ${OFFICIAL_CAREERS_EMAIL}`,
    `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
  ].join("\n");

  return {
    from: getCareersSenderAddress(),
    to: params.candidateEmail,
    replyTo: getCareersReplyToAddress(),
    subject,
    text,
    html,
  };
}

/**
 * Template 3 — Interview Reminder Email (24h or 1h before)
 */
export function buildInterviewReminderEmail(
  params: InterviewAppointmentEmailParams & { reminderKind: "24h" | "1h" }
): EmailMessageTemplate {
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";
  const baseUrl = safePublicBaseUrl(params.publicBaseUrl);
  const logoUrl = `${baseUrl}/brand/hirzexa-mark.png`;
  const manageUrl = safeExternalUrl(params.manageUrl) || `${baseUrl}/interview/schedule`;
  const formatted = formatUtcInTimezone(params.scheduledStartUtc, params.candidateTimezone, locale);
  const rows = buildAppointmentSummaryRows(params, locale);

  const timingPhrase =
    params.reminderKind === "1h"
      ? isAr
        ? "خلال ساعة واحدة تقريبًا"
        : "in approximately 1 hour"
      : isAr
        ? "خلال 24 ساعة"
        : "in 24 hours";

  const subject = isAr
    ? `HIRZEXA | تذكير بموعد المقابلة — ${params.positionTitle}`
    : `HIRZEXA | Interview Reminder — ${params.positionTitle}`;

  const html = renderEmailShell({
    locale,
    preheader: isAr
      ? `تذكير: تبدأ مقابلتك ${timingPhrase} (${formatted.fullLabel}).`
      : `Reminder: Your HIRZEXA interview begins ${timingPhrase} (${formatted.fullLabel}).`,
    eyebrow: isAr ? "تذكير بموعد المقابلة" : "INTERVIEW REMINDER",
    title: isAr ? `تذكير: مقابلتك تبدأ ${timingPhrase}` : `Reminder: Your Interview Begins ${timingPhrase}`,
    greeting: isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    introParagraphs: isAr
      ? [
          `هذا تذكير ودي بموعد مقابلتك القادمة مع فريق HIRZEXA لوظيفة ${params.positionTitle}.`,
        ]
      : [
          `This is a reminder of your upcoming interview with HIRZEXA for the ${params.positionTitle} position.`,
        ],
    summaryRows: rows,
    ctaLabel: isAr ? "عرض تفاصيل المقابلة" : "View Interview Details",
    ctaUrl: manageUrl,
    fallbackUrlLabel: isAr ? "رابط تفاصيل المقابلة:" : "Interview details link:",
    fallbackUrl: manageUrl,
    closingParagraphs: isAr
      ? [
          `إذا طرأ أي تغيير غير متوقع، يمكنك استخدام الرابط أعلاه أو مراسلتنا على ${OFFICIAL_CAREERS_EMAIL}.`,
        ]
      : [
          `If anything unexpected arises, you may manage your booking via the link above or contact ${OFFICIAL_CAREERS_EMAIL}.`,
        ],
    logoUrl,
  });

  const text = [
    subject,
    "",
    isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    isAr
      ? `تذكير: تبدأ مقابلتك ${timingPhrase}.`
      : `Reminder: Your interview begins ${timingPhrase}.`,
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
    "",
    `${isAr ? "عرض تفاصيل المقابلة" : "View Interview Details"}: ${manageUrl}`,
    `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
  ].join("\n");

  return {
    from: getCareersSenderAddress(),
    to: params.candidateEmail,
    replyTo: getCareersReplyToAddress(),
    subject,
    text,
    html,
  };
}

/**
 * Template 4 — Interview Rescheduled Email
 * Shows ONLY the updated date and time (never conflicting old slots).
 */
export function buildInterviewRescheduledEmail(
  params: InterviewAppointmentEmailParams
): EmailMessageTemplate {
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";
  const baseUrl = safePublicBaseUrl(params.publicBaseUrl);
  const logoUrl = `${baseUrl}/brand/hirzexa-mark.png`;
  const manageUrl = safeExternalUrl(params.manageUrl) || `${baseUrl}/interview/schedule`;
  const formatted = formatUtcInTimezone(params.scheduledStartUtc, params.candidateTimezone, locale);
  const rows = buildAppointmentSummaryRows(params, locale);

  const subject = isAr
    ? `HIRZEXA | تحديث موعد المقابلة — ${params.positionTitle}`
    : `HIRZEXA | Updated Interview Schedule — ${params.positionTitle}`;

  const html = renderEmailShell({
    locale,
    preheader: isAr
      ? `تم تحديث موعد مقابلتك إلى ${formatted.fullLabel}.`
      : `Your interview has been rescheduled to ${formatted.fullLabel}.`,
    eyebrow: isAr ? "تحديث الجدول" : "UPDATED SCHEDULE",
    title: isAr ? `تم تحديث موعد مقابلتك — ${params.positionTitle}` : `Updated Interview Schedule — ${params.positionTitle}`,
    greeting: isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    introParagraphs: isAr
      ? [
          "تم تحديث موعد مقابلتك مع HIRZEXA. تفاصيل الموعد الجديد المؤكد موضحة أدناه، وتم إرفاق دعوة تقويم محدثة (.ics).",
        ]
      : [
          "Your interview with HIRZEXA has been updated. Your new confirmed schedule is listed below, and an updated calendar invitation (.ics) is attached.",
        ],
    summaryRows: rows,
    ctaLabel: isAr ? "عرض تفاصيل المقابلة" : "View Interview Details",
    ctaUrl: manageUrl,
    fallbackUrlLabel: isAr ? "رابط تفاصيل المقابلة:" : "Direct link to your updated schedule:",
    fallbackUrl: manageUrl,
    logoUrl,
  });

  const text = [
    subject,
    "",
    isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    isAr ? "فيما يلي تفاصيل موعد المقابلة الجديد المؤكد:" : "Here are your updated confirmed interview details:",
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
    "",
    `${isAr ? "عرض تفاصيل المقابلة" : "View Interview Details"}: ${manageUrl}`,
    `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
  ].join("\n");

  return {
    from: getCareersSenderAddress(),
    to: params.candidateEmail,
    replyTo: getCareersReplyToAddress(),
    subject,
    text,
    html,
  };
}

/**
 * Template 5 — Interview Canceled Email
 * Respectful tone; explicitly avoids sounding like a rejection.
 */
export function buildInterviewCanceledEmail(params: {
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  interviewType: InterviewType;
  reason?: string | null;
  rescheduleUrl?: string | null;
  locale?: "en" | "ar";
  publicBaseUrl?: string;
}): EmailMessageTemplate {
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";
  const baseUrl = safePublicBaseUrl(params.publicBaseUrl);
  const logoUrl = `${baseUrl}/brand/hirzexa-mark.png`;
  const typeLabel = INTERVIEW_TYPE_LABELS[params.interviewType]?.[locale] || "Interview";
  const safeReschedule = safeExternalUrl(params.rescheduleUrl);

  const subject = isAr
    ? `HIRZEXA | تحديث بخصوص موعد المقابلة — ${params.positionTitle}`
    : `HIRZEXA | Interview Schedule Update — ${params.positionTitle}`;

  const summaryRows: SummaryRow[] = [
    { label: isAr ? "الوظيفة" : "Position", value: params.positionTitle },
    { label: isAr ? "مرحلة المقابلة" : "Interview Stage", value: typeLabel },
    { label: isAr ? "الحالة" : "Status", value: isAr ? "تم إلغاء الموعد الحالي" : "Current Appointment Canceled" },
  ];
  if (params.reason?.trim()) {
    summaryRows.push({
      label: isAr ? "ملاحظة" : "Note",
      value: params.reason.trim(),
    });
  }

  const html = renderEmailShell({
    locale,
    preheader: isAr
      ? `تم إلغاء موعد المقابلة الحالي لوظيفة ${params.positionTitle}.`
      : `Schedule update regarding your ${params.positionTitle} interview at HIRZEXA.`,
    eyebrow: isAr ? "تحديث الجدول" : "SCHEDULE UPDATE",
    title: isAr ? `تحديث بخصوص موعد المقابلة — ${params.positionTitle}` : `Interview Schedule Update — ${params.positionTitle}`,
    greeting: isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    introParagraphs: isAr
      ? [
          `نود إعلامك بأنه تم إلغاء موعد المقابلة المجدول سابقًا لوظيفة ${params.positionTitle}.`,
          "لا يعني هذا الإشعار رفض طلبك. سيتواصل معك فريق استقطاب الكفاءات عند الحاجة لتنسيق موعد بديل، أو يمكنك الرد مباشرة على هذه الرسالة.",
        ]
      : [
          `We are writing to confirm that the previously scheduled interview session for the ${params.positionTitle} role has been canceled.`,
          "Please note that this schedule change does not represent a rejection of your application. Our Talent Acquisition team remains available to coordinate next steps or arrange a new time.",
        ],
    summaryRows,
    ctaLabel: safeReschedule
      ? isAr
        ? "اختيار موعد جديد"
        : "Select a New Time"
      : undefined,
    ctaUrl: safeReschedule || undefined,
    closingParagraphs: isAr
      ? [`لأي استفسار، تواصل معنا عبر ${OFFICIAL_CAREERS_EMAIL}.`]
      : [`If you have any questions, please reply to this email or contact ${OFFICIAL_CAREERS_EMAIL}.`],
    logoUrl,
  });

  const text = [
    subject,
    "",
    isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    isAr
      ? `تم إلغاء موعد المقابلة المجدول سابقًا لوظيفة ${params.positionTitle}. هذا التحديث لا يعني رفض طلبك.`
      : `Your previously scheduled interview for ${params.positionTitle} has been canceled. This schedule update does not represent a rejection of your application.`,
    params.reason?.trim() ? `${isAr ? "ملاحظة" : "Note"}: ${params.reason.trim()}` : null,
    safeReschedule ? `${isAr ? "اختيار موعد جديد" : "Select a New Time"}: ${safeReschedule}` : null,
    "",
    `${isAr ? "التوظيف" : "Careers"}: ${OFFICIAL_CAREERS_EMAIL}`,
    `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return {
    from: getCareersSenderAddress(),
    to: params.candidateEmail,
    replyTo: getCareersReplyToAddress(),
    subject,
    text,
    html,
  };
}

/**
 * Template 6 — Scheduling Link Expired Notice
 */
export function buildInterviewExpiredEmail(params: {
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  interviewType: InterviewType;
  locale?: "en" | "ar";
  publicBaseUrl?: string;
}): EmailMessageTemplate {
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";
  const baseUrl = safePublicBaseUrl(params.publicBaseUrl);
  const logoUrl = `${baseUrl}/brand/hirzexa-mark.png`;
  const typeLabel = INTERVIEW_TYPE_LABELS[params.interviewType]?.[locale] || "Interview";

  const subject = isAr
    ? `HIRZEXA | انتهت صلاحية رابط جدولة المقابلة — ${params.positionTitle}`
    : `HIRZEXA | Interview Scheduling Link Expired — ${params.positionTitle}`;

  const html = renderEmailShell({
    locale,
    preheader: isAr
      ? `انتهت صلاحية رابط جدولة مقابلتك لوظيفة ${params.positionTitle}.`
      : `Your interview scheduling link for ${params.positionTitle} has expired.`,
    eyebrow: isAr ? "إشعار رابط الجدولة" : "SCHEDULING LINK NOTICE",
    title: isAr
      ? `انتهت صلاحية رابط جدولة المقابلة — ${params.positionTitle}`
      : `Interview Scheduling Link Expired — ${params.positionTitle}`,
    greeting: isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    introParagraphs: isAr
      ? [
          `انتهت صلاحية رابط الجدولة الخاص بمرحلة ${typeLabel} لوظيفة ${params.positionTitle} لأسباب أمنية.`,
          `إذا كنت لا تزال مهتمًا بالمتابعة، يرجى الرد على هذه الرسالة أو مراسلتنا عبر ${OFFICIAL_CAREERS_EMAIL} وسيسعد فريقنا بإرسال رابط جدولة جديد لك.`,
        ]
      : [
          `For security reasons, your personal scheduling link for the ${typeLabel} (${params.positionTitle}) has expired.`,
          `If you remain interested in moving forward, simply reply to this email or write to ${OFFICIAL_CAREERS_EMAIL} and our Talent Acquisition team will promptly issue a new scheduling link.`,
        ],
    summaryRows: [
      { label: isAr ? "الوظيفة" : "Position", value: params.positionTitle },
      { label: isAr ? "مرحلة المقابلة" : "Interview Stage", value: typeLabel },
      { label: isAr ? "التواصل" : "Contact", value: OFFICIAL_CAREERS_EMAIL },
    ],
    logoUrl,
  });

  const text = [
    subject,
    "",
    isAr ? `مرحبًا ${params.candidateName}،` : `Dear ${params.candidateName},`,
    isAr
      ? `انتهت صلاحية رابط جدولة مقابلتك لوظيفة ${params.positionTitle}. يرجى الرد على هذه الرسالة أو مراسلتنا على ${OFFICIAL_CAREERS_EMAIL} للحصول على رابط جديد.`
      : `Your scheduling link for the ${params.positionTitle} interview has expired. Please reply to this email or contact ${OFFICIAL_CAREERS_EMAIL} to receive a new link.`,
    "",
    `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
  ].join("\n");

  return {
    from: getCareersSenderAddress(),
    to: params.candidateEmail,
    replyTo: getCareersReplyToAddress(),
    subject,
    text,
    html,
  };
}

/**
 * Internal Notification for Assigned Interviewer (Booked / Rescheduled / Canceled)
 */
export function buildInterviewerNotificationEmail(params: {
  event: "scheduled" | "rescheduled" | "canceled";
  interviewerName: string;
  interviewerEmail: string;
  interviewerTimezone: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  interviewType: InterviewType;
  interviewFormat: InterviewFormat;
  durationMinutes: number;
  scheduledStartUtc: string;
  applicationReferenceId: string;
  meetingUrl?: string | null;
  locationDetails?: string | null;
  reason?: string | null;
  publicBaseUrl?: string;
}): EmailMessageTemplate {
  const baseUrl = safePublicBaseUrl(params.publicBaseUrl);
  const logoUrl = `${baseUrl}/brand/hirzexa-mark.png`;
  const adminUrl = `${baseUrl}/admin/interviews`;
  const formatted = formatUtcInTimezone(params.scheduledStartUtc, params.interviewerTimezone, "en");
  const typeLabel = INTERVIEW_TYPE_LABELS[params.interviewType]?.en || "Interview";
  const formatLabel = INTERVIEW_FORMAT_LABELS[params.interviewFormat]?.en || "Interview";
  const safeMeet = safeExternalUrl(params.meetingUrl);

  const verbMap = {
    scheduled: {
      eyebrow: "INTERVIEW SCHEDULED",
      subject: `HIRZEXA | Candidate Confirmed Interview — ${params.candidateName} (${params.positionTitle})`,
      title: `Interview Scheduled with ${params.candidateName}`,
      intro: `${params.candidateName} has selected and confirmed their interview slot for ${params.positionTitle}.`,
    },
    rescheduled: {
      eyebrow: "INTERVIEW RESCHEDULED",
      subject: `HIRZEXA | Interview Rescheduled — ${params.candidateName} (${params.positionTitle})`,
      title: `Interview Rescheduled with ${params.candidateName}`,
      intro: `The interview with ${params.candidateName} for ${params.positionTitle} has been updated to a new time.`,
    },
    canceled: {
      eyebrow: "INTERVIEW CANCELED",
      subject: `HIRZEXA | Interview Canceled — ${params.candidateName} (${params.positionTitle})`,
      title: `Interview Canceled — ${params.candidateName}`,
      intro: `The interview appointment with ${params.candidateName} for ${params.positionTitle} has been canceled.`,
    },
  }[params.event];

  const rows: SummaryRow[] = [
    { label: "Candidate", value: `${params.candidateName} (${params.candidateEmail})` },
    { label: "Position", value: params.positionTitle },
    { label: "Application Ref", value: params.applicationReferenceId },
    { label: "Stage", value: typeLabel },
    { label: "Format", value: `${formatLabel} (${params.durationMinutes} min)` },
    { label: "Date & Time", value: formatted.fullLabel },
  ];
  if (safeMeet) rows.push({ label: "Meeting Link", value: safeMeet, isLink: true });
  if (params.locationDetails?.trim()) {
    rows.push({ label: "Location / Notes", value: params.locationDetails.trim() });
  }
  if (params.reason?.trim()) {
    rows.push({ label: "Reason", value: params.reason.trim() });
  }

  const html = renderEmailShell({
    locale: "en",
    preheader: verbMap.intro,
    eyebrow: verbMap.eyebrow,
    title: verbMap.title,
    greeting: `Hello ${params.interviewerName},`,
    introParagraphs: [verbMap.intro],
    summaryRows: rows,
    ctaLabel: "Open Interviews Workspace",
    ctaUrl: adminUrl,
    logoUrl,
  });

  const text = [
    verbMap.subject,
    "",
    `Hello ${params.interviewerName},`,
    verbMap.intro,
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
    "",
    `Interviews Workspace: ${adminUrl}`,
    `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
  ].join("\n");

  return {
    from: getCareersSenderAddress(),
    to: params.interviewerEmail,
    replyTo: getCareersReplyToAddress(),
    subject: verbMap.subject,
    text,
    html,
  };
}

/**
 * Generates a live preview of any of the 6 recruitment email templates in EN or AR,
 * optionally overriding candidate/position/message/interviewer fields from the admin drawer.
 */
export function renderInterviewTemplatePreview(params: {
  kind: InterviewTemplateKind;
  locale?: "en" | "ar";
  candidateName?: string;
  candidateEmail?: string;
  positionTitle?: string;
  interviewType?: InterviewType;
  interviewFormat?: InterviewFormat;
  durationMinutes?: number;
  interviewerName?: string;
  personalizedMessage?: string;
  meetingUrl?: string | null;
  locationDetails?: string | null;
  candidateTimezone?: string;
  expiresInDays?: number;
}): EmailMessageTemplate {
  const locale = params.locale === "ar" ? "ar" : "en";
  const candidateName = params.candidateName?.trim() || (locale === "ar" ? "سارة المنصور" : "Sara Al-Mansoor");
  const candidateEmail = params.candidateEmail?.trim() || "candidate.preview@example.com";
  const positionTitle = params.positionTitle?.trim() || "Senior Full-Stack AI Engineer";
  const interviewType: InterviewType = params.interviewType || "technical_interview";
  const interviewFormat: InterviewFormat = params.interviewFormat || "online_video";
  const durationMinutes = params.durationMinutes || 45;
  const interviewerName = params.interviewerName?.trim() || "HIRZEXA Engineering Panel";
  const candidateTimezone = params.candidateTimezone || "Europe/Istanbul";

  const sampleStart = new Date(Date.now() + 72 * 3600_000);
  sampleStart.setUTCMinutes(0, 0, 0);
  const sampleExpiry = new Date(Date.now() + (params.expiresInDays || 7) * 86400_000);
  const sampleUrl = `${OFFICIAL_WEBSITE_URL}/interview/schedule?token=preview-token-sample`;

  switch (params.kind) {
    case "invitation":
      return buildInterviewInvitationEmail({
        candidateName,
        candidateEmail,
        positionTitle,
        interviewType,
        interviewFormat,
        durationMinutes,
        interviewerName,
        schedulingUrl: sampleUrl,
        expiresAtUtc: sampleExpiry.toISOString(),
        personalizedMessage: params.personalizedMessage,
        locale,
        publicBaseUrl: OFFICIAL_WEBSITE_URL,
      });
    case "confirmation":
      return buildInterviewConfirmationEmail({
        candidateName,
        candidateEmail,
        positionTitle,
        interviewType,
        interviewFormat,
        durationMinutes,
        interviewerName,
        scheduledStartUtc: sampleStart.toISOString(),
        candidateTimezone,
        manageUrl: sampleUrl,
        meetingUrl: params.meetingUrl || null,
        locationDetails: params.locationDetails || null,
        locale,
        publicBaseUrl: OFFICIAL_WEBSITE_URL,
      });
    case "reminder":
      return buildInterviewReminderEmail({
        candidateName,
        candidateEmail,
        positionTitle,
        interviewType,
        interviewFormat,
        durationMinutes,
        interviewerName,
        scheduledStartUtc: sampleStart.toISOString(),
        candidateTimezone,
        manageUrl: sampleUrl,
        meetingUrl: params.meetingUrl || null,
        locationDetails: params.locationDetails || null,
        reminderKind: "24h",
        locale,
        publicBaseUrl: OFFICIAL_WEBSITE_URL,
      });
    case "rescheduled":
      return buildInterviewRescheduledEmail({
        candidateName,
        candidateEmail,
        positionTitle,
        interviewType,
        interviewFormat,
        durationMinutes,
        interviewerName,
        scheduledStartUtc: sampleStart.toISOString(),
        candidateTimezone,
        manageUrl: sampleUrl,
        meetingUrl: params.meetingUrl || null,
        locationDetails: params.locationDetails || null,
        locale,
        publicBaseUrl: OFFICIAL_WEBSITE_URL,
      });
    case "canceled":
      return buildInterviewCanceledEmail({
        candidateName,
        candidateEmail,
        positionTitle,
        interviewType,
        reason:
          params.personalizedMessage ||
          (locale === "ar"
            ? "طلب تنسيق موعد بديل بناءً على توفر فريق المقابلة."
            : "Coordinating an updated interview slot with the hiring panel."),
        rescheduleUrl: sampleUrl,
        locale,
        publicBaseUrl: OFFICIAL_WEBSITE_URL,
      });
    case "expired":
      return buildInterviewExpiredEmail({
        candidateName,
        candidateEmail,
        positionTitle,
        interviewType,
        locale,
        publicBaseUrl: OFFICIAL_WEBSITE_URL,
      });
  }
}
