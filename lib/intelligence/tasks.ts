import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  isLocalFallbackAllowed,
  readLocalCollection,
  writeLocalCollection,
} from "@/lib/intelligence/store";
import { canAccessScopedRecord, type AuthActor } from "@/lib/rbac";
import type {
  CrmTaskRecord,
  TaskEntityType,
  TaskPriority,
  TaskStatus,
} from "@/lib/intelligence/types";

const memoryTasks = new Map<string, CrmTaskRecord>();

function mapRow(row: Record<string, unknown>): CrmTaskRecord {
  return {
    id: String(row.id),
    title: String(row.title || ""),
    description: String(row.description || ""),
    status: (row.status as TaskStatus) || "open",
    priority: (row.priority as TaskPriority) || "normal",
    dueAt: row.due_at ? String(row.due_at) : null,
    entityType: (row.entity_type as TaskEntityType | null) || null,
    entityId: row.entity_id ? String(row.entity_id) : null,
    entityLabel: row.entity_label ? String(row.entity_label) : null,
    assignedToId: row.assigned_to_id ? String(row.assigned_to_id) : null,
    assignedToEmail: row.assigned_to_email ? String(row.assigned_to_email) : null,
    createdById: String(row.created_by_id || ""),
    createdByEmail: String(row.created_by_email || ""),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export async function listTasks(
  actor: AuthActor,
  options?: {
    status?: TaskStatus | "all" | "active";
    entityId?: string;
    overdueOnly?: boolean;
  }
): Promise<CrmTaskRecord[]> {
  const byId = new Map<string, CrmTaskRecord>();

  if (isLocalFallbackAllowed()) {
    const disk = await readLocalCollection<CrmTaskRecord>("tasks");
    for (const item of disk) {
      byId.set(item.id, item);
      memoryTasks.set(item.id, item);
    }
    for (const item of memoryTasks.values()) byId.set(item.id, item);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("crm_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const mapped = mapRow(row as Record<string, unknown>);
          byId.set(mapped.id, mapped);
          memoryTasks.set(mapped.id, mapped);
        }
      }
    } catch {
      // Durable local mirror remains active.
    }
  }

  const now = Date.now();
  let items = Array.from(byId.values()).filter((task) =>
    canAccessScopedRecord(actor, {
      assignedToId: task.assignedToId,
      assignedToEmail: task.assignedToEmail,
      createdById: task.createdById,
    })
  );

  if (options?.entityId) {
    items = items.filter((t) => t.entityId === options.entityId);
  }
  if (options?.status === "active") {
    items = items.filter((t) => t.status === "open" || t.status === "in_progress");
  } else if (options?.status && options.status !== "all") {
    items = items.filter((t) => t.status === options.status);
  }
  if (options?.overdueOnly) {
    items = items.filter(
      (t) =>
        (t.status === "open" || t.status === "in_progress") &&
        Boolean(t.dueAt) &&
        new Date(t.dueAt!).getTime() < now
    );
  }

  return items.sort((a, b) => {
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function persistTask(task: CrmTaskRecord): Promise<void> {
  if (isLocalFallbackAllowed()) {
    memoryTasks.set(task.id, task);
    const existing = await readLocalCollection<CrmTaskRecord>("tasks");
    await writeLocalCollection("tasks", [
      task,
      ...existing.filter((x) => x.id !== task.id),
    ]);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from("crm_tasks").upsert({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_at: task.dueAt || null,
        entity_type: task.entityType || null,
        entity_id: task.entityId || null,
        entity_label: task.entityLabel || null,
        assigned_to_id: task.assignedToId || null,
        assigned_to_email: task.assignedToEmail || null,
        created_by_id: task.createdById,
        created_by_email: task.createdByEmail,
        completed_at: task.completedAt || null,
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      });
    } catch {
      // Local mirror already persisted.
    }
  }
}

export async function createTask(
  actor: AuthActor,
  input: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueAt?: string | null;
    entityType?: TaskEntityType | null;
    entityId?: string | null;
    entityLabel?: string | null;
    assignedToId?: string | null;
    assignedToEmail?: string | null;
  }
): Promise<CrmTaskRecord> {
  const nowIso = new Date().toISOString();
  const task: CrmTaskRecord = {
    id: randomUUID(),
    title: input.title.trim().slice(0, 180),
    description: (input.description || "").trim().slice(0, 1500),
    status: "open",
    priority: input.priority || "normal",
    dueAt: input.dueAt || null,
    entityType: input.entityType || "general",
    entityId: input.entityId || null,
    entityLabel: input.entityLabel || null,
    assignedToId: input.assignedToId || actor.employeeId,
    assignedToEmail: input.assignedToEmail || actor.email,
    createdById: actor.employeeId,
    createdByEmail: actor.email,
    completedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await persistTask(task);
  return task;
}

export async function updateTask(
  actor: AuthActor,
  taskId: string,
  patch: {
    status?: TaskStatus;
    priority?: TaskPriority;
    title?: string;
    description?: string;
    dueAt?: string | null;
    assignedToId?: string | null;
    assignedToEmail?: string | null;
  }
): Promise<CrmTaskRecord | null> {
  const all = await listTasks(actor, { status: "all" });
  const existing = all.find((t) => t.id === taskId);
  if (!existing) return null;

  const nowIso = new Date().toISOString();
  const nextStatus = patch.status || existing.status;
  const updated: CrmTaskRecord = {
    ...existing,
    title: patch.title !== undefined ? patch.title.trim().slice(0, 180) || existing.title : existing.title,
    description:
      patch.description !== undefined
        ? patch.description.trim().slice(0, 1500)
        : existing.description,
    status: nextStatus,
    priority: patch.priority || existing.priority,
    dueAt: patch.dueAt !== undefined ? patch.dueAt : existing.dueAt,
    assignedToId:
      patch.assignedToId !== undefined ? patch.assignedToId : existing.assignedToId,
    assignedToEmail:
      patch.assignedToEmail !== undefined
        ? patch.assignedToEmail
        : existing.assignedToEmail,
    completedAt:
      nextStatus === "completed"
        ? existing.completedAt || nowIso
        : nextStatus === "open" || nextStatus === "in_progress"
        ? null
        : existing.completedAt,
    updatedAt: nowIso,
  };

  await persistTask(updated);
  return updated;
}
