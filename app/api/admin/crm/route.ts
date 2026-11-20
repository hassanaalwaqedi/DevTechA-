import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import { createCrmLead, listCrmLeads, updateCrmLead } from "@/lib/crm";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import { canAccessScopedRecord, hasPermission, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createOpportunitySchema = z.object({
  leadType: z.enum(["discovery_call", "proposal_request"]).default("proposal_request"),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().min(2).max(140),
  roleTitle: z.string().trim().max(120).optional().or(z.literal("")),
  serviceTrack: z.string().trim().min(2).max(140),
  budgetRange: z.string().trim().max(80).optional().or(z.literal("")),
  timeline: z.string().trim().max(80).optional().or(z.literal("")),
  durationMinutes: z.union([z.literal(20), z.literal(30)]).default(30),
  scheduledSlotIso: z.string().trim().nullable().optional(),
  timezone: z.string().trim().max(80).default("UTC"),
  projectSummary: z.string().trim().min(5).max(2000),
  ownerId: z.string().trim().nullable().optional(),
  ownerEmail: z.string().trim().nullable().optional(),
  ownerName: z.string().trim().nullable().optional(),
});

export async function GET(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("crm", "view"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const stage = (searchParams.get("stage") || "").trim();
  const query = (searchParams.get("query") || "").trim().toLowerCase();

  let leads = (await listCrmLeads()).filter((lead) =>
    canAccessScopedRecord(actor, {
      ownerId: lead.ownerId,
      ownerEmail: lead.ownerEmail,
    })
  );

  if (stage && stage !== "all") {
    leads = leads.filter((item) => item.stage === stage);
  }
  if (query) {
    leads = leads.filter(
      (item) =>
        item.fullName.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        item.company.toLowerCase().includes(query) ||
        item.referenceId.toLowerCase().includes(query) ||
        item.serviceTrack.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("crm", "create"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = createOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  try {
    const created = await createCrmLead({
      leadType: parsed.data.leadType,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone || undefined,
      company: parsed.data.company,
      roleTitle: parsed.data.roleTitle || undefined,
      serviceTrack: parsed.data.serviceTrack,
      budgetRange: parsed.data.budgetRange || undefined,
      timeline: parsed.data.timeline || undefined,
      durationMinutes: parsed.data.durationMinutes,
      scheduledSlotIso: parsed.data.scheduledSlotIso || null,
      timezone: parsed.data.timezone || "UTC",
      projectSummary: parsed.data.projectSummary,
      consent: true,
      locale: "en",
    });

    let lead = created.lead;

    // Assign owner if provided and authorized, or default to actor for own-scoped sales reps
    const canAssign = hasPermission(actor, "crm", "assign");
    const desiredOwnerId = canAssign && parsed.data.ownerId !== undefined ? parsed.data.ownerId : actor.id;
    const desiredOwnerEmail =
      canAssign && parsed.data.ownerEmail !== undefined ? parsed.data.ownerEmail : actor.email;
    const desiredOwnerName =
      canAssign && parsed.data.ownerName !== undefined ? parsed.data.ownerName : actor.fullName;

    if (desiredOwnerId) {
      const assigned = await updateCrmLead(lead.id, {
        ownerId: desiredOwnerId,
        ownerEmail: desiredOwnerEmail,
        ownerName: desiredOwnerName,
        actorEmail: actor.email,
      });
      if (assigned) lead = assigned;
    }

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "crm",
      action: "create",
      entityType: "lead",
      entityId: lead.id,
      outcome: "allowed",
      summary: `Created CRM opportunity ${lead.referenceId} (${lead.company || lead.fullName}).`,
    });

    try {
      await emitBusinessEvent({
        eventType: lead.leadType === "discovery_call" ? "booking.created" : "proposal.created",
        module: "crm",
        severity: "info",
        actorRef: actor.email,
        entityType: "lead",
        entityId: lead.id,
        title: `New opportunity: ${lead.company || lead.fullName}`,
        summary: `${lead.referenceId} (${lead.serviceTrack}) added to Sales CRM by ${actor.fullName}.`,
        sourceHref: `/admin/crm?lead=${encodeURIComponent(lead.id)}`,
      });
    } catch {}

    return NextResponse.json({ ok: true, lead }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_ALREADY_RESERVED") {
      return NextResponse.json(
        { error: "That meeting slot is already reserved. Pick another time or leave unscheduled." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Unable to create CRM opportunity right now." },
      { status: 500 }
    );
  }
}
