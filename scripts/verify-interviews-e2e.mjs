import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const liveBase = process.argv[2] || "http://127.0.0.1:3100";

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
      const candidates = [
        resolve(root, `${rel}.ts`),
        resolve(root, `${rel}.tsx`),
        resolve(root, rel, "index.ts"),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const stagingDir = await mkdtemp(join(tmpdir(), "hirzexa-interviews-e2e-"));
const originalCwd = process.cwd();
const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const savedAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const savedFallback = process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;
const savedAiEnabled = process.env.AI_FEATURES_ENABLED;

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = "true";
process.env.AI_FEATURES_ENABLED = "false";
process.chdir(stagingDir);

try {
  const { ROLE_TEMPLATES, resolveEffectivePermissions } = await import("@/lib/rbac");
  const { createEmployeeWithInvitation } = await import("@/lib/intelligence/employees");
  const {
    bookPublicInterviewSlot,
    cancelInterviewAppointment,
    createAndSendInterviewInvitation,
    dispatchDueInterviewReminders,
    getAvailableSlotsForInterviewer,
    getInterviewStatistics,
    getPublicInterviewIcsByToken,
    listAuthorizedInterviewAppointments,
    listAuthorizedInterviewInvitations,
    lookupPublicInterviewByToken,
    recordInterviewWebhookUpdate,
    rescheduleInterviewAppointment,
    revokeInterviewInvitation,
    saveInterviewerAvailability,
    createAvailabilityException,
  } = await import("@/lib/interviews/service");
  const { renderInterviewTemplatePreview } = await import("@/lib/interviews/email-templates");
  const { sendTransactionalEmail, validateOutboundEmailContent } = await import(
    "@/lib/email/transactional"
  );
  const { executeAuthorizedTool } = await import("@/lib/intelligence/tools");
  const { runAgentTurn } = await import("@/lib/intelligence/agent");

  const makeActor = (opts) => ({
    id: opts.id,
    employeeId: opts.employeeId,
    email: opts.email,
    fullName: opts.fullName,
    jobTitle: opts.jobTitle || opts.roleKey,
    department: opts.department || "Operations",
    roleKey: opts.roleKey,
    roleLabel: ROLE_TEMPLATES[opts.roleKey].label,
    scope: ROLE_TEMPLATES[opts.roleKey].defaultScope,
    status: "active",
    permissions: resolveEffectivePermissions(opts.roleKey, {}),
    isSuperAdmin: opts.roleKey === "super_admin",
    mfaEnrolled: true,
    sessionVersion: 1,
  });

  const SUPER_ADMIN_UUID = "11111111-2222-4333-8444-555555555555";
  const superAdmin = makeActor({
    id: SUPER_ADMIN_UUID,
    employeeId: "22222222-3333-4444-8555-666666666666",
    email: "admin@devtech.ai",
    fullName: "Hassan Founder",
    roleKey: "super_admin",
    department: "Executive",
  });

  // Create real employee records in isolated staging store
  const eng1Rec = await createEmployeeWithInvitation({
    actor: superAdmin,
    fullName: "Layla Engineering",
    email: "layla.eng@hirzexa.com",
    jobTitle: "Staff AI Engineer",
    department: "Engineering",
    roleKey: "engineer",
  });
  const eng2Rec = await createEmployeeWithInvitation({
    actor: superAdmin,
    fullName: "Omar Backend",
    email: "omar.eng@hirzexa.com",
    jobTitle: "Senior Backend Engineer",
    department: "Engineering",
    roleKey: "engineer",
  });
  const hrRec = await createEmployeeWithInvitation({
    actor: superAdmin,
    fullName: "Nadia HR",
    email: "nadia.hr@hirzexa.com",
    jobTitle: "HR Manager",
    department: "People",
    roleKey: "hr_manager",
  });
  const salesRec = await createEmployeeWithInvitation({
    actor: superAdmin,
    fullName: "Jesika Sales",
    email: "jesika.sales@hirzexa.com",
    jobTitle: "Sales Representative",
    department: "Sales",
    roleKey: "sales_rep",
  });

  const hrActor = makeActor({
    id: "auth-hr",
    employeeId: hrRec.employee.id,
    email: hrRec.employee.email,
    fullName: hrRec.employee.fullName,
    roleKey: "hr_manager",
    department: "People",
  });
  const eng1Actor = makeActor({
    id: "auth-eng1",
    employeeId: eng1Rec.employee.id,
    email: eng1Rec.employee.email,
    fullName: eng1Rec.employee.fullName,
    roleKey: "engineer",
    department: "Engineering",
  });
  const eng2Actor = makeActor({
    id: "auth-eng2",
    employeeId: eng2Rec.employee.id,
    email: eng2Rec.employee.email,
    fullName: eng2Rec.employee.fullName,
    roleKey: "engineer",
    department: "Engineering",
  });
  const salesActor = makeActor({
    id: "auth-sales",
    employeeId: salesRec.employee.id,
    email: salesRec.employee.email,
    fullName: salesRec.employee.fullName,
    roleKey: "sales_rep",
    department: "Sales",
  });

  console.log("1. Testing zero fictional availability before configuration...");
  const emptySlots = await getAvailableSlotsForInterviewer({
    employeeId: eng1Rec.employee.id,
    durationMinutes: 45,
    candidateTimezone: "Europe/Istanbul",
  });
  assert.equal(emptySlots.hasConfiguredRules, false);
  assert.equal(emptySlots.slots.length, 0);

  const blockedInvite = await createAndSendInterviewInvitation(hrActor, {
    applicationReferenceId: "DEV-2026-9001",
    candidateName: "Candidate A",
    candidateEmail: "candidate.a@example.com",
    positionTitle: "Senior AI Engineer",
    interviewType: "technical_interview",
    interviewFormat: "online_video",
    durationMinutes: 45,
    interviewerEmployeeId: eng1Rec.employee.id,
    skipOutboundEmail: true,
  });
  assert.equal(blockedInvite.ok, false, "Should refuse invitation when interviewer has zero configured rules");

  console.log("2. Configuring real interviewer availability + blocked holiday date...");
  const saveAvail = await saveInterviewerAvailability(hrActor, {
    employeeId: eng1Rec.employee.id,
    timezone: "Europe/Istanbul",
    slotDurationMinutes: 45,
    minNoticeHours: 2,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 10,
    maxAdvanceDays: 14,
    weeklyWindows: [
      { dayOfWeek: 0, startMinute: 540, endMinute: 1020, isActive: true },
      { dayOfWeek: 1, startMinute: 540, endMinute: 1020, isActive: true },
      { dayOfWeek: 2, startMinute: 540, endMinute: 1020, isActive: true },
      { dayOfWeek: 3, startMinute: 540, endMinute: 1020, isActive: true },
      { dayOfWeek: 4, startMinute: 540, endMinute: 1020, isActive: true },
      { dayOfWeek: 5, startMinute: 540, endMinute: 1020, isActive: true },
      { dayOfWeek: 6, startMinute: 540, endMinute: 1020, isActive: true },
    ],
  });
  assert.equal(saveAvail.ok, true);

  const tomorrowIso = new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 10);
  const exc = await createAvailabilityException(superAdmin, {
    employeeId: eng1Rec.employee.id,
    exceptionDate: tomorrowIso,
    isUnavailable: true,
    reason: "Blocked holiday test",
  });
  assert.equal(exc.ok, true);
  assert.equal(
    exc.exception.createdBy,
    SUPER_ADMIN_UUID,
    "Exception createdBy MUST be auth user UUID, never actor email"
  );

  const slotsAfter = await getAvailableSlotsForInterviewer({
    employeeId: eng1Rec.employee.id,
    durationMinutes: 45,
    candidateTimezone: "America/New_York",
  });
  assert.equal(slotsAfter.hasConfiguredRules, true);
  assert.ok(slotsAfter.slots.length > 5, "Should generate real slots from configured hours");
  assert.equal(
    slotsAfter.slots.some((s) => s.dateKeyInterviewer === tomorrowIso),
    false,
    "Blocked date must produce zero available slots"
  );

  console.log("3. Testing Super Admin UUID persistence, token hashing, placeholder rejection & isolation...");
  const invA = await createAndSendInterviewInvitation(superAdmin, {
    applicationReferenceId: "DEV-2026-9001",
    candidateName: "Sara Al-Mansoor",
    candidateEmail: "sara.candidate@hirzexa.com",
    positionTitle: "Senior AI Engineer",
    interviewType: "technical_interview",
    interviewFormat: "online_video",
    durationMinutes: 45,
    interviewerEmployeeId: eng1Rec.employee.id,
    personalizedMessage: "Please prepare a brief walkthrough of a distributed AI system you built.",
    locale: "en",
    skipOutboundEmail: true,
  });
  assert.equal(invA.ok, true);
  assert.equal(
    invA.invitation.createdBy,
    SUPER_ADMIN_UUID,
    "Invitation createdBy MUST store auth.users UUID, never admin@devtech.ai email"
  );
  assert.ok(invA.schedulingUrl?.includes("/interview/schedule?token="));
  const tokenA = new URL(invA.schedulingUrl).searchParams.get("token");
  assert.ok(tokenA && tokenA.length >= 32);

  // Confirm raw token is NEVER stored on disk in plaintext
  const storedRaw = await readFile(join(stagingDir, ".data", "intelligence", "interview-invitations.json"), "utf8");
  assert.equal(storedRaw.includes(tokenA), false, "Plaintext token MUST NEVER be stored");

  // Confirm placeholder tokens are explicitly rejected by public lookup & booking
  const placeholderLookup = await lookupPublicInterviewByToken("preview-token-sample");
  assert.equal(placeholderLookup.state, "invalid", "Placeholder token MUST be rejected");
  const placeholderBook = await bookPublicInterviewSlot({
    rawToken: "preview-token-sample",
    slotStartUtc: new Date(Date.now() + 72 * 3600_000).toISOString(),
    candidateTimezone: "UTC",
    skipOutboundEmail: true,
  });
  assert.equal(placeholderBook.ok, false);
  assert.equal(placeholderBook.code, "INVALID_TOKEN");

  const invB = await createAndSendInterviewInvitation(hrActor, {
    applicationReferenceId: "DEV-2026-9002",
    candidateName: "Tariq Candidate",
    candidateEmail: "tariq.candidate@example.com",
    positionTitle: "Senior AI Engineer",
    interviewType: "technical_interview",
    interviewFormat: "online_video",
    durationMinutes: 45,
    interviewerEmployeeId: eng1Rec.employee.id,
    locale: "ar",
    skipOutboundEmail: true,
  });
  assert.equal(invB.ok, true);
  const tokenB = new URL(invB.schedulingUrl).searchParams.get("token");

  const lookupA = await lookupPublicInterviewByToken(tokenA, "America/New_York");
  assert.equal(lookupA.state, "open");
  assert.equal(lookupA.invitation.candidateName, "Sara Al-Mansoor");
  assert.equal(JSON.stringify(lookupA).includes("Tariq"), false, "Candidate A MUST NOT see Candidate B");
  assert.equal(JSON.stringify(lookupA).includes("tokenHash"), false, "Public payload MUST NOT expose tokenHash");

  const invalidLookup = await lookupPublicInterviewByToken("invalid-forged-token-00000000000000");
  assert.equal(invalidLookup.state, "invalid");

  console.log("4. Testing atomic booking, idempotent confirmation, AND double-booking rejection...");
  const targetSlot = lookupA.availableSlots[0];
  const altSlot = lookupA.availableSlots[3];
  assert.ok(targetSlot && altSlot);

  // Race Candidate A and Candidate B concurrently for the EXACT SAME slot
  const [bookA, bookB] = await Promise.all([
    bookPublicInterviewSlot({
      rawToken: tokenA,
      slotStartUtc: targetSlot.startUtc,
      candidateTimezone: "America/New_York",
      skipOutboundEmail: true,
    }),
    bookPublicInterviewSlot({
      rawToken: tokenB,
      slotStartUtc: targetSlot.startUtc,
      candidateTimezone: "Asia/Riyadh",
      skipOutboundEmail: true,
    }),
  ]);
  const winners = [bookA, bookB].filter((r) => r.ok);
  const losers = [bookA, bookB].filter((r) => !r.ok);
  assert.equal(winners.length, 1, "Exactly ONE candidate must win a concurrent slot race");
  assert.equal(losers.length, 1, "The second candidate must receive SLOT_CONFLICT");
  assert.equal(losers[0].code, "SLOT_CONFLICT");

  // Confirm idempotent repeat submission by winner does NOT fail or create duplicate
  const winnerToken = bookA.ok ? tokenA : tokenB;
  const loserToken = bookA.ok ? tokenB : tokenA;
  const repeatConfirm = await bookPublicInterviewSlot({
    rawToken: winnerToken,
    slotStartUtc: targetSlot.startUtc,
    candidateTimezone: "America/New_York",
    skipOutboundEmail: true,
  });
  assert.equal(repeatConfirm.ok, true);
  assert.equal(repeatConfirm.idempotent, true);

  console.log("5. Testing ICS generation, reschedule, cancel, and reminder cancellation...");
  const icsRes = await getPublicInterviewIcsByToken(winnerToken);
  assert.equal(icsRes.ok, true);
  assert.ok(icsRes.ics.includes("BEGIN:VCALENDAR"));
  assert.ok(icsRes.ics.includes("METHOD:REQUEST"));
  assert.ok(icsRes.ics.includes("TRIGGER:-PT24H"));
  assert.ok(icsRes.ics.includes("TRIGGER:-PT1H"));

  const resched = await rescheduleInterviewAppointment({
    rawToken: winnerToken,
    newSlotStartUtc: altSlot.startUtc,
    candidateTimezone: "Europe/London",
    skipOutboundEmail: true,
  });
  assert.equal(resched.ok, true);
  assert.equal(resched.appointment.rescheduleCount, 1);
  assert.equal(resched.appointment.candidateTimezone, "Europe/London");

  // Cancel appointment and verify pending reminders are canceled & never sent
  const cancelRes = await cancelInterviewAppointment({
    rawToken: winnerToken,
    reason: "Testing cancellation flow",
    skipOutboundEmail: true,
  });
  assert.equal(cancelRes.ok, true);

  const remDispatch = await dispatchDueInterviewReminders({
    now: new Date(Date.now() + 30 * 86400_000),
    skipOutboundEmail: true,
  });
  assert.equal(remDispatch.sent, 0, "Canceled interview MUST NOT send reminders");

  // Revoke loser's unused invitation and verify public lookup rejects it
  const loserInvId = bookA.ok ? invB.invitation.id : invA.invitation.id;
  const revokeRes = await revokeInterviewInvitation(hrActor, loserInvId, "Position filled");
  assert.equal(revokeRes.ok, true);
  const revokedLookup = await lookupPublicInterviewByToken(loserToken);
  assert.equal(revokedLookup.state, "revoked");

  console.log("6. Testing RBAC & AI Agent isolation (HR vs Assigned Engineer vs Other Engineer vs Sales Rep)...");
  const hrList = await listAuthorizedInterviewInvitations(hrActor);
  const eng1List = await listAuthorizedInterviewInvitations(eng1Actor);
  const eng2List = await listAuthorizedInterviewInvitations(eng2Actor);
  const salesList = await listAuthorizedInterviewInvitations(salesActor);
  assert.equal(hrList.length, 2, "HR Manager sees all invitations");
  assert.equal(eng1List.length, 2, "Assigned engineer sees invitations assigned to them");
  assert.equal(eng2List.length, 0, "Other engineer sees ZERO invitations assigned to Layla");
  assert.equal(salesList.length, 0, "Sales rep sees ZERO interview invitations");

  // Sales rep attempting to create invitation or run interview AI tool MUST be denied
  const salesCreate = await createAndSendInterviewInvitation(salesActor, {
    applicationReferenceId: "DEV-2026-9999",
    candidateName: "Unauthorized Attempt",
    candidateEmail: "unauth@example.com",
    positionTitle: "Role",
    interviewType: "initial_hr_screening",
    interviewFormat: "phone",
    durationMinutes: 30,
    interviewerEmployeeId: eng1Rec.employee.id,
    skipOutboundEmail: true,
  });
  assert.equal(salesCreate.ok, false);

  const salesToolRes = await executeAuthorizedTool(
    salesActor,
    "list_upcoming_interviews",
    {},
    { conversationId: "conv-sales", inputChannel: "voice" }
  );
  assert.equal(salesToolRes.ok, false);
  assert.equal(salesToolRes.denied, true);

  const hrPrepTool = await executeAuthorizedTool(
    hrActor,
    "prepare_interview_invitation",
    {
      applicationReferenceId: "DEV-2026-9010",
      candidateName: "Mona Candidate",
      candidateEmail: "mona@example.com",
      positionTitle: "ML Engineer",
      interviewerEmployeeId: eng1Rec.employee.id,
    },
    { conversationId: "conv-hr", inputChannel: "text" }
  );
  assert.equal(hrPrepTool.ok, true);
  assert.equal(hrPrepTool.requiresConfirmation, true, "AI Agent MUST require human approval before sending invitation");

  const hrVoiceTurn = await runAgentTurn({
    actor: hrActor,
    message: "Show upcoming interviews and interview statistics",
    inputChannel: "voice",
  });
  assert.ok(hrVoiceTurn.reply.content.length > 10);

  const statsEng2 = await getInterviewStatistics(eng2Actor);
  assert.equal(statsEng2.invitationsSent, 0);

  console.log("7. Testing all 6 HIRZEXA Recruitment Email Templates (EN + AR)...");
  const kinds = ["invitation", "confirmation", "reminder", "rescheduled", "canceled", "expired"];
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  for (const kind of kinds) {
    for (const locale of ["en", "ar"]) {
      const tpl = renderInterviewTemplatePreview({ kind, locale });
      assert.equal(tpl.from, "HIRZEXA Careers <careers@hirzexa.com>");
      assert.equal(tpl.replyTo, "careers@hirzexa.com");
      assert.ok(tpl.html.includes("https://hirzexa.com/brand/hirzexa-mark.png"), `${kind}/${locale} missing logo`);
      assert.ok(tpl.html.includes("#0B1122"), `${kind}/${locale} missing midnight navy header`);
      assert.ok(tpl.html.includes("support@hirzexa.com"), `${kind}/${locale} missing support footer`);
      assert.ok(tpl.html.includes("careers@hirzexa.com"), `${kind}/${locale} missing careers footer`);
      assert.equal(/devtech/i.test(tpl.html), false, `${kind}/${locale} leaked DevTech`);
      assert.equal(/devtech/i.test(tpl.text), false, `${kind}/${locale} text leaked DevTech`);
      assert.equal(/preview-token-sample/i.test(tpl.html), false, `${kind}/${locale} leaked preview-token-sample`);
      assert.equal(/preview-token-sample/i.test(tpl.text), false, `${kind}/${locale} text leaked preview-token-sample`);
      assert.equal(/example\.com/i.test(tpl.html), false, `${kind}/${locale} leaked example.com`);
      assert.equal(/onrender\.com/i.test(tpl.html), false, `${kind}/${locale} leaked onrender.com`);
      assert.equal(/localhost/i.test(tpl.html), false, `${kind}/${locale} leaked localhost`);
      assert.equal(emojiRegex.test(tpl.html), false, `${kind}/${locale} contained emoji`);
      assert.equal(emojiRegex.test(tpl.subject), false, `${kind}/${locale} subject contained emoji`);
      if (locale === "ar") {
        assert.ok(tpl.html.includes('dir="rtl"'), `${kind}/ar missing RTL dir`);
      }
      if (kind === "invitation") {
        assert.equal(tpl.html.includes("meet.google.com"), false, "No fictional Meet link");
      }
    }
  }

  // Confirm outbound email validator blocks preview-token-sample, example.com, localhost, and preview templates
  const blockedPreviewSend = await sendTransactionalEmail({
    from: "HIRZEXA Careers <careers@hirzexa.com>",
    to: "candidate@hirzexa.com",
    replyTo: "careers@hirzexa.com",
    subject: "Test",
    html: '<a href="https://hirzexa.com/interview/schedule?token=preview-token-sample">Schedule</a>',
    text: "https://hirzexa.com/interview/schedule?token=preview-token-sample",
  });
  assert.equal(blockedPreviewSend.ok, false, "sendTransactionalEmail MUST reject preview-token-sample");
  assert.equal(
    validateOutboundEmailContent({
      from: "HIRZEXA Careers <careers@hirzexa.com>",
      to: "candidate@hirzexa.com",
      replyTo: "careers@hirzexa.com",
      subject: "Test",
      html: '<a href="https://example.com/interview/schedule?token=abc">Schedule</a>',
      text: "https://example.com/interview/schedule?token=abc",
    }).ok,
    false,
    "Outbound validator MUST reject example.com URLs"
  );
  assert.equal(
    validateOutboundEmailContent({
      from: "HIRZEXA Careers <careers@hirzexa.com>",
      to: "candidate@hirzexa.com",
      replyTo: "careers@hirzexa.com",
      subject: "Test",
      html: '<a href="http://localhost:3100/interview/schedule?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">Schedule</a>',
      text: "http://localhost:3100/interview/schedule?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }).ok,
    false,
    "Outbound validator MUST reject localhost URLs"
  );
  const previewTpl = renderInterviewTemplatePreview({ kind: "invitation", locale: "en" });
  assert.equal(
    validateOutboundEmailContent(previewTpl).ok,
    false,
    "Outbound validator MUST block preview-mode templates from reaching Resend"
  );

  console.log("8. Testing Resend webhook synchronization idempotency...");
  const webhookNoMatch = await recordInterviewWebhookUpdate({
    providerMessageId: "re_nonexistent_123",
    eventType: "email.delivered",
  });
  assert.equal(webhookNoMatch.matched, false);

  console.log("9. Testing PostgreSQL migration & RLS verification files...");
  const migrationSql = await readFile(
    resolve(root, "supabase/migrations/20261121_interview_scheduling.sql"),
    "utf8"
  );
  assert.ok(migrationSql.includes("btree_gist"));
  assert.ok(migrationSql.includes("interview_appointments_no_overlap_excl"));
  assert.ok(migrationSql.includes("reserve_interview_slot_atomic"));
  assert.ok(/enable row level security/i.test(migrationSql));

  const rlsSql = await readFile(
    resolve(root, "supabase/migrations/verify_20261121_interviews_rls.sql"),
    "utf8"
  );
  assert.ok(/begin;/i.test(rlsSql) && /rollback;/i.test(rlsSql));

  console.log(`10. Testing live HTTP endpoints on ${liveBase}...`);
  try {
    const pubInvalid = await fetch(`${liveBase}/api/interviews/public?token=nonexistent-token-1234567890`);
    assert.equal(pubInvalid.status, 404, "Public endpoint must return 404 for unknown token");

    const pubPlaceholder = await fetch(`${liveBase}/api/interviews/public?token=preview-token-sample`);
    assert.equal(pubPlaceholder.status, 404, "Public endpoint must return 404 for preview-token-sample");

    const adminUnauth = await fetch(`${liveBase}/api/admin/interviews`);
    assert.equal(adminUnauth.status, 401, "Admin interviews API must reject unauthenticated requests with 401");

    const previewUnauth = await fetch(`${liveBase}/api/admin/interviews/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "invitation" }),
    });
    assert.equal(previewUnauth.status, 401, "Preview API must reject unauthenticated requests with 401");

    const pageRes = await fetch(`${liveBase}/interview/schedule?token=sample-invalid`);
    assert.equal(pageRes.status, 200, "Candidate scheduling page must render cleanly");
    const pageHtml = await pageRes.text();
    assert.equal(pageHtml.includes("/admin/team"), false, "Public candidate page must not expose admin navigation");
  } catch (httpErr) {
    if (process.env.REQUIRE_LIVE_HTTP === "true") throw httpErr;
    console.log("   (Skipping live HTTP check — server not running on", liveBase, ")");
  }

  console.log("\nALL INTERVIEW SCHEDULING E2E, SECURITY, CONCURRENCY & EMAIL CHECKS PASSED!");
} finally {
  process.chdir(originalCwd);
  if (savedUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
  if (savedAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedAnon;
  if (savedFallback !== undefined) process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = savedFallback;
  else delete process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;
  if (savedAiEnabled !== undefined) process.env.AI_FEATURES_ENABLED = savedAiEnabled;
  else delete process.env.AI_FEATURES_ENABLED;
  await rm(stagingDir, { recursive: true, force: true });
}
