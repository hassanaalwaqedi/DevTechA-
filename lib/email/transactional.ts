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

export function getInvitationSenderAddress(): string {
  return (
    process.env.INVITATION_EMAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "HIRZEXA Accounts <accounts@hirzexa.com>"
  );
}

export function getInvitationReplyToAddress(): string {
  return process.env.INVITATION_EMAIL_REPLY_TO?.trim() || "hassan@hirzexa.com";
}

/**
 * Resolves and strictly validates the public HTTPS base URL used in external invitation emails.
 * Never allows `localhost`, `127.0.0.1`, `0.0.0.0`, or insecure `http://` links in emails
 * sent to external employees.
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
        "APP_BASE_URL is not configured. Set an accessible public HTTPS URL (e.g. https://hirzexa.com or your staging HTTPS domain) before sending external invitation emails.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
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
export async function sendTransactionalEmail(
  template: EmailMessageTemplate,
  options?: {
    idempotencyKey?: string;
    tags?: Array<{ name: string; value: string }>;
  }
): Promise<TransactionalEmailResult> {
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
