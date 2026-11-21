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
      `فريق ${dept.ar} — HIRZEXA — AI & Software Engineering`,
      `الدعم: ${COMPANY_EMAILS.support}`,
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
    <p style="margin:0 0 14px;font-size:13px;line-height:1.65;color:#5c6b8e;">هذه رسالة إشعار آلية من <span dir="ltr">${SYSTEM_NOTIFICATION_EMAIL}</span>. لإضافة أي تفاصيل جديدة، يمكنك الرد مباشرة ليصل ردك إلى <span dir="ltr">${escapeHtml(replyChannel)}</span>.</p>
    <p style="margin:0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">HIRZEXA — AI &amp; Software Engineering · <a dir="ltr" href="mailto:${COMPANY_EMAILS.support}" style="color:#1050ff;">${COMPANY_EMAILS.support}</a> · <a dir="ltr" href="https://hirzexa.com" style="color:#1050ff;">hirzexa.com</a></p>
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
    `HIRZEXA — AI & Software Engineering (${dept.en})`,
    `Support: ${COMPANY_EMAILS.support}`,
    "Website: https://hirzexa.com",
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
    <p style="margin:0 0 14px;font-size:13px;line-height:1.65;color:#5c6b8e;">This automated message was sent from ${SYSTEM_NOTIFICATION_EMAIL}. Please reply directly to reach ${escapeHtml(replyChannel)} (do not compose new requests to the noreply address).</p>
    <p style="margin:0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">HIRZEXA — AI &amp; Software Engineering · Support: <a href="mailto:${COMPANY_EMAILS.support}" style="color:#1050ff;">${COMPANY_EMAILS.support}</a> · <a href="https://hirzexa.com" style="color:#1050ff;">hirzexa.com</a></p>
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
        `الدعم: ${COMPANY_EMAILS.support}`,
        "",
        `ملاحظة: هذه رسالة آلية من ${SYSTEM_NOTIFICATION_EMAIL}. يمكنك الرد مباشرة للتواصل مع فريق التوظيف (${careersEmail}).`,
        "",
        "HIRZEXA — AI & Software Engineering",
        "https://hirzexa.com",
      ].join("\n"),
      html: `<div dir="rtl" lang="ar" style="font-family:Tahoma,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9ff;color:#080d21;"><div style="background:#fff;border:1px solid #d9e0f5;border-radius:14px;padding:26px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1050ff;">HIRZEXA · التوظيف</p><h1 style="margin:0 0 12px;font-size:20px;">تم استلام طلبك بنجاح</h1><p style="font-size:15px;line-height:1.7;color:#34415e;">مرحباً ${escapeHtml(params.candidateName)}، استلمنا طلبك لوظيفة <strong>${escapeHtml(params.jobTitle)}</strong>. الرقم المرجعي: <strong dir="ltr">${escapeHtml(params.reference)}</strong>.</p><p style="font-size:13px;color:#5c6b8e;">لأي استفسار حول طلبك، يمكنك الرد مباشرة ليصل إلى <a dir="ltr" href="mailto:${careersEmail}">${careersEmail}</a>.</p><p style="margin:14px 0 0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">HIRZEXA — AI &amp; Software Engineering · <a dir="ltr" href="mailto:${COMPANY_EMAILS.support}" style="color:#1050ff;">${COMPANY_EMAILS.support}</a> · <a dir="ltr" href="https://hirzexa.com" style="color:#1050ff;">hirzexa.com</a></p></div></div>`,
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
      `Support: ${COMPANY_EMAILS.support}`,
      "",
      `Note: Automated message from ${SYSTEM_NOTIFICATION_EMAIL}. Reply directly to reach ${careersEmail}.`,
      "",
      "HIRZEXA — AI & Software Engineering",
      "https://hirzexa.com",
    ].join("\n"),
    html: `<div dir="ltr" lang="en" style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9ff;color:#080d21;"><div style="background:#fff;border:1px solid #d9e0f5;border-radius:14px;padding:26px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#1050ff;">HIRZEXA · CAREERS</p><h1 style="margin:0 0 12px;font-size:20px;">Application received</h1><p style="font-size:15px;line-height:1.65;color:#34415e;">Hello ${escapeHtml(params.candidateName)}, thank you for applying for <strong>${escapeHtml(params.jobTitle)}</strong>. Keep reference <strong>${escapeHtml(params.reference)}</strong> for your records.</p><p style="font-size:13px;color:#5c6b8e;">Questions regarding this role can be sent to <a href="mailto:${careersEmail}">${careersEmail}</a>.</p><p style="margin:14px 0 0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">HIRZEXA — AI &amp; Software Engineering · Support: <a href="mailto:${COMPANY_EMAILS.support}" style="color:#1050ff;">${COMPANY_EMAILS.support}</a> · <a href="https://hirzexa.com" style="color:#1050ff;">hirzexa.com</a></p></div></div>`,
  };
}

export function buildEmployeeInvitationEmail(params: {
  employeeName: string;
  employeeEmail: string;
  roleLabel: string;
  department: string;
  invitedByName: string;
  activationUrl: string;
  expiresAt: string;
  publicBaseUrl: string;
  fromAddress?: string;
  replyToAddress?: string;
}): EmailMessageTemplate {
  const from = params.fromAddress || "HIRZEXA Accounts <accounts@hirzexa.com>";
  const replyTo = params.replyToAddress || COMPANY_EMAILS.support;
  const supportEmail = COMPANY_EMAILS.support;
  const canonicalWebsite = "https://hirzexa.com";
  const safeBaseUrl = params.publicBaseUrl
    .replace(/https?:\/\/[a-z0-9-]+\.onrender\.com/gi, canonicalWebsite)
    .replace(/\/$/, "");
  const safeActivationUrl = params.activationUrl.replace(
    /https?:\/\/[a-z0-9-]+\.onrender\.com/gi,
    canonicalWebsite
  );
  const logoUrl = `${safeBaseUrl}/brand/hirzexa-mark.png`;
  const expiresFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(params.expiresAt));

  const subject = "You're invited to join HIRZEXA Intelligence";

  const text = [
    `Hello ${params.employeeName},`,
    "",
    `${params.invitedByName} has invited you to join HIRZEXA Intelligence, our internal AI & Software Engineering operating platform.`,
    "",
    `Assigned Role: ${params.roleLabel}`,
    `Department: ${params.department}`,
    `Work Account: ${params.employeeEmail}`,
    "",
    "Activate Your Account:",
    safeActivationUrl,
    "",
    `Expiration: This single-use activation link expires on ${expiresFormatted} (48 hours from issuance).`,
    "",
    "Security Notice:",
    "- This invitation link can only be used once and is tied to your email address.",
    "- You will create your own password securely during activation (HIRZEXA never emails plaintext passwords).",
    `- Do not forward or share this link. If you were not expecting this invitation, ignore this email or contact ${supportEmail} immediately.`,
    "",
    `Support: ${supportEmail}`,
    `Website: ${canonicalWebsite}`,
    "HIRZEXA — AI & Software Engineering",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#060a14;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#060a14;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#0b1120;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
          <!-- Brand Header -->
          <tr>
            <td style="padding:28px 32px 22px;background:linear-gradient(135deg,#0f172a 0%,#131c38 100%);border-bottom:1px solid #1e293b;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${escapeHtml(logoUrl)}" alt="HIRZEXA" width="32" height="32" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:15px;font-weight:800;letter-spacing:0.06em;color:#ffffff;line-height:1.1;">HIRZEXA</div>
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;color:#93c5fd;text-transform:uppercase;margin-top:3px;">INTELLIGENCE</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#60a5fa;">EMPLOYEE WORKSPACE INVITATION</p>
              <h1 style="margin:0 0 14px;font-size:24px;font-weight:700;line-height:1.25;color:#ffffff;">Welcome to HIRZEXA Intelligence, ${escapeHtml(params.employeeName)}</h1>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#cbd5e1;">
                <strong style="color:#f8fafc;">${escapeHtml(params.invitedByName)}</strong> has invited you to activate your employee account on <strong style="color:#f8fafc;">HIRZEXA Intelligence</strong>.
              </p>

              <!-- Role & Account Summary Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#080d1a;border:1px solid #1e293b;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13.5px;line-height:1.6;">
                      <tr>
                        <td style="padding:4px 0;color:#94a3b8;width:130px;">Assigned Role</td>
                        <td style="padding:4px 0;font-weight:600;color:#ffffff;">${escapeHtml(params.roleLabel)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#94a3b8;">Department</td>
                        <td style="padding:4px 0;font-weight:600;color:#e2e8f0;">${escapeHtml(params.department)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#94a3b8;">Work Email</td>
                        <td style="padding:4px 0;color:#93c5fd;">${escapeHtml(params.employeeEmail)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#94a3b8;">Link Expires</td>
                        <td style="padding:4px 0;color:#fde68a;">${escapeHtml(expiresFormatted)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(90deg,#2563eb 0%,#7c3aed 100%);">
                    <a href="${escapeHtml(safeActivationUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 28px;font-size:14.5px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Activate Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0 0 22px;font-size:12.5px;line-height:1.6;color:#94a3b8;">
                If the button does not open in your email client, copy and paste this secure link into your browser:<br />
                <a href="${escapeHtml(safeActivationUrl)}" style="color:#93c5fd;word-break:break-all;">${escapeHtml(safeActivationUrl)}</a>
              </p>

              <!-- Security Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:rgba(30,41,82,0.45);border:1px solid #1e3a5f;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;font-size:12.5px;line-height:1.6;color:#cbd5e1;">
                    <strong style="color:#f8fafc;display:block;margin-bottom:4px;">Security Notice</strong>
                    This activation link is <strong style="color:#f8fafc;">single-use</strong> and expires in 48 hours. You will create your own password during activation—HIRZEXA never sends plaintext passwords. Do not forward this email. If you did not expect this invitation, contact <a href="mailto:${escapeHtml(supportEmail)}" style="color:#93c5fd;">${escapeHtml(supportEmail)}</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid #1e293b;font-size:12px;line-height:1.6;color:#64748b;">
              <div><strong style="color:#94a3b8;">HIRZEXA — AI &amp; Software Engineering</strong></div>
              <div>Support: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#93c5fd;text-decoration:none;">${escapeHtml(supportEmail)}</a> · <a href="${canonicalWebsite}" style="color:#93c5fd;text-decoration:none;">hirzexa.com</a></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return {
    from,
    to: params.employeeEmail,
    replyTo,
    subject,
    text,
    html,
  };
}

export function buildAccountActivatedEmail(params: {
  employeeName: string;
  employeeEmail: string;
  roleLabel: string;
  publicBaseUrl?: string;
  fromAddress?: string;
  replyToAddress?: string;
}): EmailMessageTemplate {
  const from = params.fromAddress || "HIRZEXA Accounts <accounts@hirzexa.com>";
  const replyTo = params.replyToAddress || COMPANY_EMAILS.support;
  const supportEmail = COMPANY_EMAILS.support;
  const canonicalWebsite = "https://hirzexa.com";
  const safeBaseUrl = (params.publicBaseUrl || canonicalWebsite)
    .replace(/https?:\/\/[a-z0-9-]+\.onrender\.com/gi, canonicalWebsite)
    .replace(/\/$/, "");
  const loginUrl = `${safeBaseUrl}/admin/login`;
  const logoUrl = `${safeBaseUrl}/brand/hirzexa-mark.png`;
  const subject = "Your HIRZEXA Intelligence account is active";

  const text = [
    `Hello ${params.employeeName},`,
    "",
    "Your HIRZEXA Intelligence employee account has been activated successfully.",
    "",
    `Work Account: ${params.employeeEmail}`,
    `Assigned Role: ${params.roleLabel}`,
    `Sign In: ${loginUrl}`,
    "",
    `If you did not perform this activation, contact ${supportEmail} immediately.`,
    "",
    `Support: ${supportEmail}`,
    `Website: ${canonicalWebsite}`,
    "HIRZEXA — AI & Software Engineering",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#060a14;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#060a14;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#0b1120;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:26px 32px 20px;background:linear-gradient(135deg,#0f172a 0%,#131c38 100%);border-bottom:1px solid #1e293b;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${escapeHtml(logoUrl)}" alt="HIRZEXA" width="30" height="30" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:15px;font-weight:800;letter-spacing:0.06em;color:#ffffff;line-height:1.1;">HIRZEXA</div>
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;color:#93c5fd;text-transform:uppercase;margin-top:3px;">INTELLIGENCE</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 24px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#34d399;">ACCOUNT ACTIVATED</p>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">You're ready to sign in, ${escapeHtml(params.employeeName)}</h1>
              <p style="margin:0 0 20px;font-size:14.5px;line-height:1.65;color:#cbd5e1;">
                Your HIRZEXA Intelligence account (<strong style="color:#f8fafc;">${escapeHtml(params.employeeEmail)}</strong>) has been activated under the <strong style="color:#f8fafc;">${escapeHtml(params.roleLabel)}</strong> role.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(90deg,#2563eb 0%,#7c3aed 100%);">
                    <a href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Sign In to HIRZEXA Intelligence
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12.5px;line-height:1.6;color:#94a3b8;">
                If you did not perform this activation, contact <a href="mailto:${escapeHtml(supportEmail)}" style="color:#93c5fd;">${escapeHtml(supportEmail)}</a> immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 22px;border-top:1px solid #1e293b;font-size:12px;line-height:1.6;color:#64748b;">
              <div><strong style="color:#94a3b8;">HIRZEXA — AI &amp; Software Engineering</strong></div>
              <div>Support: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#93c5fd;text-decoration:none;">${escapeHtml(supportEmail)}</a> · <a href="${canonicalWebsite}" style="color:#93c5fd;text-decoration:none;">hirzexa.com</a></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return {
    from,
    to: params.employeeEmail,
    replyTo,
    subject,
    text,
    html,
  };
}


