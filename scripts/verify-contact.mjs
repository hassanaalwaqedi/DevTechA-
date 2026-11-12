import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { join } from "node:path";
import {
  COMPANY_EMAILS,
  CONTACT_DIRECTORY,
  FOOTER_EMAIL_CHANNELS,
  SYSTEM_NOTIFICATION_EMAIL,
  companyMailto,
} from "../lib/company-emails.ts";

const root = process.cwd();
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

const expected = {
  general: "contact@hirzexa.com",
  business: "business@hirzexa.com",
  support: "support@hirzexa.com",
  investors: "investors@hirzexa.com",
  partnerships: "partnerships@hirzexa.com",
  finance: "finance@hirzexa.com",
  careers: "careers@hirzexa.com",
  orders: "orders@hirzexa.com",
  privacy: "privacy@hirzexa.com",
  legal: "legal@hirzexa.com",
};

assert.deepEqual(COMPANY_EMAILS, expected);
assert.equal(SYSTEM_NOTIFICATION_EMAIL, "noreply@hirzexa.com");
assert.equal(Object.isFrozen(COMPANY_EMAILS), true);
assert.equal(CONTACT_DIRECTORY.length, 10);
assert.deepEqual(
  FOOTER_EMAIL_CHANNELS.map((c) => c.channel),
  ["general", "business", "support", "careers"]
);
assert.equal(
  companyMailto("careers", "Careers & hiring"),
  "mailto:careers@hirzexa.com?subject=Careers%20%26%20hiring"
);
assert.equal(
  companyMailto("general", "Hello\r\nWorld"),
  "mailto:contact@hirzexa.com?subject=Hello%20%20World"
);

const deliveries = [];
let webhookStatus = 202;
const webhook = createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  deliveries.push({
    headers: request.headers,
    body: JSON.parse(raw),
  });
  response.writeHead(webhookStatus);
  response.end();
});
webhook.listen(0, "127.0.0.1");
await once(webhook, "listening");
const webhookPort = webhook.address().port;

async function freePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function startApp(webhookUrl) {
  const port = await freePort();
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      CONTACT_WEBHOOK_URL: webhookUrl,
      CONTACT_WEBHOOK_SECRET: "test-secret",
      VERIFIED_EMAIL_SENDER_ENABLED: "false",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js exited before readiness: ${logs.slice(-2000)}`);
    }
    try {
      const response = await fetch(`${base}/api/contact`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.status === 405) return { child, base };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill();
  throw new Error(`Next.js did not become ready: ${logs.slice(-2000)}`);
}

async function submit(base, payload, ip, options = {}) {
  return fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(payload),
    ...options,
  });
}

const valid = {
  name: "Test Sender",
  email: "sender@example.com",
  company: "Example Vision",
  category: "Computer Vision Systems",
  budget: "",
  overview: "We need a camera inference prototype for a logistics facility.",
  locale: "en",
};

const categoryRoutes = [
  ["General Inquiries", COMPANY_EMAILS.general, "general"],
  ["Product Demos & Business", COMPANY_EMAILS.business, "business"],
  ["AEGIS AI Commercial", COMPANY_EMAILS.business, "business"],
  ["AEGIS AI Technical Support", COMPANY_EMAILS.support, "support"],
  ["Computer Vision Systems", COMPANY_EMAILS.support, "support"],
  ["Partnerships & Collaborations", COMPANY_EMAILS.partnerships, "partnerships"],
  ["Orders & Purchasing", COMPANY_EMAILS.orders, "orders"],
  ["Investors & Fundraising", COMPANY_EMAILS.investors, "investors"],
  ["Finance & Billing", COMPANY_EMAILS.finance, "finance"],
  ["Careers & Recruitment", COMPANY_EMAILS.careers, "careers"],
  ["Privacy & Data Protection", COMPANY_EMAILS.privacy, "privacy"],
  ["Legal Matters", COMPANY_EMAILS.legal, "legal"],
];

let app;
let missingApp;
try {
  app = await startApp(`http://127.0.0.1:${webhookPort}`);

  // Client-forged recipient must be ignored; server routing always wins
  let response = await submit(
    app.base,
    { ...valid, recipient: "attacker@example.com" },
    "test-forged"
  );
  assert.equal(response.status, 200);
  const forgedJson = await response.json();
  assert.equal(forgedJson.ok, true);
  assert.equal(forgedJson.routedTo, COMPANY_EMAILS.support);
  assert.match(forgedJson.reference, /^HRZ-\d{4}-\d{5}$/);

  const latest = deliveries.at(-1);
  assert.equal(latest.headers["x-hirzexa-webhook-secret"], "test-secret");
  assert.equal(latest.body.recipient, COMPANY_EMAILS.support);
  assert.equal(latest.body.automatedSender, "noreply@hirzexa.com");
  assert.equal(latest.body.autoAckAuthorized, false);
  assert.equal(latest.body.acknowledgment.from, "HIRZEXA Notifications <noreply@hirzexa.com>");
  assert.equal(latest.body.acknowledgment.replyTo, COMPANY_EMAILS.support);
  assert.equal(latest.body.acknowledgment.to, "sender@example.com");

  // Verify every department routing category + Arabic acknowledgment template
  for (const [index, [cat, expectedEmail, expectedDept]] of categoryRoutes.entries()) {
    const isAr = index % 2 === 1;
    response = await submit(
      app.base,
      { ...valid, category: cat, locale: isAr ? "ar" : "en" },
      `test-route-${index}`
    );
    assert.equal(response.status, 200, `Failed for category ${cat}`);
    const delivered = deliveries.at(-1).body;
    assert.equal(delivered.recipient, expectedEmail);
    assert.equal(delivered.department, expectedDept);
    assert.equal(delivered.acknowledgment.replyTo, expectedEmail);
    assert.ok(
      delivered.acknowledgment.html.includes(expectedEmail),
      `Acknowledgment missing reply channel for ${cat}`
    );
    if (isAr) {
      assert.ok(delivered.acknowledgment.html.includes('dir="rtl"'));
    }
  }

  // Validation, honeypot, and URL-flood anti-spam guards
  const acceptedCount = deliveries.length;
  response = await submit(app.base, { ...valid, category: "Unrecognized" }, "test-invalid");
  assert.equal(response.status, 400);
  assert.equal(deliveries.length, acceptedCount);

  response = await submit(app.base, { ...valid, website: "spam.example" }, "test-honeypot");
  assert.equal(response.status, 400);
  assert.equal(deliveries.length, acceptedCount);

  response = await submit(
    app.base,
    {
      ...valid,
      overview:
        "Spam links https://a.example https://b.example https://c.example https://d.example https://e.example",
    },
    "test-url-spam"
  );
  assert.equal(response.status, 400);
  assert.equal(deliveries.length, acceptedCount);

  // Webhook delivery failure returns 502 with department fallbackEmail
  webhookStatus = 500;
  response = await submit(
    app.base,
    { ...valid, category: "Product Demos & Business" },
    "test-failure"
  );
  assert.equal(response.status, 502);
  assert.equal((await response.json()).fallbackEmail, COMPANY_EMAILS.business);
  webhookStatus = 202;

  // Rate limiting returns 429 on 6th request within hour
  for (let index = 0; index < 5; index++) {
    response = await submit(app.base, valid, "test-limit");
    assert.equal(response.status, 200);
  }
  response = await submit(app.base, valid, "test-limit");
  assert.equal(response.status, 429);

  // Missing webhook returns 503 with department fallbackEmail
  missingApp = await startApp("");
  response = await submit(
    missingApp.base,
    { ...valid, category: "Privacy & Data Protection" },
    "test-missing"
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).fallbackEmail, COMPANY_EMAILS.privacy);

  console.log(
    "Verified: 10 departmental emails + noreply sender gate, footer channels, bilingual templates, server routing, anti-spam, rate limiting, webhook handling, and fallbacks."
  );
} finally {
  app?.child.kill();
  missingApp?.child.kill();
  await new Promise((resolve) => webhook.close(resolve));
}
