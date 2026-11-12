import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import {
  COMPANY_EMAILS,
  CONTACT_DIRECTORY,
  SYSTEM_NOTIFICATION_EMAIL,
} from "@/lib/company-emails";
import { isAutomatedAckEnabled } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { user } = await requireAdmin();
  const webhookConfigured = Boolean(process.env.CONTACT_WEBHOOK_URL);
  const autoAckEnabled = isAutomatedAckEnabled();

  return (
    <AdminShell active="settings">
      <div className="admin-top">
        <div>
          <h1>Settings</h1>
          <p>Workspace and communication settings.</p>
        </div>
      </div>
      <div className="admin-panel">
        <h2>Admin profile</h2>
        <div className="field-grid">
          <div className="field">
            <label>Name</label>
            <input defaultValue="Hassan" />
          </div>
          <div className="field">
            <label>Email</label>
            <input defaultValue={user.email || ""} type="email" />
          </div>
        </div>
        <button className="button-dark">Save changes</button>
      </div>
      <div className="admin-panel communication-settings">
        <h2>Communication settings</h2>
        <p>
          All operational HIRZEXA addresses are Google Workspace aliases belonging to one
          primary administration account. Receiving mail on an alias does not enable outbound
          sending from that alias unless Gmail &ldquo;Send mail as&rdquo; / SMTP / API sender
          identity and SPF/DKIM/DMARC records are verified.
        </p>
        <p className={webhookConfigured ? "admin-notice" : "admin-error"}>
          {webhookConfigured
            ? "Contact webhook is configured. Confirm end-to-end forwarding for each alias before relying on email delivery."
            : `Contact webhook is not configured. The form returns HTTP 503 with the matching departmental fallback address (default: ${COMPANY_EMAILS.general}).`}
        </p>
        <p className={autoAckEnabled ? "admin-notice" : "admin-error"}>
          {autoAckEnabled
            ? `Automated acknowledgment templates (${SYSTEM_NOTIFICATION_EMAIL} with departmental Reply-To) are authorized (VERIFIED_EMAIL_SENDER_ENABLED=true).`
            : `Automated sending from ${SYSTEM_NOTIFICATION_EMAIL} is disabled until sender identity verification is completed and VERIFIED_EMAIL_SENDER_ENABLED=true is set server-side.`}
        </p>
        <div className="communication-settings-grid">
          {CONTACT_DIRECTORY.map((channel) => (
            <div key={channel.id} className="communication-settings-row">
              <strong>{channel.en}</strong>
              <span>{channel.emails.map((key) => COMPANY_EMAILS[key]).join(" · ")}</span>
            </div>
          ))}
        </div>
        <small>
          Departmental routing is maintained in <code>lib/company-emails.ts</code> and bilingual
          acknowledgment templates in <code>lib/email-templates.ts</code>.
        </small>
      </div>
    </AdminShell>
  );
}
