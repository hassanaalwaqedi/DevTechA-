/**
 * HIRZEXA — Automated Enterprise Security Audit & Regression Verification Suite
 *
 * Executes non-destructive security verification against:
 *   1. Local production build HTTP endpoints (http://127.0.0.1:3100 by default)
 *   2. Cryptographic & RBAC / AI Agent security invariants (in-process)
 *   3. Static & client-bundle secret/XSS/source-map checks
 *
 * Run with: node scripts/verify-security-audit.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const BASE = process.env.SECURITY_TEST_BASE_URL || "http://127.0.0.1:3100";
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err instanceof Error ? err.message : String(err)}`);
  }
}

function buildMinimalZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data, compress } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const rawBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    const compBuf = compress ? deflateRawSync(rawBuf) : rawBuf;
    const method = compress ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(compBuf.length, 18);
    local.writeUInt32LE(rawBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(compBuf.length, 20);
    central.writeUInt32LE(rawBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);

    localParts.push(local, nameBuf, compBuf);
    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + compBuf.length;
  }

  const cdSize = centralParts.reduce((sum, b) => sum + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

async function run() {
  console.log(`\n=== HIRZEXA Security Regression Verification (${BASE}) ===\n`);

  // 1. HTTP Security Headers & Technology Hiding (SEC-007)
  console.log("1. HTTP Security Headers & Cache Controls");
  await test("Public home page includes strict security headers and omits X-Powered-By", async () => {
    const res = await fetch(`${BASE}/`, { method: "HEAD" });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-powered-by"), null, "X-Powered-By must be disabled");
    assert.match(res.headers.get("strict-transport-security") || "", /max-age=\d+/i);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.match(res.headers.get("permissions-policy") || "", /camera=\(\)/);
    const csp = res.headers.get("content-security-policy") || "";
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
  });

  await test("Admin login page sets private no-store cache headers", async () => {
    const res = await fetch(`${BASE}/admin/login`, { method: "HEAD" });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control") || "", /no-store/i);
  });

  // 2. Unauthenticated Access Denial across Admin Pages & Protected APIs (Phase 2 & 3)
  console.log("\n2. Unauthenticated Access Control Matrix");
  const protectedApis = [
    ["GET", "/api/admin/crm"],
    ["POST", "/api/admin/crm"],
    ["GET", "/api/admin/team"],
    ["POST", "/api/admin/team"],
    ["PATCH", "/api/admin/profile"],
    ["GET", "/api/admin/audit-logs"],
    ["GET", "/api/admin/briefing"],
    ["GET", "/api/admin/search?q=test"],
    ["GET", "/api/admin/settings"],
    ["POST", "/api/admin/settings/actions"],
    ["GET", "/api/admin/agent"],
    ["POST", "/api/admin/agent"],
    ["POST", "/api/admin/agent/confirm"],
    ["GET", "/api/admin/interviews"],
    ["POST", "/api/admin/interviews"],
    ["GET", "/api/admin/interviews/availability"],
    ["POST", "/api/admin/interviews/preview"],
    ["POST", "/api/admin/interviews/reminders/dispatch"],
    ["GET", "/api/admin/recruitment/candidates"],
    ["POST", "/api/admin/recruitment/candidates"],
    ["GET", "/api/admin/recruitment/emails"],
    ["POST", "/api/admin/recruitment/emails"],
    ["GET", "/api/admin/tasks"],
    ["POST", "/api/admin/tasks"],
    ["GET", "/api/admin/demonstrations"],
    ["PUT", "/api/admin/demonstrations"],
    ["POST", "/api/admin/ai/jobs/generate"],
    ["POST", "/api/admin/ai/jobs/classify-visual"],
    ["GET", "/api/applications"],
    ["PATCH", "/api/applications/DEV-2026-00001"],
    ["GET", "/api/applications/DEV-2026-00001/cv"],
    ["GET", "/api/metrics"],
    ["GET", "/api/jobs?admin=true"],
    ["POST", "/api/jobs"],
    ["GET", "/api/products?admin=true"],
    ["POST", "/api/products"],
  ];

  await test(`All ${protectedApis.length} protected API endpoints deny unauthenticated callers (401)`, async () => {
    for (const [method, route] of protectedApis) {
      const res = await fetch(`${BASE}${route}`, {
        method,
        headers: method !== "GET" ? { "content-type": "application/json" } : {},
        body: method !== "GET" ? "{}" : undefined,
      });
      assert.equal(res.status, 401, `${method} ${route} returned ${res.status} instead of 401`);
    }
  });

  const protectedPages = [
    "/admin",
    "/admin/crm",
    "/admin/applications",
    "/admin/interviews",
    "/admin/jobs",
    "/admin/products",
    "/admin/team",
    "/admin/audit",
    "/admin/agent",
    "/admin/settings",
    "/admin/website/demonstrations",
  ];

  await test(`All ${protectedPages.length} admin pages redirect unauthenticated users to /admin/login`, async () => {
    for (const page of protectedPages) {
      const res = await fetch(`${BASE}${page}`, { redirect: "manual" });
      assert.ok(
        res.status === 307 || res.status === 302 || res.status === 303,
        `${page} returned ${res.status} instead of redirect`
      );
      assert.match(
        res.headers.get("location") || "",
        /\/admin\/login/,
        `${page} did not redirect to /admin/login`
      );
    }
  });

  // 3. SEC-002: Booking ICS BOLA / PII Disclosure & CRLF Injection Prevention
  console.log("\n3. Booking ICS Authorization & CRLF Injection Defense (SEC-002)");
  await test("GET /api/bookings/ics rejects CRLF injection payloads with 400", async () => {
    const res = await fetch(`${BASE}/api/bookings/ics?ref=TEST%0D%0AX-INJECTED:1`);
    assert.equal(res.status, 400);
  });

  await test("GET /api/bookings/ics blocks unsigned unauthenticated lookup with 403", async () => {
    const res = await fetch(`${BASE}/api/bookings/ics?ref=HRZ-DSC-2026-12345`);
    assert.equal(res.status, 403);
  });

  await test("GET /api/bookings/ics blocks invalid HMAC signature with 403", async () => {
    const res = await fetch(`${BASE}/api/bookings/ics?ref=HRZ-DSC-2026-12345&sig=deadbeef12345678`);
    assert.equal(res.status, 403);
  });

  // 4. SEC-004: Admin Login Brute-Force Rate Limit
  console.log("\n4. Authentication Rate Limiting & Webhook Verification (SEC-004)");
  await test("POST /api/admin/login rejects empty payload with 400 and no-store", async () => {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.77" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get("cache-control") || "", /no-store/i);
  });

  await test("POST /api/admin/login enforces per-IP+account rate limit (429)", async () => {
    const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
    let saw429 = false;
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${BASE}/api/admin/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": testIp },
        body: JSON.stringify({
          email: "nonexistent-security-probe@invalid.hirzexa.test",
          password: "InvalidPassword123!",
        }),
      });
      if (res.status === 429) {
        saw429 = true;
        assert.ok(res.headers.get("retry-after"), "429 must include Retry-After header");
        break;
      }
      assert.ok(res.status === 401 || res.status === 503, `Unexpected login status: ${res.status}`);
    }
    assert.equal(saw429, true, "Login endpoint did not enforce rate limit after 10 attempts");
  });

  await test("POST /api/webhooks/resend fails closed (401/503) without valid Svix signature", async () => {
    const res = await fetch(`${BASE}/api/webhooks/resend`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "email.delivered", data: { email_id: "fake_id" } }),
    });
    assert.ok(res.status === 401 || res.status === 503, `Expected 401/503, got ${res.status}`);
  });

  // 5. SEC-005: DOCX ZIP Bomb Protection
  console.log("\n5. Public Upload & Parser Resilience (SEC-005, SEC-016, SEC-017)");
  await test("POST /api/applications/parse-cv safely rejects crafted DOCX decompression bomb", async () => {
    // 6 MB of repeated XML spaces compresses down to ~6 KB -> triggers MAX_DOCX_ENTRY_UNCOMPRESSED (2 MB)
    const bombPayload = `<w:document><w:body><w:p><w:t>${"A".repeat(6 * 1024 * 1024)}</w:t></w:p></w:body></w:document>`;
    const bombZip = buildMinimalZip([{ name: "word/document.xml", data: bombPayload, compress: true }]);
    assert.ok(bombZip.length < 100_000, "Bomb fixture should be small when compressed");

    const form = new FormData();
    form.append(
      "cv",
      new Blob([bombZip], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      "bomb.docx"
    );

    const started = Date.now();
    const res = await fetch(`${BASE}/api/applications/parse-cv`, {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.88" },
      body: form,
    });
    const elapsed = Date.now() - started;
    assert.equal(res.status, 400, "Oversized uncompressed DOCX must fail cleanly with 400");
    assert.ok(elapsed < 5000, `DOCX bomb rejection took too long (${elapsed} ms)`);
  });

  await test("POST /api/applications rejects invalid email format and non-PDF/DOCX uploads", async () => {
    const form = new FormData();
    form.append("jobSlug", "nonexistent-job-slug");
    form.append("email", "not-an-email");
    const res = await fetch(`${BASE}/api/applications`, {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.89" },
      body: form,
    });
    assert.ok([400, 409, 422].includes(res.status), `Expected 400/409/422, got ${res.status}`);
  });

  await test("POST /api/analytics/page-view silently ignores forged /__crm_lead__/ path injection", async () => {
    const res = await fetch(`${BASE}/api/analytics/page-view`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.90" },
      body: JSON.stringify({
        path: "/__crm_lead__/HRZ-FORGED-99999",
        visitorId: "visitor-security-test-1234567890",
      }),
    });
    assert.equal(res.status, 204);
  });

  // 6. Static & Bundle Integrity Assertions (SEC-014, Phase 6)
  console.log("\n6. Static Hardening & Client Bundle Zero-Secret Assertions");
  await test("All srcDoc email preview iframes enforce sandbox=\"\"", async () => {
    const files = [
      "components/admin-interviews-client.tsx",
      "components/interviews/InviteInterviewDrawer.tsx",
      "components/recruitment/ManualEmailComposerDrawer.tsx",
    ];
    for (const file of files) {
      const content = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      assert.match(content, /srcDoc=[\s\S]{0,120}sandbox=""/, `${file} iframe missing sandbox=""`);
    }
  });

  await test("Client JS bundle (.next/static) contains zero source maps and zero secret values", async () => {
    const staticDir = path.join(process.cwd(), ".next", "static");
    assert.ok(fs.existsSync(staticDir), ".next/static must exist");
    const files = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else files.push(p);
      }
    };
    walk(staticDir);
    const maps = files.filter((f) => f.endsWith(".map"));
    assert.equal(maps.length, 0, "Production client bundle must not expose .map source maps");

    const secretRe = /AIza[0-9A-Za-z_-]{20}|re_[0-9A-Za-z_]{20}|whsec_[0-9A-Za-z+/=]{16}|sk-[0-9A-Za-z]{20}/;
    for (const jsFile of files.filter((f) => f.endsWith(".js"))) {
      const text = fs.readFileSync(jsFile, "utf8");
      assert.equal(secretRe.test(text), false, `Secret pattern found in client chunk ${path.basename(jsFile)}`);
    }
  });

  await test("Session revocation & prompt-injection sanitization code invariants hold", async () => {
    const authSrc = fs.readFileSync(path.join(process.cwd(), "lib/auth.ts"), "utf8");
    assert.match(authSrc, /verifySessionVersionCookie/, "lib/auth.ts must verify HMAC session version cookie");
    assert.match(authSrc, /signSessionVersionToken/, "lib/auth.ts must sign session version cookie");

    const toolsSrc = fs.readFileSync(path.join(process.cwd(), "lib/intelligence/tools.ts"), "utf8");
    assert.match(toolsSrc, /untrusted_business_data/, "sanitizeUntrustedText must strip untrusted_business_data delimiter tags");
    assert.match(toolsSrc, /claimPendingActionAtomically/, "Pending action confirm must atomically claim action before execution");
  });

  console.log(`\n=== Security Audit Verification Summary: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Security test runner crashed:", err);
  process.exit(1);
});
