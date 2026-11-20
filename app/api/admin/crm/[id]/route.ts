import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { listCrmLeads, updateCrmLead } from "@/lib/crm";
import { canTransitionStage, CRM_STAGE_LABELS, type CrmStage } from "@/lib/crm-types";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import { canAccessScopedRecord, hasPermission, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("crm", "edit"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = (await listCrmLeads()).find((l) => l.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (
    !canAccessScopedRecord(actor, {
      ownerId: existing.ownerId,
      ownerEmail: existing.ownerEmail,
    })
  ) {
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "crm",
      action: "edit",
      entityType: "lead",
      entityId: existing.id,
      outcome: "denied",
      summary: `Blocked out-of-scope CRM update on ${existing.referenceId}.`,
    });
    return NextResponse.json(
      { error: "You do not have scope permission to edit this lead." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (body.ownerId !== undefined && !hasPermission(actor, "crm", "assign")) {
    return NextResponse.json(
      { error: "Your role does not allow reassigning lead ownership." },
      { status: 403 }
    );
  }

  const requestedStage =
    typeof body.stage === "string" ? (body.stage as CrmStage) : undefined;
  if (
    requestedStage &&
    requestedStage !== existing.stage &&
    !actor.isSuperAdmin &&
    !canTransitionStage(existing.stage, requestedStage)
  ) {
    return NextResponse.json(
      {
        error: `Stage transition from ${CRM_STAGE_LABELS[existing.stage].en} directly to ${
          CRM_STAGE_LABELS[requestedStage]?.en || requestedStage
        } is not permitted. Move through the documented pipeline stages.`,
      },
      { status: 422 }
    );
  }

  const updated = await updateCrmLead(id, {
    stage: requestedStage,
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
    ownerId:
      body.ownerId === null
        ? null
        : typeof body.ownerId === "string"
        ? body.ownerId
        : undefined,
    ownerEmail:
      body.ownerEmail === null
        ? null
        : typeof body.ownerEmail === "string"
        ? body.ownerEmail
        : undefined,
    ownerName:
      body.ownerName === null
        ? null
        : typeof body.ownerName === "string"
        ? body.ownerName
        : undefined,
    actorEmail: actor.email,
  });

  if (!updated) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "crm",
    action: "edit",
    entityType: "lead",
    entityId: updated.id,
    outcome: "allowed",
    summary: `Updated lead ${updated.referenceId} (${updated.company || updated.fullName}).`,
    metadata: {
      stage: updated.stage,
      ownerEmail: updated.ownerEmail || null,
      sendReminder: Boolean(body.sendReminder),
    },
  });

  if (requestedStage && requestedStage !== existing.stage) {
    try {
      await emitBusinessEvent({
        eventType: "lead.stage_changed",
        module: "crm",
        severity: requestedStage === "won" ? "attention" : "info",
        actorRef: actor.email,
        entityType: "lead",
        entityId: updated.id,
        title: `Pipeline moved: ${updated.company || updated.fullName} → ${CRM_STAGE_LABELS[requestedStage].en}`,
        summary: `${updated.referenceId} moved from ${CRM_STAGE_LABELS[existing.stage].en} to ${CRM_STAGE_LABELS[requestedStage].en} by ${actor.fullName}.`,
        sourceHref: `/admin/crm?lead=${encodeURIComponent(updated.id)}`,
      });
    } catch {}
  }

  return NextResponse.json({ ok: true, lead: updated });
}
