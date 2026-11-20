import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  isLocalFallbackAllowed,
  readLocalCollection,
  writeLocalCollection,
} from "@/lib/intelligence/store";
import type { AuditLogEntry } from "@/lib/intelligence/types";

const memoryAudit: AuditLogEntry[] = [];
const MAX_LOCAL_AUDIT = 500;

function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/password|token|secret|key|authorization|cookie/i.test(key)) {
      cleaned[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") {
      cleaned[key] = value.slice(0, 320);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.slice(0, 12);
    }
  }
  return cleaned;
}

export async function recordAuditLog(input: {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  module: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  outcome: AuditLogEntry["outcome"];
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: randomUUID(),
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    module: input.module,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId || null,
    outcome: input.outcome,
    summary: input.summary.slice(0, 400),
    metadata: sanitizeMetadata(input.metadata),
    createdAt: new Date().toISOString(),
  };

  if (isLocalFallbackAllowed()) {
    memoryAudit.unshift(entry);
    if (memoryAudit.length > MAX_LOCAL_AUDIT) memoryAudit.length = MAX_LOCAL_AUDIT;

    const existing = await readLocalCollection<AuditLogEntry>("audit-logs");
    const merged = [entry, ...existing.filter((x) => x.id !== entry.id)].slice(
      0,
      MAX_LOCAL_AUDIT
    );
    await writeLocalCollection("audit-logs", merged);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from("audit_logs").insert({
        id: entry.id,
        actor_id: entry.actorId,
        actor_email: entry.actorEmail,
        actor_role: entry.actorRole,
        module: entry.module,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        outcome: entry.outcome,
        summary: entry.summary,
        metadata: entry.metadata,
        created_at: entry.createdAt,
      });
    } catch {
      // Table may not be migrated yet; local audit log remains durable.
    }
  }

  return entry;
}

export async function listAuditLogs(options?: {
  limit?: number;
  module?: string;
  outcome?: string;
}): Promise<AuditLogEntry[]> {
  const limit = Math.min(200, Math.max(1, options?.limit ?? 80));
  const byId = new Map<string, AuditLogEntry>();

  if (isLocalFallbackAllowed()) {
    const local = await readLocalCollection<AuditLogEntry>("audit-logs");
    for (const item of local) byId.set(item.id, item);
    for (const item of memoryAudit) byId.set(item.id, item);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          byId.set(String(row.id), {
            id: String(row.id),
            actorId: String(row.actor_id),
            actorEmail: String(row.actor_email),
            actorRole: String(row.actor_role),
            module: String(row.module),
            action: String(row.action),
            entityType: String(row.entity_type),
            entityId: row.entity_id ? String(row.entity_id) : null,
            outcome: (row.outcome as AuditLogEntry["outcome"]) || "allowed",
            summary: String(row.summary),
            metadata:
              row.metadata && typeof row.metadata === "object"
                ? (row.metadata as Record<string, unknown>)
                : {},
            createdAt: String(row.created_at),
          });
        }
      }
    } catch {
      // Fallback to local mirror
    }
  }

  let list = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (options?.module && options.module !== "all") {
    list = list.filter((e) => e.module === options.module);
  }
  if (options?.outcome && options.outcome !== "all") {
    list = list.filter((e) => e.outcome === options.outcome);
  }

  return list.slice(0, limit);
}
