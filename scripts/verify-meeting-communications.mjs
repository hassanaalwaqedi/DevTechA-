import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
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

// Isolated offline test environment (never touches production Supabase or sends real emails)
process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = "true";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.GEMINI_API_KEY;
process.env.RESEND_API_KEY = "re_test_mock_key_never_used_externally";
process.env.APP_BASE_URL = "https://hirzexa.com";

const dataDir = join(root, ".data");
const intelDir = join(dataDir, "intelligence");
async function resetTestCollections() {
  await rm(join(dataDir, "crm-leads.json"), { force: true }).catch(() => {});
  for (const file of [
    "crm-meeting-communications.json",
    "crm-meeting-reminder-configs.json",
    "audit-logs.json",
    "business-events.json",
    "employees.json",
  ]) {
    await rm(join(intelDir, file), { force: true }).catch(() => {});
  }
}

await resetTestCollections();

const { writeLocalCollection } = await import("@/lib/intelligence/store");
const nowSeedIso = new Date().toISOString();
await writeLocalCollection("employees", [
  {
    id: "emp-sales-a",
    authUserId: "auth-sales-a",
    email: "rep.a@hirzexa.com",
    fullName: "Rep Alpha",
    department: "Sales",
    roleKey: "sales_rep",
    status: "active",
    scope: "assigned",
    mfaEnrolled: true,
    sessionVersion: 1,
    createdAt: nowSeedIso,
    updatedAt: nowSeedIso,
  },
  {
    id: "emp-sales-b",
    authUserId: "auth-sales-b",
    email: "rep.b@hirzexa.com",
    fullName: "Rep Beta",
    department: "Sales",
    roleKey: "sales_rep",
    status: "active",
    scope: "assigned",
    mfaEnrolled: true,
    sessionVersion: 1,
    createdAt: nowSeedIso,
    updatedAt: nowSeedIso,
  },
]);

const { createCrmLead, updateCrmLead, listCrmLeads } = await import("@/lib/crm");
const { ROLE_TEMPLATES, resolveEffectivePermissions, RbacDeniedError } = await import("@/lib/rbac");

function makeActor({ id, email, fullName, roleKey, department }) {
  const tpl = ROLE_TEMPLATES[roleKey];
  return {
    id,
    employeeId: id,
    email,
    fullName,
    department,
    roleKey,
    roleLabel: tpl.label,
    status: "active",
    scope: tpl.defaultScope,
    permissions: resolveEffectivePermissions(roleKey),
    mfaEnrolled: true,
    sessionVersion: 1,
    isSuperAdmin: roleKey === "super_admin",
  };
}
const { renderMeetingEmailTemplate, formatMeetingDateTime, normalizeTimezone } = await import(
  "@/lib/crm-meetings/templates"
);
const {
  handleDiscoveryBookingCreated,
  getLeadMeetingCommunications,
  sendManualMeetingEmail,
  updateLeadReminderSchedule,
  rescheduleLeadMeeting,
  cancelLeadMeeting,
  processDueMeetingEmailJobs,
  recordCrmMeetingWebhookUpdate,
  generateAiFollowUpDraft,
  setMeetingEmailTransportForTest,
} = await import("@/lib/crm-meetings/service");

const superAdmin = makeActor({
  id: "emp-super-admin",
  email: "hassan@hirzexa.com",
  fullName: "Hassan Founder",
  roleKey: "super_admin",
  department: "Executive",
});

const salesRepA = makeActor({
  id: "emp-sales-a",
  email: "rep.a@hirzexa.com",
  fullName: "Rep Alpha",
  roleKey: "sales_rep",
  department: "Sales",
});

const salesRepB = makeActor({
  id: "emp-sales-b",
  email: "rep.b@hirzexa.com",
  fullName: "Rep Beta",
  roleKey: "sales_rep",
  department: "Sales",
});

const marketingIntern = makeActor({
  id: "emp-intern",
  email: "intern@hirzexa.com",
  fullName: "Intern Viewer",
  roleKey: "marketing_intern",
  department: "Marketing",
});

// Deterministic mock email transport (zero real emails sent!)
const sentCalls = [];
let mockFailNext = false;
let mockCounter = 0;

setMeetingEmailTransportForTest(async (template, options) => {
  sentCalls.push({ template, options });
  if (mockFailNext) {
    return {
      ok: false,
      status: "delivery_failed",
      provider: "resend",
      error: "Simulated Resend 503 temporary outage",
    };
  }
  mockCounter += 1;
  return {
    ok: true,
    status: "accepted_by_provider",
    provider: "resend",
    messageId: `re_mock_msg_${mockCounter}`,
    sentAt: new Date().toISOString(),
  };
});

try {
  // ==========================================================================
  // 1. Booking Confirmation + Automated 24h & 1h UTC Reminder Scheduling
  // ==========================================================================
  console.log("1. Testing Discovery Call booking confirmation & 24h/1h UTC reminder scheduling...");
  const baseNow = Date.now();
  const slot48h = new Date(baseNow + 48 * 60 * 60 * 1000).toISOString();

  const created = await createCrmLead({
    leadType: "discovery_call",
    fullName: "Nadia Al-Mansoor",
    email: "nadia.safe-test@hirzexa.test",
    company: "Crescent Cloud Systems",
    serviceTrack: "AI Engineering & Intelligent Agents",
    durationMinutes: 30,
    scheduledSlotIso: slot48h,
    timezone: "Asia/Riyadh",
    projectSummary: "We want to deploy an automated RAG support assistant integrated with Zendesk.",
    currentStack: "AWS ECS, PostgreSQL, Zendesk",
    consent: true,
    locale: "en",
  });
  // Assign to salesRepA for RBAC ownership tests
  await updateCrmLead(created.lead.id, {
    ownerId: salesRepA.id,
    ownerEmail: salesRepA.email,
    ownerName: salesRepA.fullName,
    notes: "Client confirmed Q2 pilot timeline and needs SOC2-compliant data handling.",
    actorEmail: superAdmin.email,
  });
  const leadA = (await listCrmLeads()).find((l) => l.id === created.lead.id);
  assert.ok(leadA, "Lead must persist");

  const autoRes = await handleDiscoveryBookingCreated(leadA, { nowMs: baseNow });
  assert.ok(autoRes.confirmation, "Confirmation email record must be created");
  assert.equal(autoRes.confirmation.status, "submitted", "Must be 'submitted' (NOT 'delivered') until webhook");
  assert.equal(autoRes.confirmation.deliveredAt, null, "deliveredAt must remain null prior to webhook");
  assert.equal(autoRes.scheduledReminders.length, 2, "Must queue 24h and 1h reminders");
  assert.equal(sentCalls.length, 1, "Exactly 1 confirmation email submitted");
  assert.equal(sentCalls[0].options.attachments?.length, 1, "Confirmation must include .ics attachment");
  assert.equal(sentCalls[0].template.replyTo, "business@hirzexa.com", "Reply-to must be business@hirzexa.com");

  // Re-running booking hook with same slot must be 100% idempotent (zero duplicate sends)
  const dupAuto = await handleDiscoveryBookingCreated(leadA, { nowMs: baseNow });
  assert.equal(sentCalls.length, 1, "Idempotency must prevent duplicate confirmation send");
  assert.equal(dupAuto.scheduledReminders.length, 0, "Idempotency must prevent duplicate queued reminders");

  // ==========================================================================
  // 2. Short-Notice Booking (< 24h) Must Skip Obsolete 24h Reminder
  // ==========================================================================
  console.log("2. Testing short-notice booking (<24h) skips obsolete 24h reminder...");
  const slot5h = new Date(baseNow + 5 * 60 * 60 * 1000).toISOString();
  const shortLeadRes = await createCrmLead({
    leadType: "discovery_call",
    fullName: "Omar ShortNotice",
    email: "omar.short@hirzexa.test",
    company: "QuickScale Labs",
    serviceTrack: "Business Process Automation",
    durationMinutes: 20,
    scheduledSlotIso: slot5h,
    timezone: "America/New_York",
    projectSummary: "Need urgent workflow automation consultation for ERP order ingestion.",
    consent: true,
    locale: "en",
  });
  const shortAuto = await handleDiscoveryBookingCreated(shortLeadRes.lead, { nowMs: baseNow });
  assert.equal(shortAuto.scheduledReminders.length, 1, "Only 1h reminder should be scheduled");
  assert.equal(shortAuto.scheduledReminders[0].templateType, "meeting_reminder_1h");
  assert.deepEqual(shortAuto.skippedOffsets, [1440], "24h offset must be skipped as obsolete");

  // ==========================================================================
  // 3. Timezone Handling & Safe Escaping (HTML + Header Injection Prevention)
  // ==========================================================================
  console.log("3. Testing timezone formatting, fallback, and HTML/header injection defense...");
  assert.equal(normalizeTimezone("Asia/Riyadh"), "Asia/Riyadh");
  assert.equal(normalizeTimezone("Invalid/Timezone_XYZ"), "UTC");
  const tzFmt = formatMeetingDateTime(slot48h, "Asia/Riyadh", "en");
  assert.ok(tzFmt && tzFmt.utcDisplay.endsWith("UTC"), "Must produce deterministic UTC display");

  const injectedRender = renderMeetingEmailTemplate({
    lead: leadA,
    templateType: "custom_email",
    customSubject: "Hello\r\nBcc: attacker@evil.test\nInjected",
    customBody: '<script>alert("xss")</script><b>Bold Attempt</b>',
  });
  assert.ok(!/[\r\n]/.test(injectedRender.subject), "CR/LF must be stripped from subject");
  assert.ok(!injectedRender.html.includes("<script>"), "Raw script tag must be escaped in HTML");
  assert.ok(injectedRender.html.includes("&lt;script&gt;"), "HTML must safely escape tags");

  // ==========================================================================
  // 4. Resend Webhook Delivery Confirmation (submitted -> delivered)
  // ==========================================================================
  console.log("4. Testing Resend webhook promotion submitted -> delivered...");
  const msgId = autoRes.confirmation.providerMessageId;
  const whRes = await recordCrmMeetingWebhookUpdate({
    providerMessageId: msgId,
    eventType: "email.delivered",
  });
  assert.equal(whRes.matched, true);
  assert.equal(whRes.status, "delivered");

  // Out-of-order email.sent webhook must NOT downgrade delivered back to submitted
  await recordCrmMeetingWebhookUpdate({
    providerMessageId: msgId,
    eventType: "email.sent",
  });
  const summaryAfterWh = await getLeadMeetingCommunications(salesRepA, leadA.id);
  assert.equal(summaryAfterWh.summary.confirmationStatus, "delivered");
  assert.ok(summaryAfterWh.summary.latestConfirmation.deliveredAt, "deliveredAt must be populated");

  // ==========================================================================
  // 5. RBAC & Cross-Client Scope Enforcement
  // ==========================================================================
  console.log("5. Testing RBAC & cross-client ownership scope boundaries...");
  const crossClientRead = await getLeadMeetingCommunications(salesRepB, leadA.id);
  assert.equal(crossClientRead.status, 403, "Unassigned sales rep must be denied read access");

  const crossClientSend = await sendManualMeetingEmail(salesRepB, leadA.id, {
    templateType: "custom_email",
    subject: "Unauthorized",
    bodyText: "Should be blocked",
    confirmed: true,
  });
  assert.equal(crossClientSend.status, 403, "Unassigned sales rep must be denied sending");

  await assert.rejects(
    () =>
      sendManualMeetingEmail(marketingIntern, leadA.id, {
        templateType: "custom_email",
        subject: "Intern Attempt",
        bodyText: "Should throw RbacDeniedError",
        confirmed: true,
      }),
    RbacDeniedError,
    "Marketing intern without crm:edit must be denied"
  );

  // ==========================================================================
  // 6. Manual Send Confirmation Gate & Duplicate Reminder Protection
  // ==========================================================================
  console.log("6. Testing explicit confirmation gate & duplicate reminder guard...");
  const unconfirmed = await sendManualMeetingEmail(salesRepA, leadA.id, {
    templateType: "meeting_reminder_24h",
    confirmed: false,
  });
  assert.equal(unconfirmed.status, 400);
  assert.equal(unconfirmed.code, "CONFIRMATION_REQUIRED");

  const firstManualRem = await sendManualMeetingEmail(salesRepA, leadA.id, {
    templateType: "meeting_reminder_24h",
    confirmed: true,
  });
  assert.equal(firstManualRem.ok, true);
  assert.equal(firstManualRem.communication.status, "submitted");

  const dupManualRem = await sendManualMeetingEmail(salesRepA, leadA.id, {
    templateType: "meeting_reminder_1h",
    confirmed: true,
    allowDuplicateOverride: false,
  });
  assert.equal(dupManualRem.status, 409, "Must block accidental duplicate reminder within 30m");
  assert.equal(dupManualRem.code, "DUPLICATE_REMINDER_GUARD");

  // ==========================================================================
  // 7. Meeting Reschedule: Cancel Obsolete Reminders & Recalculate New Schedule
  // ==========================================================================
  console.log("7. Testing meeting reschedule cancels obsolete reminders & recalculates...");
  const newSlot72h = new Date(baseNow + 72 * 60 * 60 * 1000).toISOString();
  const reschedRes = await rescheduleLeadMeeting(salesRepA, leadA.id, {
    newScheduledSlotIso: newSlot72h,
    timezone: "Asia/Riyadh",
    meetingLink: "https://meet.google.com/abc-defg-hij",
    reason: "Engineering lead requested morning slot",
    notifyClient: true,
  });
  assert.equal(reschedRes.ok, true);
  assert.equal(reschedRes.cancelledCount, 2, "Both previous queued reminders must be cancelled");
  assert.equal(reschedRes.scheduledReminders.length, 2, "Two fresh reminders must be queued");
  assert.equal(reschedRes.notification.templateType, "meeting_rescheduled");
  assert.equal(reschedRes.notification.status, "submitted");

  // ==========================================================================
  // 8. Persistent Scheduler Worker: Provider Failure -> Retry Backoff -> Success
  // ==========================================================================
  console.log("8. Testing scheduler worker failure retry backoff & concurrency safety...");
  // Advance simulated clock to 23h before the 72h slot (so the 24h reminder is due, 1h is not yet due)
  const at24hDue = new Date(newSlot72h).getTime() - 23 * 60 * 60 * 1000;
  mockFailNext = true;
  const workerFailRun = await processDueMeetingEmailJobs({ workerId: "worker-test-1", nowMs: at24hDue });
  assert.equal(workerFailRun.claimed, 2, "Must claim leadA 24h due job + shortLead expired job");
  assert.equal(workerFailRun.skipped, 1, "Must skip already-past shortLead meeting without sending");
  assert.equal(workerFailRun.retried, 1, "Transient failure must schedule bounded retry with backoff");
  assert.equal(workerFailRun.submitted, 0);

  // Immediately re-running before backoff expires must claim 0 jobs!
  const beforeBackoffRun = await processDueMeetingEmailJobs({
    workerId: "worker-test-2",
    nowMs: at24hDue + 60_000,
  });
  assert.equal(beforeBackoffRun.claimed, 0, "Backoff window must prevent immediate retry");

  // After 6 minutes (past 5m backoff), provider recovers -> job succeeds!
  mockFailNext = false;
  const afterBackoffRun = await processDueMeetingEmailJobs({
    workerId: "worker-test-3",
    nowMs: at24hDue + 6 * 60_000,
  });
  assert.equal(afterBackoffRun.claimed, 1);
  assert.equal(afterBackoffRun.submitted, 1, "Recovered worker run must submit due reminder");

  // ==========================================================================
  // 9. Meeting Cancellation Stops All Remaining Queued Reminders
  // ==========================================================================
  console.log("9. Testing meeting cancellation stops all queued reminders...");
  const cancelRes = await cancelLeadMeeting(salesRepA, leadA.id, {
    reason: "Postponed to next month",
    notifyClient: true,
  });
  assert.equal(cancelRes.ok, true);
  assert.equal(cancelRes.cancelledCount, 1, "Remaining 1h reminder must be cancelled");
  assert.equal(cancelRes.notification.templateType, "meeting_cancelled");
  assert.equal(cancelRes.notification.status, "submitted");

  // Running worker at meeting time must send ZERO reminders for cancelled meeting!
  const atMeetingTime = new Date(newSlot72h).getTime() - 30 * 60_000;
  const postCancelWorker = await processDueMeetingEmailJobs({
    workerId: "worker-test-4",
    nowMs: atMeetingTime,
  });
  assert.equal(postCancelWorker.submitted, 0, "Cancelled meeting must never fire reminders");

  // ==========================================================================
  // 10. Custom Reminder Schedule & Internal Reminder Separation
  // ==========================================================================
  console.log("10. Testing custom reminder schedule & internal Log Reminder truthfulness...");
  const schedRes = await updateLeadReminderSchedule(superAdmin, shortLeadRes.lead.id, {
    enabled: true,
    offsetsMinutes: [180, 30],
  });
  assert.equal(schedRes.ok, true);
  assert.deepEqual(schedRes.config.offsetsMinutes, [180, 30]);
  assert.equal(schedRes.scheduledJobs.length, 2, "Both 3h and 30m reminders fit inside 5h window");

  // Internal Log Reminder MUST NOT claim an email was sent
  const callsBeforeInternalLog = sentCalls.length;
  const loggedLead = await updateCrmLead(leadA.id, {
    sendReminder: true,
    actorEmail: salesRepA.email,
  });
  assert.equal(sentCalls.length, callsBeforeInternalLog, "Internal Log Reminder must NOT send client email");
  assert.ok(
    loggedLead.activities[0].summary.includes("no email sent to client"),
    "Timeline must clearly distinguish internal CRM reminder from client email"
  );

  // ==========================================================================
  // 11. AI Follow-Up Draft Flow (Grounded, Draft-Only, Human Approval Required)
  // ==========================================================================
  console.log("11. Testing AI follow-up draft flow (draft-only + grounded in CRM notes)...");
  const callsBeforeAiDraft = sentCalls.length;
  const aiDraft = await generateAiFollowUpDraft(salesRepA, leadA.id, { locale: "en" });
  assert.equal(aiDraft.ok, true);
  assert.equal(aiDraft.draft.sent, false, "AI draft must NEVER auto-send");
  assert.equal(aiDraft.draft.requiresHumanApproval, true);
  assert.equal(sentCalls.length, callsBeforeAiDraft, "Generating AI draft must make 0 email sends");
  assert.ok(
    aiDraft.draft.bodyText.includes("SOC2") || aiDraft.draft.groundedFacts.some((f) => f.includes("SOC2")),
    "AI draft must ground in recorded CRM meeting notes"
  );

  // Unassigned rep cannot generate AI draft for another rep's client
  const aiDraftDenied = await generateAiFollowUpDraft(salesRepB, leadA.id, { locale: "en" });
  assert.equal(aiDraftDenied.status, 403, "Cross-client AI follow-up draft must be blocked");

  console.log("\nALL 11 MEETING COMMUNICATIONS & AUTOMATED REMINDER TESTS PASSED!");
} finally {
  setMeetingEmailTransportForTest(null);
  await resetTestCollections();
}
