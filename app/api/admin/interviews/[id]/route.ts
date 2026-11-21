import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import {
  cancelInterviewAppointment,
  rescheduleInterviewAppointment,
  resendInterviewInvitation,
  revokeInterviewInvitation,
  updateInterviewAppointmentOutcome,
} from "@/lib/interviews/service";
import type { InterviewOutcome } from "@/lib/interviews/types";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const action = String(body.action || "");
    const allowSkipEmail =
      body.skipOutboundEmail === true &&
      process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK === "true";

    if (action === "resend_invitation") {
      const { actor } = await requirePermissionApi("interviews", "edit");
      const res = await resendInterviewInvitation(actor, id, {
        expiresInDays: body.expiresInDays ? Number(body.expiresInDays) : 7,
        skipOutboundEmail: allowSkipEmail,
      });
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    if (action === "revoke_invitation") {
      const { actor } = await requirePermissionApi("interviews", "edit");
      const res = await revokeInterviewInvitation(
        actor,
        id,
        body.reason ? String(body.reason) : undefined
      );
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    if (action === "reschedule") {
      const { actor } = await requirePermissionApi("interviews", "edit");
      const newSlotStartUtc = String(body.newSlotStartUtc || "");
      if (!newSlotStartUtc) {
        return NextResponse.json({ error: "newSlotStartUtc is required." }, { status: 400 });
      }
      const res = await rescheduleInterviewAppointment({
        actor,
        appointmentId: id,
        newSlotStartUtc,
        candidateTimezone: body.candidateTimezone ? String(body.candidateTimezone) : undefined,
        skipOutboundEmail: allowSkipEmail,
      });
      return NextResponse.json(res, {
        status: res.ok ? 200 : res.code === "SLOT_CONFLICT" ? 409 : 400,
      });
    }

    if (action === "cancel") {
      const { actor } = await requirePermissionApi("interviews", "edit");
      const res = await cancelInterviewAppointment({
        actor,
        appointmentId: id,
        reason: body.reason ? String(body.reason) : undefined,
        skipOutboundEmail: allowSkipEmail,
      });
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    if (action === "update_outcome") {
      const { actor } = await requirePermissionApi("interviews", "view");
      const res = await updateInterviewAppointmentOutcome(actor, id, {
        status:
          body.status === "completed" || body.status === "no_show" ? body.status : undefined,
        outcome: body.outcome ? (String(body.outcome) as InterviewOutcome) : undefined,
        outcomeNotes: body.outcomeNotes !== undefined ? String(body.outcomeNotes) : undefined,
      });
      return NextResponse.json(res, { status: res.ok ? 200 : 403 });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err) {
    if (err instanceof RbacDeniedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "";
    if (/unauthor|session|suspend|sign in|login/i.test(msg)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update interview record." }, { status: 500 });
  }
}
