import { NextRequest, NextResponse } from "next/server";
import {
  bookPublicInterviewSlot,
  lookupPublicInterviewByToken,
} from "@/lib/interviews/service";
import { checkRateLimit } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`interview-public-get:${ip}`, 90, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const token = request.nextUrl.searchParams.get("token") || "";
  const timezone = request.nextUrl.searchParams.get("timezone") || undefined;

  if (!token.trim()) {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }

  const result = await lookupPublicInterviewByToken(token, timezone);
  if (result.state === "invalid") {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`interview-public-book:${ip}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many scheduling attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  let body: {
    token?: string;
    slotStartUtc?: string;
    candidateTimezone?: string;
    skipOutboundEmail?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (!body.token || !body.slotStartUtc) {
    return NextResponse.json(
      { error: "Scheduling token and selected time slot are required." },
      { status: 400 }
    );
  }

  const allowSkipEmail =
    body.skipOutboundEmail === true &&
    process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK === "true";

  const result = await bookPublicInterviewSlot({
    rawToken: body.token,
    slotStartUtc: body.slotStartUtc,
    candidateTimezone: body.candidateTimezone || "UTC",
    skipOutboundEmail: allowSkipEmail,
  });

  if (!result.ok) {
    const status =
      result.code === "INVALID_TOKEN"
        ? 404
        : result.code === "EXPIRED" || result.code === "REVOKED"
          ? 410
          : result.code === "SLOT_CONFLICT"
            ? 409
            : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  // Return strictly candidate-scoped confirmation data (never internal IDs or HR notes)
  const appt = result.appointment!;
  return NextResponse.json({
    ok: true,
    idempotent: Boolean(result.idempotent),
    appointment: {
      id: appt.id,
      scheduledStartUtc: appt.scheduledStartUtc,
      scheduledEndUtc: appt.scheduledEndUtc,
      candidateTimezone: appt.candidateTimezone,
      positionTitle: appt.positionTitle,
      interviewType: appt.interviewType,
      interviewFormat: appt.interviewFormat,
      durationMinutes: appt.durationMinutes,
      interviewerName: appt.interviewerName,
      meetingUrl: appt.meetingUrl || null,
      locationDetails: appt.locationDetails || null,
      status: appt.status,
      rescheduleCount: appt.rescheduleCount,
    },
    calendarLinks: result.calendarLinks,
  });
}
