import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { CrmLeadRecord } from "@/lib/crm-types";
import {
  canonicalizeUserFacingUrl,
  OFFICIAL_WEBSITE_URL,
} from "@/lib/email/transactional";
import { recordAuditLog } from "@/lib/intelligence/audit";
import {
  isLocalFallbackAllowed,
  readLocalCollection,
  writeLocalCollection,
} from "@/lib/intelligence/store";
import type { AuthActor } from "@/lib/rbac";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  createSupabaseServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/service-role";

export const GOOGLE_CALENDAR_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

export const GOOGLE_OAUTH_STATE_COOKIE = "hirzexa_gcal_oauth_state";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const WORKSPACE_KEY = "default";
const LOCAL_COLLECTION = "google-calendar-connections";
const TOKEN_KEY_VERSION = "v1";

export interface GoogleCalendarConnectionStatus {
  provider: "google_calendar";
  oauthClientConfigured: boolean;
  encryptionKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  connected: boolean;
  connectedEmail: string | null;
  calendarId: string;
  scopes: string[];
  redirectUri: string;
  connectedByEmail: string | null;
  connectedAt: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
  summary: string;
}

interface StoredGoogleCalendarConnection {
  workspaceKey: string;
  provider: "google_calendar";
  connectedEmail: string;
  calendarId: string;
  scopes: string[];
  encryptedRefreshToken: string;
  encryptedAccessToken: string | null;
  accessTokenExpiresAt: string | null;
  tokenKeyVersion: string;
  connectedByActorId: string | null;
  connectedByEmail: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleMeetEventResult {
  ok: boolean;
  connected: boolean;
  conferenceStatus?: "success" | "pending" | "failure" | "unknown";
  eventId?: string;
  meetUrl?: string;
  htmlLink?: string;
  error?: string;
}

type FetchLike = typeof fetch;
let activeFetch: FetchLike = fetch;
let pollBaseDelayMs = 450;

export function setGoogleCalendarFetchForTest(fn: FetchLike | null): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK !== "true"
  ) {
    throw new Error("Cannot override Google Calendar HTTP transport in production.");
  }
  activeFetch = fn || fetch;
}

export function setGoogleCalendarPollDelayForTest(ms: number | null): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK !== "true"
  ) {
    throw new Error("Cannot override poll delay in production.");
  }
  pollBaseDelayMs = ms === null ? 450 : Math.max(0, ms);
}

function redactErrorDetail(raw: string): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[REDACTED_ACCESS_TOKEN]")
    .replace(/1\/\/[A-Za-z0-9._-]+/g, "[REDACTED_REFRESH_TOKEN]")
    .replace(/GOCSPX-[A-Za-z0-9._-]+/g, "[REDACTED_CLIENT_SECRET]")
    .slice(0, 260);
}

function getClientId(): string {
  return process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() || "";
}

function getClientSecret(): string {
  return process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() || "";
}

function getEncryptionSecret(): string {
  return process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY?.trim() || "";
}

export function getGoogleCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || "primary";
}

export function isGoogleCalendarClientConfigured(): boolean {
  return Boolean(getClientId() && getClientSecret());
}

export function isGoogleCalendarEncryptionConfigured(): boolean {
  return getEncryptionSecret().length >= 32;
}

/**
 * Returns the exact canonical Authorized Redirect URI registered in Google Cloud Console.
 * Production default: https://hirzexa.com/api/admin/integrations/google-calendar/callback
 */
export function getGoogleCalendarRedirectUri(): string {
  const explicit = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim();
  if (explicit) {
    return canonicalizeUserFacingUrl(explicit);
  }
  const rawBase =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    OFFICIAL_WEBSITE_URL;
  const canonicalBase = canonicalizeUserFacingUrl(rawBase).replace(/\/$/, "");
  return `${canonicalBase}/api/admin/integrations/google-calendar/callback`;
}

function deriveAes256Key(): Buffer {
  const secret = getEncryptionSecret();
  if (secret.length < 32) {
    throw new Error(
      "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY must be configured with at least 32 characters."
    );
  }
  return createHash("sha256").update(`hirzexa-gcal-aes-key:${secret}`, "utf8").digest();
}

function deriveStateHmacKey(): Buffer {
  const secret = getEncryptionSecret() || process.env.SESSION_SIGNING_SECRET?.trim() || "";
  if (secret.length < 16) {
    throw new Error("OAuth state signing key is not configured.");
  }
  return createHash("sha256").update(`hirzexa-gcal-state:${secret}`, "utf8").digest();
}

/**
 * Encrypts sensitive OAuth tokens using authenticated AES-256-GCM (random 12-byte IV per call).
 */
export function encryptOAuthSecret(plaintext: string): string {
  const key = deriveAes256Key();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    TOKEN_KEY_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/**
 * Decrypts AES-256-GCM token ciphertext and verifies integrity tag (rejects tampering).
 */
export function decryptOAuthSecret(encoded: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 4 || parts[0] !== TOKEN_KEY_VERSION) {
    throw new Error("Invalid encrypted token format.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = deriveAes256Key();
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(tagB64, "base64url");
  const ciphertext = Buffer.from(dataB64, "base64url");
  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error("Corrupted token envelope.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Creates a signed, actor-bound, short-lived CSRF state token for OAuth 2.0 authorization.
 */
export function createGoogleOAuthState(actorId: string, nowMs = Date.now()): string {
  const payload = JSON.stringify({
    a: actorId,
    iat: nowMs,
    n: randomBytes(18).toString("base64url"),
  });
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", deriveStateHmacKey())
    .update(encodedPayload, "utf8")
    .digest("base64url");
  return `${encodedPayload}.${sig}`;
}

/**
 * Strictly validates OAuth CSRF state:
 * 1. Timing-safe match between query `state` and HttpOnly cookie `state`
 * 2. Valid HMAC-SHA256 signature
 * 3. Actor binding matches current authenticated admin `actorId`
 * 4. Not expired (< 10 minutes old)
 */
export function verifyGoogleOAuthState(params: {
  queryState: string | null | undefined;
  cookieState: string | null | undefined;
  actorId: string;
  nowMs?: number;
}): { ok: boolean; error?: string } {
  const queryState = (params.queryState || "").trim();
  const cookieState = (params.cookieState || "").trim();
  if (!queryState || !cookieState) {
    return { ok: false, error: "Missing OAuth CSRF state parameter or cookie." };
  }

  const qBuf = Buffer.from(queryState, "utf8");
  const cBuf = Buffer.from(cookieState, "utf8");
  if (qBuf.length !== cBuf.length || !timingSafeEqual(qBuf, cBuf)) {
    return { ok: false, error: "OAuth CSRF state mismatch." };
  }

  const dotIdx = queryState.indexOf(".");
  if (dotIdx <= 0) {
    return { ok: false, error: "Malformed OAuth state token." };
  }
  const encodedPayload = queryState.slice(0, dotIdx);
  const providedSig = queryState.slice(dotIdx + 1);
  let expectedSig: string;
  try {
    expectedSig = createHmac("sha256", deriveStateHmacKey())
      .update(encodedPayload, "utf8")
      .digest("base64url");
  } catch {
    return { ok: false, error: "State signing key unavailable." };
  }

  const pSigBuf = Buffer.from(providedSig, "utf8");
  const eSigBuf = Buffer.from(expectedSig, "utf8");
  if (pSigBuf.length !== eSigBuf.length || !timingSafeEqual(pSigBuf, eSigBuf)) {
    return { ok: false, error: "Invalid OAuth state signature." };
  }

  let parsed: { a?: string; iat?: number; n?: string };
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as typeof parsed;
  } catch {
    return { ok: false, error: "Invalid OAuth state payload." };
  }

  if (!parsed.a || parsed.a !== params.actorId) {
    return { ok: false, error: "OAuth state does not belong to the active administrator session." };
  }

  const nowMs = params.nowMs ?? Date.now();
  if (
    typeof parsed.iat !== "number" ||
    !Number.isFinite(parsed.iat) ||
    nowMs - parsed.iat > OAUTH_STATE_TTL_MS ||
    parsed.iat - nowMs > 60_000
  ) {
    return { ok: false, error: "OAuth authorization state expired. Please retry connecting." };
  }

  return { ok: true };
}

export function buildGoogleOAuthAuthorizationUrl(state: string): {
  ok: boolean;
  url?: string;
  redirectUri: string;
  error?: string;
} {
  const redirectUri = getGoogleCalendarRedirectUri();
  const clientId = getClientId();
  if (!clientId || !getClientSecret()) {
    return {
      ok: false,
      redirectUri,
      error:
        "GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET must be configured server-side.",
    };
  }
  if (!isGoogleCalendarEncryptionConfigured()) {
    return {
      ok: false,
      redirectUri,
      error:
        "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY (minimum 32 characters) must be configured before connecting Google Calendar.",
    };
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return {
    ok: true,
    redirectUri,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

function mapDbRowToStored(row: Record<string, unknown>): StoredGoogleCalendarConnection {
  return {
    workspaceKey: String(row.workspace_key || WORKSPACE_KEY),
    provider: "google_calendar",
    connectedEmail: String(row.connected_email || ""),
    calendarId: String(row.calendar_id || getGoogleCalendarId()),
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [],
    encryptedRefreshToken: String(row.encrypted_refresh_token || ""),
    encryptedAccessToken: row.encrypted_access_token ? String(row.encrypted_access_token) : null,
    accessTokenExpiresAt: row.access_token_expires_at ? String(row.access_token_expires_at) : null,
    tokenKeyVersion: String(row.token_key_version || TOKEN_KEY_VERSION),
    connectedByActorId: row.connected_by_actor_id ? String(row.connected_by_actor_id) : null,
    connectedByEmail: row.connected_by_email ? String(row.connected_by_email) : null,
    lastVerifiedAt: row.last_verified_at ? String(row.last_verified_at) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

async function loadStoredConnection(): Promise<StoredGoogleCalendarConnection | null> {
  if (isSupabaseConfigured()) {
    const serviceClient = createSupabaseServiceRoleClient();
    if (serviceClient) {
      try {
        const { data, error } = await serviceClient
          .from("google_calendar_connections")
          .select("*")
          .eq("workspace_key", WORKSPACE_KEY)
          .maybeSingle();
        if (!error && data) {
          return mapDbRowToStored(data as Record<string, unknown>);
        }
      } catch {}
    }
  }

  if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<StoredGoogleCalendarConnection>(LOCAL_COLLECTION);
    return all.find((c) => c.workspaceKey === WORKSPACE_KEY) || null;
  }

  return null;
}

async function saveStoredConnection(conn: StoredGoogleCalendarConnection): Promise<void> {
  if (isSupabaseConfigured()) {
    const serviceClient = createSupabaseServiceRoleClient();
    if (!serviceClient) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is required to securely store encrypted Google Calendar tokens."
      );
    }
    const { error } = await serviceClient.from("google_calendar_connections").upsert(
      {
        workspace_key: conn.workspaceKey,
        provider: conn.provider,
        connected_email: conn.connectedEmail,
        calendar_id: conn.calendarId,
        scopes: conn.scopes,
        encrypted_refresh_token: conn.encryptedRefreshToken,
        encrypted_access_token: conn.encryptedAccessToken,
        access_token_expires_at: conn.accessTokenExpiresAt,
        token_key_version: conn.tokenKeyVersion,
        connected_by_actor_id: conn.connectedByActorId,
        connected_by_email: conn.connectedByEmail,
        last_verified_at: conn.lastVerifiedAt,
        last_error: conn.lastError,
        created_at: conn.createdAt,
        updated_at: conn.updatedAt,
      },
      { onConflict: "workspace_key" }
    );
    if (error) {
      throw new Error(`Failed to persist Google Calendar connection: ${error.message}`);
    }
    if (isLocalFallbackAllowed()) {
      await writeLocalCollection(LOCAL_COLLECTION, [conn]);
    }
    return;
  }

  if (isLocalFallbackAllowed()) {
    await writeLocalCollection(LOCAL_COLLECTION, [conn]);
    return;
  }

  throw new Error("No persistent storage configured for Google Calendar OAuth tokens.");
}

async function deleteStoredConnection(): Promise<void> {
  if (isSupabaseConfigured()) {
    const serviceClient = createSupabaseServiceRoleClient();
    if (serviceClient) {
      await serviceClient
        .from("google_calendar_connections")
        .delete()
        .eq("workspace_key", WORKSPACE_KEY);
    }
  }
  if (isLocalFallbackAllowed()) {
    await writeLocalCollection(LOCAL_COLLECTION, []);
  }
}

/**
 * Returns non-secret operational status of Google Calendar OAuth integration.
 * Safe to render in Admin Settings (NEVER returns tokens or client secrets).
 */
export async function getGoogleCalendarConnectionStatus(): Promise<GoogleCalendarConnectionStatus> {
  const oauthClientConfigured = isGoogleCalendarClientConfigured();
  const encryptionKeyConfigured = isGoogleCalendarEncryptionConfigured();
  const serviceRoleConfigured = isServiceRoleConfigured();
  const redirectUri = getGoogleCalendarRedirectUri();
  const calendarId = getGoogleCalendarId();

  const stored = await loadStoredConnection();
  if (stored && stored.encryptedRefreshToken) {
    return {
      provider: "google_calendar",
      oauthClientConfigured,
      encryptionKeyConfigured,
      serviceRoleConfigured,
      connected: true,
      connectedEmail: stored.connectedEmail,
      calendarId: stored.calendarId || calendarId,
      scopes: stored.scopes,
      redirectUri,
      connectedByEmail: stored.connectedByEmail,
      connectedAt: stored.createdAt,
      lastVerifiedAt: stored.lastVerifiedAt,
      lastError: stored.lastError,
      summary: `Connected to Google Calendar (${stored.connectedEmail}) for automatic unique Google Meet creation.`,
    };
  }

  let summary =
    "External Google Calendar synchronization is not connected. HIRZEXA internal scheduling, conflict prevention, and .ics calendar invites are active.";
  if (oauthClientConfigured && encryptionKeyConfigured) {
    summary =
      "Google OAuth credentials are configured. Click Connect Google Calendar to authorize unique Google Meet creation for Discovery Calls.";
  } else if (oauthClientConfigured && !encryptionKeyConfigured) {
    summary =
      "GOOGLE_CALENDAR_CLIENT_ID/SECRET detected, but GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY (32+ chars) is required before connecting.";
  }

  return {
    provider: "google_calendar",
    oauthClientConfigured,
    encryptionKeyConfigured,
    serviceRoleConfigured,
    connected: false,
    connectedEmail: null,
    calendarId,
    scopes: [],
    redirectUri,
    connectedByEmail: null,
    connectedAt: null,
    lastVerifiedAt: null,
    lastError: null,
    summary,
  };
}

/**
 * Completes the server-side OAuth 2.0 Authorization Code exchange, verifies user email,
 * encrypts refresh & access tokens with AES-256-GCM, and persists securely.
 */
export async function exchangeGoogleOAuthCodeAndStore(params: {
  code: string;
  actor: AuthActor;
}): Promise<{ ok: boolean; connectedEmail?: string; error?: string }> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Google OAuth client credentials are not configured server-side." };
  }
  if (!isGoogleCalendarEncryptionConfigured()) {
    return { ok: false, error: "Token encryption key is not configured." };
  }

  const redirectUri = getGoogleCalendarRedirectUri();
  const tokenRes = await activeFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const tokenBody = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenBody.access_token) {
    return {
      ok: false,
      error:
        tokenBody.error_description ||
        tokenBody.error ||
        `Google token exchange failed (HTTP ${tokenRes.status}).`,
    };
  }

  // Fetch connected Google account email using the short-lived access token
  let connectedEmail = params.actor.email;
  try {
    const infoRes = await activeFetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (infoRes.ok) {
      const info = (await infoRes.json().catch(() => ({}))) as { email?: string };
      if (info.email && info.email.includes("@")) {
        connectedEmail = info.email.trim().toLowerCase();
      }
    }
  } catch {}

  const existing = await loadStoredConnection();
  const refreshToken = tokenBody.refresh_token?.trim() || "";
  const encryptedRefreshToken = refreshToken
    ? encryptOAuthSecret(refreshToken)
    : existing?.encryptedRefreshToken || "";

  if (!encryptedRefreshToken) {
    return {
      ok: false,
      error:
        "Google did not return a refresh token. Revoke previous app access in your Google Account security settings and reconnect with consent.",
    };
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + Math.max(60, Number(tokenBody.expires_in || 3600) - 60) * 1000
  ).toISOString();
  const scopes = (tokenBody.scope || GOOGLE_CALENDAR_OAUTH_SCOPES.join(" "))
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  await saveStoredConnection({
    workspaceKey: WORKSPACE_KEY,
    provider: "google_calendar",
    connectedEmail,
    calendarId: getGoogleCalendarId(),
    scopes,
    encryptedRefreshToken,
    encryptedAccessToken: encryptOAuthSecret(tokenBody.access_token),
    accessTokenExpiresAt: expiresAt,
    tokenKeyVersion: TOKEN_KEY_VERSION,
    connectedByActorId: params.actor.id,
    connectedByEmail: params.actor.email,
    lastVerifiedAt: nowIso,
    lastError: null,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  });

  await recordAuditLog({
    actorId: params.actor.id,
    actorEmail: params.actor.email,
    actorRole: params.actor.roleKey,
    module: "settings",
    action: "google_calendar_connect",
    entityType: "integration",
    entityId: "google_calendar",
    outcome: "allowed",
    summary: `Connected Google Calendar OAuth 2.0 integration for ${connectedEmail} (calendar=${getGoogleCalendarId()}).`,
    metadata: { connectedEmail, scopesCount: scopes.length },
  }).catch(() => {});

  return { ok: true, connectedEmail };
}

/**
 * Returns a valid Google OAuth access token, transparently refreshing from the
 * AES-256-GCM encrypted refresh token when expired.
 */
async function getValidAccessToken(): Promise<{
  ok: boolean;
  accessToken?: string;
  connection?: StoredGoogleCalendarConnection;
  error?: string;
}> {
  const conn = await loadStoredConnection();
  if (!conn || !conn.encryptedRefreshToken) {
    return { ok: false, error: "Google Calendar is not connected." };
  }

  // Use cached access token if valid for at least 2 more minutes
  if (
    conn.encryptedAccessToken &&
    conn.accessTokenExpiresAt &&
    new Date(conn.accessTokenExpiresAt).getTime() > Date.now() + 120_000
  ) {
    try {
      const accessToken = decryptOAuthSecret(conn.encryptedAccessToken);
      if (accessToken) {
        return { ok: true, accessToken, connection: conn };
      }
    } catch {
      // Fall through to refresh
    }
  }

  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Google OAuth client credentials missing." };
  }

  let refreshToken: string;
  try {
    refreshToken = decryptOAuthSecret(conn.encryptedRefreshToken);
  } catch {
    return { ok: false, error: "Failed to decrypt stored Google refresh token." };
  }

  const res = await activeFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !body.access_token) {
    const errMsg =
      body.error_description || body.error || `Token refresh failed (HTTP ${res.status}).`;
    await saveStoredConnection({
      ...conn,
      lastError: errMsg.slice(0, 300),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
    return { ok: false, error: errMsg };
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + Math.max(60, Number(body.expires_in || 3600) - 60) * 1000
  ).toISOString();

  const updated: StoredGoogleCalendarConnection = {
    ...conn,
    encryptedRefreshToken: body.refresh_token?.trim()
      ? encryptOAuthSecret(body.refresh_token.trim())
      : conn.encryptedRefreshToken,
    encryptedAccessToken: encryptOAuthSecret(body.access_token),
    accessTokenExpiresAt: expiresAt,
    lastError: null,
    updatedAt: nowIso,
  };
  await saveStoredConnection(updated).catch(() => {});

  return { ok: true, accessToken: body.access_token, connection: updated };
}

interface GoogleCalendarEventPayload {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
  conferenceData?: {
    createRequest?: {
      requestId?: string;
      status?: { statusCode?: string };
    };
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
  error?: { message?: string };
}

function extractConferenceStatus(
  event: GoogleCalendarEventPayload
): "success" | "pending" | "failure" | "unknown" {
  const code = event.conferenceData?.createRequest?.status?.statusCode?.toLowerCase();
  if (code === "success") return "success";
  if (code === "pending") return "pending";
  if (code === "failure") return "failure";
  return extractVerifiedGoogleMeetUrl(event) ? "success" : "unknown";
}

function extractVerifiedGoogleMeetUrl(event: GoogleCalendarEventPayload): string | null {
  const candidates: string[] = [];
  if (typeof event.hangoutLink === "string") candidates.push(event.hangoutLink);
  if (Array.isArray(event.conferenceData?.entryPoints)) {
    for (const ep of event.conferenceData.entryPoints) {
      if (ep.entryPointType === "video" && typeof ep.uri === "string") {
        candidates.push(ep.uri);
      }
    }
  }
  for (const raw of candidates) {
    try {
      const parsed = new URL(raw.trim());
      if (
        parsed.protocol === "https:" &&
        parsed.hostname.toLowerCase() === "meet.google.com" &&
        parsed.pathname.length > 1
      ) {
        return parsed.toString();
      }
    } catch {}
  }
  return null;
}

async function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls a newly created/patched Google Calendar event with bounded retries
 * when Google returns `conferenceData.createRequest.status.statusCode === "pending"`.
 */
async function pollForVerifiedGoogleMeet(params: {
  calendarId: string;
  eventId: string;
  accessToken: string;
  initialEvent: GoogleCalendarEventPayload;
  maxPolls?: number;
}): Promise<GoogleMeetEventResult> {
  let latest = params.initialEvent;
  let confStatus = extractConferenceStatus(latest);
  let meetUrl = extractVerifiedGoogleMeetUrl(latest);

  if (meetUrl && confStatus !== "failure") {
    return {
      ok: true,
      connected: true,
      conferenceStatus: "success",
      eventId: latest.id || params.eventId,
      meetUrl,
      htmlLink: latest.htmlLink,
    };
  }

  if (confStatus === "failure") {
    return {
      ok: false,
      connected: true,
      conferenceStatus: "failure",
      eventId: latest.id || params.eventId,
      htmlLink: latest.htmlLink,
      error:
        "Google Calendar created the event, but Google Meet conference provisioning returned statusCode=failure.",
    };
  }

  const maxPolls = params.maxPolls ?? 4;
  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    await sleepMs(pollBaseDelayMs * attempt);
    try {
      const pollRes = await activeFetch(
        `https://www.googleapis.com/calendar/v3/calendars/${params.calendarId}/events/${encodeURIComponent(
          params.eventId
        )}`,
        {
          headers: { Authorization: `Bearer ${params.accessToken}` },
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        }
      );
      if (!pollRes.ok) continue;
      latest = (await pollRes.json().catch(() => ({}))) as GoogleCalendarEventPayload;
      confStatus = extractConferenceStatus(latest);
      meetUrl = extractVerifiedGoogleMeetUrl(latest);

      if (meetUrl && confStatus !== "failure") {
        return {
          ok: true,
          connected: true,
          conferenceStatus: "success",
          eventId: latest.id || params.eventId,
          meetUrl,
          htmlLink: latest.htmlLink,
        };
      }
      if (confStatus === "failure") {
        return {
          ok: false,
          connected: true,
          conferenceStatus: "failure",
          eventId: latest.id || params.eventId,
          htmlLink: latest.htmlLink,
          error:
            "Google Meet conference creation failed asynchronously (conferenceData.statusCode=failure).",
        };
      }
    } catch {
      // Bounded poll continues until exhausted
    }
  }

  return {
    ok: false,
    connected: true,
    conferenceStatus: confStatus,
    eventId: latest.id || params.eventId,
    htmlLink: latest.htmlLink,
    error: `Google Calendar event created (${params.eventId}), but Google Meet link remained ${confStatus} after ${maxPolls} polls.`,
  };
}

/**
 * Automatically creates a Google Calendar event with a unique Google Meet conference link
 * for a confirmed Discovery Call booking, verifying conference creation status and
 * polling with bounded retries if Google returns `statusCode=pending`.
 * Uses `sendUpdates=none` so Google Calendar NEVER fires premature automatic customer emails.
 */
export async function createGoogleMeetDiscoveryEvent(
  lead: Pick<
    CrmLeadRecord,
    | "id"
    | "referenceId"
    | "fullName"
    | "email"
    | "company"
    | "serviceTrack"
    | "durationMinutes"
    | "scheduledSlotIso"
    | "timezone"
    | "projectSummary"
  >
): Promise<GoogleMeetEventResult> {
  if (!lead.scheduledSlotIso) {
    return { ok: false, connected: false, error: "No scheduled slot ISO on booking." };
  }

  const tokenRes = await getValidAccessToken();
  if (!tokenRes.ok || !tokenRes.accessToken || !tokenRes.connection) {
    return {
      ok: false,
      connected: false,
      error: redactErrorDetail(tokenRes.error || "Google Calendar is not connected."),
    };
  }

  const start = new Date(lead.scheduledSlotIso);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, connected: true, error: "Invalid scheduledSlotIso." };
  }
  const end = new Date(start.getTime() + (lead.durationMinutes || 30) * 60_000);
  const calendarId = encodeURIComponent(tokenRes.connection.calendarId || getGoogleCalendarId());
  const requestId = createHash("sha256")
    .update(`hirzexa-meet:${lead.id}:${start.toISOString()}`)
    .digest("hex")
    .slice(0, 32);

  const eventBody = {
    summary: `HIRZEXA Discovery Call — ${lead.company || lead.fullName} (${lead.referenceId})`,
    description: [
      `HIRZEXA Engineering Discovery Call (${lead.durationMinutes} min)`,
      `Reference: ${lead.referenceId}`,
      `Client: ${lead.fullName} <${lead.email}>`,
      lead.company ? `Company: ${lead.company}` : null,
      `Track: ${lead.serviceTrack}`,
      "",
      "Scope Summary:",
      lead.projectSummary.slice(0, 1200),
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    start: {
      dateTime: start.toISOString(),
      timeZone: lead.timezone || "UTC",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: lead.timezone || "UTC",
    },
    attendees: [{ email: lead.email, displayName: lead.fullName }],
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  try {
    const res = await activeFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=none`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenRes.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      }
    );

    const parsed = (await res.json().catch(() => ({}))) as GoogleCalendarEventPayload;

    if (!res.ok || !parsed.id) {
      return {
        ok: false,
        connected: true,
        error: redactErrorDetail(
          parsed.error?.message || `Google Calendar API error (HTTP ${res.status}).`
        ),
      };
    }

    return await pollForVerifiedGoogleMeet({
      calendarId,
      eventId: parsed.id,
      accessToken: tokenRes.accessToken,
      initialEvent: parsed,
    });
  } catch (err) {
    return {
      ok: false,
      connected: true,
      error: redactErrorDetail(
        err instanceof Error ? err.message : "Google Calendar request failed."
      ),
    };
  }
}

/**
 * Idempotent provisioning / repair helper:
 * - If the lead already has a `googleCalendarEventId`, inspects it first and patches
 *   `conferenceData` onto the existing event instead of creating a duplicate event.
 * - Otherwise creates a fresh Google Calendar event with a unique Google Meet link.
 */
export async function repairOrProvisionGoogleMeetEvent(
  lead: Pick<
    CrmLeadRecord,
    | "id"
    | "referenceId"
    | "fullName"
    | "email"
    | "company"
    | "serviceTrack"
    | "durationMinutes"
    | "scheduledSlotIso"
    | "timezone"
    | "projectSummary"
    | "googleCalendarEventId"
  >
): Promise<GoogleMeetEventResult> {
  if (!lead.scheduledSlotIso) {
    return { ok: false, connected: false, error: "Lead has no scheduled slot ISO." };
  }

  const existingEventId = lead.googleCalendarEventId?.trim() || "";
  if (!existingEventId) {
    return createGoogleMeetDiscoveryEvent(lead);
  }

  const tokenRes = await getValidAccessToken();
  if (!tokenRes.ok || !tokenRes.accessToken || !tokenRes.connection) {
    return {
      ok: false,
      connected: false,
      error: redactErrorDetail(tokenRes.error || "Google Calendar is not connected."),
    };
  }

  const calendarId = encodeURIComponent(tokenRes.connection.calendarId || getGoogleCalendarId());
  try {
    const getRes = await activeFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
        existingEventId
      )}`,
      {
        headers: { Authorization: `Bearer ${tokenRes.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (getRes.status === 404 || getRes.status === 410) {
      return createGoogleMeetDiscoveryEvent(lead);
    }

    if (getRes.ok) {
      const existing = (await getRes.json().catch(() => ({}))) as GoogleCalendarEventPayload;
      if (existing.status === "cancelled") {
        return createGoogleMeetDiscoveryEvent(lead);
      }
      const alreadyReadyUrl = extractVerifiedGoogleMeetUrl(existing);
      if (alreadyReadyUrl) {
        return {
          ok: true,
          connected: true,
          conferenceStatus: "success",
          eventId: existing.id || existingEventId,
          meetUrl: alreadyReadyUrl,
          htmlLink: existing.htmlLink,
        };
      }

      // Existing event lacks a Meet conference -> PATCH conferenceData onto the SAME event
      const patchReqId = createHash("sha256")
        .update(`hirzexa-meet-repair:${lead.id}:${existingEventId}:${Date.now()}`)
        .digest("hex")
        .slice(0, 32);
      const patchRes = await activeFetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
          existingEventId
        )}?conferenceDataVersion=1&sendUpdates=none`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${tokenRes.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conferenceData: {
              createRequest: {
                requestId: patchReqId,
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        }
      );
      const patched = (await patchRes.json().catch(() => ({}))) as GoogleCalendarEventPayload;
      if (!patchRes.ok) {
        return {
          ok: false,
          connected: true,
          eventId: existingEventId,
          error: redactErrorDetail(
            patched.error?.message || `Failed to attach Google Meet to event (HTTP ${patchRes.status}).`
          ),
        };
      }
      return await pollForVerifiedGoogleMeet({
        calendarId,
        eventId: existingEventId,
        accessToken: tokenRes.accessToken,
        initialEvent: patched,
      });
    }
  } catch (err) {
    return {
      ok: false,
      connected: true,
      eventId: existingEventId,
      error: redactErrorDetail(
        err instanceof Error ? err.message : "Failed inspecting existing Google Calendar event."
      ),
    };
  }

  return createGoogleMeetDiscoveryEvent(lead);
}

export async function updateGoogleMeetDiscoveryEvent(
  eventId: string,
  lead: Pick<CrmLeadRecord, "scheduledSlotIso" | "durationMinutes" | "timezone">
): Promise<GoogleMeetEventResult> {
  if (!eventId || !lead.scheduledSlotIso) {
    return { ok: false, connected: false, error: "Missing eventId or scheduledSlotIso." };
  }
  const tokenRes = await getValidAccessToken();
  if (!tokenRes.ok || !tokenRes.accessToken || !tokenRes.connection) {
    return { ok: false, connected: false, error: tokenRes.error };
  }

  const start = new Date(lead.scheduledSlotIso);
  const end = new Date(start.getTime() + (lead.durationMinutes || 30) * 60_000);
  const calendarId = encodeURIComponent(tokenRes.connection.calendarId || getGoogleCalendarId());

  try {
    const res = await activeFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
        eventId
      )}?conferenceDataVersion=1&sendUpdates=none`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenRes.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: { dateTime: start.toISOString(), timeZone: lead.timezone || "UTC" },
          end: { dateTime: end.toISOString(), timeZone: lead.timezone || "UTC" },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }
    );
    const parsed = (await res.json().catch(() => ({}))) as {
      id?: string;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        connected: true,
        error: parsed.error?.message || `Google Calendar PATCH failed (HTTP ${res.status}).`,
      };
    }
    return {
      ok: true,
      connected: true,
      eventId: parsed.id || eventId,
      meetUrl: extractVerifiedGoogleMeetUrl(parsed) || undefined,
    };
  } catch (err) {
    return {
      ok: false,
      connected: true,
      error: err instanceof Error ? err.message.slice(0, 200) : "Google Calendar update failed.",
    };
  }
}

export async function deleteGoogleMeetDiscoveryEvent(
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!eventId) return { ok: false, error: "Missing eventId." };
  const tokenRes = await getValidAccessToken();
  if (!tokenRes.ok || !tokenRes.accessToken || !tokenRes.connection) {
    return { ok: false, error: tokenRes.error };
  }
  const calendarId = encodeURIComponent(tokenRes.connection.calendarId || getGoogleCalendarId());
  try {
    const res = await activeFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
        eventId
      )}?sendUpdates=none`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenRes.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }
    );
    // 204 No Content or 410 Gone both mean the event is cancelled/removed
    if (res.ok || res.status === 410 || res.status === 404) {
      return { ok: true };
    }
    return { ok: false, error: `Google Calendar DELETE failed (HTTP ${res.status}).` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message.slice(0, 200) : "Google Calendar delete failed.",
    };
  }
}

/**
 * Admin-only diagnostic probe: verifies token refresh + live Calendar API reachability
 * (or optionally creates and immediately cleans up a private synthetic Google Meet event).
 */
export async function testGoogleCalendarConnection(
  actor: AuthActor,
  options?: { verifyMeetCreation?: boolean }
): Promise<{
  ok: boolean;
  latencyMs: number;
  connectedEmail?: string;
  calendarSummary?: string;
  verifiedMeetUrl?: string;
  detail: string;
}> {
  const started = Date.now();
  const tokenRes = await getValidAccessToken();
  if (!tokenRes.ok || !tokenRes.accessToken || !tokenRes.connection) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      detail: tokenRes.error || "Google Calendar is not connected.",
    };
  }

  const calendarId = encodeURIComponent(tokenRes.connection.calendarId || getGoogleCalendarId());

  if (options?.verifyMeetCreation) {
    const probeStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const created = await createGoogleMeetDiscoveryEvent({
      id: `probe-${Date.now()}`,
      referenceId: "HRZ-PROBE",
      fullName: actor.fullName,
      email: tokenRes.connection.connectedEmail,
      company: "HIRZEXA Diagnostic Check",
      serviceTrack: "Google Meet Verification",
      durationMinutes: 20,
      scheduledSlotIso: probeStart,
      timezone: "UTC",
      projectSummary: "Automated HIRZEXA diagnostic test verifying Google Meet link creation.",
    });
    if (created.eventId) {
      await deleteGoogleMeetDiscoveryEvent(created.eventId).catch(() => {});
    }
    const latencyMs = Date.now() - started;
    const nowIso = new Date().toISOString();
    await saveStoredConnection({
      ...tokenRes.connection,
      lastVerifiedAt: created.ok ? nowIso : tokenRes.connection.lastVerifiedAt,
      lastError: created.ok ? null : (created.error || "Meet creation probe failed.").slice(0, 300),
      updatedAt: nowIso,
    }).catch(() => {});

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "google_calendar_test_meet",
      entityType: "integration",
      entityId: "google_calendar",
      outcome: created.ok ? "allowed" : "error",
      summary: created.ok
        ? `Verified live Google Meet creation and cleanup for ${tokenRes.connection.connectedEmail} (${latencyMs} ms).`
        : `Google Meet creation probe failed: ${created.error || "Unknown error"}`,
      metadata: { latencyMs, verified: created.ok },
    }).catch(() => {});

    return {
      ok: created.ok,
      latencyMs,
      connectedEmail: tokenRes.connection.connectedEmail,
      verifiedMeetUrl: created.meetUrl,
      detail: created.ok
        ? `Verified unique Google Meet link creation (${created.meetUrl}) and cleaned up test event in ${latencyMs} ms.`
        : created.error || "Google Meet link verification failed.",
    };
  }

  try {
    const res = await activeFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`,
      {
        headers: { Authorization: `Bearer ${tokenRes.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );
    const latencyMs = Date.now() - started;
    const parsed = (await res.json().catch(() => ({}))) as {
      summary?: string;
      error?: { message?: string };
    };
    const nowIso = new Date().toISOString();
    const ok = res.ok;
    const detail = ok
      ? `Connected to Google Calendar "${parsed.summary || tokenRes.connection.connectedEmail}" (${latencyMs} ms).`
      : parsed.error?.message || `Google Calendar API returned HTTP ${res.status}.`;

    await saveStoredConnection({
      ...tokenRes.connection,
      lastVerifiedAt: ok ? nowIso : tokenRes.connection.lastVerifiedAt,
      lastError: ok ? null : detail.slice(0, 300),
      updatedAt: nowIso,
    }).catch(() => {});

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "google_calendar_test",
      entityType: "integration",
      entityId: "google_calendar",
      outcome: ok ? "allowed" : "error",
      summary: detail,
      metadata: { latencyMs, httpStatus: res.status },
    }).catch(() => {});

    return {
      ok,
      latencyMs,
      connectedEmail: tokenRes.connection.connectedEmail,
      calendarSummary: parsed.summary,
      detail,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      detail: err instanceof Error ? err.message.slice(0, 180) : "Network error contacting Google Calendar.",
    };
  }
}

/**
 * Disconnects Google Calendar: revokes the stored refresh token with Google and deletes
 * the encrypted record from the database.
 */
export async function disconnectGoogleCalendar(actor: AuthActor): Promise<{
  ok: boolean;
  revokedRemote: boolean;
}> {
  const conn = await loadStoredConnection();
  let revokedRemote = false;
  if (conn?.encryptedRefreshToken) {
    try {
      const refreshToken = decryptOAuthSecret(conn.encryptedRefreshToken);
      const rev = await activeFetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal: AbortSignal.timeout(6_000),
        }
      );
      revokedRemote = rev.ok;
    } catch {
      revokedRemote = false;
    }
  }

  await deleteStoredConnection();

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "settings",
    action: "google_calendar_disconnect",
    entityType: "integration",
    entityId: "google_calendar",
    outcome: "allowed",
    summary: `Disconnected Google Calendar OAuth integration (${conn?.connectedEmail || "none"}, remoteRevoked=${revokedRemote}).`,
    metadata: { revokedRemote },
  }).catch(() => {});

  return { ok: true, revokedRemote };
}
