import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { updateCrmLead } from "@/lib/crm";
import type { CrmStage } from "@/lib/crm-types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let adminEmail = "Admin";
  try {
    const { user } = await requireAdminApi();
    if (user?.email) adminEmail = user.email;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const updated = await updateCrmLead(id, {
    stage: typeof body.stage === "string" ? (body.stage as CrmStage) : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    nextFollowUpAt:
      body.nextFollowUpAt === null
        ? null
        : typeof body.nextFollowUpAt === "string"
        ? body.nextFollowUpAt
        : undefined,
    scheduledSlotIso:
      body.scheduledSlotIso === null
        ? null
        : typeof body.scheduledSlotIso === "string"
        ? body.scheduledSlotIso
        : undefined,
    meetingLink: typeof body.meetingLink === "string" ? body.meetingLink : undefined,
    activityNote: typeof body.activityNote === "string" ? body.activityNote : undefined,
    sendReminder: body.sendReminder === true,
    actorEmail: adminEmail,
  });

  if (!updated) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead: updated });
}
