import "server-only";
import type { EmailMessageTemplate } from "@/lib/email-templates";
import {
  OFFICIAL_CAREERS_EMAIL,
  OFFICIAL_SUPPORT_EMAIL,
  OFFICIAL_WEBSITE_URL,
  canonicalizeUserFacingUrl,
  getCareersReplyToAddress,
  getCareersSenderAddress,
} from "@/lib/email/transactional";
import { renderSafeRecruitmentRichText } from "@/lib/recruitment/richtext";
import type { RecruitmentMessageType } from "@/lib/recruitment/types";

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

const EYEBROW_BY_TYPE: Record<RecruitmentMessageType, { en: string; ar: string }> = {
  application_thank_you: { en: "APPLICATION RECEIVED", ar: "تأكيد استلام الطلب" },
  general_recruitment: { en: "TALENT ACQUISITION", ar: "استقطاب الكفاءات" },
  interview_invitation: { en: "INTERVIEW INVITATION", ar: "دعوة لمقابلة عمل" },
  interview_follow_up: { en: "INTERVIEW FOLLOW-UP", ar: "متابعة المقابلة" },
  request_info: { en: "ADDITIONAL INFORMATION", ar: "معلومات إضافية" },
  application_update: { en: "APPLICATION UPDATE", ar: "تحديث طلب التوظيف" },
  custom: { en: "HIRZEXA CAREERS", ar: "توظيف HIRZEXA" },
};

export interface BuildRecruitmentEmailParams {
  recipientEmail: string;
  recipientName?: string | null;
  positionTitle?: string | null;
  messageType: RecruitmentMessageType;
  subject: string;
  bodyMarkdown: string;
  locale?: "en" | "ar";
  senderName?: string | null;
  publicBaseUrl?: string;
  isSamplePreview?: boolean;
}

/**
 * Renders a premium, Gmail & mobile-responsive HIRZEXA Talent Acquisition email
 * using the exact HIRZEXA visual design system (#0B1122 midnight navy header,
 * official logo, clean white correspondence card, #315CDA blue accents, EN LTR & AR RTL).
 *
 * Unlike interview invitations, manual recruitment correspondence is formatted cleanly
 * as readable executive communication without forcing interview-specific cards or links.
 */
export function buildRecruitmentEmail(params: BuildRecruitmentEmailParams): {
  template: EmailMessageTemplate;
  bodyHtmlSafe: string;
  bodyText: string;
  hasUnsafeLinksBlocked: boolean;
} {
  const locale: "en" | "ar" = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";
  const fontFamily = isAr
    ? "'Segoe UI', Tahoma, Arial, sans-serif"
    : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

  const baseUrl = safePublicBaseUrl(params.publicBaseUrl);
  const logoUrl = `${baseUrl}/brand/hirzexa-mark.png`;
  const subject = params.subject.trim() || (isAr ? "رسالة من HIRZEXA" : "Message from HIRZEXA");
  const rendered = renderSafeRecruitmentRichText(params.bodyMarkdown, locale);

  const eyebrow =
    EYEBROW_BY_TYPE[params.messageType]?.[locale] ||
    (isAr ? "استقطاب الكفاءات" : "TALENT ACQUISITION");
  const brandSubtitle = isAr ? "الذكاء الاصطناعي وهندسة البرمجيات" : "AI & SOFTWARE ENGINEERING";
  const departmentBadge = isAr ? "استقطاب الكفاءات" : "TALENT ACQUISITION";
  const footerLine = isAr
    ? "HIRZEXA — الذكاء الاصطناعي وهندسة البرمجيات"
    : "HIRZEXA — AI & Software Engineering";
  const careersLabel = isAr ? "التوظيف" : "Careers";
  const supportLabel = isAr ? "الدعم" : "Support";

  const preheader = rendered.plainText.replace(/\s+/g, " ").slice(0, 140) || subject;

  const previewBannerHtml = params.isSamplePreview
    ? `
      <tr>
        <td style="background-color:#FEF3C7;border-bottom:1px solid #F59E0B;padding:10px 32px;text-align:${align};">
          <div style="font-size:12px;font-weight:700;color:#92400E;line-height:1.5;">
            ${escapeHtml(
              isAr
                ? "معاينة نموذجية — أدخل بريدًا إلكترونيًا حقيقيًا ورسالة مكتملة قبل الإرسال."
                : "SAMPLE PREVIEW — Enter a valid recipient email and complete message content before sending."
            )}
          </div>
        </td>
      </tr>`
    : "";

  const contextStripHtml =
    params.positionTitle && params.messageType !== "custom"
      ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;background-color:#F8FAFC;border:1px solid #E5EAF2;border-radius:10px;">
        <tr>
          <td style="padding:12px 16px;text-align:${align};">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#667085;">
              ${escapeHtml(isAr ? "الدور الوظيفي:" : "ROLE CONTEXT:")}
            </span>
            <span style="font-size:13px;font-weight:600;color:#182230;margin-${isAr ? "right" : "left"}:6px;">
              ${escapeHtml(params.positionTitle)}
            </span>
          </td>
        </tr>
      </table>`
      : "";

  const html = `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F6F8FC;font-family:${fontFamily};color:#182230;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(preheader)}
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
                          <img src="${escapeHtml(logoUrl)}" alt="HIRZEXA" width="34" height="34" style="display:block;border-radius:8px;border:1px solid #243252;" />
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
          ${previewBannerHtml}
          <tr>
            <td style="padding:32px 32px 26px;text-align:${align};">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#315CDA;margin-bottom:8px;">
                ${escapeHtml(eyebrow)}
              </div>
              <h1 style="margin:0 0 20px;font-size:20px;line-height:1.35;font-weight:700;color:#182230;">
                ${escapeHtml(subject)}
              </h1>
              ${contextStripHtml}
              <div style="font-size:14.5px;line-height:1.72;color:#344054;text-align:${align};">
                ${rendered.safeHtml || `<p style="margin:0;color:#667085;">${escapeHtml(isAr ? "محتوى الرسالة سيظهر هنا." : "Your message content will appear here.")}</p>`}
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;border-top:1px solid #E5EAF2;">
                <tr>
                  <td style="padding-top:16px;text-align:${align};">
                    <div style="font-size:13px;font-weight:700;color:#182230;">
                      ${escapeHtml(isAr ? "فريق استقطاب الكفاءات — HIRZEXA" : "HIRZEXA Talent Acquisition")}
                    </div>
                    ${
                      params.senderName?.trim()
                        ? `<div style="font-size:12px;color:#667085;margin-top:2px;">${escapeHtml(
                            isAr
                              ? `أُرسلت بواسطة ${params.senderName.trim()}`
                              : `Sent on behalf of HIRZEXA by ${params.senderName.trim()}`
                          )}</div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
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

  const text = [
    params.isSamplePreview ? "[PREVIEW ONLY — Sample preview content]" : null,
    subject,
    params.positionTitle && params.messageType !== "custom"
      ? `${isAr ? "الدور الوظيفي" : "Role"}: ${params.positionTitle}`
      : null,
    "",
    rendered.plainText,
    "",
    "--",
    isAr ? "فريق استقطاب الكفاءات — HIRZEXA" : "HIRZEXA Talent Acquisition",
    `${isAr ? "التوظيف" : "Careers"}: ${OFFICIAL_CAREERS_EMAIL}`,
    `${isAr ? "الدعم" : "Support"}: ${OFFICIAL_SUPPORT_EMAIL}`,
    `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return {
    template: {
      from: getCareersSenderAddress(),
      to: params.recipientEmail.trim().toLowerCase(),
      replyTo: getCareersReplyToAddress(),
      subject,
      text,
      html,
    },
    bodyHtmlSafe: rendered.safeHtml,
    bodyText: rendered.plainText,
    hasUnsafeLinksBlocked: rendered.hasUnsafeLinksBlocked,
  };
}
