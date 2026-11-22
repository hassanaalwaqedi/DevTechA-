import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, actor, user } = await requirePermissionApi("recruitment", "edit");
    const { id } = await params;
    const body = await request.json();
    if (
      body.status &&
      !["new", "reviewing", "shortlisted", "interview", "accepted", "rejected"].includes(
        body.status
      )
    ) {
      return NextResponse.json({ error: "Invalid application status." }, { status: 422 });
    }
    if (body.note !== undefined) {
      const cleanNote = String(body.note).trim().slice(0, 4000);
      if (!cleanNote) {
        return NextResponse.json({ error: "Note cannot be empty." }, { status: 422 });
      }
      const { data: app, error: appError } = await supabase
        .from("job_applications")
        .select("id")
        .eq("reference_id", id)
        .single();
      if (appError) throw appError;
      const { error } = await supabase
        .from("application_notes")
        .insert({ application_id: app.id, admin_id: user?.id, note: cleanNote });
      if (error) throw error;
    }
    if (body.status) {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: body.status })
        .eq("reference_id", id);
      if (error) throw error;
    }

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "recruitment",
      action: "edit",
      entityType: "application",
      entityId: id,
      outcome: "allowed",
      summary: `Updated candidate application ${id}${body.status ? ` → ${body.status}` : " (note added)"}.`,
    });

    if (body.status) {
      try {
        await emitBusinessEvent({
          eventType: "application.status_changed",
          module: "recruitment",
          severity: body.status === "interview" || body.status === "accepted" ? "attention" : "info",
          actorRef: actor.email,
          entityType: "application",
          entityId: id,
          title: `Candidate stage updated: ${id} → ${body.status}`,
          summary: `Application ${id} moved to "${body.status}" by ${actor.fullName}.`,
          sourceHref: `/admin/applications?q=${encodeURIComponent(id)}`,
          payload: { status: body.status },
        });
      } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Request failed.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 }
    );
  }
}
