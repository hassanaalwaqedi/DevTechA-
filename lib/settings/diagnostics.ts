import "server-only";
import { resolveMx, resolveTxt } from "node:dns/promises";
import { GoogleGenAI } from "@google/genai";
import {
  COMPANY_EMAILS,
  CONTACT_DIRECTORY,
  SYSTEM_NOTIFICATION_EMAIL,
} from "@/lib/company-emails";
import { isAutomatedAckEnabled } from "@/lib/email-templates";
import {
  OFFICIAL_WEBSITE_URL,
  getCareersReplyToAddress,
  getCareersSenderAddress,
  getInvitationReplyToAddress,
  getInvitationSenderAddress,
  isResendConfigured,
  resolvePublicInvitationBaseUrl,
  sendTransactionalEmail,
} from "@/lib/email/transactional";
import { getGoogleCalendarConnectionStatus } from "@/lib/integrations/google-calendar";
import { listAuditLogs, recordAuditLog } from "@/lib/intelligence/audit";
import { listEmployees } from "@/lib/intelligence/employees";
import { listRegisteredToolsMetadata } from "@/lib/intelligence/tools";
import { getExternalCalendarAdapterStatus } from "@/lib/interviews/calendar-adapter";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasPermission, ROLE_TEMPLATES, type AuthActor } from "@/lib/rbac";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ServiceHealthStatus =
  | "operational"
  | "configuration_required"
  | "degraded"
  | "unavailable"
  | "not_verified";

export interface DnsCheckResult {
  domain: string;
  checkedAt: string;
  mx: {
    status: ServiceHealthStatus;
    records: string[];
    summary: string;
  };
  spf: {
    status: ServiceHealthStatus;
    record: string | null;
    summary: string;
  };
  dmarc: {
    status: ServiceHealthStatus;
    record: string | null;
    summary: string;
  };
  dkimGoogle: {
    status: ServiceHealthStatus;
    present: boolean;
    summary: string;
  };
  dkimResend: {
    status: ServiceHealthStatus;
    present: boolean;
    summary: string;
  };
}

export interface SettingsDiagnosticsSnapshot {
  generatedAt: string;
  workspace: {
    brand: "HIRZEXA";
    canonicalUrl: string;
    appBaseUrlValid: boolean;
    appBaseUrlDetail: string;
    environment: string;
    legacyAuthDetected: boolean;
    legacyAuthOrigin: string | null;
  };
  database: {
    status: ServiceHealthStatus;
    latencyMs: number | null;
    summary: string;
    checkedAt: string;
  };
  aiRuntime: {
    status: ServiceHealthStatus;
    configuredModel: string;
    apiKeyConfigured: boolean;
    featuresFlagEnabled: boolean;
    toolCount: number;
    writeToolCount: number;
    rbacEnforced: boolean;
    humanApprovalEnforced: boolean;
    lastVerifiedAt: string | null;
    lastVerifiedStatus: string | null;
    lastVerifiedLatencyMs: number | null;
    summary: string;
  };
  email: {
    providerStatus: ServiceHealthStatus;
    resendConfigured: boolean;
    resendWebhookSecretConfigured: boolean;
    careersSender: string;
    careersReplyTo: string;
    accountsSender: string;
    accountsReplyTo: string;
    systemNotificationSender: string;
    autoAckEnabled: boolean;
    autoAckStatus: ServiceHealthStatus;
    autoAckSummary: string;
    lastDnsCheckAt: string | null;
    lastTestEmailAt: string | null;
    departments: Array<{
      id: string;
      label: string;
      emails: string[];
    }>;
  };
  contactRouting: {
    status: ServiceHealthStatus;
    webhookConfigured: boolean;
    webhookHost: string | null;
    webhookSecretConfigured: boolean;
    deliveryMode: "webhook" | "resend" | "unconfigured";
    lastTestedAt: string | null;
    lastTestOutcome: string | null;
    summary: string;
  };
  externalCalendar: {
    provider: string;
    status: ServiceHealthStatus;
    connected: boolean;
    oauthClientConfigured: boolean;
    encryptionKeyConfigured: boolean;
    serviceRoleConfigured: boolean;
    connectedEmail: string | null;
    calendarId: string;
    redirectUri: string;
    lastVerifiedAt: string | null;
    lastError: string | null;
    summary: string;
  };
  teamSummary: {
    canViewTeam: boolean;
    activeEmployees: number;
    invitedEmployees: number;
    suspendedEmployees: number;
    mfaEnrolledCount: number;
    roleCount: number;
  };
  securityAudit: {
    canViewAudit: boolean;
    recentSettingsEvents: Array<{
      id: string;
      action: string;
      actorEmail: string;
      outcome: string;
      summary: string;
      createdAt: string;
    }>;
  };
}

function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
}

function getSafeWebhookHost(rawUrl?: string): string | null {
  if (!rawUrl?.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return "Invalid URL format";
  }
}

export function isLegacyAuthEmail(email: string): boolean {
  return /@devtech\.ai$/i.test(email.trim());
}

export async function getSettingsDiagnosticsSnapshot(
  actor: AuthActor
): Promise<SettingsDiagnosticsSnapshot> {
  const nowIso = new Date().toISOString();

  // 1. Live Database Probe
  let dbStatus: ServiceHealthStatus = "configuration_required";
  let dbLatencyMs: number | null = null;
  let dbSummary = "Supabase environment variables are not configured.";

  if (isSupabaseConfigured()) {
    const started = Date.now();
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("jobs").select("id", { count: "exact", head: true });
      dbLatencyMs = Date.now() - started;
      if (error) {
        dbStatus = "degraded";
        dbSummary = `Supabase reachable but query returned error (${error.code || "DB_ERR"}).`;
      } else {
        dbStatus = "operational";
        dbSummary = `Connected to Supabase PostgreSQL (${dbLatencyMs} ms).`;
      }
    } catch {
      dbLatencyMs = Date.now() - started;
      dbStatus = "unavailable";
      dbSummary = "Unable to reach Supabase PostgreSQL.";
    }
  }

  // 2. Audit logs lookup (for real last-verified timestamps across reloads)
  const settingsAudit = await listAuditLogs({ module: "settings", limit: 40 }).catch(() => []);
  const lastAiCheck = settingsAudit.find((e) => e.action === "settings.ai_health_check");
  const lastWebhookCheck = settingsAudit.find((e) => e.action === "settings.contact_webhook_test");
  const lastDnsCheck = settingsAudit.find((e) => e.action === "settings.email_dns_verify");
  const lastTestEmail = settingsAudit.find((e) => e.action === "settings.test_email_sent");

  // 3. AI Intelligence Runtime Posture (NEVER reports Operational without real verification)
  const apiKeyConfigured = Boolean(getGeminiApiKey());
  const featuresFlagEnabled = process.env.AI_FEATURES_ENABLED === "true";
  const configuredModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const tools = listRegisteredToolsMetadata();
  const writeToolCount = tools.filter((t) => t.requiresConfirmation).length;

  let aiStatus: ServiceHealthStatus = "configuration_required";
  let aiSummary =
    "Gemini synthesis is disabled. Set AI_FEATURES_ENABLED=true and GOOGLE_GENERATIVE_AI_API_KEY server-side.";
  if (apiKeyConfigured && !featuresFlagEnabled) {
    aiStatus = "configuration_required";
    aiSummary =
      "API key is present, but AI_FEATURES_ENABLED is not set to true. Running in deterministic tool-summary mode.";
  } else if (!apiKeyConfigured && featuresFlagEnabled) {
    aiStatus = "configuration_required";
    aiSummary =
      "AI_FEATURES_ENABLED=true, but GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY is missing.";
  } else if (apiKeyConfigured && featuresFlagEnabled) {
    if (lastAiCheck?.outcome === "allowed") {
      aiStatus = "operational";
      aiSummary = `Verified Gemini synthesis active (${configuredModel}) with RBAC tools and approval gates.`;
    } else if (lastAiCheck?.outcome === "error") {
      aiStatus = "degraded";
      aiSummary = `Last runtime check failed. Run Test Runtime to re-verify ${configuredModel}.`;
    } else {
      aiStatus = "not_verified";
      aiSummary = `Configured (${configuredModel}) — run Test Runtime to verify live Gemini connectivity.`;
    }
  }

  // 4. Email & Sender Verification Posture
  const resendConfigured = isResendConfigured();
  const resendWebhookSecretConfigured = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
  const baseUrlCheck = resolvePublicInvitationBaseUrl();
  const autoAckEnabled = isAutomatedAckEnabled();

  const providerStatus: ServiceHealthStatus = !resendConfigured
    ? "configuration_required"
    : !baseUrlCheck.ok
      ? "degraded"
      : lastTestEmail?.outcome === "allowed" || lastDnsCheck?.outcome === "allowed"
        ? "operational"
        : "not_verified";

  const autoAckStatus: ServiceHealthStatus = autoAckEnabled
    ? resendConfigured || Boolean(process.env.CONTACT_WEBHOOK_URL?.trim())
      ? "operational"
      : "degraded"
    : "configuration_required";

  const autoAckSummary = autoAckEnabled
    ? `Automated sending from ${SYSTEM_NOTIFICATION_EMAIL} is authorized (VERIFIED_EMAIL_SENDER_ENABLED=true).`
    : `Disabled by security gate until SPF/DKIM/DMARC & sender identity are verified and VERIFIED_EMAIL_SENDER_ENABLED=true is set server-side.`;

  // 5. Contact Routing & Webhook Posture
  const rawWebhook = process.env.CONTACT_WEBHOOK_URL?.trim() || "";
  const webhookConfigured = Boolean(rawWebhook);
  const webhookSecretConfigured = Boolean(process.env.CONTACT_WEBHOOK_SECRET?.trim());
  const explicitResendContact =
    process.env.CONTACT_DELIVERY_MODE?.trim().toLowerCase() === "resend" && resendConfigured;

  const deliveryMode: "webhook" | "resend" | "unconfigured" = webhookConfigured
    ? "webhook"
    : explicitResendContact
      ? "resend"
      : "unconfigured";

  let contactStatus: ServiceHealthStatus = "configuration_required";
  let contactSummary = `Contact webhook is not configured. POST /api/contact returns HTTP 503 with departmental fallback (${COMPANY_EMAILS.general}).`;
  if (deliveryMode === "webhook") {
    if (lastWebhookCheck?.outcome === "allowed") {
      contactStatus = "operational";
      contactSummary = "Contact webhook verified and routing submissions to departmental aliases.";
    } else if (lastWebhookCheck?.outcome === "error") {
      contactStatus = "degraded";
      contactSummary = "Contact webhook is configured, but the last connectivity probe failed.";
    } else {
      contactStatus = "not_verified";
      contactSummary = "Contact webhook URL is configured — run Test Webhook to verify delivery.";
    }
  } else if (deliveryMode === "resend") {
    if (lastWebhookCheck?.outcome === "allowed" || lastTestEmail?.outcome === "allowed") {
      contactStatus = "operational";
      contactSummary =
        "Direct Resend contact routing active (CONTACT_DELIVERY_MODE=resend). Departmental aliases receive routed inquiries.";
    } else if (lastWebhookCheck?.outcome === "error") {
      contactStatus = "degraded";
      contactSummary =
        "Direct Resend contact routing is enabled, but the last connectivity probe failed.";
    } else {
      contactStatus = "not_verified";
      contactSummary =
        "Direct Resend contact routing enabled (CONTACT_DELIVERY_MODE=resend) — click Test Connection to verify.";
    }
  }

  // 6. External Calendar Status (Server-Side Google Calendar OAuth 2.0)
  const gcal = await getGoogleCalendarConnectionStatus();
  const cal = getExternalCalendarAdapterStatus();

  // 7. Team & Permissions Summary (only load full directory if permitted)
  const canViewTeam = hasPermission(actor, "team", "view");
  let activeEmployees = 0;
  let invitedEmployees = 0;
  let suspendedEmployees = 0;
  let mfaEnrolledCount = 0;
  if (canViewTeam) {
    const employees = await listEmployees().catch(() => []);
    for (const emp of employees) {
      if (emp.status === "active") activeEmployees += 1;
      else if (emp.status === "invited") invitedEmployees += 1;
      else if (emp.status === "suspended") suspendedEmployees += 1;
      if (emp.mfaEnrolled) mfaEnrolledCount += 1;
    }
  }

  // 8. Security & Audit Summary
  const canViewAudit = hasPermission(actor, "audit", "view");
  const recentSettingsEvents = canViewAudit
    ? settingsAudit.slice(0, 10).map((e) => ({
        id: e.id,
        action: e.action,
        actorEmail: e.actorEmail,
        outcome: e.outcome,
        summary: e.summary,
        createdAt: e.createdAt,
      }))
    : [];

  const legacyAuthDetected = isLegacyAuthEmail(actor.email);

  return {
    generatedAt: nowIso,
    workspace: {
      brand: "HIRZEXA",
      canonicalUrl: baseUrlCheck.baseUrl || OFFICIAL_WEBSITE_URL,
      appBaseUrlValid: baseUrlCheck.ok,
      appBaseUrlDetail: baseUrlCheck.ok
        ? `Public HTTPS origin verified (${baseUrlCheck.baseUrl}).`
        : baseUrlCheck.error || "APP_BASE_URL must be configured to https://hirzexa.com.",
      environment: process.env.NODE_ENV === "production" ? "Production" : "Development",
      legacyAuthDetected,
      legacyAuthOrigin: legacyAuthDetected
        ? "Originates from legacy Supabase Auth account (auth.users.email) and mirrored public.employees row."
        : null,
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      summary: dbSummary,
      checkedAt: nowIso,
    },
    aiRuntime: {
      status: aiStatus,
      configuredModel,
      apiKeyConfigured,
      featuresFlagEnabled,
      toolCount: tools.length,
      writeToolCount,
      rbacEnforced: true,
      humanApprovalEnforced: true,
      lastVerifiedAt: lastAiCheck?.createdAt || null,
      lastVerifiedStatus: lastAiCheck?.outcome || null,
      lastVerifiedLatencyMs:
        typeof lastAiCheck?.metadata?.latencyMs === "number"
          ? Number(lastAiCheck.metadata.latencyMs)
          : null,
      summary: aiSummary,
    },
    email: {
      providerStatus,
      resendConfigured,
      resendWebhookSecretConfigured,
      careersSender: getCareersSenderAddress(),
      careersReplyTo: getCareersReplyToAddress(),
      accountsSender: getInvitationSenderAddress(),
      accountsReplyTo: getInvitationReplyToAddress(),
      systemNotificationSender: SYSTEM_NOTIFICATION_EMAIL,
      autoAckEnabled,
      autoAckStatus,
      autoAckSummary,
      lastDnsCheckAt: lastDnsCheck?.createdAt || null,
      lastTestEmailAt: lastTestEmail?.createdAt || null,
      departments: CONTACT_DIRECTORY.map((ch) => ({
        id: ch.id,
        label: ch.en,
        emails: ch.emails.map((k) => COMPANY_EMAILS[k]),
      })),
    },
    contactRouting: {
      status: contactStatus,
      webhookConfigured,
      webhookHost: getSafeWebhookHost(rawWebhook),
      webhookSecretConfigured,
      deliveryMode,
      lastTestedAt: lastWebhookCheck?.createdAt || null,
      lastTestOutcome: lastWebhookCheck?.outcome || null,
      summary: contactSummary,
    },
    externalCalendar: {
      provider: gcal.provider || cal.provider,
      status: gcal.connected
        ? gcal.lastError
          ? "degraded"
          : "operational"
        : "configuration_required",
      connected: gcal.connected,
      oauthClientConfigured: gcal.oauthClientConfigured,
      encryptionKeyConfigured: gcal.encryptionKeyConfigured,
      serviceRoleConfigured: gcal.serviceRoleConfigured,
      connectedEmail: gcal.connectedEmail,
      calendarId: gcal.calendarId,
      redirectUri: gcal.redirectUri,
      lastVerifiedAt: gcal.lastVerifiedAt,
      lastError: gcal.lastError,
      summary: gcal.summary,
    },
    teamSummary: {
      canViewTeam,
      activeEmployees,
      invitedEmployees,
      suspendedEmployees,
      mfaEnrolledCount,
      roleCount: Object.keys(ROLE_TEMPLATES).length,
    },
    securityAudit: {
      canViewAudit,
      recentSettingsEvents,
    },
  };
}

/**
 * Safe, read-only Gemini runtime health check (admin-only).
 * Never exposes API keys or prompts to the browser.
 */
export async function runAiRuntimeHealthCheck(actor: AuthActor): Promise<{
  ok: boolean;
  status: ServiceHealthStatus;
  model: string;
  latencyMs: number;
  checkedAt: string;
  detail: string;
}> {
  const checkedAt = new Date().toISOString();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const key = getGeminiApiKey();

  if (process.env.AI_FEATURES_ENABLED !== "true" || !key) {
    const detail =
      !key
        ? "GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY is not configured on the server."
        : "AI_FEATURES_ENABLED is not set to 'true' on the server.";
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "settings.ai_health_check",
      entityType: "ai_runtime",
      entityId: model,
      outcome: "error",
      summary: `AI runtime health check skipped: ${detail}`,
      metadata: { model, latencyMs: 0 },
    });
    return {
      ok: false,
      status: "configuration_required",
      model,
      latencyMs: 0,
      checkedAt,
      detail,
    };
  }

  if (!checkRateLimit(`settings-ai-test:${actor.id}`, 10, 15 * 60 * 1000)) {
    return {
      ok: false,
      status: "degraded",
      model,
      latencyMs: 0,
      checkedAt,
      detail: "Rate limit reached for AI health checks. Wait a few minutes and try again.",
    };
  }

  const started = Date.now();
  try {
    const client = new GoogleGenAI({ apiKey: key });
    const req = client.models.generateContent({
      model,
      contents: "Reply with the exact word OK.",
      config: { maxOutputTokens: 12, temperature: 0 },
    });
    const response = await Promise.race([
      req,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini runtime timed out after 10s.")), 10_000)
      ),
    ]);
    const latencyMs = Date.now() - started;
    const textOut = (response.text || "").trim();
    const ok = textOut.length > 0;

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "settings.ai_health_check",
      entityType: "ai_runtime",
      entityId: model,
      outcome: ok ? "allowed" : "error",
      summary: ok
        ? `Gemini runtime (${model}) verified operational in ${latencyMs} ms.`
        : `Gemini runtime (${model}) returned empty output.`,
      metadata: { model, latencyMs },
    });

    return {
      ok,
      status: ok ? "operational" : "degraded",
      model,
      latencyMs,
      checkedAt,
      detail: ok
        ? `Model ${model} responded cleanly in ${latencyMs} ms.`
        : `Model ${model} responded with empty text.`,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const rawMsg = err instanceof Error ? err.message : "Unable to reach Gemini API.";
    const safeMsg = rawMsg.replace(/AIza[\w-]{20,}/g, "[REDACTED]").slice(0, 220);

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "settings.ai_health_check",
      entityType: "ai_runtime",
      entityId: model,
      outcome: "error",
      summary: `Gemini runtime check failed (${model}): ${safeMsg}`,
      metadata: { model, latencyMs },
    });

    return {
      ok: false,
      status: "unavailable",
      model,
      latencyMs,
      checkedAt,
      detail: safeMsg,
    };
  }
}

/**
 * Performs live server-side DNS authentication checks (MX, SPF, DMARC, Google & Resend DKIM)
 * for hirzexa.com so sender verification statuses are independently grounded in real DNS data.
 */
export async function runDnsAndSenderVerification(actor: AuthActor): Promise<DnsCheckResult> {
  const domain = "hirzexa.com";
  const checkedAt = new Date().toISOString();

  const safeTxt = async (host: string): Promise<string[]> => {
    try {
      const chunks = await resolveTxt(host);
      return chunks.map((parts) => parts.join(""));
    } catch {
      return [];
    }
  };

  const [mxRaw, rootTxt, dmarcTxt, googleDkimTxt, resendDkimTxt] = await Promise.all([
    resolveMx(domain).catch(() => []),
    safeTxt(domain),
    safeTxt(`_dmarc.${domain}`),
    safeTxt(`google._domainkey.${domain}`),
    safeTxt(`resend._domainkey.${domain}`),
  ]);

  const mxHosts = mxRaw
    .sort((a, b) => a.priority - b.priority)
    .map((m) => `${m.exchange} (priority ${m.priority})`);
  const hasGoogleMx = mxRaw.some((m) => /google\.com|googlemail\.com/i.test(m.exchange));

  const spfRecord = rootTxt.find((t) => /^v=spf1\b/i.test(t.trim())) || null;
  const dmarcRecord = dmarcTxt.find((t) => /^v=DMARC1\b/i.test(t.trim())) || null;
  const hasGoogleDkim = googleDkimTxt.some((t) => /v=DKIM1|p=/i.test(t));
  const hasResendDkim = resendDkimTxt.some((t) => /v=DKIM1|p=/i.test(t));

  const result: DnsCheckResult = {
    domain,
    checkedAt,
    mx: {
      status: mxHosts.length > 0 ? "operational" : "configuration_required",
      records: mxHosts,
      summary:
        mxHosts.length === 0
          ? "No MX records found for hirzexa.com."
          : hasGoogleMx
            ? `Google Workspace MX verified (${mxHosts.length} record${mxHosts.length === 1 ? "" : "s"}).`
            : `MX records present (${mxHosts.length}), non-Google mail exchanger.`,
    },
    spf: {
      status: spfRecord ? "operational" : "configuration_required",
      record: spfRecord,
      summary: spfRecord
        ? "SPF TXT policy published on hirzexa.com."
        : "No v=spf1 TXT record found on hirzexa.com.",
    },
    dmarc: {
      status: dmarcRecord
        ? /p=(quarantine|reject)/i.test(dmarcRecord)
          ? "operational"
          : "degraded"
        : "configuration_required",
      record: dmarcRecord,
      summary: !dmarcRecord
        ? "No DMARC TXT record found at _dmarc.hirzexa.com."
        : /p=(quarantine|reject)/i.test(dmarcRecord)
          ? "Enforcing DMARC policy published at _dmarc.hirzexa.com."
          : "DMARC record present in monitoring mode (p=none). Consider p=quarantine after verifying DKIM.",
    },
    dkimGoogle: {
      status: hasGoogleDkim ? "operational" : "not_verified",
      present: hasGoogleDkim,
      summary: hasGoogleDkim
        ? "Google Workspace DKIM public key found at google._domainkey.hirzexa.com."
        : "No TXT record at default google._domainkey.hirzexa.com (verify custom selector in Google Admin if used).",
    },
    dkimResend: {
      status: hasResendDkim ? "operational" : "not_verified",
      present: hasResendDkim,
      summary: hasResendDkim
        ? "Resend DKIM public key verified at resend._domainkey.hirzexa.com."
        : "No TXT record found at resend._domainkey.hirzexa.com.",
    },
  };

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "settings",
    action: "settings.email_dns_verify",
    entityType: "email_domain",
    entityId: domain,
    outcome: spfRecord && mxHosts.length > 0 ? "allowed" : "error",
    summary: `Verified live DNS records for ${domain} (MX=${mxHosts.length}, SPF=${Boolean(spfRecord)}, DMARC=${Boolean(dmarcRecord)}, Resend DKIM=${hasResendDkim}).`,
    metadata: {
      mxCount: mxHosts.length,
      hasSpf: Boolean(spfRecord),
      hasDmarc: Boolean(dmarcRecord),
      hasGoogleDkim,
      hasResendDkim,
    },
  });

  return result;
}

/**
 * Real Contact Webhook connectivity test (admin-only).
 * Sends a signed dry-run probe to CONTACT_WEBHOOK_URL and reports exact status + latency.
 */
export async function runContactWebhookHealthCheck(actor: AuthActor): Promise<{
  ok: boolean;
  status: ServiceHealthStatus;
  httpStatus: number | null;
  latencyMs: number;
  checkedAt: string;
  endpointHost: string | null;
  detail: string;
}> {
  const checkedAt = new Date().toISOString();
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL?.trim() || "";
  const deliveryModeEnv = process.env.CONTACT_DELIVERY_MODE?.trim().toLowerCase() || "";
  const endpointHost = getSafeWebhookHost(webhookUrl);

  if (!webhookUrl && deliveryModeEnv === "resend") {
    if (!isResendConfigured()) {
      return {
        ok: false,
        status: "configuration_required",
        httpStatus: null,
        latencyMs: 0,
        checkedAt,
        endpointHost: "https://api.resend.com",
        detail: "CONTACT_DELIVERY_MODE=resend is set, but RESEND_API_KEY is not configured.",
      };
    }

    if (!checkRateLimit(`settings-webhook-test:${actor.id}`, 10, 15 * 60 * 1000)) {
      return {
        ok: false,
        status: "degraded",
        httpStatus: null,
        latencyMs: 0,
        checkedAt,
        endpointHost: "https://api.resend.com",
        detail: "Rate limit reached for connectivity tests. Wait a few minutes before retrying.",
      };
    }

    const started = Date.now();
    try {
      const response = await fetch("https://api.resend.com/domains", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim() || ""}`,
        },
        signal: AbortSignal.timeout(8_000),
      });
      const latencyMs = Date.now() - started;
      const bodyText = await response.text().catch(() => "");
      // Resend sending-only API keys legitimately return 401 with "restricted to only send emails" on GET /domains
      const isSendingScopedKey =
        response.status === 401 && /restricted|only send/i.test(bodyText);
      const ok = response.ok || isSendingScopedKey;
      const detail = response.ok
        ? `Resend direct contact routing verified (HTTP ${response.status} in ${latencyMs} ms).`
        : isSendingScopedKey
          ? `Resend sending-scoped API key authenticated for direct contact routing (${latencyMs} ms).`
          : `Resend API check failed with HTTP ${response.status} (${latencyMs} ms).`;

      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.roleKey,
        module: "settings",
        action: "settings.contact_webhook_test",
        entityType: "contact_routing",
        entityId: "resend-direct",
        outcome: ok ? "allowed" : "error",
        summary: detail,
        metadata: { mode: "resend", httpStatus: response.status, latencyMs, isSendingScopedKey },
      });

      return {
        ok,
        status: ok ? "operational" : "degraded",
        httpStatus: response.status,
        latencyMs,
        checkedAt,
        endpointHost: "https://api.resend.com (direct mode)",
        detail,
      };
    } catch (err) {
      const latencyMs = Date.now() - started;
      const detail =
        err instanceof Error
          ? `Resend API connection failed: ${err.message.slice(0, 180)}`
          : "Resend API connection failed.";

      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.roleKey,
        module: "settings",
        action: "settings.contact_webhook_test",
        entityType: "contact_routing",
        entityId: "resend-direct",
        outcome: "error",
        summary: `Resend direct contact probe unreachable (${latencyMs} ms): ${detail}`,
        metadata: { mode: "resend", latencyMs },
      });

      return {
        ok: false,
        status: "unavailable",
        httpStatus: null,
        latencyMs,
        checkedAt,
        endpointHost: "https://api.resend.com (direct mode)",
        detail,
      };
    }
  }

  if (!webhookUrl) {
    const detail =
      "CONTACT_WEBHOOK_URL is not configured. Set CONTACT_WEBHOOK_URL (and optionally CONTACT_WEBHOOK_SECRET) in your deployment environment, or set CONTACT_DELIVERY_MODE=resend to route directly via Resend.";
    return {
      ok: false,
      status: "configuration_required",
      httpStatus: null,
      latencyMs: 0,
      checkedAt,
      endpointHost: null,
      detail,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    return {
      ok: false,
      status: "degraded",
      httpStatus: null,
      latencyMs: 0,
      checkedAt,
      endpointHost,
      detail: "CONTACT_WEBHOOK_URL is not a valid HTTP(S) URL.",
    };
  }

  if (!checkRateLimit(`settings-webhook-test:${actor.id}`, 10, 15 * 60 * 1000)) {
    return {
      ok: false,
      status: "degraded",
      httpStatus: null,
      latencyMs: 0,
      checkedAt,
      endpointHost,
      detail: "Rate limit reached for webhook tests. Wait a few minutes before retrying.",
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-hirzexa-event": "webhook.health_check",
  };
  if (process.env.CONTACT_WEBHOOK_SECRET?.trim()) {
    headers["x-hirzexa-webhook-secret"] = process.env.CONTACT_WEBHOOK_SECRET.trim();
  }

  const started = Date.now();
  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "hirzexa.webhook.health_check",
        dryRun: true,
        checkedAt,
        source: "HIRZEXA Settings Diagnostics",
        initiatedBy: actor.fullName,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const latencyMs = Date.now() - started;
    const ok = response.ok;

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "settings.contact_webhook_test",
      entityType: "contact_webhook",
      entityId: endpointHost || "webhook",
      outcome: ok ? "allowed" : "error",
      summary: ok
        ? `Contact webhook probe succeeded (HTTP ${response.status} in ${latencyMs} ms).`
        : `Contact webhook probe failed with HTTP ${response.status} (${latencyMs} ms).`,
      metadata: { httpStatus: response.status, latencyMs },
    });

    return {
      ok,
      status: ok ? "operational" : "degraded",
      httpStatus: response.status,
      latencyMs,
      checkedAt,
      endpointHost,
      detail: ok
        ? `Endpoint accepted health probe (HTTP ${response.status} in ${latencyMs} ms).`
        : `Endpoint returned HTTP ${response.status} in ${latencyMs} ms.`,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const detail =
      err instanceof Error
        ? `Webhook connection failed: ${err.message.slice(0, 180)}`
        : "Webhook connection failed.";

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "settings.contact_webhook_test",
      entityType: "contact_webhook",
      entityId: endpointHost || "webhook",
      outcome: "error",
      summary: `Contact webhook probe unreachable (${latencyMs} ms): ${detail}`,
      metadata: { latencyMs },
    });

    return {
      ok: false,
      status: "unavailable",
      httpStatus: null,
      latencyMs,
      checkedAt,
      endpointHost,
      detail,
    };
  }
}

/**
 * Safe admin-only diagnostic test email sent via existing Resend integration.
 * Blocks legacy fake addresses (@devtech.ai), example.com, and bulk recipients.
 */
export async function sendSettingsDiagnosticEmail(
  actor: AuthActor,
  rawRecipient: string
): Promise<{
  ok: boolean;
  status: string;
  messageId?: string;
  error?: string;
}> {
  const recipient = rawRecipient.trim().toLowerCase();
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(recipient)) {
    return { ok: false, status: "delivery_failed", error: "Enter a single valid email address." };
  }
  if (/@devtech\.ai$|@example\.(com|org|net)$/i.test(recipient)) {
    return {
      ok: false,
      status: "delivery_failed",
      error:
        "Cannot send test email to a non-deliverable legacy (@devtech.ai) or example.com address. Enter a real deliverable mailbox.",
    };
  }
  if (!checkRateLimit(`settings-test-email:${actor.id}`, 5, 60 * 60 * 1000)) {
    return {
      ok: false,
      status: "delivery_failed",
      error: "Test email rate limit reached (5 per hour). Please wait before sending again.",
    };
  }

  const nowIso = new Date().toISOString();
  const res = await sendTransactionalEmail(
    {
      from: getInvitationSenderAddress(),
      to: recipient,
      replyTo: getInvitationReplyToAddress(),
      subject: "HIRZEXA Intelligence | Outbound Email Delivery Verification",
      text: [
        "HIRZEXA Intelligence — Outbound Email Delivery Verification",
        "",
        `Verified at: ${nowIso}`,
        `Initiated by: ${actor.fullName} (${actor.roleLabel})`,
        `Sender: ${getInvitationSenderAddress()}`,
        `Reply-To: ${getInvitationReplyToAddress()}`,
        "",
        "If you received this message, your server-side Resend API integration for hirzexa.com is operational.",
        "",
        `HIRZEXA — AI & Software Engineering (${OFFICIAL_WEBSITE_URL})`,
      ].join("\n"),
      html: `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#F6F8FC;font-family:Inter,Arial,sans-serif;color:#182230;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5EAF2;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:#0B1122;padding:20px 26px;color:#FFFFFF;">
        <div style="font-size:14px;font-weight:800;letter-spacing:0.08em;">HIRZEXA</div>
        <div style="font-size:10px;letter-spacing:0.12em;color:#94A3B8;margin-top:3px;">INFRASTRUCTURE VERIFICATION</div>
      </td>
    </tr>
    <tr>
      <td style="padding:26px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#315CDA;margin-bottom:8px;">DELIVERY CHECK PASSED</div>
        <h1 style="margin:0 0 12px;font-size:18px;color:#182230;">Outbound Email Delivery Verification</h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#475467;">
          This diagnostic message confirms that HIRZEXA Intelligence can dispatch transactional emails through your verified Resend integration for <strong>hirzexa.com</strong>.
        </p>
        <div style="padding:12px 14px;border-radius:8px;background:#F8FAFC;border:1px solid #E5EAF2;font-size:12.5px;color:#334155;">
          <div><strong>Timestamp:</strong> ${nowIso}</div>
          <div><strong>Initiated by:</strong> ${actor.fullName} (${actor.roleLabel})</div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    {
      tags: [{ name: "category", value: "settings_diagnostic_test" }],
    }
  );

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "settings",
    action: "settings.test_email_sent",
    entityType: "email_provider",
    entityId: "resend",
    outcome: res.ok ? "allowed" : "error",
    summary: res.ok
      ? `Diagnostic test email accepted by Resend for ${recipient} (${res.messageId || "ok"}).`
      : `Diagnostic test email failed for ${recipient}: ${res.error || "unknown error"}.`,
    metadata: { recipient, deliveryStatus: res.status, messageId: res.messageId || null },
  });

  return {
    ok: res.ok,
    status: res.status,
    messageId: res.messageId,
    error: res.error,
  };
}
