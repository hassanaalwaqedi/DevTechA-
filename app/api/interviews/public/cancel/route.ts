import { NextRequest, NextResponse } from "next/server";
import { cancelInterviewAppointment } from "@/lib/interviews/service";
import { checkRateLimit } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`interview-public-cancel:${ip}`, 15, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many cancellation attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  let body: { token?: string; reason?: string; skipOutboundEmail?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Scheduling token is required." }, { status: 400 });
  }

  const allowSkipEmail =
    body.skipOutboundEmail === true &&
    process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK === "true";

  const result = await cancelInterviewAppointment({
    rawToken: body.token,
    reason: body.reason,
    skipOutboundEmail: allowSkipEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
