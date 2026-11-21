import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { getExternalCalendarAdapterStatus } from "@/lib/interviews/calendar-adapter";
import {
  createAvailabilityException,
  deleteAvailabilityException,
  getAvailableSlotsForInterviewer,
  listAvailabilityExceptions,
  listInterviewerAvailability,
  saveInterviewerAvailability,
} from "@/lib/interviews/service";
import type { InterviewDuration } from "@/lib/interviews/types";
import { hasPermission, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleAdminAuthError(err: unknown, fallback: string) {
  if (err instanceof RbacDeniedError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const msg = err instanceof Error ? err.message : "";
  if (/unauthor|session|suspend|sign in|login/i.test(msg)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("interviews", "view");
    const requestedEmployeeId =
      request.nextUrl.searchParams.get("employeeId") || actor.employeeId || undefined;

    const canManageAll = hasPermission(actor, "interviews", "manage");
    const scopedEmployeeId = canManageAll ? requestedEmployeeId : actor.employeeId || undefined;

    const [rules, exceptions] = await Promise.all([
      listInterviewerAvailability(scopedEmployeeId),
      listAvailabilityExceptions(scopedEmployeeId),
    ]);

    const previewSlots =
      scopedEmployeeId && request.nextUrl.searchParams.get("includeSlots") === "true"
        ? (
            await getAvailableSlotsForInterviewer({
              employeeId: scopedEmployeeId,
              durationMinutes: Number(request.nextUrl.searchParams.get("durationMinutes") || 45),
              candidateTimezone: request.nextUrl.searchParams.get("timezone") || "UTC",
            })
          ).slots
        : undefined;

    return NextResponse.json({
      rules,
      exceptions,
      previewSlots,
      externalCalendar: getExternalCalendarAdapterStatus(),
    });
  } catch (err) {
    return handleAdminAuthError(err, "Unable to load interviewer availability.");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("interviews", "view");
    const body = (await request.json()) as {
      employeeId?: string;
      timezone?: string;
      slotDurationMinutes?: InterviewDuration;
      minNoticeHours?: number;
      bufferBeforeMinutes?: number;
      bufferAfterMinutes?: number;
      maxAdvanceDays?: number;
      weeklyWindows?: Array<{
        dayOfWeek: number;
        startMinute: number;
        endMinute: number;
        isActive?: boolean;
      }>;
    };

    const employeeId = body.employeeId || actor.employeeId || "";
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
    }

    const result = await saveInterviewerAvailability(actor, {
      employeeId,
      timezone: body.timezone || "UTC",
      slotDurationMinutes: (body.slotDurationMinutes || 45) as InterviewDuration,
      minNoticeHours: body.minNoticeHours ?? 12,
      bufferBeforeMinutes: body.bufferBeforeMinutes ?? 10,
      bufferAfterMinutes: body.bufferAfterMinutes ?? 10,
      maxAdvanceDays: body.maxAdvanceDays ?? 21,
      weeklyWindows: Array.isArray(body.weeklyWindows) ? body.weeklyWindows : [],
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.startsWith("Forbidden") ? 403 : 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return handleAdminAuthError(err, "Failed to save availability rules.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("interviews", "view");
    const body = (await request.json()) as {
      employeeId?: string;
      exceptionDate?: string;
      isUnavailable?: boolean;
      startMinute?: number | null;
      endMinute?: number | null;
      reason?: string;
    };

    const employeeId = body.employeeId || actor.employeeId || "";
    if (!employeeId || !body.exceptionDate) {
      return NextResponse.json(
        { error: "employeeId and exceptionDate are required." },
        { status: 400 }
      );
    }

    const result = await createAvailabilityException(actor, {
      employeeId,
      exceptionDate: body.exceptionDate,
      isUnavailable: body.isUnavailable !== false,
      startMinute: body.startMinute ?? null,
      endMinute: body.endMinute ?? null,
      reason: body.reason || "",
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.startsWith("Forbidden") ? 403 : 400 }
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleAdminAuthError(err, "Failed to add availability exception.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("interviews", "view");
    const exceptionId = request.nextUrl.searchParams.get("id") || "";
    if (!exceptionId) {
      return NextResponse.json({ error: "Exception id is required." }, { status: 400 });
    }
    const result = await deleteAvailabilityException(actor, exceptionId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Forbidden" ? 403 : 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAdminAuthError(err, "Failed to delete availability exception.");
  }
}
