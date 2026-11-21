import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailMessageTemplate } from "@/lib/email-templates";

export type InvitationDeliveryStatus =
  | "created"
  | "sending"
  | "accepted_by_provider"
  | "delivered"
  | "delivery_failed"
  | "bounced"
  | "complained";

export interface TransactionalEmailResult {
  ok: boolean;
  status: "accepted_by_provider" | "delivery_failed";
  provider: "resend";
  messageId?: string;
  sentAt?: string;
  error?: string;
  notConfigured?: boolean;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export const OFFICIAL_SUPPORT_EMAIL = "support@hirzexa.com";
export const OFFICIAL_CAREERS_EMAIL = "careers@hirzexa.com";
export const OFFICIAL_CAREERS_SENDER = "HIRZEXA Careers <careers@hirzexa.com>";
export const OFFICIAL_ACCOUNTS_SENDER = "HIRZEXA Accounts <accounts@hirzexa.com>";
export const OFFICIAL_WEBSITE_URL = "https://hirzexa.com";

export function getCareersSenderAddress(): string {
  return process.env.CAREERS_EMAIL_FROM?.trim() || OFFICIAL_CAREERS_SENDER;
}

export function getCareersReplyToAddress(): string {
  return process.env.CAREERS_EMAIL_REPLY_TO?.trim() || OFFICIAL_CAREERS_EMAIL;
}

export function getInvitationSenderAddress(): string {
  return (
    process.env.INVITATION_EMAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    OFFICIAL_ACCOUNTS_SENDER
  );
}

export function getInvitationReplyToAddress(): string {
  return process.env.INVITATION_EMAIL_REPLY_TO?.trim() || OFFICIAL_SUPPORT_EMAIL;
}

/**
 * Replaces temporary Render preview/service hostnames (e.g. devtecha.onrender.com)
 * with the canonical production domain https://hirzexa.com so user-facing emails
 * never leak internal hosting URLs.
 */
export function canonicalizeUserFacingUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.hostname.toLowerCase().endsWith(".onrender.com")) {
      return `${OFFICIAL_WEBSITE_URL}${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}${parsed.hash}`.replace(
        /\/$/,
        ""
      );
    }
    return rawUrl.trim().replace(/\/$/, "");
  } catch {
    return rawUrl.trim().replace(/https?:\/\/[a-z0-9-]+\.onrender\.com/gi, OFFICIAL_WEBSITE_URL);
  }
}

/**
 * Resolves and strictly validates the public HTTPS base URL used in external invitation emails.
 * Never allows `localhost`, `127.0.0.1`, `0.0.0.0`, or insecure `http://` links in emails
 * sent to external employees, and canonicalizes any `*.onrender.com` origin to `https://hirzexa.com`.
 */
export function resolvePublicInvitationBaseUrl(): {
  ok: boolean;
  baseUrl?: string;
  error?: string;
} {
  const raw =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";

  if (!raw) {
    return {
      ok: false,
      error:
        "APP_BASE_URL is not configured. Set an accessible public HTTPS URL (e.g. https://hirzexa.com) before sending external invitation emails.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(canonicalizeUserFacingUrl(raw));
  } catch {
    return {
      ok: false,
      error: `APP_BASE_URL ("${raw}") is not a valid URL.`,
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local");

  const allowLocalTest =
    process.env.ALLOW_LOCALHOST_INVITE_EMAILS === "true" &&
    process.env.VERCEL_ENV !== "production";

  if ((parsed.protocol !== "https:" || isLocalHost) && !allowLocalTest) {
    return {
      ok: false,
      error:
        "Invitation emails require a public HTTPS APP_BASE_URL (localhost and HTTP links are blocked for external employee invitations).",
    };
  }

  return {
    ok: true,
    baseUrl: parsed.origin.replace(/\/$/, ""),
  };
}

/**
 * Reusable server-side transactional email sender backed by Resend REST API.
 * Keeps RESEND_API_KEY strictly server-side and distinguishes provider acceptance
 * (`accepted_by_provider`) from verified mailbox delivery (`delivered` via webhook).
 */
export interface TransactionalEmailAttachment {
  filename: string;
  /** Base64-encoded file content (Resend REST API format) */
  content: string;
  content_type?: string;
}

const PLACEHOLDER_TOKEN_PATTERNS = [
  /preview[-_]?token/i,
  /sample[-_]?token/i,
  /dummy[-_]?token/i,
  /fake[-_]?token/i,
  /placeholder/i,
  /generated[-_]?on[-_]?send/i,
  /^test[-_]?token/i,
  /^mock[-_]?token/i,
];

/**
 * Checks whether a raw scheduling token looks like a mock/placeholder/weak token
 * rather than a real cryptographically generated 256-bit random token.
 */
export function isPlaceholderOrWeakSchedulingToken(rawToken: string): boolean {
  const token = rawToken.trim();
  if (token.length < 32) return true;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return true;
  return PLACEHOLDER_TOKEN_PATTERNS.some((pattern) => pattern.test(token));
}

/**
 * Strict outbound safety gate executed before any email reaches Resend.
 * Blocks placeholder tokens, preview banners, dummy domains (example.com),
 * localhost/loopback links, legacy hosting URLs (*.onrender.com), and
 * malformed/weak interview scheduling URLs.
 */
export function validateOutboundEmailContent(template: EmailMessageTemplate): {
  ok: boolean;
  error?: string;
} {
  const combined = `${template.subject}\n${template.html}\n${template.text}`;
  const allowLocalTest =
    process.env.ALLOW_LOCALHOST_INVITE_EMAILS === "true" &&
    process.env.VERCEL_ENV !== "production";

  if (/preview-token-sample|generated-on-send|\[PREVIEW ONLY/i.test(combined)) {
    return {
      ok: false,
      error:
        "Blocked outbound email: template contains a preview placeholder token or preview-only marker.",
    };
  }

  if (/\bhttps?:\/\/(?:[a-z0-9-]+\.)?example\.(?:com|org|net)\b/i.test(combined)) {
    return {
      ok: false,
      error: "Blocked outbound email: contains placeholder example.com URL.",
    };
  }

  if (!allowLocalTest) {
    if (/\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\b/i.test(combined)) {
      return {
        ok: false,
        error: "Blocked outbound email: contains localhost or loopback URL.",
      };
    }
  }

  if (/\bhttps?:\/\/[a-z0-9-]+\.onrender\.com\b/i.test(combined)) {
    return {
      ok: false,
      error: "Blocked outbound email: contains deprecated onrender.com URL.",
    };
  }

  // Validate every interview scheduling URL embedded in HTML or plain text
  const scheduleUrlRegex = /https?:\/\/[^\s"'<>]+\/interview\/schedule[^\s"'<>]*/gi;
  const matches = combined.match(scheduleUrlRegex) || [];
  for (const rawMatch of matches) {
    const cleaned = rawMatch.replace(/&amp;/g, "&").replace(/[).,;]+$/, "");
    let parsed: URL;
    try {
      parsed = new URL(cleaned);
    } catch {
      return {
        ok: false,
        error: "Blocked outbound email: malformed interview scheduling URL.",
      };
    }

    if (!allowLocalTest && parsed.protocol !== "https:") {
      return {
        ok: false,
        error: "Blocked outbound email: interview scheduling URL must use HTTPS.",
      };
    }

    const tokenParam = parsed.searchParams.get("token");
    if (tokenParam !== null && isPlaceholderOrWeakSchedulingToken(tokenParam)) {
      return {
        ok: false,
        error:
          "Blocked outbound email: interview scheduling link contains a placeholder or insecure token.",
      };
    }
  }

  return { ok: true };
}

export async function sendTransactionalEmail(
  template: EmailMessageTemplate,
  options?: {
    idempotencyKey?: string;
    tags?: Array<{ name: string; value: string }>;
    attachments?: TransactionalEmailAttachment[];
  }
): Promise<TransactionalEmailResult> {
  const safetyCheck = validateOutboundEmailContent(template);
  if (!safetyCheck.ok) {
    return {
      ok: false,
      status: "delivery_failed",
      provider: "resend",
      error: safetyCheck.error || "Blocked unsafe outbound email payload.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: "delivery_failed",
      provider: "resend",
      notConfigured: true,
      error:
        "RESEND_API_KEY is not configured on the server. Invitation token was created safely, but no email was sent.",
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: template.from,
        to: [template.to],
        reply_to: template.replyTo,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: options?.tags,
        attachments:
          options?.attachments && options.attachments.length > 0
            ? options.attachments
            : undefined,
      }),
      cache: "no-store",
    });

    const rawText = await response.text();
    let parsed: { id?: string; message?: string; name?: string } = {};
    try {
      parsed = rawText ? (JSON.parse(rawText) as typeof parsed) : {};
    } catch {
      parsed = { message: rawText.slice(0, 300) };
    }

    if (!response.ok || !parsed.id) {
      const detail =
        parsed.message || `Resend rejected the request (HTTP ${response.status}).`;
      return {
        ok: false,
        status: "delivery_failed",
        provider: "resend",
        error: detail,
      };
    }

    return {
      ok: true,
      status: "accepted_by_provider",
      provider: "resend",
      messageId: parsed.id,
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      status: "delivery_failed",
      provider: "resend",
      error:
        err instanceof Error
          ? `Network error contacting Resend: ${err.message}`
          : "Network error contacting Resend.",
    };
  }
}

/**
 * Cryptographically verifies Resend (Svix) webhook HMAC-SHA256 signatures
 * (`svix-id`, `svix-timestamp`, `svix-signature`) using timing-safe comparison
 * and a 5-minute replay tolerance window.
 */
export function verifyResendWebhookSignature(params: {
  rawBody: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  secret?: string;
}): boolean {
  const secret = (params.secret || process.env.RESEND_WEBHOOK_SECRET || "").trim();
  if (!secret || !params.svixId || !params.svixTimestamp || !params.svixSignature) {
    return false;
  }

  const tsNum = Number(params.svixTimestamp);
  if (!Number.isFinite(tsNum)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > 300) {
    return false;
  }

  const secretMaterial = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secretMaterial, "base64");
  } catch {
    return false;
  }
  if (secretBytes.length === 0) return false;

  const signedContent = `${params.svixId}.${params.svixTimestamp}.${params.rawBody}`;
  const expectedSig = createHmac("sha256", secretBytes)
    .update(signedContent, "utf8")
    .digest("base64");

  const expectedBuf = Buffer.from(expectedSig, "utf8");
  const candidates = params.svixSignature
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const [version, sig] = candidate.split(",", 2);
    if (version !== "v1" || !sig) continue;
    const sigBuf = Buffer.from(sig, "utf8");
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return true;
    }
  }

  return false;
}
