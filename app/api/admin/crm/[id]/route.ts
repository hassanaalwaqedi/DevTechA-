import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import {
  canActorAccessCrmLead,
  CrmPersistenceError,
  getAuthorizedCrmLeadById,
  InvalidCrmOwnerError,
  listCrmLeads,
  updateCrmLead,
} from "@/lib/crm";
import { canTransitionStage, CRM_STAGE_LABELS, type CrmStage } from "@/lib/crm-types";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import { hasPermission, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("crm", "view"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { lead, denied } = await getAuthorizedCrmLeadById(actor, id);
  if (denied) {
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "crm",
      action: "view",
      entityType: "lead",
      entityId: id,
      outcome: "denied",
      summary: `Blocked out-of-scope CRM read on lead ${id}.`,
    });
    return NextResponse.json(
      { error: "You do not have scope permission to view this lead." },
      { status: 403 }
    );
  }
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, lead });
}

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

  if (!canActorAccessCrmLead(actor, existing)) {
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

  const attemptingReassign =
    body.ownerId !== undefined ||
    body.ownerEmail !== undefined ||
    body.ownerName !== undefined;
  if (attemptingReassign && !hasPermission(actor, "crm", "assign")) {
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "crm",
      action: "assign",
      entityType: "lead",
      entityId: existing.id,
      outcome: "denied",
      summary: `Blocked unauthorized lead ownership reassignment attempt on ${existing.referenceId}.`,
    });
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

  let updated;
  try {
    updated = await updateCrmLead(id, {
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
  } catch (err) {
    if (err instanceof InvalidCrmOwnerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof CrmPersistenceError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Unable to persist CRM lead update." },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const ownerChanged = (updated.ownerId || null) !== (existing.ownerId || null);

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "crm",
    action: ownerChanged ? "assign" : "edit",
    entityType: "lead",
    entityId: updated.id,
    outcome: "allowed",
    summary: ownerChanged
      ? `Reassigned lead ${updated.referenceId} owner: ${
          existing.ownerEmail || "Unassigned"
        } → ${updated.ownerEmail || "Unassigned"}.`
      : `Updated lead ${updated.referenceId} (${updated.company || updated.fullName}).`,
    metadata: {
      stage: updated.stage,
      previousOwnerId: existing.ownerId || null,
      previousOwnerEmail: existing.ownerEmail || null,
      ownerId: updated.ownerId || null,
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
