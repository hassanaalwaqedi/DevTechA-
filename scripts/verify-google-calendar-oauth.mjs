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
process.env.RESEND_API_KEY = "re_test_mock_key_never_external";
process.env.DISCOVERY_AUTO_EMAILS_ENABLED = "true";

const dataDir = join(root, ".data");
const intelDir = join(dataDir, "intelligence");
const connFile = join(intelDir, "google-calendar-connections.json");

async function cleanup() {
  await rm(join(dataDir, "crm-leads.json"), { force: true }).catch(() => {});
  for (const file of [
    "google-calendar-connections.json",
    "crm-meeting-communications.json",
    "crm-meeting-reminder-configs.json",
    "audit-logs.json",
    "business-events.json",
  ]) {
    await rm(join(intelDir, file), { force: true }).catch(() => {});
  }
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
  setGoogleCalendarPollDelayForTest,
} = await import("@/lib/integrations/google-calendar");

const {
  createCrmLead,
  generateMeetingLink,
  generateDiscoveryIcs,
  buildCalendarLinks,
  listCrmLeads,
} = await import("@/lib/crm");
const { renderMeetingEmailTemplate } = await import("@/lib/crm-meetings/templates");
const {
  provisionGoogleMeetForBooking,
  processDueGoogleMeetProvisioningJobs,
  adminRepairGoogleMeetLink,
  setMeetingEmailTransportForTest,
} = await import("@/lib/crm-meetings/service");
const { ROLE_TEMPLATES, resolveEffectivePermissions } = await import("@/lib/rbac");

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
  permissions: resolveEffectivePermissions("super_admin"),
  mfaEnrolled: true,
  sessionVersion: 1,
  isSuperAdmin: true,
};
void ROLE_TEMPLATES;

const sentEmails = [];
setMeetingEmailTransportForTest(async (template, options) => {
  sentEmails.push({ template, options });
  return {
    ok: true,
    status: "accepted_by_provider",
    provider: "resend",
    messageId: `re_mock_${sentEmails.length}`,
    sentAt: new Date().toISOString(),
  };
});

setGoogleCalendarPollDelayForTest(0);

let eventCounter = 0;
let mockMode = "immediate_success"; // "immediate_success" | "pending_then_success" | "conference_failure" | "api_outage"
let pollCounter = 0;

setGoogleCalendarFetchForTest(async (url, init) => {
  const urlStr = String(url);
  const method = (init?.method || "GET").toUpperCase();

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
    return new Response(
      JSON.stringify({ access_token: "ya29.mock_refreshed_access_token", expires_in: 3600 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (urlStr === "https://www.googleapis.com/oauth2/v2/userinfo") {
    return new Response(JSON.stringify({ email: "hassan@hirzexa.com" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urlStr.includes("/calendar/v3/calendars/primary/events") && method === "POST") {
    assert.ok(urlStr.includes("conferenceDataVersion=1"));
    assert.ok(urlStr.includes("sendUpdates=none"));
    if (mockMode === "api_outage") {
      return new Response(
        JSON.stringify({ error: { message: "Calendar backend temporarily unavailable" } }),
        { status: 503 }
      );
    }
    eventCounter += 1;
    const evtId = `gcal_evt_${eventCounter}`;
    if (mockMode === "pending_then_success") {
      pollCounter = 0;
      return new Response(
        JSON.stringify({
          id: evtId,
          conferenceData: { createRequest: { status: { statusCode: "pending" } } },
        }),
        { status: 200 }
      );
    }
    if (mockMode === "conference_failure") {
      return new Response(
        JSON.stringify({
          id: evtId,
          conferenceData: { createRequest: { status: { statusCode: "failure" } } },
        }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        id: evtId,
        htmlLink: `https://calendar.google.com/event?eid=${eventCounter}`,
        hangoutLink: `https://meet.google.com/hir-zexa-${eventCounter}0${eventCounter}`,
        conferenceData: {
          createRequest: { status: { statusCode: "success" } },
          entryPoints: [
            {
              entryPointType: "video",
              uri: `https://meet.google.com/hir-zexa-${eventCounter}0${eventCounter}`,
            },
          ],
        },
      }),
      { status: 200 }
    );
  }

  if (urlStr.includes("/calendar/v3/calendars/primary/events/") && method === "GET") {
    const evtId = urlStr.split("/events/")[1].split("?")[0];
    pollCounter += 1;
    if (mockMode === "pending_then_success" && pollCounter < 2) {
      return new Response(
        JSON.stringify({
          id: evtId,
          conferenceData: { createRequest: { status: { statusCode: "pending" } } },
        }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        id: evtId,
        hangoutLink: `https://meet.google.com/pol-ledm-${pollCounter}99`,
        conferenceData: {
          createRequest: { status: { statusCode: "success" } },
          entryPoints: [
            { entryPointType: "video", uri: `https://meet.google.com/pol-ledm-${pollCounter}99` },
          ],
        },
      }),
      { status: 200 }
    );
  }

  if (urlStr.includes("/calendar/v3/calendars/primary/events/") && method === "PATCH") {
    assert.ok(urlStr.includes("sendUpdates=none"));
    const evtId = urlStr.split("/events/")[1].split("?")[0];
    return new Response(
      JSON.stringify({
        id: evtId,
        hangoutLink: "https://meet.google.com/rep-airm-777",
        conferenceData: { createRequest: { status: { statusCode: "success" } } },
      }),
      { status: 200 }
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
    "https://hirzexa.com/api/admin/integrations/google-calendar/callback"
  );

  // 2. AES-256-GCM Token Encryption & Tamper Rejection
  console.log("2. Verifying AES-256-GCM encryption, unique IVs, and tamper rejection...");
  const enc1 = encryptOAuthSecret("1//secret-refresh");
  const enc2 = encryptOAuthSecret("1//secret-refresh");
  assert.notEqual(enc1, enc2);
  assert.equal(decryptOAuthSecret(enc1), "1//secret-refresh");
  assert.throws(() => decryptOAuthSecret(enc1.slice(0, -4) + "AAAA"));

  // 3. CSRF State Verification
  console.log("3. Verifying OAuth CSRF state binding, HMAC integrity, and expiry...");
  const now = Date.now();
  const state = createGoogleOAuthState(adminActor.id, now);
  assert.equal(
    verifyGoogleOAuthState({ queryState: state, cookieState: state, actorId: adminActor.id, nowMs: now }).ok,
    true
  );
  assert.equal(
    verifyGoogleOAuthState({ queryState: state, cookieState: "bad", actorId: adminActor.id, nowMs: now }).ok,
    false
  );
  assert.equal(
    verifyGoogleOAuthState({ queryState: state, cookieState: state, actorId: "wrong-admin", nowMs: now }).ok,
    false
  );
  assert.equal(
    verifyGoogleOAuthState({ queryState: state, cookieState: state, actorId: adminActor.id, nowMs: now + 700_000 }).ok,
    false
  );

  // 4. OAuth URL + Exchange + Encrypted Storage
  console.log("4. Verifying OAuth authorization URL, code exchange, and encrypted storage...");
  const authUrlRes = buildGoogleOAuthAuthorizationUrl(state);
  assert.equal(authUrlRes.ok, true);
  const exch = await exchangeGoogleOAuthCodeAndStore({ code: "4/mock_code", actor: adminActor });
  assert.equal(exch.ok, true);
  const rawStored = await readFile(connFile, "utf8");
  assert.ok(!rawStored.includes("1//mock_super_secret_refresh_token"));

  // 5. Pending Conference Status Polling (pending -> pending -> success)
  console.log("5. Verifying bounded polling when Google returns conferenceData.statusCode=pending...");
  mockMode = "pending_then_success";
  const slot48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const polledMeet = await createGoogleMeetDiscoveryEvent({
    id: "lead-poll-1",
    referenceId: "HRZ-DSC-2026-90001",
    fullName: "Poll Client",
    email: "poll@hirzexa.test",
    company: "Poll Corp",
    serviceTrack: "AI Engineering & Intelligent Agents",
    durationMinutes: 30,
    scheduledSlotIso: slot48h,
    timezone: "Asia/Riyadh",
    projectSummary: "Testing pending conference status polling.",
  });
  assert.equal(polledMeet.ok, true, "Bounded polling must resolve pending -> success");
  assert.equal(polledMeet.conferenceStatus, "success");
  assert.ok(polledMeet.meetUrl?.startsWith("https://meet.google.com/pol-ledm-"));

  // 6. Conference Failure Rejection (HTTP 200 + statusCode=failure MUST NOT succeed)
  console.log("6. Verifying HTTP 200 with conferenceData.statusCode=failure is rejected...");
  mockMode = "conference_failure";
  const failedMeet = await createGoogleMeetDiscoveryEvent({
    id: "lead-fail-1",
    referenceId: "HRZ-DSC-2026-90002",
    fullName: "Fail Client",
    email: "fail@hirzexa.test",
    company: "Fail Corp",
    serviceTrack: "AI Engineering & Intelligent Agents",
    durationMinutes: 30,
    scheduledSlotIso: slot48h,
    timezone: "UTC",
    projectSummary: "Testing conference failure detection.",
  });
  assert.equal(failedMeet.ok, false, "HTTP 200 without Meet URL must be rejected");
  assert.equal(failedMeet.conferenceStatus, "failure");
  assert.equal(failedMeet.meetUrl, undefined);

  // 7. No /book?ref=... Fallback + ICS + Calendar Links + Join Google Meet CTA Consistency
  console.log("7. Verifying zero /book?ref=... fallback, ICS conference properties, and email CTA consistency...");
  assert.equal(generateMeetingLink("HRZ-DSC-2026-77777"), undefined, "Must NOT fall back to /book?ref=...");

  mockMode = "immediate_success";
  const created = await createCrmLead({
    leadType: "discovery_call",
    fullName: "Synthetic Tester",
    email: "synthetic@hirzexa.test",
    company: "HIRZEXA QA",
    serviceTrack: "AI Engineering & Intelligent Agents",
    durationMinutes: 30,
    scheduledSlotIso: slot48h,
    timezone: "Asia/Riyadh",
    projectSummary: "End-to-end verification of Google Meet link consistency across ICS and emails.",
    consent: true,
    locale: "en",
  });
  assert.equal(created.lead.meetingLink, undefined, "Unprovisioned booking must not contain fake /book link");

  const provRes = await provisionGoogleMeetForBooking(created.lead);
  assert.equal(provRes.ok, true);
  assert.ok(provRes.meetUrl?.startsWith("https://meet.google.com/"));

  const ics = generateDiscoveryIcs({
    referenceId: provRes.lead.referenceId,
    fullName: provRes.lead.fullName,
    email: provRes.lead.email,
    company: provRes.lead.company,
    serviceTrack: provRes.lead.serviceTrack,
    durationMinutes: provRes.lead.durationMinutes,
    scheduledSlotIso: provRes.lead.scheduledSlotIso,
    meetingLink: provRes.lead.meetingLink,
    projectSummary: provRes.lead.projectSummary,
  });
  assert.ok(ics.includes(`LOCATION:${provRes.meetUrl}`), "ICS LOCATION must be real Google Meet URL");
  assert.ok(!ics.includes("LOCATION:https://hirzexa.com/book"), "ICS LOCATION must NEVER be /book?ref=...");
  assert.ok(ics.includes(`X-GOOGLE-CONFERENCE:${provRes.meetUrl}`), "ICS must include X-GOOGLE-CONFERENCE");
  assert.ok(ics.includes(`CONFERENCE;VALUE=URI;FEATURE=VIDEO;LABEL=Google Meet:${provRes.meetUrl}`));
  assert.ok(ics.includes(`UID:hirzexa-discovery-${provRes.lead.referenceId}@hirzexa.com`));

  const calLinks = buildCalendarLinks(provRes.lead);
  assert.ok(calLinks.googleUrl.includes(encodeURIComponent(provRes.meetUrl)));
  assert.ok(calLinks.outlookUrl.includes(encodeURIComponent(provRes.meetUrl)));

  const confirmEmail = renderMeetingEmailTemplate({ lead: provRes.lead, templateType: "meeting_confirmation" });
  const rem24Email = renderMeetingEmailTemplate({ lead: provRes.lead, templateType: "meeting_reminder_24h" });
  const rem1Email = renderMeetingEmailTemplate({ lead: provRes.lead, templateType: "meeting_reminder_1h" });
  for (const tpl of [confirmEmail, rem24Email, rem1Email]) {
    assert.ok(tpl.html.includes("Join Google Meet"), `${tpl.templateType} must feature 'Join Google Meet' CTA`);
    assert.ok(tpl.html.includes(provRes.meetUrl), `${tpl.templateType} must use exact persisted Meet URL`);
  }

  // 8. Failure Handling + Persistent Retry Worker Recovery -> Triggers Held Confirmation Email
  console.log("8. Verifying Meet failure holds email, schedules retry, and worker recovers cleanly...");
  mockMode = "api_outage";
  const slot60h = new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString();
  const outageLead = (
    await createCrmLead({
      leadType: "discovery_call",
      fullName: "Outage Retry Client",
      email: "retry@hirzexa.test",
      company: "Resilient Systems",
      serviceTrack: "Cloud Architecture & Systems Integration",
      durationMinutes: 30,
      scheduledSlotIso: slot60h,
      timezone: "UTC",
      projectSummary: "Verifying failed Meet creation persists booking and retries idempotently.",
      consent: true,
      locale: "en",
    })
  ).lead;

  const emailsBeforeOutage = sentEmails.length;
  const failProv = await provisionGoogleMeetForBooking(outageLead, { nowMs: now });
  assert.equal(failProv.ok, false);
  assert.equal(failProv.lead.meetProvisioningStatus, "failed");
  assert.ok(failProv.lead.meetNextRetryAt, "Must schedule persistent retry timestamp");
  assert.equal(sentEmails.length, emailsBeforeOutage, "Must NOT send customer email when Meet failed");

  // Simulate Google recovery 6 minutes later -> worker retries, attaches Meet URL, sends held confirmation!
  mockMode = "immediate_success";
  const retryWorker = await processDueGoogleMeetProvisioningJobs({ nowMs: now + 6 * 60_000 });
  assert.equal(retryWorker.claimed, 1);
  assert.equal(retryWorker.provisioned, 1);
  assert.equal(retryWorker.emailsTriggered, 1, "Must send held confirmation once genuine Meet link succeeds");
  const recoveredLead = (await listCrmLeads()).find((l) => l.id === outageLead.id);
  assert.ok(recoveredLead.meetingLink?.startsWith("https://meet.google.com/"));
  assert.equal(recoveredLead.meetProvisioningStatus, "ready");

  // 9. Admin Repair Action for Legacy Booking (Like HRZ-DSC-2026-60700) Without Duplicate Emails
  console.log("9. Verifying admin repair replaces legacy booking without auto-sending duplicate emails...");
  const slot80h = new Date(Date.now() + 80 * 60 * 60 * 1000).toISOString();
  const legacyLead = (
    await createCrmLead({
      leadType: "discovery_call",
      fullName: "Legacy Booking Client",
      email: "legacy-repair@hirzexa.test",
      company: "Legacy Corp",
      serviceTrack: "Custom Software & SaaS Engineering",
      durationMinutes: 30,
      scheduledSlotIso: slot80h,
      timezone: "UTC",
      projectSummary: "Booking missing Google Meet link prior to OAuth connection.",
      consent: true,
      locale: "en",
    })
  ).lead;

  const emailsBeforeRepair = sentEmails.length;
  const repairRes = await adminRepairGoogleMeetLink(adminActor, legacyLead.id);
  assert.equal(repairRes.ok, true);
  assert.ok(repairRes.meetUrl?.startsWith("https://meet.google.com/"));
  assert.equal(sentEmails.length, emailsBeforeRepair, "Admin repair must NOT auto-send duplicate emails");

  // 10. Reschedule, Cancel, Probe & Disconnect
  console.log("10. Verifying reschedule, cancel, Meet diagnostic probe, and disconnect...");
  assert.equal((await updateGoogleMeetDiscoveryEvent("gcal_evt_1", { scheduledSlotIso: slot80h, durationMinutes: 30, timezone: "UTC" })).ok, true);
  assert.equal((await deleteGoogleMeetDiscoveryEvent("gcal_evt_1")).ok, true);
  assert.equal((await testGoogleCalendarConnection(adminActor, { verifyMeetCreation: true })).ok, true);
  const disc = await disconnectGoogleCalendar(adminActor);
  assert.equal(disc.ok, true);
  assert.equal((await getGoogleCalendarConnectionStatus()).connected, false);

  console.log("\nALL 10 END-TO-END GOOGLE MEET PROVISIONING, POLLING, FAILURE RECOVERY & REPAIR TESTS PASSED!");
} finally {
  setGoogleCalendarFetchForTest(null);
  setGoogleCalendarPollDelayForTest(null);
  setMeetingEmailTransportForTest(null);
  await cleanup();
}
