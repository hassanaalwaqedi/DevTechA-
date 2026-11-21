import { NextRequest, NextResponse } from "next/server";
import { rescheduleInterviewAppointment } from "@/lib/interviews/service";
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
  if (!checkRateLimit(`interview-public-resched:${ip}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many reschedule attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  let body: {
    token?: string;
    newSlotStartUtc?: string;
    candidateTimezone?: string;
    skipOutboundEmail?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (!body.token || !body.newSlotStartUtc) {
    return NextResponse.json(
      { error: "Scheduling token and new time slot are required." },
      { status: 400 }
    );
  }

  const allowSkipEmail =
    body.skipOutboundEmail === true &&
    process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK === "true";

  const result = await rescheduleInterviewAppointment({
    rawToken: body.token,
    newSlotStartUtc: body.newSlotStartUtc,
    candidateTimezone: body.candidateTimezone,
    skipOutboundEmail: allowSkipEmail,
  });

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "SLOT_CONFLICT"
          ? 409
          : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  const appt = result.appointment!;
  return NextResponse.json({
    ok: true,
    appointment: {
      id: appt.id,
      scheduledStartUtc: appt.scheduledStartUtc,
      scheduledEndUtc: appt.scheduledEndUtc,
      candidateTimezone: appt.candidateTimezone,
      meetingUrl: appt.meetingUrl || null,
      locationDetails: appt.locationDetails || null,
      status: appt.status,
      rescheduleCount: appt.rescheduleCount,
    },
    calendarLinks: result.calendarLinks,
  });
}
