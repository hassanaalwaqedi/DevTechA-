import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    if (
      specifier === "next/headers" ||
      specifier === "next/navigation" ||
      specifier === "next/server"
    ) {
      return nextResolve(`${specifier}.js`, context);
    }
    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      for (const candidate of [
        resolve(root, `${rel}.ts`),
        resolve(root, `${rel}.tsx`),
        resolve(root, rel, "index.ts"),
      ]) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

// Isolated offline test environment
process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = "true";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.APP_BASE_URL = "https://devtecha.onrender.com";
process.env.GOOGLE_CALENDAR_CLIENT_ID = "1234567890-mockclient.apps.googleusercontent.com";
process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "GOCSPX-mock_server_secret_only";
process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY =
  "hirzexa_test_aes256_gcm_encryption_key_32_bytes_min_999";

const intelDir = join(root, ".data", "intelligence");
const connFile = join(intelDir, "google-calendar-connections.json");
const auditFile = join(intelDir, "audit-logs.json");

async function cleanup() {
  await rm(connFile, { force: true }).catch(() => {});
  await rm(auditFile, { force: true }).catch(() => {});
}
await cleanup();

const {
  GOOGLE_CALENDAR_OAUTH_SCOPES,
  getGoogleCalendarRedirectUri,
  encryptOAuthSecret,
  decryptOAuthSecret,
  createGoogleOAuthState,
  verifyGoogleOAuthState,
  buildGoogleOAuthAuthorizationUrl,
  exchangeGoogleOAuthCodeAndStore,
  getGoogleCalendarConnectionStatus,
  createGoogleMeetDiscoveryEvent,
  updateGoogleMeetDiscoveryEvent,
  deleteGoogleMeetDiscoveryEvent,
  testGoogleCalendarConnection,
  disconnectGoogleCalendar,
  setGoogleCalendarFetchForTest,
} = await import("@/lib/integrations/google-calendar");

const adminActor = {
  id: "emp-super-admin",
  employeeId: "emp-super-admin",
  email: "hassan@hirzexa.com",
  fullName: "Hassan Founder",
  department: "Executive",
  roleKey: "super_admin",
  roleLabel: "Super Admin",
  status: "active",
  scope: "all",
  permissions: {},
  mfaEnrolled: true,
  sessionVersion: 1,
  isSuperAdmin: true,
};

const apiCalls = [];
let eventCounter = 0;

setGoogleCalendarFetchForTest(async (url, init) => {
  const urlStr = String(url);
  const method = (init?.method || "GET").toUpperCase();
  apiCalls.push({ method, url: urlStr, body: init?.body ? String(init.body) : "" });

  if (urlStr === "https://oauth2.googleapis.com/token") {
    const params = new URLSearchParams(String(init?.body || ""));
    if (params.get("grant_type") === "authorization_code") {
      return new Response(
        JSON.stringify({
          access_token: "ya29.mock_initial_access_token",
          refresh_token: "1//mock_super_secret_refresh_token",
          expires_in: 3600,
          scope: GOOGLE_CALENDAR_OAUTH_SCOPES.join(" "),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (params.get("grant_type") === "refresh_token") {
      assert.equal(params.get("refresh_token"), "1//mock_super_secret_refresh_token");
      return new Response(
        JSON.stringify({
          access_token: "ya29.mock_refreshed_access_token",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  if (urlStr === "https://www.googleapis.com/oauth2/v2/userinfo") {
    return new Response(JSON.stringify({ email: "hassan@hirzexa.com" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urlStr.includes("/calendar/v3/calendars/primary/events") && method === "POST") {
    assert.ok(urlStr.includes("conferenceDataVersion=1"), "Must request conferenceDataVersion=1");
    assert.ok(urlStr.includes("sendUpdates=none"), "Must pass sendUpdates=none so Google does not auto-email");
    eventCounter += 1;
    return new Response(
      JSON.stringify({
        id: `gcal_evt_${eventCounter}`,
        htmlLink: `https://calendar.google.com/event?eid=${eventCounter}`,
        hangoutLink: `https://meet.google.com/hir-zexa-${eventCounter}0${eventCounter}`,
        conferenceData: {
          entryPoints: [
            {
              entryPointType: "video",
              uri: `https://meet.google.com/hir-zexa-${eventCounter}0${eventCounter}`,
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (urlStr.includes("/calendar/v3/calendars/primary/events/") && method === "PATCH") {
    assert.ok(urlStr.includes("sendUpdates=none"));
    return new Response(
      JSON.stringify({
        id: "gcal_evt_1",
        hangoutLink: "https://meet.google.com/hir-zexa-101",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (urlStr.includes("/calendar/v3/calendars/primary/events/") && method === "DELETE") {
    assert.ok(urlStr.includes("sendUpdates=none"));
    return new Response(null, { status: 204 });
  }

  if (urlStr.startsWith("https://oauth2.googleapis.com/revoke")) {
    return new Response("", { status: 200 });
  }

  return new Response(JSON.stringify({ error: "unexpected_mock_url", url: urlStr }), { status: 500 });
});

try {
  // 1. Canonical Redirect URI
  console.log("1. Verifying canonical Authorized Redirect URI...");
  assert.equal(
    getGoogleCalendarRedirectUri(),
    "https://hirzexa.com/api/admin/integrations/google-calendar/callback",
    "Must canonicalize *.onrender.com to https://hirzexa.com"
  );

  // 2. AES-256-GCM Token Encryption & Tamper Detection
  console.log("2. Verifying AES-256-GCM encryption, unique IVs, and tamper rejection...");
  const secretToken = "1//very-sensitive-google-refresh-token";
  const enc1 = encryptOAuthSecret(secretToken);
  const enc2 = encryptOAuthSecret(secretToken);
  assert.notEqual(enc1, enc2, "Random IV must produce distinct ciphertexts");
  assert.ok(!enc1.includes(secretToken), "Plaintext must never appear in ciphertext");
  assert.equal(decryptOAuthSecret(enc1), secretToken);
  assert.equal(decryptOAuthSecret(enc2), secretToken);

  // Tamper with ciphertext -> must throw auth tag verification error
  const tampered = enc1.slice(0, -4) + "AAAA";
  assert.throws(() => decryptOAuthSecret(tampered), "Tampered AES-GCM ciphertext must fail decryption");

  // 3. CSRF State Verification
  console.log("3. Verifying OAuth CSRF state binding, HMAC integrity, and expiry...");
  const now = Date.now();
  const state = createGoogleOAuthState(adminActor.id, now);
  assert.equal(
    verifyGoogleOAuthState({ queryState: state, cookieState: state, actorId: adminActor.id, nowMs: now + 1000 }).ok,
    true
  );
  assert.equal(
    verifyGoogleOAuthState({ queryState: state, cookieState: "different", actorId: adminActor.id, nowMs: now }).ok,
    false,
    "Cookie/query mismatch must fail"
  );
  assert.equal(
    verifyGoogleOAuthState({ queryState: state, cookieState: state, actorId: "other-admin-id", nowMs: now }).ok,
    false,
    "Cross-admin actor replay must fail"
  );
  assert.equal(
    verifyGoogleOAuthState({
      queryState: state,
      cookieState: state,
      actorId: adminActor.id,
      nowMs: now + 11 * 60 * 1000,
    }).ok,
    false,
    "Expired state (>10m) must fail"
  );

  // 4. Authorization URL & Minimal Scopes
  console.log("4. Verifying Google OAuth authorization URL & least-privilege scopes...");
  const authUrlRes = buildGoogleOAuthAuthorizationUrl(state);
  assert.equal(authUrlRes.ok, true);
  const parsedAuth = new URL(authUrlRes.url);
  assert.equal(parsedAuth.origin, "https://accounts.google.com");
  assert.equal(parsedAuth.searchParams.get("access_type"), "offline");
  assert.equal(parsedAuth.searchParams.get("prompt"), "consent");
  assert.equal(
    parsedAuth.searchParams.get("redirect_uri"),
    "https://hirzexa.com/api/admin/integrations/google-calendar/callback"
  );
  assert.equal(
    parsedAuth.searchParams.get("scope"),
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email"
  );

  // 5. OAuth Code Exchange + Encrypted Storage + Zero Secret Leakage
  console.log("5. Verifying server-side code exchange, encrypted storage, and non-secret status...");
  const exchangeRes = await exchangeGoogleOAuthCodeAndStore({
    code: "4/mock_auth_code",
    actor: adminActor,
  });
  assert.equal(exchangeRes.ok, true);
  assert.equal(exchangeRes.connectedEmail, "hassan@hirzexa.com");

  const rawStored = await readFile(connFile, "utf8");
  assert.ok(
    !rawStored.includes("1//mock_super_secret_refresh_token"),
    "Plaintext refresh token must NEVER be persisted"
  );
  assert.ok(
    !rawStored.includes("ya29.mock_initial_access_token"),
    "Plaintext access token must NEVER be persisted"
  );

  const status = await getGoogleCalendarConnectionStatus();
  assert.equal(status.connected, true);
  assert.equal(status.connectedEmail, "hassan@hirzexa.com");
  assert.equal(JSON.stringify(status).includes("mock_super_secret"), false, "Status must leak 0 tokens");

  // 6. Automatic Unique Google Meet Event Creation + Reschedule + Cancel
  console.log("6. Verifying automatic unique Google Meet creation, reschedule, and cancel sync...");
  const slotIso = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const meet1 = await createGoogleMeetDiscoveryEvent({
    id: "lead-1",
    referenceId: "HRZ-DSC-2026-10001",
    fullName: "Nadia Client",
    email: "nadia@client.test",
    company: "Crescent Cloud",
    serviceTrack: "AI Engineering & Intelligent Agents",
    durationMinutes: 30,
    scheduledSlotIso: slotIso,
    timezone: "Asia/Riyadh",
    projectSummary: "Discovery consultation for enterprise RAG.",
  });
  assert.equal(meet1.ok, true);
  assert.equal(meet1.eventId, "gcal_evt_1");
  assert.equal(meet1.meetUrl, "https://meet.google.com/hir-zexa-101");

  const upd = await updateGoogleMeetDiscoveryEvent("gcal_evt_1", {
    scheduledSlotIso: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    timezone: "Asia/Riyadh",
  });
  assert.equal(upd.ok, true);

  const del = await deleteGoogleMeetDiscoveryEvent("gcal_evt_1");
  assert.equal(del.ok, true);

  // 7. Admin Meet Verification Probe (creates temp Meet event & deletes it immediately)
  console.log("7. Verifying admin Test Meet Sync diagnostic (create + cleanup)...");
  const probe = await testGoogleCalendarConnection(adminActor, { verifyMeetCreation: true });
  assert.equal(probe.ok, true);
  assert.ok(probe.verifiedMeetUrl?.startsWith("https://meet.google.com/"));

  // 8. Disconnect + Token Revocation
  console.log("8. Verifying disconnect revokes Google token & deletes stored connection...");
  const disc = await disconnectGoogleCalendar(adminActor);
  assert.equal(disc.ok, true);
  assert.equal(disc.revokedRemote, true);
  const statusAfter = await getGoogleCalendarConnectionStatus();
  assert.equal(statusAfter.connected, false);

  console.log("\nALL 8 GOOGLE CALENDAR OAUTH 2.0 & MEET INTEGRATION TESTS PASSED!");
} finally {
  setGoogleCalendarFetchForTest(null);
  await cleanup();
}
