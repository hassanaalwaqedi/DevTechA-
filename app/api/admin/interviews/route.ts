import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { isResendConfigured } from "@/lib/email/transactional";
import { listEmployees } from "@/lib/intelligence/employees";
import { getExternalCalendarAdapterStatus } from "@/lib/interviews/calendar-adapter";
import {
  createAndSendInterviewInvitation,
  getInterviewStatistics,
  listAuthorizedInterviewAppointments,
  listAuthorizedInterviewInvitations,
  listInterviewActivity,
  listInterviewerAvailability,
} from "@/lib/interviews/service";
import {
  INTERVIEW_DURATIONS,
  INTERVIEW_FORMATS,
  INTERVIEW_TYPES,
  type InterviewDuration,
  type InterviewFormat,
  type InterviewType,
} from "@/lib/interviews/types";
import { RbacDeniedError } from "@/lib/rbac";

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
    const appRef = request.nextUrl.searchParams.get("applicationReferenceId") || undefined;

    const [invitations, appointments, statistics, activity, employees, availability] =
      await Promise.all([
        listAuthorizedInterviewInvitations(
          actor,
          appRef ? { applicationReferenceId: appRef } : undefined
        ),
        listAuthorizedInterviewAppointments(
          actor,
          appRef ? { applicationReferenceId: appRef } : undefined
        ),
        getInterviewStatistics(actor),
        listInterviewActivity(actor, appRef),
        listEmployees(),
        listInterviewerAvailability(),
      ]);

    const configuredIds = new Set(availability.filter((a) => a.isActive).map((a) => a.employeeId));
    const interviewers = employees
      .filter((e) => e.status === "active" || e.status === "invited")
      .map((e) => ({
        id: e.id,
        fullName: e.fullName,
        email: e.email,
        jobTitle: e.jobTitle,
        department: e.department,
        roleKey: e.roleKey,
        hasConfiguredAvailability: configuredIds.has(e.id),
      }));

    return NextResponse.json({
      invitations,
      appointments,
      statistics,
      activity,
      interviewers,
      resendConfigured: isResendConfigured(),
      externalCalendar: getExternalCalendarAdapterStatus(),
    });
  } catch (err) {
    return handleAdminAuthError(err, "Unable to load interviews workspace.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("interviews", "create");

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const applicationReferenceId = String(body.applicationReferenceId || "").trim();
    const candidateName = String(body.candidateName || "").trim();
    const candidateEmail = String(body.candidateEmail || "").trim();
    const positionTitle = String(body.positionTitle || "").trim();
    const interviewType = String(body.interviewType || "") as InterviewType;
    const interviewFormat = String(body.interviewFormat || "") as InterviewFormat;
    const durationMinutes = Number(body.durationMinutes || 45) as InterviewDuration;
    const interviewerEmployeeId = String(body.interviewerEmployeeId || "").trim();

    if (
      !applicationReferenceId ||
      !candidateName ||
      !candidateEmail ||
      !positionTitle ||
      !interviewerEmployeeId
    ) {
      return NextResponse.json(
        {
          error:
            "applicationReferenceId, candidateName, candidateEmail, positionTitle, and interviewerEmployeeId are required.",
        },
        { status: 400 }
      );
    }

    if (!INTERVIEW_TYPES.includes(interviewType)) {
      return NextResponse.json({ error: "Invalid interviewType." }, { status: 400 });
    }
    if (!INTERVIEW_FORMATS.includes(interviewFormat)) {
      return NextResponse.json({ error: "Invalid interviewFormat." }, { status: 400 });
    }
    if (!INTERVIEW_DURATIONS.includes(durationMinutes)) {
      return NextResponse.json({ error: "Invalid durationMinutes." }, { status: 400 });
    }

    const allowSkipEmail =
      body.skipOutboundEmail === true &&
      process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK === "true";

    const result = await createAndSendInterviewInvitation(actor, {
      applicationReferenceId,
      applicationId: body.applicationId ? String(body.applicationId) : null,
      candidateName,
      candidateEmail,
      positionTitle,
      interviewStage: body.interviewStage ? String(body.interviewStage) : undefined,
      interviewType,
      interviewFormat,
      durationMinutes,
      interviewerEmployeeId,
      availabilityWindowStart: body.availabilityWindowStart
        ? String(body.availabilityWindowStart)
        : null,
      availabilityWindowEnd: body.availabilityWindowEnd ? String(body.availabilityWindowEnd) : null,
      meetingUrl: body.meetingUrl ? String(body.meetingUrl) : null,
      locationDetails: body.locationDetails ? String(body.locationDetails) : null,
      personalizedMessage: body.personalizedMessage ? String(body.personalizedMessage) : "",
      locale: body.locale === "ar" ? "ar" : "en",
      expiresInDays: body.expiresInDays ? Number(body.expiresInDays) : 7,
      skipOutboundEmail: allowSkipEmail,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleAdminAuthError(err, "Unable to create interview invitation.");
  }
}
