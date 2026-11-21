import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requirePermissionApi } from "@/lib/auth";
import { dispatchDueInterviewReminders } from "@/lib/interviews/service";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidCronSecret(request: NextRequest): boolean {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) return false;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return false;
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(configured, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidCronSecret(request)) {
      await requirePermissionApi("interviews", "manage");
    }

    let skipOutboundEmail = false;
    try {
      const body = (await request.json()) as { skipOutboundEmail?: boolean };
      if (
        body?.skipOutboundEmail === true &&
        process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK === "true"
      ) {
        skipOutboundEmail = true;
      }
    } catch {
      // Optional empty body
    }

    const summary = await dispatchDueInterviewReminders({ skipOutboundEmail });
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    if (err instanceof RbacDeniedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "";
    if (/unauthor|session|suspend|sign in|login/i.test(msg)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to dispatch interview reminders." }, { status: 500 });
  }
}
