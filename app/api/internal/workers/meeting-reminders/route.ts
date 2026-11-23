import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  processDueGoogleMeetProvisioningJobs,
  processDueMeetingEmailJobs,
} from "@/lib/crm-meetings/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyWorkerSecret(request: Request): { configured: boolean; valid: boolean } {
  const expected = process.env.MEETING_REMINDER_WORKER_SECRET?.trim() || "";
  if (!expected) {
    return { configured: false, valid: false };
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const customHeader = (request.headers.get("x-hirzexa-worker-secret") || "").trim();
  const provided = bearer || customHeader;

  if (!provided) {
    return { configured: true, valid: false };
  }

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return {
    configured: true,
    valid: a.length === b.length && timingSafeEqual(a, b),
  };
}

/**
 * Authenticated background worker endpoint invoked by Render Cron Job every 5 minutes.
 * Never publicly callable — requires timing-safe MEETING_REMINDER_WORKER_SECRET bearer auth.
 */
export async function POST(request: Request) {
  const auth = verifyWorkerSecret(request);
  if (!auth.configured) {
    return NextResponse.json(
      { error: "MEETING_REMINDER_WORKER_SECRET is not configured on the server." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (!auth.valid) {
    return NextResponse.json(
      { error: "Unauthorized worker invocation." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let limit = 20;
  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    if (typeof body?.limit === "number" && Number.isFinite(body.limit)) {
      limit = Math.max(1, Math.min(Math.round(body.limit), 50));
    }
  } catch {}

  const meetRetrySummary = await processDueGoogleMeetProvisioningJobs({ limit: 10 });
  const summary = await processDueMeetingEmailJobs({ limit });
  return NextResponse.json(
    { ok: true, ...summary, meetProvisioning: meetRetrySummary, processedAt: new Date().toISOString() },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
