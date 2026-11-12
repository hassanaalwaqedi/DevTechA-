import {
  COMPANY_EMAILS,
  DEPARTMENT_METADATA,
  SYSTEM_NOTIFICATION_EMAIL,
  type CompanyEmailChannel,
} from "@/lib/company-emails";
import type { Locale } from "@/lib/locale";

export interface ContactSubmissionRecord {
  reference: string;
  name: string;
  email: string;
  company: string;
  category: string;
  budget: string;
  overview: string;
  department: CompanyEmailChannel;
  locale: Locale;
}

export interface EmailMessageTemplate {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Automated sending from `noreply@hirzexa.com` must stay disabled until
 * Google Workspace sender identity, Gmail "Send mail as" (if relaying through Gmail),
 * and domain SPF/DKIM/DMARC authentication are verified server-side.
 */
export function isAutomatedAckEnabled() {
  return process.env.VERIFIED_EMAIL_SENDER_ENABLED === "true";
}

export function buildInternalContactNotificationEmail(
  submission: ContactSubmissionRecord
): EmailMessageTemplate {
  const targetEmail = COMPANY_EMAILS[submission.department];
  const dept = DEPARTMENT_METADATA[submission.department];

  const subject = `[HIRZEXA · ${dept.en}] ${submission.category} — ${submission.name} (${submission.reference})`;
  const text = [
    `HIRZEXA Website Inquiry (${submission.reference})`,
    `Department: ${dept.en} <${targetEmail}>`,
    `Category: ${submission.category}`,
    `From: ${submission.name} <${submission.email}>`,
    submission.company ? `Company: ${submission.company}` : null,
    submission.budget ? `Project Scope: ${submission.budget}` : null,
    "",
    "Overview:",
    submission.overview,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#080d21;background:#f8f9ff;">
  <div style="background:#ffffff;border:1px solid #d9e0f5;border-radius:12px;padding:24px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1050ff;letter-spacing:0.06em;">HIRZEXA INQUIRY ROUTING · ${escapeHtml(submission.reference)}</p>
    <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(dept.en)} (${escapeHtml(targetEmail)})</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#465473;width:130px;">Category</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(submission.category)}</td></tr>
      <tr><td style="padding:6px 0;color:#465473;">Sender</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(submission.name)} &lt;${escapeHtml(submission.email)}&gt;</td></tr>
      ${submission.company ? `<tr><td style="padding:6px 0;color:#465473;">Company</td><td style="padding:6px 0;">${escapeHtml(submission.company)}</td></tr>` : ""}
      ${submission.budget ? `<tr><td style="padding:6px 0;color:#465473;">Scope</td><td style="padding:6px 0;">${escapeHtml(submission.budget)}</td></tr>` : ""}
    </table>
    <div style="padding:14px;border-radius:8px;background:#f1f4ff;color:#080d21;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(submission.overview)}</div>
  </div>
</div>`.trim();

  return {
    from: `HIRZEXA Website <${SYSTEM_NOTIFICATION_EMAIL}>`,
    to: targetEmail,
    replyTo: submission.email,
    subject,
    text,
    html,
  };
}

export function buildDepartmentalAcknowledgmentEmail(
  submission: ContactSubmissionRecord
): EmailMessageTemplate {
  const replyChannel = COMPANY_EMAILS[submission.department];
  const dept = DEPARTMENT_METADATA[submission.department];
  const ar = submission.locale === "ar";

  if (ar) {
    const subject = `تم استلام رسالتك لدى HIRZEXA — ${dept.ar} (${submission.reference})`;
    const text = [
      `مرحباً ${submission.name}،`,
      "",
      `شكراً لتواصلك مع HIRZEXA. تم استلام رسالتك ضمن تصنيف "${submission.category}" وتوجيهها إلى فريق ${dept.ar}.`,
      `الرقم المرجعي: ${submission.reference}`,
      `القسم المختص للرد والمتابعة: ${replyChannel}`,
      "",
      `ملاحظة: هذه رسالة إشعار آلية صادرة من ${SYSTEM_NOTIFICATION_EMAIL}. للرد أو إضافة تفاصيل، يرجى الرد مباشرة على هذا البريد ليصل إلى ${replyChannel}.`,
      "",
      "مع التحية،",
      `فريق ${dept.ar} — HIRZEXA`,
      "https://hirzexa.com",
    ].join("\n");

    const html = `
<div dir="rtl" lang="ar" style="font-family:Tahoma,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#080d21;background:#f8f9ff;">
  <div style="background:#ffffff;border:1px solid #d9e0f5;border-radius:14px;padding:28px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1050ff;">HIRZEXA · إشعار استلام الطلب</p>
    <h1 style="margin:0 0 14px;font-size:21px;color:#080d21;">شكراً لتواصلك مع فريق ${escapeHtml(dept.ar)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#34415e;">مرحباً ${escapeHtml(submission.name)}، لقد استلمنا استفسارك بنجاح وتم توجيهه إلى القسم المختص للمراجعة.</p>
    <div style="padding:14px 16px;border-radius:10px;background:#f1f4ff;margin-bottom:18px;font-size:14px;line-height:1.7;">
      <div><strong>الرقم المرجعي:</strong> <span dir="ltr">${escapeHtml(submission.reference)}</span></div>
      <div><strong>القسم المختص:</strong> ${escapeHtml(dept.ar)}</div>
      <div><strong>قناة الرد المباشر:</strong> <a dir="ltr" href="mailto:${escapeHtml(replyChannel)}" style="color:#1050ff;">${escapeHtml(replyChannel)}</a></div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.65;color:#5c6b8e;">هذه رسالة إشعار آلية من <span dir="ltr">${SYSTEM_NOTIFICATION_EMAIL}</span>. لإضافة أي تفاصيل جديدة، يمكنك الرد مباشرة ليصل ردك إلى <span dir="ltr">${escapeHtml(replyChannel)}</span>.</p>
  </div>
</div>`.trim();

    return {
      from: `HIRZEXA Notifications <${SYSTEM_NOTIFICATION_EMAIL}>`,
      to: submission.email,
      replyTo: replyChannel,
      subject,
      text,
      html,
    };
  }

  const subject = `We received your HIRZEXA inquiry — ${dept.en} (${submission.reference})`;
  const text = [
    `Hello ${submission.name},`,
    "",
    `Thank you for contacting HIRZEXA. Your inquiry regarding "${submission.category}" has been routed to our ${dept.en} team (${dept.roleEn}).`,
    `Reference ID: ${submission.reference}`,
    `Department Reply Channel: ${replyChannel}`,
    "",
    `Note: This is an automated acknowledgment sent from ${SYSTEM_NOTIFICATION_EMAIL}. To share additional details or follow up, please reply directly or email ${replyChannel}.`,
    "",
    "Best regards,",
    `HIRZEXA ${dept.en}`,
    "https://hirzexa.com",
  ].join("\n");

  const html = `
<div dir="ltr" lang="en" style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#080d21;background:#f8f9ff;">
  <div style="background:#ffffff;border:1px solid #d9e0f5;border-radius:14px;padding:28px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#1050ff;">HIRZEXA · AUTOMATED ACKNOWLEDGMENT</p>
    <h1 style="margin:0 0 14px;font-size:21px;color:#080d21;">Thank you for contacting ${escapeHtml(dept.en)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#34415e;">Hello ${escapeHtml(submission.name)}, we have received your inquiry and routed it to the right HIRZEXA department for review.</p>
    <div style="padding:14px 16px;border-radius:10px;background:#f1f4ff;margin-bottom:18px;font-size:14px;line-height:1.7;">
      <div><strong>Reference:</strong> ${escapeHtml(submission.reference)}</div>
      <div><strong>Department:</strong> ${escapeHtml(dept.en)}</div>
      <div><strong>Reply Channel:</strong> <a href="mailto:${escapeHtml(replyChannel)}" style="color:#1050ff;">${escapeHtml(replyChannel)}</a></div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.65;color:#5c6b8e;">This automated message was sent from ${SYSTEM_NOTIFICATION_EMAIL}. Please reply directly to reach ${escapeHtml(replyChannel)} (do not compose new requests to the noreply address).</p>
  </div>
</div>`.trim();

  return {
    from: `HIRZEXA Notifications <${SYSTEM_NOTIFICATION_EMAIL}>`,
    to: submission.email,
    replyTo: replyChannel,
    subject,
    text,
    html,
  };
}

export function buildRecruitmentAcknowledgmentEmail(params: {
  reference: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  locale?: Locale;
}): EmailMessageTemplate {
  const ar = params.locale === "ar";
  const careersEmail = COMPANY_EMAILS.careers;

  if (ar) {
    return {
      from: `HIRZEXA Careers <${SYSTEM_NOTIFICATION_EMAIL}>`,
      to: params.candidateEmail,
      replyTo: careersEmail,
      subject: `تم استلام طلب التوظيف في HIRZEXA — ${params.jobTitle} (${params.reference})`,
      text: [
        `مرحباً ${params.candidateName}،`,
        "",
        `تم استلام طلبك للتقديم على وظيفة "${params.jobTitle}" لدى HIRZEXA بنجاح.`,
        `الرقم المرجعي للطلب: ${params.reference}`,
        `للاستفسارات المتعلقة بالتوظيف: ${careersEmail}`,
        "",
        `ملاحظة: هذه رسالة آلية من ${SYSTEM_NOTIFICATION_EMAIL}. يمكنك الرد مباشرة للتواصل مع فريق التوظيف (${careersEmail}).`,
      ].join("\n"),
      html: `<div dir="rtl" lang="ar" style="font-family:Tahoma,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9ff;color:#080d21;"><div style="background:#fff;border:1px solid #d9e0f5;border-radius:14px;padding:26px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1050ff;">HIRZEXA · التوظيف</p><h1 style="margin:0 0 12px;font-size:20px;">تم استلام طلبك بنجاح</h1><p style="font-size:15px;line-height:1.7;color:#34415e;">مرحباً ${escapeHtml(params.candidateName)}، استلمنا طلبك لوظيفة <strong>${escapeHtml(params.jobTitle)}</strong>. الرقم المرجعي: <strong dir="ltr">${escapeHtml(params.reference)}</strong>.</p><p style="font-size:13px;color:#5c6b8e;">لأي استفسار حول طلبك، يمكنك الرد مباشرة ليصل إلى <a dir="ltr" href="mailto:${careersEmail}">${careersEmail}</a>.</p></div></div>`,
    };
  }

  return {
    from: `HIRZEXA Careers <${SYSTEM_NOTIFICATION_EMAIL}>`,
    to: params.candidateEmail,
    replyTo: careersEmail,
    subject: `HIRZEXA Application Received — ${params.jobTitle} (${params.reference})`,
    text: [
      `Hello ${params.candidateName},`,
      "",
      `We received your application for ${params.jobTitle} at HIRZEXA.`,
      `Application Reference: ${params.reference}`,
      `Recruitment Contact: ${careersEmail}`,
      "",
      `Note: Automated message from ${SYSTEM_NOTIFICATION_EMAIL}. Reply directly to reach ${careersEmail}.`,
    ].join("\n"),
    html: `<div dir="ltr" lang="en" style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9ff;color:#080d21;"><div style="background:#fff;border:1px solid #d9e0f5;border-radius:14px;padding:26px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#1050ff;">HIRZEXA · CAREERS</p><h1 style="margin:0 0 12px;font-size:20px;">Application received</h1><p style="font-size:15px;line-height:1.65;color:#34415e;">Hello ${escapeHtml(params.candidateName)}, thank you for applying for <strong>${escapeHtml(params.jobTitle)}</strong>. Keep reference <strong>${escapeHtml(params.reference)}</strong> for your records.</p><p style="font-size:13px;color:#5c6b8e;">Questions regarding this role can be sent to <a href="mailto:${careersEmail}">${careersEmail}</a>.</p></div></div>`,
  };
}

