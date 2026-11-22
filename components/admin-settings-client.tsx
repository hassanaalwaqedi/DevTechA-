"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  Database,
  Globe,
  Mail,
  Plug,
  RefreshCw,
  Send,
  Shield,
  Users,
  Webhook,
} from "lucide-react";
import { AdminProfileForm } from "@/components/admin-profile-form";
import { Modal, StatusBadge } from "@/components/admin-ui/primitives";
import type {
  DnsCheckResult,
  ServiceHealthStatus,
  SettingsDiagnosticsSnapshot,
} from "@/lib/settings/diagnostics";

type SettingsSectionId =
  | "general"
  | "ai"
  | "email"
  | "integrations"
  | "team"
  | "security";

const NAV_ITEMS: Array<{
  id: SettingsSectionId;
  label: string;
  icon: typeof Building2;
}> = [
  { id: "general", label: "General & Workspace", icon: Building2 },
  { id: "ai", label: "AI Intelligence", icon: Bot },
  { id: "email", label: "Communications & Email", icon: Mail },
  { id: "integrations", label: "Integrations & Webhooks", icon: Plug },
  { id: "team", label: "Team & Permissions", icon: Users },
  { id: "security", label: "Security & Audit", icon: Shield },
];

const CORE_ALIAS_IDS = new Set([
  "general",
  "business",
  "support",
  "partnerships",
  "investors",
  "careers",
]);

function healthMeta(status: ServiceHealthStatus): {
  label: string;
  tone: "emerald" | "amber" | "rose" | "blue" | "neutral";
} {
  switch (status) {
    case "operational":
      return { label: "Operational", tone: "emerald" };
    case "configuration_required":
      return { label: "Configuration Required", tone: "amber" };
    case "degraded":
      return { label: "Degraded", tone: "rose" };
    case "unavailable":
      return { label: "Unavailable", tone: "rose" };
    case "not_verified":
    default:
      return { label: "Not Verified", tone: "blue" };
  }
}

function formatShortTimestamp(iso: string | null): string {
  if (!iso) return "Not verified yet";
  return `${iso.slice(0, 16).replace("T", " ")} UTC`;
}

export function AdminSettingsClient({
  initialSnapshot,
  actorProfile,
  canEditSettings,
}: {
  initialSnapshot: SettingsDiagnosticsSnapshot;
  actorProfile: {
    fullName: string;
    jobTitle: string;
    department: string;
    email: string;
    roleLabel: string;
    scope: string;
    mfaEnrolled: boolean;
    sessionVersion: number;
  };
  canEditSettings: boolean;
}) {
  const [section, setSection] = useState<SettingsSectionId>("general");
  const [snapshot, setSnapshot] = useState<SettingsDiagnosticsSnapshot>(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "success" | "error" | "warn"; text: string } | null>(
    null
  );

  // Live probe results (real server responses only)
  const [aiProbe, setAiProbe] = useState<{
    ok: boolean;
    detail: string;
    latencyMs: number;
    checkedAt: string;
  } | null>(null);
  const [dnsResult, setDnsResult] = useState<DnsCheckResult | null>(null);
  const [webhookProbe, setWebhookProbe] = useState<{
    ok: boolean;
    httpStatus: number | null;
    latencyMs: number;
    checkedAt: string;
    detail: string;
  } | null>(null);

  // Safe Test Email confirmation modal
  const [testEmailModalOpen, setTestEmailModalOpen] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState(
    /@devtech\.ai$/i.test(actorProfile.email) ? "" : actorProfile.email
  );
  const [testEmailConfirmed, setTestEmailConfirmed] = useState(false);

  const [showAllAliases, setShowAllAliases] = useState(false);

  async function refreshSnapshot() {
    setRefreshing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.snapshot) {
        setBanner({ kind: "error", text: data.error || "Unable to refresh diagnostics." });
        return;
      }
      setSnapshot(data.snapshot);
    } catch {
      setBanner({ kind: "error", text: "Network error while refreshing status." });
    } finally {
      setRefreshing(false);
    }
  }

  async function runAction(
    action: "test_ai" | "verify_email_dns" | "test_contact_webhook" | "send_test_email",
    extra?: Record<string, unknown>
  ) {
    setActionBusy(action);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/settings/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
      if (!res.ok) {
        setBanner({ kind: "error", text: data.error || data.result?.error || "Action failed." });
        return;
      }

      if (action === "test_ai" && data.result) {
        setAiProbe(data.result);
        setBanner({
          kind: data.result.ok ? "success" : "warn",
          text: data.result.detail,
        });
      } else if (action === "verify_email_dns" && data.result) {
        setDnsResult(data.result);
        setBanner({
          kind: "success",
          text: `Live DNS records verified for ${data.result.domain}.`,
        });
      } else if (action === "test_contact_webhook" && data.result) {
        setWebhookProbe(data.result);
        setBanner({
          kind: data.result.ok ? "success" : "warn",
          text: data.result.detail,
        });
      } else if (action === "send_test_email" && data.result) {
        setTestEmailModalOpen(false);
        setTestEmailConfirmed(false);
        setBanner({
          kind: data.result.ok ? "success" : "error",
          text: data.result.ok
            ? `Test email accepted by Resend (ID: ${data.result.messageId || "ok"}).`
            : data.result.error || "Test email delivery failed.",
        });
      }
    } catch {
      setBanner({ kind: "error", text: "Network error executing settings action." });
    } finally {
      setActionBusy(null);
    }
  }

  const aiBadge = healthMeta(snapshot.aiRuntime.status);
  const dbBadge = healthMeta(snapshot.database.status);
  const emailBadge = healthMeta(snapshot.email.providerStatus);
  const ackBadge = healthMeta(snapshot.email.autoAckStatus);
  const contactBadge = healthMeta(snapshot.contactRouting.status);
  const calBadge = healthMeta(snapshot.externalCalendar.status);

  const visibleDepartments = showAllAliases
    ? snapshot.email.departments
    : snapshot.email.departments.filter((d) => CORE_ALIAS_IDS.has(d.id));

  return (
    <div className="hz-set-page">
      {/* Compact Enterprise Header */}
      <header className="hz-set-header">
        <div>
          <h1 className="hz-set-title">Settings</h1>
          <p className="hz-set-subtitle">
            Manage your workspace, intelligence services, communications, and security.
          </p>
        </div>
        <div className="hz-set-header-right">
          <StatusBadge tone="blue">{actorProfile.roleLabel}</StatusBadge>
          <button
            type="button"
            className="hz-btn hz-btn-secondary hz-btn-sm"
            disabled={refreshing}
            onClick={() => void refreshSnapshot()}
          >
            <RefreshCw size={13} />
            {refreshing ? "Refreshing…" : "Refresh Status"}
          </button>
        </div>
      </header>

      {banner ? (
        <div
          className={`hz-int-banner ${
            banner.kind === "error"
              ? "is-error"
              : banner.kind === "warn"
                ? "is-warn"
                : "is-success"
          }`}
          style={{ marginBottom: 14 }}
        >
          {banner.kind === "success" ? (
            <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          ) : (
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          )}
          <span>{banner.text}</span>
        </div>
      ) : null}

      <div className="hz-set-layout">
        {/* Clean Left Section Navigation */}
        <nav className="hz-set-nav" aria-label="Settings sections">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`hz-set-nav-btn ${active ? "is-active" : ""}`}
                onClick={() => {
                  setSection(item.id);
                  setBanner(null);
                }}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Section Content */}
        <div className="hz-set-content">
          {/* 1. GENERAL & WORKSPACE */}
          {section === "general" ? (
            <>
              <section className="hz-set-card">
                <div className="hz-set-card-head">
                  <div>
                    <h2>Operator Profile</h2>
                    <p>Your display identity across HIRZEXA Intelligence and audit entries.</p>
                  </div>
                  <StatusBadge tone="neutral">{actorProfile.scope} scope</StatusBadge>
                </div>
                <AdminProfileForm
                  initialFullName={actorProfile.fullName}
                  initialJobTitle={actorProfile.jobTitle}
                  initialDepartment={actorProfile.department}
                  email={actorProfile.email}
                  isLegacyAuth={snapshot.workspace.legacyAuthDetected}
                />
              </section>

              <section className="hz-set-card">
                <div className="hz-set-card-head">
                  <div>
                    <h2>Workspace Identity</h2>
                    <p>Canonical brand origin, runtime mode, and authentication identity audit.</p>
                  </div>
                  <StatusBadge tone={snapshot.workspace.appBaseUrlValid ? "emerald" : "amber"} dot>
                    {snapshot.workspace.appBaseUrlValid ? "HIRZEXA Verified" : "Origin Check Needed"}
                  </StatusBadge>
                </div>

                <div className="hz-set-kv-grid">
                  <div className="hz-set-kv">
                    <span>Organization Brand</span>
                    <strong>{snapshot.workspace.brand}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Canonical Base URL</span>
                    <strong>{snapshot.workspace.canonicalUrl}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Environment</span>
                    <strong>{snapshot.workspace.environment}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Database</span>
                    <strong>{snapshot.database.summary}</strong>
                  </div>
                </div>

                {snapshot.workspace.legacyAuthDetected ? (
                  <div className="hz-set-notice-box" style={{ marginTop: 14 }}>
                    <div className="hz-set-notice-head">
                      <AlertTriangle size={14} style={{ color: "#fbbf24", flexShrink: 0 }} />
                      <strong>Legacy Authentication Email Detected ({actorProfile.email})</strong>
                    </div>
                    <p>
                      {snapshot.workspace.legacyAuthOrigin} To protect access and audit continuity,
                      HIRZEXA never mutates authentication credentials automatically. Sidebar chrome
                      masks the legacy domain as <code>HIRZEXA Workspace · Legacy Auth</code>.
                    </p>
                    <details className="hz-set-details">
                      <summary>
                        <ChevronDown size={13} /> Safe manual migration steps to an @hirzexa.com
                        Super Admin login
                      </summary>
                      <ol className="hz-set-steps">
                        <li>
                          Open <Link href="/admin/team">Team &amp; RBAC</Link> and invite your
                          deliverable <code>@hirzexa.com</code> address as <strong>Super Admin</strong>.
                        </li>
                        <li>
                          Activate the new account, sign in with it, and confirm full dashboard &amp;
                          settings access.
                        </li>
                        <li>
                          Once verified, suspend the legacy <code>admin@devtech.ai</code> account in
                          Team &amp; RBAC.
                        </li>
                      </ol>
                    </details>
                  </div>
                ) : null}
              </section>
            </>
          ) : null}

          {/* 2. AI INTELLIGENCE */}
          {section === "ai" ? (
            <section className="hz-set-card">
              <div className="hz-set-card-head">
                <div>
                  <h2>AI Intelligence Runtime</h2>
                  <p>Server-side Gemini synthesis, typed tool execution, and approval safeguards.</p>
                </div>
                <div className="hz-set-head-actions">
                  <StatusBadge tone={aiBadge.tone} dot>
                    {aiBadge.label}
                  </StatusBadge>
                  {canEditSettings ? (
                    <button
                      type="button"
                      className="hz-btn hz-btn-primary hz-btn-sm"
                      disabled={actionBusy === "test_ai"}
                      onClick={() => void runAction("test_ai")}
                    >
                      <Activity size={13} />
                      {actionBusy === "test_ai" ? "Testing…" : "Test Runtime"}
                    </button>
                  ) : null}
                </div>
              </div>

              <p className="hz-set-lead">{snapshot.aiRuntime.summary}</p>

              <div className="hz-set-kv-grid">
                <div className="hz-set-kv">
                  <span>Configured Model</span>
                  <strong>{snapshot.aiRuntime.configuredModel}</strong>
                </div>
                <div className="hz-set-kv">
                  <span>Runtime Health</span>
                  <strong>{aiBadge.label}</strong>
                </div>
                <div className="hz-set-kv">
                  <span>Tool Execution</span>
                  <strong>{snapshot.aiRuntime.toolCount} registered server tools</strong>
                </div>
                <div className="hz-set-kv">
                  <span>Permission Enforcement</span>
                  <strong>Server RBAC + Postgres RLS</strong>
                </div>
                <div className="hz-set-kv">
                  <span>Human Approval Gate</span>
                  <strong>Mandatory ({snapshot.aiRuntime.writeToolCount} write actions)</strong>
                </div>
                <div className="hz-set-kv">
                  <span>Last Verified</span>
                  <strong>
                    {formatShortTimestamp(snapshot.aiRuntime.lastVerifiedAt)}
                    {snapshot.aiRuntime.lastVerifiedLatencyMs
                      ? ` (${snapshot.aiRuntime.lastVerifiedLatencyMs} ms)`
                      : ""}
                  </strong>
                </div>
              </div>

              {aiProbe ? (
                <div
                  className={`hz-int-banner ${aiProbe.ok ? "is-success" : "is-warn"}`}
                  style={{ marginTop: 12 }}
                >
                  <span>
                    <strong>Live Probe ({formatShortTimestamp(aiProbe.checkedAt)}):</strong>{" "}
                    {aiProbe.detail}
                  </span>
                </div>
              ) : null}

              <details className="hz-set-details" style={{ marginTop: 14 }}>
                <summary>
                  <ChevronDown size={13} /> Technical Architecture Details
                </summary>
                <div className="hz-set-details-body">
                  <ul>
                    <li>
                      <strong>API Key Present:</strong>{" "}
                      {snapshot.aiRuntime.apiKeyConfigured
                        ? "Configured server-side (never exposed to browser)"
                        : "Missing GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY"}
                    </li>
                    <li>
                      <strong>Feature Flag:</strong>{" "}
                      <code>AI_FEATURES_ENABLED={snapshot.aiRuntime.featuresFlagEnabled ? "true" : "false"}</code>
                    </li>
                    <li>
                      <strong>Execution Boundary:</strong> All tool calls execute strictly server-side
                      under the signed-in actor&apos;s RBAC permissions with prompt-injection
                      sanitization and audit logging.
                    </li>
                    <li>
                      <strong>Fallback Mode:</strong> When synthesis is disabled or unavailable, the
                      agent safely falls back to deterministic grounded tool summaries.
                    </li>
                  </ul>
                </div>
              </details>
            </section>
          ) : null}

          {/* 3. COMMUNICATIONS & EMAIL */}
          {section === "email" ? (
            <>
              <section className="hz-set-card">
                <div className="hz-set-card-head">
                  <div>
                    <h2>Email Infrastructure &amp; Sender Verification</h2>
                    <p>Independently verified provider posture, DNS authentication, and sender gates.</p>
                  </div>
                  <div className="hz-set-head-actions">
                    {canEditSettings ? (
                      <>
                        <button
                          type="button"
                          className="hz-btn hz-btn-secondary hz-btn-sm"
                          disabled={actionBusy === "verify_email_dns"}
                          onClick={() => void runAction("verify_email_dns")}
                        >
                          <Globe size={13} />
                          {actionBusy === "verify_email_dns" ? "Checking DNS…" : "Verify DNS"}
                        </button>
                        <button
                          type="button"
                          className="hz-btn hz-btn-primary hz-btn-sm"
                          disabled={!snapshot.email.resendConfigured}
                          onClick={() => {
                            setTestEmailConfirmed(false);
                            setTestEmailModalOpen(true);
                          }}
                        >
                          <Send size={13} /> Send Test Email
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="hz-set-service-list">
                  <div className="hz-set-service-row">
                    <div>
                      <div className="hz-set-service-name">
                        <strong>Resend Outbound Delivery</strong>
                        <StatusBadge tone={emailBadge.tone} dot>
                          {emailBadge.label}
                        </StatusBadge>
                      </div>
                      <p className="hz-set-service-desc">
                        {snapshot.email.resendConfigured
                          ? `Server API key active. Careers: ${snapshot.email.careersSender} · Accounts: ${snapshot.email.accountsSender}`
                          : "RESEND_API_KEY is not configured server-side."}
                      </p>
                    </div>
                    <span className="hz-set-meta-time">
                      Last test: {formatShortTimestamp(snapshot.email.lastTestEmailAt)}
                    </span>
                  </div>

                  <div className="hz-set-service-row">
                    <div>
                      <div className="hz-set-service-name">
                        <strong>Automated Sender ({snapshot.email.systemNotificationSender})</strong>
                        <StatusBadge tone={ackBadge.tone} dot>
                          {ackBadge.label}
                        </StatusBadge>
                      </div>
                      <p className="hz-set-service-desc">{snapshot.email.autoAckSummary}</p>
                    </div>
                    <code className="hz-set-code-pill">
                      VERIFIED_EMAIL_SENDER_ENABLED={snapshot.email.autoAckEnabled ? "true" : "false"}
                    </code>
                  </div>

                  <div className="hz-set-service-row">
                    <div>
                      <div className="hz-set-service-name">
                        <strong>Public Invitation &amp; Scheduling Base URL</strong>
                        <StatusBadge
                          tone={snapshot.workspace.appBaseUrlValid ? "emerald" : "amber"}
                          dot
                        >
                          {snapshot.workspace.appBaseUrlValid
                            ? "Operational"
                            : "Configuration Required"}
                        </StatusBadge>
                      </div>
                      <p className="hz-set-service-desc">{snapshot.workspace.appBaseUrlDetail}</p>
                    </div>
                    <code className="hz-set-code-pill">{snapshot.workspace.canonicalUrl}</code>
                  </div>
                </div>

                {dnsResult ? (
                  <div className="hz-set-dns-panel">
                    <div className="hz-set-dns-head">
                      <strong>Live DNS Verification ({dnsResult.domain})</strong>
                      <span>Checked {formatShortTimestamp(dnsResult.checkedAt)}</span>
                    </div>
                    <div className="hz-set-dns-grid">
                      {[
                        { key: "MX (Workspace)", data: dnsResult.mx },
                        { key: "SPF", data: dnsResult.spf },
                        { key: "DMARC", data: dnsResult.dmarc },
                        { key: "Google DKIM", data: dnsResult.dkimGoogle },
                        { key: "Resend DKIM", data: dnsResult.dkimResend },
                      ].map((row) => {
                        const badge = healthMeta(row.data.status);
                        return (
                          <div key={row.key} className="hz-set-dns-item">
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                              <strong>{row.key}</strong>
                              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                            </div>
                            <span>{row.data.summary}</span>
                          </div>
                        );
                      })}
                    </div>
                    <details className="hz-set-details" style={{ marginTop: 10 }}>
                      <summary>
                        <ChevronDown size={13} /> Inspect Raw DNS TXT / MX Values
                      </summary>
                      <div className="hz-set-details-body">
                        <pre className="hz-set-pre">
                          {`MX: ${dnsResult.mx.records.join(", ") || "None"}\nSPF: ${dnsResult.spf.record || "None"}\nDMARC: ${dnsResult.dmarc.record || "None"}`}
                        </pre>
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className="hz-set-hint" style={{ marginTop: 12 }}>
                    Last DNS check: {formatShortTimestamp(snapshot.email.lastDnsCheckAt)}. Click{" "}
                    <strong>Verify DNS</strong> to inspect live MX, SPF, DKIM, and DMARC records on{" "}
                    <code>hirzexa.com</code>.
                  </p>
                )}
              </section>

              <section className="hz-set-card">
                <div className="hz-set-card-head">
                  <div>
                    <h2>Departmental Google Workspace Aliases</h2>
                    <p>
                      Aliases routed to your primary Google Workspace account — not independent
                      mailboxes.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="hz-btn hz-btn-ghost hz-btn-sm"
                    onClick={() => setShowAllAliases((v) => !v)}
                  >
                    {showAllAliases
                      ? "Show Core 6"
                      : `Show All (${snapshot.email.departments.length})`}
                  </button>
                </div>

                <div className="hz-set-alias-grid">
                  {visibleDepartments.map((dept) => (
                    <div key={dept.id} className="hz-set-alias-row">
                      <strong>{dept.label}</strong>
                      <code>{dept.emails.join(" · ")}</code>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {/* 4. INTEGRATIONS & WEBHOOKS */}
          {section === "integrations" ? (
            <section className="hz-set-card">
              <div className="hz-set-card-head">
                <div>
                  <h2>Integrations &amp; Webhooks</h2>
                  <p>Live connectivity status for contact routing, webhooks, database, and calendar.</p>
                </div>
              </div>

              <div className="hz-set-service-list">
                {/* Contact Form Routing Webhook */}
                <div className="hz-set-service-row is-stackable">
                  <div style={{ flex: 1 }}>
                    <div className="hz-set-service-name">
                      <Webhook size={14} style={{ color: "#60a5fa" }} />
                      <strong>Contact Form Routing</strong>
                      <StatusBadge tone={contactBadge.tone} dot>
                        {contactBadge.label}
                      </StatusBadge>
                    </div>
                    <p className="hz-set-service-desc">{snapshot.contactRouting.summary}</p>
                    <div className="hz-set-service-meta">
                      <span>
                        Mode: <code>{snapshot.contactRouting.deliveryMode}</code>
                      </span>
                      {snapshot.contactRouting.webhookHost ? (
                        <span>
                          Target: <code>{snapshot.contactRouting.webhookHost}</code>
                        </span>
                      ) : null}
                      <span>
                        Secret:{" "}
                        <code>
                          {snapshot.contactRouting.webhookSecretConfigured ? "Set" : "Not set"}
                        </code>
                      </span>
                      <span>Last probe: {formatShortTimestamp(snapshot.contactRouting.lastTestedAt)}</span>
                    </div>

                    {webhookProbe ? (
                      <div
                        className={`hz-int-banner ${webhookProbe.ok ? "is-success" : "is-warn"}`}
                        style={{ marginTop: 10 }}
                      >
                        <span>{webhookProbe.detail}</span>
                      </div>
                    ) : null}

                    <details className="hz-set-details" style={{ marginTop: 10 }}>
                      <summary>
                        <ChevronDown size={13} /> Configuration &amp; Setup Instructions
                      </summary>
                      <div className="hz-set-details-body">
                        <p style={{ margin: "0 0 8px" }}>
                          Configure either an external webhook relay <strong>or</strong> direct
                          Resend departmental routing in your deployment environment (Render /{" "}
                          <code>.env.local</code>):
                        </p>
                        <pre className="hz-set-pre">{`# Option A — External Webhook Relay (recommended for custom CRM/Workspace flows)
CONTACT_WEBHOOK_URL=https://your-relay.example.net/hirzexa-contact
CONTACT_WEBHOOK_SECRET=<shared-secret-sent-as-x-hirzexa-webhook-secret>

# Option B — Direct Resend Departmental Routing (uses existing RESEND_API_KEY)
CONTACT_DELIVERY_MODE=resend`}</pre>
                      </div>
                    </details>
                  </div>
                  {canEditSettings ? (
                    <button
                      type="button"
                      className="hz-btn hz-btn-secondary hz-btn-sm"
                      disabled={actionBusy === "test_contact_webhook"}
                      onClick={() => void runAction("test_contact_webhook")}
                    >
                      {actionBusy === "test_contact_webhook" ? "Testing…" : "Test Connection"}
                    </button>
                  ) : null}
                </div>

                {/* Resend Webhook Receiver */}
                <div className="hz-set-service-row">
                  <div>
                    <div className="hz-set-service-name">
                      <Mail size={14} style={{ color: "#60a5fa" }} />
                      <strong>Resend Delivery Webhooks</strong>
                      <StatusBadge
                        tone={snapshot.email.resendWebhookSecretConfigured ? "emerald" : "amber"}
                        dot
                      >
                        {snapshot.email.resendWebhookSecretConfigured
                          ? "Operational"
                          : "Configuration Required"}
                      </StatusBadge>
                    </div>
                    <p className="hz-set-service-desc">
                      {snapshot.email.resendWebhookSecretConfigured
                        ? "Svix HMAC-SHA256 signature verification active at POST /api/webhooks/resend."
                        : "Set RESEND_WEBHOOK_SECRET from your Resend dashboard to sync delivered/bounced statuses."}
                    </p>
                  </div>
                  <code className="hz-set-code-pill">/api/webhooks/resend</code>
                </div>

                {/* Supabase PostgreSQL */}
                <div className="hz-set-service-row">
                  <div>
                    <div className="hz-set-service-name">
                      <Database size={14} style={{ color: "#34d399" }} />
                      <strong>Supabase PostgreSQL &amp; Storage</strong>
                      <StatusBadge tone={dbBadge.tone} dot>
                        {dbBadge.label}
                      </StatusBadge>
                    </div>
                    <p className="hz-set-service-desc">{snapshot.database.summary}</p>
                  </div>
                  <span className="hz-set-meta-time">
                    Verified {formatShortTimestamp(snapshot.database.checkedAt)}
                  </span>
                </div>

                {/* External Calendar Sync */}
                <div className="hz-set-service-row">
                  <div>
                    <div className="hz-set-service-name">
                      <Plug size={14} style={{ color: "#94a3b8" }} />
                      <strong>External Calendar ({snapshot.externalCalendar.provider})</strong>
                      <StatusBadge tone={calBadge.tone} dot>
                        {calBadge.label}
                      </StatusBadge>
                    </div>
                    <p className="hz-set-service-desc">{snapshot.externalCalendar.summary}</p>
                  </div>
                  <Link href="/admin/interviews" className="hz-btn hz-btn-ghost hz-btn-sm">
                    View Details <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {/* 5. TEAM & PERMISSIONS */}
          {section === "team" ? (
            <section className="hz-set-card">
              <div className="hz-set-card-head">
                <div>
                  <h2>Team &amp; Permissions</h2>
                  <p>Server-enforced RBAC roles, employee access posture, and MFA adoption.</p>
                </div>
                {snapshot.teamSummary.canViewTeam ? (
                  <Link href="/admin/team" className="hz-btn hz-btn-primary hz-btn-sm">
                    Manage Team &amp; Roles <ArrowUpRight size={13} />
                  </Link>
                ) : null}
              </div>

              {snapshot.teamSummary.canViewTeam ? (
                <div className="hz-set-kv-grid">
                  <div className="hz-set-kv">
                    <span>Active Employees</span>
                    <strong>{snapshot.teamSummary.activeEmployees}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Pending Invitations</span>
                    <strong>{snapshot.teamSummary.invitedEmployees}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Suspended Accounts</span>
                    <strong>{snapshot.teamSummary.suspendedEmployees}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>MFA Enrolled</span>
                    <strong>{snapshot.teamSummary.mfaEnrolledCount}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Role Templates</span>
                    <strong>{snapshot.teamSummary.roleCount} RBAC roles</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Your Role</span>
                    <strong>{actorProfile.roleLabel}</strong>
                  </div>
                </div>
              ) : (
                <p className="hz-set-lead">
                  Your role (<strong>{actorProfile.roleLabel}</strong>) does not have permission to
                  view the organization employee directory.
                </p>
              )}
            </section>
          ) : null}

          {/* 6. SECURITY & AUDIT */}
          {section === "security" ? (
            <>
              <section className="hz-set-card">
                <div className="hz-set-card-head">
                  <div>
                    <h2>Session &amp; Security Posture</h2>
                    <p>Authentication state, row-level security, and secret isolation.</p>
                  </div>
                  <StatusBadge tone={actorProfile.mfaEnrolled ? "emerald" : "amber"} dot>
                    {actorProfile.mfaEnrolled ? "MFA Enrolled" : "MFA Not Enrolled"}
                  </StatusBadge>
                </div>

                <div className="hz-set-kv-grid">
                  <div className="hz-set-kv">
                    <span>Active Session Generation</span>
                    <strong>v{actorProfile.sessionVersion}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Data Access Scope</span>
                    <strong style={{ textTransform: "capitalize" }}>{actorProfile.scope}</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Database Enforcement</span>
                    <strong>Independent Postgres RLS</strong>
                  </div>
                  <div className="hz-set-kv">
                    <span>Credential Exposure</span>
                    <strong>Server-only (zero client keys)</strong>
                  </div>
                </div>
              </section>

              <section className="hz-set-card">
                <div className="hz-set-card-head">
                  <div>
                    <h2>Recent Settings &amp; Infrastructure Audit Events</h2>
                    <p>Immutable server audit trail for profile edits and diagnostic checks.</p>
                  </div>
                  {snapshot.securityAudit.canViewAudit ? (
                    <Link href="/admin/audit" className="hz-btn hz-btn-secondary hz-btn-sm">
                      Open Audit Log <ArrowUpRight size={13} />
                    </Link>
                  ) : null}
                </div>

                {!snapshot.securityAudit.canViewAudit ? (
                  <p className="hz-set-lead">
                    Audit log access requires <code>audit:view</code> permission.
                  </p>
                ) : snapshot.securityAudit.recentSettingsEvents.length === 0 ? (
                  <p className="hz-set-lead">No settings audit events recorded yet.</p>
                ) : (
                  <div className="hz-set-audit-list">
                    {snapshot.securityAudit.recentSettingsEvents.map((ev) => (
                      <div key={ev.id} className="hz-set-audit-row">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, color: "var(--hz-text-strong)", fontWeight: 600 }}>
                            {ev.summary}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--hz-text-muted)", marginTop: 2 }}>
                            <code>{ev.action}</code> · {ev.actorEmail}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <StatusBadge tone={ev.outcome === "allowed" ? "emerald" : "rose"}>
                            {ev.outcome}
                          </StatusBadge>
                          <span className="hz-set-meta-time">
                            {formatShortTimestamp(ev.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>

      {/* Confirmation Modal for Sending a Live Diagnostic Test Email */}
      <Modal
        open={testEmailModalOpen}
        onClose={() => setTestEmailModalOpen(false)}
        title="Send Diagnostic Test Email"
        width={480}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--hz-text-secondary)", lineHeight: 1.55 }}>
            Sends one real verification message through your configured Resend integration (
            <code>{snapshot.email.accountsSender}</code>) to confirm outbound delivery. Legacy{" "}
            <code>@devtech.ai</code> and <code>example.com</code> addresses are blocked.
          </p>
          <div className="hz-int-field">
            <label htmlFor="diag-email-to">Deliverable Test Recipient Email</label>
            <input
              id="diag-email-to"
              type="email"
              value={testEmailTarget}
              onChange={(e) => setTestEmailTarget(e.target.value)}
              placeholder="you@hirzexa.com"
            />
          </div>
          <label className="hz-int-confirm-check">
            <input
              type="checkbox"
              checked={testEmailConfirmed}
              onChange={(e) => setTestEmailConfirmed(e.target.checked)}
            />
            <span>
              I confirm sending a live diagnostic email to{" "}
              <strong>{testEmailTarget.trim() || "this address"}</strong>.
            </span>
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="hz-btn hz-btn-secondary hz-btn-sm"
              onClick={() => setTestEmailModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="hz-btn hz-btn-primary hz-btn-sm"
              disabled={
                actionBusy === "send_test_email" ||
                !testEmailConfirmed ||
                !testEmailTarget.trim().includes("@")
              }
              onClick={() =>
                void runAction("send_test_email", {
                  recipientEmail: testEmailTarget.trim(),
                  confirmed: true,
                })
              }
            >
              <Send size={13} />
              {actionBusy === "send_test_email" ? "Sending…" : "Send Verification Email"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
