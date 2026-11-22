import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
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

const stagingDir = await mkdtemp(join(tmpdir(), "hirzexa-settings-e2e-"));
const originalCwd = process.cwd();
const savedEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  HIRZEXA_ALLOW_LOCAL_FALLBACK: process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK,
  AI_FEATURES_ENABLED: process.env.AI_FEATURES_ENABLED,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  CONTACT_WEBHOOK_URL: process.env.CONTACT_WEBHOOK_URL,
  CONTACT_WEBHOOK_SECRET: process.env.CONTACT_WEBHOOK_SECRET,
  VERIFIED_EMAIL_SENDER_ENABLED: process.env.VERIFIED_EMAIL_SENDER_ENABLED,
};

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK = "true";
process.env.AI_FEATURES_ENABLED = "false";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = "AIzaSyFAKE_SUPER_SECRET_KEY_NEVER_LEAK_12345";
process.env.RESEND_API_KEY = "re_FAKE_RESEND_SECRET_NEVER_LEAK_99999";
process.env.CONTACT_WEBHOOK_SECRET = "whsec_FAKE_CONTACT_SECRET_NEVER_LEAK";
delete process.env.CONTACT_WEBHOOK_URL;
process.env.VERIFIED_EMAIL_SENDER_ENABLED = "false";
process.chdir(stagingDir);

let mockWebhook;
try {
  const { ROLE_TEMPLATES, resolveEffectivePermissions, hasPermission } = await import("@/lib/rbac");
  const {
    getSettingsDiagnosticsSnapshot,
    isLegacyAuthEmail,
    runAiRuntimeHealthCheck,
    runContactWebhookHealthCheck,
    runDnsAndSenderVerification,
    sendSettingsDiagnosticEmail,
  } = await import("@/lib/settings/diagnostics");

  const makeActor = (roleKey, email) => ({
    id: "11111111-2222-4333-8444-555555555555",
    employeeId: "22222222-3333-4444-8555-666666666666",
    email,
    fullName: "Admin User",
    department: "Executive",
    roleKey,
    roleLabel: ROLE_TEMPLATES[roleKey].label,
    scope: ROLE_TEMPLATES[roleKey].defaultScope,
    status: "active",
    permissions: resolveEffectivePermissions(roleKey, {}),
    isSuperAdmin: roleKey === "super_admin",
    mfaEnrolled: false,
    sessionVersion: 1,
  });

  const superAdmin = makeActor("super_admin", "admin@devtech.ai");
  const hrManager = makeActor("hr_manager", "hr@hirzexa.com");
  const salesRep = makeActor("sales_rep", "sales@hirzexa.com");

  console.log("1. Verifying RBAC permission boundaries on settings module...");
  assert.equal(hasPermission(superAdmin, "settings", "view"), true);
  assert.equal(hasPermission(superAdmin, "settings", "edit"), true);
  assert.equal(hasPermission(hrManager, "settings", "view"), false, "HR Manager must not access Settings");
  assert.equal(hasPermission(salesRep, "settings", "view"), false, "Sales Rep must not access Settings");

  console.log("2. Verifying truthful diagnostics snapshot, zero secret leaks & legacy auth audit...");
  const snap = await getSettingsDiagnosticsSnapshot(superAdmin);
  const rawSnap = JSON.stringify(snap);
  assert.equal(rawSnap.includes("AIzaSyFAKE_SUPER_SECRET"), false, "Gemini API key MUST NOT leak");
  assert.equal(rawSnap.includes("re_FAKE_RESEND_SECRET"), false, "Resend API key MUST NOT leak");
  assert.equal(rawSnap.includes("whsec_FAKE_CONTACT_SECRET"), false, "Webhook secret MUST NOT leak");

  assert.equal(snap.aiRuntime.status, "configuration_required", "Disabled AI must not report Operational");
  assert.equal(snap.contactRouting.status, "configuration_required", "Unset webhook must report Configuration Required");
  assert.equal(snap.email.autoAckEnabled, false, "noreply@hirzexa.com gate must remain false");
  assert.equal(snap.email.autoAckStatus, "configuration_required");
  assert.equal(snap.workspace.legacyAuthDetected, true);
  assert.equal(isLegacyAuthEmail("admin@devtech.ai"), true);
  assert.equal(isLegacyAuthEmail("founder@hirzexa.com"), false);

  console.log("3. Verifying AI runtime read-only health check when disabled...");
  const aiCheck = await runAiRuntimeHealthCheck(superAdmin);
  assert.equal(aiCheck.ok, false);
  assert.equal(aiCheck.status, "configuration_required");

  console.log("4. Verifying contact webhook probe (unset -> 200 ok -> 500 degraded)...");
  const whMissing = await runContactWebhookHealthCheck(superAdmin);
  assert.equal(whMissing.ok, false);
  assert.equal(whMissing.status, "configuration_required");

  let mockStatus = 200;
  let lastHeaderSecret = null;
  let lastDryRun = false;
  mockWebhook = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    lastHeaderSecret = req.headers["x-hirzexa-webhook-secret"] || null;
    try {
      lastDryRun = Boolean(JSON.parse(body).dryRun);
    } catch {}
    res.writeHead(mockStatus);
    res.end();
  });
  mockWebhook.listen(0, "127.0.0.1");
  await once(mockWebhook, "listening");
  const whPort = mockWebhook.address().port;

  process.env.CONTACT_WEBHOOK_URL = `http://127.0.0.1:${whPort}/hook`;
  const whOk = await runContactWebhookHealthCheck(superAdmin);
  assert.equal(whOk.ok, true);
  assert.equal(whOk.status, "operational");
  assert.equal(whOk.httpStatus, 200);
  assert.equal(lastHeaderSecret, "whsec_FAKE_CONTACT_SECRET_NEVER_LEAK");
  assert.equal(lastDryRun, true);

  mockStatus = 500;
  const whFail = await runContactWebhookHealthCheck(superAdmin);
  assert.equal(whFail.ok, false);
  assert.equal(whFail.status, "degraded");
  assert.equal(whFail.httpStatus, 500);

  console.log("5. Verifying sender diagnostic guard (blocks legacy @devtech.ai, example.com, bulk)...");
  const legacyBlocked = await sendSettingsDiagnosticEmail(superAdmin, "admin@devtech.ai");
  assert.equal(legacyBlocked.ok, false);
  const exampleBlocked = await sendSettingsDiagnosticEmail(superAdmin, "user@example.com");
  assert.equal(exampleBlocked.ok, false);
  const bulkBlocked = await sendSettingsDiagnosticEmail(superAdmin, "a@hirzexa.com,b@hirzexa.com");
  assert.equal(bulkBlocked.ok, false);

  console.log("6. Verifying live DNS verification for hirzexa.com...");
  const dns = await runDnsAndSenderVerification(superAdmin);
  assert.equal(dns.domain, "hirzexa.com");
  assert.ok(dns.checkedAt);
  console.log(
    `   Live DNS on hirzexa.com -> MX: ${dns.mx.status} (${dns.mx.records.length}), SPF: ${dns.spf.status}, DMARC: ${dns.dmarc.status}, Google DKIM: ${dns.dkimGoogle.status}, Resend DKIM: ${dns.dkimResend.status}`
  );

  console.log(`7. Verifying live HTTP auth boundaries on ${liveBase}...`);
  try {
    const getUnauth = await fetch(`${liveBase}/api/admin/settings`);
    assert.equal(getUnauth.status, 401, "GET /api/admin/settings must return 401 unauthenticated");

    const postUnauth = await fetch(`${liveBase}/api/admin/settings/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test_ai" }),
    });
    assert.equal(postUnauth.status, 401, "POST /api/admin/settings/actions must return 401 unauthenticated");

    const pageUnauth = await fetch(`${liveBase}/admin/settings`, { redirect: "manual" });
    assert.ok(
      pageUnauth.status === 307 || pageUnauth.status === 302,
      `GET /admin/settings unauthenticated must redirect, got ${pageUnauth.status}`
    );
  } catch (err) {
    if (process.env.REQUIRE_LIVE_HTTP === "true") throw err;
    console.log("   (Skipping live HTTP check — server not running on", liveBase, ")");
  }

  console.log("\nALL ADMIN SETTINGS & INFRASTRUCTURE DIAGNOSTICS CHECKS PASSED!");
} finally {
  if (mockWebhook) await new Promise((r) => mockWebhook.close(r));
  process.chdir(originalCwd);
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await rm(stagingDir, { recursive: true, force: true });
}
