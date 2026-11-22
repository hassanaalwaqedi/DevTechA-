import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_VERSION_COOKIE = "hirzexa_sv";

function getSessionSigningSecret(): string {
  return (
    process.env.SESSION_SIGNING_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    "hirzexa-sv-fallback-key"
  );
}

export function signSessionVersionToken(userId: string, sessionVersion: number): string {
  const version = Math.max(1, Math.floor(sessionVersion));
  const mac = createHmac("sha256", getSessionSigningSecret())
    .update(`sv:${userId}:${version}`, "utf8")
    .digest("hex")
    .slice(0, 32);
  return `${version}.${mac}`;
}

export function verifySessionVersionCookie(
  rawCookie: string | undefined,
  userId: string,
  requiredVersion: number
): boolean {
  const minVersion = Math.max(1, Math.floor(requiredVersion));
  if (!rawCookie || !rawCookie.trim()) {
    // Allow legacy pre-revocation sessions (version 1) without cookie; fail closed once revoked (>1)
    return minVersion <= 1;
  }

  const trimmed = rawCookie.trim();
  const dotIdx = trimmed.indexOf(".");
  if (dotIdx > 0) {
    const verStr = trimmed.slice(0, dotIdx);
    const sig = trimmed.slice(dotIdx + 1);
    const parsedVer = Number(verStr);
    if (!Number.isInteger(parsedVer) || parsedVer < minVersion) {
      return false;
    }
    const expectedSig = createHmac("sha256", getSessionSigningSecret())
      .update(`sv:${userId}:${parsedVer}`, "utf8")
      .digest("hex")
      .slice(0, 32);
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // Legacy unsigned numeric cookie: only accepted if version 1 and account was never revoked (>1).
  // Rejects NaN, malformed values, or forged high integers once sessionVersion > 1.
  const legacyVer = Number(trimmed);
  if (!Number.isInteger(legacyVer) || legacyVer < 1) {
    return false;
  }
  if (minVersion > 1) {
    return false;
  }
  return legacyVer >= minVersion;
}
