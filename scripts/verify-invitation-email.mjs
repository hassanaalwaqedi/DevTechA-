import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
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

const BASE_URL = process.argv[2] || "http://127.0.0.1:3100";

async function main() {
  console.log("1) Verifying public HTTPS APP_BASE_URL validation (blocking localhost/HTTP)...");
  const tx = await import("../lib/email/transactional.ts");

  const prevAppBase = process.env.APP_BASE_URL;
  const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.APP_BASE_URL = "http://localhost:3100";
    assert.equal(tx.resolvePublicInvitationBaseUrl().ok, false, "Must block http://localhost");

    process.env.APP_BASE_URL = "https://localhost:3100";
    assert.equal(tx.resolvePublicInvitationBaseUrl().ok, false, "Must block https://localhost");

    process.env.APP_BASE_URL = "http://127.0.0.1:3100";
    assert.equal(tx.resolvePublicInvitationBaseUrl().ok, false, "Must block 127.0.0.1");

    process.env.APP_BASE_URL = "http://hirzexa.com";
    assert.equal(tx.resolvePublicInvitationBaseUrl().ok, false, "Must block non-HTTPS");

    process.env.APP_BASE_URL = "https://hirzexa.com/";
    const okRes = tx.resolvePublicInvitationBaseUrl();
    assert.equal(okRes.ok, true);
    assert.equal(okRes.baseUrl, "https://hirzexa.com");
  } finally {
    if (prevAppBase === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = prevAppBase;
    if (prevSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
  }
  console.log("   PASS: APP_BASE_URL strictly enforces public HTTPS and rejects localhost/HTTP.");

  console.log("2) Verifying branded employee invitation HTML + plain-text template...");
  const { buildEmployeeInvitationEmail } = await import("../lib/email-templates.ts");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const tpl = buildEmployeeInvitationEmail({
    employeeName: "Sara <Script> Al-Mansoor",
    employeeEmail: "sara@hirzexa.com",
    roleLabel: "Sales Manager",
    department: "Sales",
    invitedByName: "Hassan",
    activationUrl: "https://hirzexa.com/admin/activate?token=TEST_TOKEN_SAMPLE",
    expiresAt,
    publicBaseUrl: "https://hirzexa.com",
  });
  assert.equal(tpl.subject, "You're invited to join HIRZEXA Intelligence");
  assert.equal(tpl.from, "HIRZEXA Accounts <accounts@hirzexa.com>");
  assert.equal(tpl.replyTo, "hassan@hirzexa.com");
  assert.ok(tpl.html.includes("Activate Your Account"), "HTML must contain CTA button");
  assert.ok(tpl.html.includes("hirzexa-mark.png"), "HTML must contain HIRZEXA logo");
  assert.ok(tpl.html.includes("&lt;Script&gt;"), "HTML must escape user input");
  assert.ok(tpl.text.includes("https://hirzexa.com/admin/activate?token=TEST_TOKEN_SAMPLE"));
  assert.ok(tpl.text.includes("never emails plaintext passwords"));
  console.log("   PASS: Branded HTML & plain-text invitation template verified.");

  console.log("3) Verifying Resend/Svix HMAC-SHA256 webhook signature verification...");
  const secretRaw = Buffer.from("super-secret-webhook-signing-key-32b").toString("base64");
  const whsec = `whsec_${secretRaw}`;
  const svixId = "msg_test_01";
  const nowSec = String(Math.floor(Date.now() / 1000));
  const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "re_12345" } });
  const sig = createHmac("sha256", Buffer.from(secretRaw, "base64"))
    .update(`${svixId}.${nowSec}.${payload}`, "utf8")
    .digest("base64");

  assert.equal(
    tx.verifyResendWebhookSignature({
      rawBody: payload,
      svixId,
      svixTimestamp: nowSec,
      svixSignature: `v1,${sig}`,
      secret: whsec,
    }),
    true,
    "Valid Svix signature must pass"
  );
  assert.equal(
    tx.verifyResendWebhookSignature({
      rawBody: `${payload} `,
      svixId,
      svixTimestamp: nowSec,
      svixSignature: `v1,${sig}`,
      secret: whsec,
    }),
    false,
    "Tampered body must fail"
  );
  assert.equal(
    tx.verifyResendWebhookSignature({
      rawBody: payload,
      svixId,
      svixTimestamp: String(Number(nowSec) - 600),
      svixSignature: `v1,${sig}`,
      secret: whsec,
    }),
    false,
    "Stale timestamp (>5m) must fail"
  );
  console.log("   PASS: Cryptographic webhook verification & replay window enforced.");

  console.log("4) Verifying graceful failure when RESEND_API_KEY is unset...");
  const prevKey = process.env.RESEND_API_KEY;
  try {
    delete process.env.RESEND_API_KEY;
    const failed = await tx.sendTransactionalEmail(tpl);
    assert.equal(failed.ok, false);
    assert.equal(failed.status, "delivery_failed");
    assert.equal(failed.notConfigured, true);
  } finally {
    if (prevKey !== undefined) process.env.RESEND_API_KEY = prevKey;
  }
  console.log("   PASS: Unconfigured provider reports truthful delivery_failed status.");

  console.log(`5) Verifying live HTTP security & admin layout isolation on ${BASE_URL}...`);
  const resendUnauth = await fetch(`${BASE_URL}/api/admin/team/00000000-0000-0000-0000-000000000000/resend`, {
    method: "POST",
  });
  assert.equal(resendUnauth.status, 401, "Resend endpoint must enforce 401 unauthenticated");

  const webhookUnsigned = await fetch(`${BASE_URL}/api/webhooks/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  assert.ok(
    webhookUnsigned.status === 401 || webhookUnsigned.status === 503,
    `Unsigned webhook must return 401 or 503, got ${webhookUnsigned.status}`
  );

  // Layout isolation: /admin/login and /admin/activate must NOT contain public site-header or site-footer
  const adminLoginHtml = await (await fetch(`${BASE_URL}/admin/login`)).text();
  assert.equal(adminLoginHtml.includes("site-header"), false, "/admin/login must not render public SiteHeader");
  assert.equal(adminLoginHtml.includes("site-footer"), false, "/admin/login must not render public SiteFooter");
  assert.ok(adminLoginHtml.includes("hz-os-root"), "/admin/login must render isolated admin root");

  const publicHomeHtml = await (await fetch(`${BASE_URL}/`)).text();
  assert.ok(publicHomeHtml.includes("site-footer"), "Public homepage must preserve SiteFooter");
  console.log("   PASS: Admin layout isolation & resend/webhook endpoint security verified.");

  console.log("\nALL INVITATION EMAIL INFRASTRUCTURE & LAYOUT ISOLATION CHECKS PASSED.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
