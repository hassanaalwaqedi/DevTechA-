import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { join } from "node:path";
import { COMPANY_EMAILS, CONTACT_DIRECTORY, companyMailto } from "../lib/company-emails.ts";

const root = process.cwd();
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const expected = {
  general: "contact@hirzexa.com", support: "support@hirzexa.com",
  investors: "investors@hirzexa.com", partnerships: "partnerships@hirzexa.com",
  finance: "finance@hirzexa.com", careers: "careers@hirzexa.com",
  orders: "orders@hirzexa.com", privacy: "privacy@hirzexa.com", legal: "legal@hirzexa.com",
};
assert.deepEqual(COMPANY_EMAILS, expected);
assert.equal(Object.isFrozen(COMPANY_EMAILS), true);
assert.equal(CONTACT_DIRECTORY.length, 8);
assert.equal(companyMailto("careers", "Careers & hiring"), "mailto:careers@hirzexa.com?subject=Careers%20%26%20hiring");
assert.equal(companyMailto("general", "Hello\r\nWorld"), "mailto:contact@hirzexa.com?subject=Hello%20%20World");

const deliveries = [];
let webhookStatus = 202;
const webhook = createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  deliveries.push(JSON.parse(raw));
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
    env: { ...process.env, CONTACT_WEBHOOK_URL: webhookUrl, NEXT_TELEMETRY_DISABLED: "1" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  child.stderr.on("data", (chunk) => { logs += chunk.toString(); });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error(`Next.js exited before readiness: ${logs.slice(-2000)}`);
    try {
      const response = await fetch(`${base}/api/contact`, { signal: AbortSignal.timeout(500) });
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
  name: "Test Sender", email: "sender@example.com", company: "Example",
  category: "Computer Vision Systems", budget: "", overview: "We need a camera inference prototype for a warehouse.",
};

let app;
let missingApp;
try {
  app = await startApp(`http://127.0.0.1:${webhookPort}`);
  let response = await submit(app.base, { ...valid, recipient: "attacker@example.com" }, "test-support");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(deliveries.at(-1).recipient, COMPANY_EMAILS.support);
  assert.equal(deliveries.at(-1).department, "support");

  response = await submit(app.base, { ...valid, category: "Technology Partnership" }, "test-partnership");
  assert.equal(response.status, 200);
  assert.equal(deliveries.at(-1).recipient, COMPANY_EMAILS.partnerships);

  response = await submit(app.base, { ...valid, category: "Intelligent Devices & Cameras" }, "test-devices");
  assert.equal(response.status, 200);
  assert.equal(deliveries.at(-1).recipient, COMPANY_EMAILS.orders);

  const acceptedCount = deliveries.length;
  response = await submit(app.base, { ...valid, category: "Unrecognized" }, "test-invalid");
  assert.equal(response.status, 400);
  assert.equal(deliveries.length, acceptedCount);

  response = await submit(app.base, { ...valid, website: "spam.example" }, "test-honeypot");
  assert.equal(response.status, 400);
  assert.equal(deliveries.length, acceptedCount);

  webhookStatus = 500;
  response = await submit(app.base, valid, "test-failure");
  assert.equal(response.status, 502);
  assert.equal((await response.json()).fallbackEmail, COMPANY_EMAILS.general);
  webhookStatus = 202;

  for (let index = 0; index < 5; index++) {
    response = await submit(app.base, valid, "test-limit");
    assert.equal(response.status, 200);
  }
  response = await submit(app.base, valid, "test-limit");
  assert.equal(response.status, 429);

  missingApp = await startApp("");
  response = await submit(missingApp.base, valid, "test-missing");
  assert.equal(response.status, 503);
  assert.equal((await response.json()).fallbackEmail, COMPANY_EMAILS.general);
  console.log("Email configuration, routing, validation, anti-spam, rate limiting, webhook success/failure, and fallback: passed");
} finally {
  app?.child.kill();
  missingApp?.child.kill();
  await new Promise((resolve) => webhook.close(resolve));
}
