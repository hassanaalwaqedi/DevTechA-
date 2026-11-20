import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { updateTask } from "@/lib/intelligence/tasks";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";

const patchTaskSchema = z.object({
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(1500).optional(),
  dueAt: z.string().trim().max(40).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("tasks", "edit"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = patchTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task update payload." }, { status: 400 });
  }

  const updated = await updateTask(actor, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "tasks",
    action: "edit",
    entityType: "task",
    entityId: updated.id,
    outcome: "allowed",
    summary: `Updated task "${updated.title}" → ${updated.status}.`,
  });

  return NextResponse.json({ ok: true, task: updated });
}
