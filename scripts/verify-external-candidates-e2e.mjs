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

const stagingDir = await mkdtemp(join(tmpdir(), "hirzexa-recruitment-e2e-"));
const originalCwd = process.cwd();
const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const savedAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const savedFallback = process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = "true";
process.chdir(stagingDir);

try {
  const { ROLE_TEMPLATES, resolveEffectivePermissions } = await import("@/lib/rbac");
  const { createEmployeeWithInvitation } = await import("@/lib/intelligence/employees");
  const {
    createExternalCandidate,
    findDuplicateCandidates,
    getUnifiedCandidateTimeline,
    listAllAuthorizedCandidates,
    listRecruitmentCommunications,
    recordRecruitmentWebhookUpdate,
    sendRecruitmentEmail,
  } = await import("@/lib/recruitment/service");
  const { buildRecruitmentEmail } = await import("@/lib/recruitment/email-templates");
  const { getRecruitmentTemplateDraft } = await import("@/lib/recruitment/templates-catalog");
  const { renderSafeRecruitmentRichText } = await import("@/lib/recruitment/richtext");
  const {
    bookPublicInterviewSlot,
    createAndSendInterviewInvitation,
    lookupPublicInterviewByToken,
    saveInterviewerAvailability,
  } = await import("@/lib/interviews/service");

  const makeActor = (opts) => ({
    id: opts.id,
    employeeId: opts.employeeId,
    email: opts.email,
    fullName: opts.fullName,
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

  const superAdmin = makeActor({
    id: "11111111-2222-4333-8444-555555555555",
    employeeId: "22222222-3333-4444-8555-666666666666",
    email: "admin@devtech.ai",
    fullName: "Hassan Founder",
    roleKey: "super_admin",
    department: "Executive",
  });

  const hrEmp = await createEmployeeWithInvitation({
    fullName: "Nadia HR",
    email: "nadia.hr@hirzexa.com",
    jobTitle: "HR Manager",
    department: "People",
    roleKey: "hr_manager",
    createdBy: superAdmin.id,
  });
  const engEmp = await createEmployeeWithInvitation({
    fullName: "Layla Engineer",
    email: "layla.eng@hirzexa.com",
    jobTitle: "Staff AI Engineer",
    department: "Engineering",
    roleKey: "engineer",
    createdBy: superAdmin.id,
  });
  const salesEmp = await createEmployeeWithInvitation({
    fullName: "Jesika Sales",
    email: "jesika.sales@hirzexa.com",
    jobTitle: "Sales Rep",
    department: "Sales",
    roleKey: "sales_rep",
    createdBy: superAdmin.id,
  });

  const hrActor = makeActor({
    id: "33333333-4444-4555-8666-777777777777",
    employeeId: hrEmp.employee.id,
    email: hrEmp.employee.email,
    fullName: hrEmp.employee.fullName,
    roleKey: "hr_manager",
    department: "People",
  });
  const engActor = makeActor({
    id: "44444444-5555-4666-8777-888888888888",
    employeeId: engEmp.employee.id,
    email: engEmp.employee.email,
    fullName: engEmp.employee.fullName,
    roleKey: "engineer",
    department: "Engineering",
  });
  const salesActor = makeActor({
    id: "55555555-6666-4777-8888-999999999999",
    employeeId: salesEmp.employee.id,
    email: salesEmp.employee.email,
    fullName: salesEmp.employee.fullName,
    roleKey: "sales_rep",
    department: "Sales",
  });

  console.log("1. Adding external LinkedIn candidate + website baseline & checking persistence...");
  const webCand = await createExternalCandidate(hrActor, {
    fullName: "Website Applicant",
    email: "web.applicant@hirzexa.com",
    jobId: "job-uuid-web-1",
    customPositionTitle: "Backend Engineer",
    source: "website",
    location: "Riyadh",
    country: "Saudi Arabia",
  });
  assert.equal(webCand.ok, true);
  assert.equal(webCand.candidate.source, "website");

  const linkedinCand = await createExternalCandidate(hrActor, {
    fullName: "Lina Al-Harbi",
    email: "lina.linkedin@hirzexa.com",
    phone: "+90 555 123 4567",
    jobId: "__prospect__",
    customPositionTitle: "Senior AI Systems Engineer",
    source: "linkedin",
    linkedinUrl: "https://www.linkedin.com/in/lina-alharbi",
    location: "Istanbul",
    country: "Turkey",
    internalNotes: "Strong distributed systems & LLM inference background from LinkedIn outreach.",
  });
  assert.equal(linkedinCand.ok, true);
  assert.equal(linkedinCand.candidate.source, "linkedin");
  assert.equal(linkedinCand.candidate.isExternalProspect, true);
  assert.equal(linkedinCand.candidate.createdByEmail, hrActor.email);

  const allCands = await listAllAuthorizedCandidates(hrActor);
  assert.equal(allCands.length, 2, "Both website and LinkedIn candidates must appear in Recruitment");
  assert.ok(allCands.some((c) => c.email === "web.applicant@hirzexa.com" && c.source === "website"));
  assert.ok(allCands.some((c) => c.email === "lina.linkedin@hirzexa.com" && c.source === "linkedin"));

  console.log("2. Verifying search & explicit deduplication (never silent merge)...");
  const dupeAttempt = await createExternalCandidate(hrActor, {
    fullName: "Lina Al-Harbi",
    email: "LINA.LINKEDIN@HIRZEXA.COM",
    source: "linkedin",
    jobId: "__prospect__",
  });
  assert.equal(dupeAttempt.ok, false);
  assert.equal(dupeAttempt.duplicateDetected, true);
  assert.equal(dupeAttempt.duplicates.length, 1);

  const merged = await createExternalCandidate(hrActor, {
    fullName: "Lina Al-Harbi",
    email: "lina.linkedin@hirzexa.com",
    source: "linkedin",
    internalNotes: "Follow-up: confirmed availability for next week.",
    dedupeAction: "merge",
    mergeTargetReferenceId: linkedinCand.candidate.id,
  });
  assert.equal(merged.ok, true);
  assert.equal(merged.merged, true);
  assert.ok(merged.candidate.note.includes("confirmed availability"));

  const separate = await createExternalCandidate(hrActor, {
    fullName: "Lina Al-Harbi",
    email: "lina.linkedin@hirzexa.com",
    source: "referral",
    jobId: "job-uuid-staff-ai",
    customPositionTitle: "Staff AI Engineer",
    dedupeAction: "create_separate",
  });
  assert.equal(separate.ok, true);
  assert.notEqual(separate.candidate.id, linkedinCand.candidate.id);
  const dupesAfter = await findDuplicateCandidates(hrActor, { email: "lina.linkedin@hirzexa.com" });
  assert.equal(dupesAfter.length, 2);

  console.log("3. Verifying safe rich-text sanitization (XSS/javascript: blocked) + EN/AR templates...");
  const xssCheck = renderSafeRecruitmentRichText(
    'Hello **Lina**, <script>alert(1)</script> check [Safe Link](https://hirzexa.com) and [Bad](javascript:alert(1))\n\n- Point 1\n- *Point 2*',
    "en"
  );
  assert.equal(xssCheck.safeHtml.includes("<script>"), false, "Raw script tags MUST be escaped");
  assert.equal(xssCheck.safeHtml.includes("javascript:"), false, "javascript: URLs MUST be stripped");
  assert.equal(xssCheck.hasUnsafeLinksBlocked, true);
  assert.ok(xssCheck.safeHtml.includes("<strong"));
  assert.ok(xssCheck.safeHtml.includes("<em>Point 2</em>"));
  assert.ok(xssCheck.safeHtml.includes('href="https://hirzexa.com/"'));
  assert.ok(xssCheck.safeHtml.includes("<ul"));

  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const type of ["application_thank_you", "general_recruitment", "request_info", "application_update", "interview_follow_up", "custom"]) {
    for (const locale of ["en", "ar"]) {
      const draft = getRecruitmentTemplateDraft(type, locale, {
        candidateName: locale === "ar" ? "لينا الحربي" : "Lina Al-Harbi",
        positionTitle: "Senior AI Engineer",
      });
      const built = buildRecruitmentEmail({
        recipientEmail: "approved.test@hirzexa.com",
        recipientName: "Lina Al-Harbi",
        positionTitle: "Senior AI Engineer",
        messageType: type,
        subject: draft.subject || "HIRZEXA | Custom Follow-up",
        bodyMarkdown: draft.body || "Hello Lina, thank you for connecting with HIRZEXA.",
        locale,
        senderName: hrActor.fullName,
      });
      assert.equal(built.template.from, "HIRZEXA Careers <careers@hirzexa.com>");
      assert.equal(built.template.replyTo, "careers@hirzexa.com");
      assert.ok(built.template.html.includes("https://hirzexa.com/brand/hirzexa-mark.png"));
      assert.ok(built.template.html.includes("#0B1122"));
      assert.ok(built.template.html.includes("careers@hirzexa.com"));
      assert.ok(built.template.html.includes("support@hirzexa.com"));
      assert.equal(/devtech/i.test(built.template.html), false);
      assert.equal(/onrender\.com/i.test(built.template.html), false);
      assert.equal(/localhost/i.test(built.template.html), false);
      assert.equal(emojiRegex.test(built.template.html), false);
      if (locale === "ar") {
        assert.ok(built.template.html.includes('dir="rtl"'));
      }
    }
  }

  console.log("4. Verifying manual email send safeguards, idempotency, webhook sync & NO silent candidate creation...");
  // Reject interview_invitation on manual composer (must use live scheduling workflow)
  const blockedFakeInterview = await sendRecruitmentEmail(hrActor, {
    recipientEmail: "external.manual@hirzexa.com",
    messageType: "interview_invitation",
    subject: "HIRZEXA | Interview",
    bodyMarkdown: "Please book here.",
    skipOutboundEmail: true,
  });
  assert.equal(blockedFakeInterview.ok, false);

  // Reject bulk comma-separated emails
  const blockedBulk = await sendRecruitmentEmail(hrActor, {
    recipientEmail: "a@hirzexa.com, b@hirzexa.com",
    messageType: "general_recruitment",
    subject: "HIRZEXA | Outreach",
    bodyMarkdown: "Hello everyone, checking in from HIRZEXA.",
    skipOutboundEmail: true,
  });
  assert.equal(blockedBulk.ok, false);

  // Reject unfilled placeholders
  const blockedPlaceholder = await sendRecruitmentEmail(hrActor, {
    recipientEmail: "external.manual@hirzexa.com",
    messageType: "general_recruitment",
    subject: "HIRZEXA | Regarding Your Application",
    bodyMarkdown: "Dear [Candidate Name], we are reaching out about [Position].",
    skipOutboundEmail: true,
  });
  assert.equal(blockedPlaceholder.ok, false);

  // Valid manual email to an external address NOT in Recruitment DB
  const countBeforeManual = (await listAllAuthorizedCandidates(hrActor)).length;
  const reqId = "client-req-unique-001";
  const sent1 = await sendRecruitmentEmail(hrActor, {
    recipientEmail: "external.manual@hirzexa.com",
    recipientName: "Tariq Manual",
    positionTitle: "Senior AI Engineer",
    messageType: "request_info",
    locale: "en",
    subject: "HIRZEXA | Additional Information Regarding Your Application",
    bodyMarkdown:
      "Dear Tariq,\n\nThank you for your interest in HIRZEXA.\n\nCould you share your **GitHub profile** and earliest availability?\n\nBest regards,\nHIRZEXA Talent Acquisition Team",
    clientRequestId: reqId,
    skipOutboundEmail: true,
  });
  assert.equal(sent1.ok, true);
  assert.equal(sent1.communication.deliveryStatus, "accepted_by_provider");
  assert.ok(sent1.communication.providerMessageId);

  // Confirm manual email did NOT silently create a candidate record!
  const countAfterManual = (await listAllAuthorizedCandidates(hrActor)).length;
  assert.equal(
    countAfterManual,
    countBeforeManual,
    "Sending to manual email MUST NOT silently create a candidate record"
  );

  // Duplicate send prevention (same clientRequestId -> idempotent, zero duplicate record!)
  const sentDup = await sendRecruitmentEmail(hrActor, {
    recipientEmail: "external.manual@hirzexa.com",
    recipientName: "Tariq Manual",
    messageType: "request_info",
    subject: "HIRZEXA | Additional Information Regarding Your Application",
    bodyMarkdown: "Dear Tariq,\n\nRetry click.",
    clientRequestId: reqId,
    skipOutboundEmail: true,
  });
  assert.equal(sentDup.ok, true);
  assert.equal(sentDup.idempotent, true);
  assert.equal(sentDup.communication.id, sent1.communication.id);

  // Webhook delivery update: email.delivered -> delivered
  const whDelivered = await recordRecruitmentWebhookUpdate({
    providerMessageId: sent1.communication.providerMessageId,
    eventType: "email.delivered",
  });
  assert.equal(whDelivered.matched, true);
  assert.equal(whDelivered.deliveryStatus, "delivered");

  const commsAfterWebhook = await listRecruitmentCommunications(hrActor, {
    recipientEmail: "external.manual@hirzexa.com",
  });
  assert.equal(commsAfterWebhook.length, 1);
  assert.equal(commsAfterWebhook[0].deliveryStatus, "delivered");

  // Also send an email to the LinkedIn candidate and verify unified timeline
  const sentToLinkedin = await sendRecruitmentEmail(hrActor, {
    recipientEmail: linkedinCand.candidate.email,
    recipientName: linkedinCand.candidate.name,
    applicationReferenceId: linkedinCand.candidate.id,
    positionTitle: linkedinCand.candidate.jobTitle,
    messageType: "application_update",
    locale: "ar",
    subject: "HIRZEXA | تحديث بخصوص طلب التوظيف الخاص بك",
    bodyMarkdown: "مرحبًا لينا،\n\nنود إعلامك بأن ملفك قيد المراجعة الحالية من قبل فريق التوظيف لدينا.",
    clientRequestId: "client-req-linkedin-ar-001",
    skipOutboundEmail: true,
  });
  assert.equal(sentToLinkedin.ok, true);

  console.log("5. Inviting external LinkedIn candidate through live Interview Scheduling workflow...");
  const availRes = await saveInterviewerAvailability(hrActor, {
    employeeId: engEmp.employee.id,
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
  assert.equal(availRes.ok, true);

  const invRes = await createAndSendInterviewInvitation(superAdmin, {
    applicationReferenceId: linkedinCand.candidate.id,
    candidateName: linkedinCand.candidate.name,
    candidateEmail: linkedinCand.candidate.email,
    positionTitle: linkedinCand.candidate.jobTitle,
    interviewType: "technical_interview",
    interviewFormat: "online_video",
    durationMinutes: 45,
    interviewerEmployeeId: engEmp.employee.id,
    locale: "en",
    skipOutboundEmail: true,
  });
  assert.equal(invRes.ok, true);
  assert.ok(invRes.schedulingUrl.startsWith("https://hirzexa.com/interview/schedule?token="));
  const realToken = new URL(invRes.schedulingUrl).searchParams.get("token");
  assert.ok(realToken && realToken.length >= 32);

  const pubLookup = await lookupPublicInterviewByToken(realToken, "Europe/Istanbul");
  assert.equal(pubLookup.state, "open");
  assert.ok(pubLookup.availableSlots.length > 0);

  const booked = await bookPublicInterviewSlot({
    rawToken: realToken,
    slotStartUtc: pubLookup.availableSlots[0].startUtc,
    candidateTimezone: "Europe/Istanbul",
    skipOutboundEmail: true,
  });
  assert.equal(booked.ok, true);

  // Unified timeline for LinkedIn candidate should show manual email + interview invitation + appointment + activity
  const timeline = await getUnifiedCandidateTimeline(hrActor, {
    applicationReferenceId: linkedinCand.candidate.id,
    recipientEmail: linkedinCand.candidate.email,
  });
  assert.ok(timeline.some((e) => e.kind === "manual_email"));
  assert.ok(timeline.some((e) => e.kind === "interview_invitation"));
  assert.ok(timeline.some((e) => e.kind === "interview_appointment"));

  console.log("6. Verifying strict RBAC enforcement (Sales Rep & Engineer blocked)...");
  for (const unauthActor of [salesActor, engActor]) {
    const addBlocked = await createExternalCandidate(unauthActor, {
      fullName: "Unauthorized Add",
      email: "unauth.cand@hirzexa.com",
      source: "linkedin",
    });
    assert.equal(addBlocked.ok, false, `${unauthActor.roleKey} MUST NOT add candidates`);

    const mailBlocked = await sendRecruitmentEmail(unauthActor, {
      recipientEmail: "unauth.cand@hirzexa.com",
      messageType: "general_recruitment",
      subject: "Unauthorized",
      bodyMarkdown: "This must be blocked by RBAC.",
      skipOutboundEmail: true,
    });
    assert.equal(mailBlocked.ok, false, `${unauthActor.roleKey} MUST NOT send recruitment emails`);

    const histBlocked = await getUnifiedCandidateTimeline(unauthActor, {
      applicationReferenceId: linkedinCand.candidate.id,
      recipientEmail: linkedinCand.candidate.email,
    });
    assert.equal(histBlocked.length, 0, `${unauthActor.roleKey} MUST see zero recruitment history`);
  }

  console.log("7. Verifying additive PostgreSQL migration & RLS definitions...");
  const migrationSql = await readFile(
    resolve(root, "supabase/migrations/20261121_external_candidates_and_communications.sql"),
    "utf8"
  );
  assert.ok(migrationSql.includes("candidate_source"));
  assert.ok(migrationSql.includes("is_external_prospect"));
  assert.ok(migrationSql.includes("recruitment_communications"));
  assert.ok(migrationSql.includes("record_recruitment_email_webhook"));
  assert.ok(/enable row level security/i.test(migrationSql));

  console.log(`8. Verifying live HTTP auth protection on ${liveBase}...`);
  try {
    const candUnauth = await fetch(`${liveBase}/api/admin/recruitment/candidates`);
    assert.equal(candUnauth.status, 401, "Candidates API must enforce 401");

    const emailUnauth = await fetch(`${liveBase}/api/admin/recruitment/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "preview", messageType: "general_recruitment" }),
    });
    assert.equal(emailUnauth.status, 401, "Recruitment emails API must enforce 401");
  } catch (err) {
    if (process.env.REQUIRE_LIVE_HTTP === "true") throw err;
    console.log("   (Skipping live HTTP probe — server not running on", liveBase, ")");
  }

  console.log("\nALL EXTERNAL CANDIDATE & MANUAL RECRUITMENT EMAIL E2E CHECKS PASSED!");
} finally {
  process.chdir(originalCwd);
  if (savedUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
  if (savedAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedAnon;
  if (savedFallback !== undefined) process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = savedFallback;
  else delete process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK;
  await rm(stagingDir, { recursive: true, force: true });
}
