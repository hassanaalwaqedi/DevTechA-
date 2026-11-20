import { AdminProfileForm } from "@/components/admin-profile-form";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader, StatusBadge } from "@/components/admin-ui/primitives";
import { requirePermission } from "@/lib/auth";
import {
  COMPANY_EMAILS,
  CONTACT_DIRECTORY,
  SYSTEM_NOTIFICATION_EMAIL,
} from "@/lib/company-emails";
import { isAutomatedAckEnabled } from "@/lib/email-templates";
import { findEmployeeByAuthOrEmail } from "@/lib/intelligence/employees";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { actor } = await requirePermission("settings", "view");
  const employee = await findEmployeeByAuthOrEmail(actor.id, actor.email);
  const webhookConfigured = Boolean(process.env.CONTACT_WEBHOOK_URL);
  const autoAckEnabled = isAutomatedAckEnabled();
  const aiConfigured = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const aiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  return (
    <AdminShell active="settings">
      <PageHeader
        eyebrow="System · Configuration"
        title="Settings & Integrations"
        description="Operator identity, AI intelligence runtime status, and Google Workspace communication routing."
        actions={<StatusBadge tone="blue">{actor.roleLabel}</StatusBadge>}
      />

      <section className="hz-card" style={{ marginBottom: 16 }}>
        <div className="hz-card-head">
          <div>
            <h2>Operator Profile &amp; Security</h2>
            <p>Manage your authenticated workspace display identity and view active session posture.</p>
          </div>
          <StatusBadge tone={actor.mfaEnrolled ? "emerald" : "amber"}>
            {actor.mfaEnrolled ? "MFA Active" : "MFA Not Enrolled"}
          </StatusBadge>
        </div>
        <AdminProfileForm
          initialFullName={employee?.fullName || actor.fullName}
          initialJobTitle={employee?.jobTitle || actor.roleLabel}
          initialDepartment={employee?.department || actor.department}
          email={actor.email}
          roleLabel={actor.roleLabel}
          scope={actor.scope}
          mfaEnrolled={actor.mfaEnrolled}
          sessionVersion={actor.sessionVersion}
        />
      </section>

      <section className="hz-card" style={{ marginBottom: 16 }}>
        <div className="hz-card-head">
          <div>
            <h2>HIRZEXA Intelligence Runtime</h2>
            <p>Server-side Gemini synthesis and tool-execution runtime status.</p>
          </div>
          <StatusBadge tone={aiConfigured ? "emerald" : "amber"}>
            {aiConfigured ? aiModel : "Deterministic Mode"}
          </StatusBadge>
        </div>
        <p className={aiConfigured ? "hz-alert hz-alert-success" : "hz-alert hz-alert-warning"} style={{ marginBottom: 0 }}>
          {aiConfigured
            ? `Gemini synthesis runtime is active (${aiModel}). All AI queries execute server-side through RBAC-checked typed tools with prompt-injection sanitization and mandatory human approval for write actions.`
            : "GOOGLE_GENERATIVE_AI_API_KEY is not configured. The AI Agent operates in deterministic grounded tool-summary mode."}
        </p>
      </section>

      <section className="hz-card communication-settings">
        <div className="hz-card-head">
          <div>
            <h2>Communication Routing</h2>
            <p>Departmental Google Workspace aliases, contact webhook, and automated acknowledgment verification.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <StatusBadge tone={webhookConfigured ? "emerald" : "amber"}>
              {webhookConfigured ? "Webhook Active" : "Webhook Unset"}
            </StatusBadge>
            <StatusBadge tone={autoAckEnabled ? "emerald" : "neutral"}>
              {autoAckEnabled ? "Auto-Ack Verified" : "Auto-Ack Disabled"}
            </StatusBadge>
          </div>
        </div>
        <p style={{ marginTop: 0, fontSize: 13, color: "var(--hz-text-secondary)" }}>
          All operational HIRZEXA addresses are Google Workspace aliases belonging to one
          primary administration account. Receiving mail on an alias does not enable outbound
          sending from that alias unless Gmail &ldquo;Send mail as&rdquo; / SMTP / API sender
          identity and SPF/DKIM/DMARC records are verified.
        </p>
        <p className={webhookConfigured ? "hz-alert hz-alert-success" : "hz-alert hz-alert-warning"}>
          {webhookConfigured
            ? "Contact webhook is configured. Confirm end-to-end forwarding for each alias before relying on email delivery."
            : `Contact webhook is not configured. The form returns HTTP 503 with the matching departmental fallback address (default: ${COMPANY_EMAILS.general}).`}
        </p>
        <p className={autoAckEnabled ? "hz-alert hz-alert-success" : "hz-alert hz-alert-warning"}>
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
        <small style={{ color: "var(--hz-text-muted)" }}>
          Departmental routing is maintained in <code>lib/company-emails.ts</code> and
          bilingual acknowledgment templates in <code>lib/email-templates.ts</code>.
        </small>
      </section>
    </AdminShell>
  );
}
