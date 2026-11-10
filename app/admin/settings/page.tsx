import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { COMPANY_EMAILS, CONTACT_DIRECTORY } from "@/lib/company-emails";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { user } = await requireAdmin();
  const webhookConfigured = Boolean(process.env.CONTACT_WEBHOOK_URL);

  return <AdminShell active="settings">
    <div className="admin-top"><div><h1>Settings</h1><p>Workspace and communication settings.</p></div></div>
    <div className="admin-panel">
      <h2>Admin profile</h2>
      <div className="field-grid">
        <div className="field"><label>Name</label><input defaultValue="Hassan" /></div>
        <div className="field"><label>Email</label><input defaultValue={user.email || ""} type="email" /></div>
      </div>
      <button className="button-dark">Save changes</button>
    </div>
    <div className="admin-panel communication-settings">
      <h2>Communication settings</h2>
      <p>These are Google Workspace aliases managed through one account. The website sends contact form data to the configured webhook, which must forward each enquiry to the recipient below.</p>
      <p className={webhookConfigured ? "admin-notice" : "admin-error"}>
        {webhookConfigured ? "Contact webhook is configured. Confirm delivery with a test enquiry before relying on email forwarding." : <>Contact webhook is not configured. The form returns a delivery error and offers {COMPANY_EMAILS.general} as a fallback.</>}
      </p>
      <div className="communication-settings-grid">
        {CONTACT_DIRECTORY.map((channel) => <div key={channel.id} className="communication-settings-row">
          <strong>{channel.en}</strong>
          <span>{channel.emails.map((key) => COMPANY_EMAILS[key]).join(" · ")}</span>
        </div>)}
      </div>
      <small>Routing is maintained in <code>lib/company-emails.ts</code>. Update the aliases there and redeploy to change them.</small>
    </div>
  </AdminShell>;
}
