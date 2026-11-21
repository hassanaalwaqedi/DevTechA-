import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import { getAuthorizedCrmLeadById } from "@/lib/crm";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import { createTask, listTasks } from "@/lib/intelligence/tasks";
import { hasPermission, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1500).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  dueAt: z.string().trim().max(40).nullable().optional(),
  entityType: z
    .enum(["lead", "booking", "application", "job", "general"])
    .nullable()
    .optional(),
  entityId: z.string().trim().max(120).nullable().optional(),
  entityLabel: z.string().trim().max(160).nullable().optional(),
  assignedToId: z.string().trim().max(120).nullable().optional(),
  assignedToEmail: z.string().trim().max(160).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const { actor } = await requirePermissionApi("tasks", "view");
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "all") as
      | "all"
      | "active"
      | "open"
      | "in_progress"
      | "completed"
      | "cancelled";
    const entityId = searchParams.get("entityId") || undefined;
    const overdueOnly = searchParams.get("overdue") === "1";

    const tasks = await listTasks(actor, { status, entityId, overdueOnly });
    return NextResponse.json({ ok: true, tasks });
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("tasks", "create"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  // Verify linked CRM lead falls within actor's authorized scope before attaching task
  if (
    (parsed.data.entityType === "lead" || parsed.data.entityType === "booking") &&
    parsed.data.entityId
  ) {
    const leadCheck = await getAuthorizedCrmLeadById(actor, parsed.data.entityId);
    if (leadCheck.denied || !leadCheck.lead) {
      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.roleKey,
        module: "tasks",
        action: "create",
        entityType: "lead",
        entityId: parsed.data.entityId,
        outcome: "denied",
        summary: `Blocked task attachment to unauthorized lead ${parsed.data.entityId}.`,
      });
      return NextResponse.json(
        { error: "You do not have authorized scope to attach a task to that lead." },
        { status: 403 }
      );
    }
  }

  // Only actors with tasks:assign may assign a task to another employee
  const canAssignTasks = hasPermission(actor, "tasks", "assign");
  const safeTaskInput = canAssignTasks
    ? parsed.data
    : {
        ...parsed.data,
        assignedToId: actor.employeeId,
        assignedToEmail: actor.email,
      };

  const task = await createTask(actor, safeTaskInput);

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "tasks",
    action: "create",
    entityType: "task",
    entityId: task.id,
    outcome: "allowed",
    summary: `Created task "${task.title}" (${task.priority}).`,
  });

  try {
    await emitBusinessEvent({
      eventType: "task.created",
      module: "tasks",
      actorRef: actor.email,
      entityType: "task",
      entityId: task.id,
      title: `New task: ${task.title}`,
      summary: `${task.priority} priority${task.entityLabel ? ` · ${task.entityLabel}` : ""}`,
      sourceHref:
        task.entityType === "lead" && task.entityId
          ? `/admin/crm?lead=${encodeURIComponent(task.entityId)}`
          : "/admin",
    });
  } catch {}

  return NextResponse.json({ ok: true, task }, { status: 201 });
}
