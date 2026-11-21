import "server-only";
import { randomUUID } from "node:crypto";
import { listAuthorizedCrmLeads } from "@/lib/crm";
import { getApplications, getMetrics } from "@/lib/db";
import { listTasks } from "@/lib/intelligence/tasks";
import {
  isLocalFallbackAllowed,
  readLocalCollection,
  writeLocalCollection,
} from "@/lib/intelligence/store";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  hasPermission,
  type AuthActor,
  type PermissionModule,
} from "@/lib/rbac";
import type {
  AgentCitation,
  BusinessEventRecord,
  MorningBriefingData,
} from "@/lib/intelligence/types";

const memoryEvents: BusinessEventRecord[] = [];
const MAX_LOCAL_EVENTS = 300;

export async function emitBusinessEvent(input: {
  eventType: BusinessEventRecord["eventType"];
  module: PermissionModule;
  severity?: BusinessEventRecord["severity"];
  actorRef: string;
  entityType: string;
  entityId: string;
  title: string;
  summary: string;
  sourceHref: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<BusinessEventRecord> {
  const existingLocal = isLocalFallbackAllowed()
    ? await readLocalCollection<BusinessEventRecord>("business-events")
    : [];
  if (input.idempotencyKey && isLocalFallbackAllowed()) {
    const duplicate =
      memoryEvents.find((e) => e.idempotencyKey === input.idempotencyKey) ||
      existingLocal.find((e) => e.idempotencyKey === input.idempotencyKey);
    if (duplicate) return duplicate;
  }

  const event: BusinessEventRecord = {
    id: randomUUID(),
    eventType: input.eventType,
    module: input.module,
    severity: input.severity || "info",
    actorRef: input.actorRef,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title.slice(0, 180),
    summary: input.summary.slice(0, 420),
    sourceHref: input.sourceHref,
    payload: input.payload || {},
    idempotencyKey: input.idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  if (isLocalFallbackAllowed()) {
    memoryEvents.unshift(event);
    if (memoryEvents.length > MAX_LOCAL_EVENTS) memoryEvents.length = MAX_LOCAL_EVENTS;

    await writeLocalCollection(
      "business-events",
      [event, ...existingLocal.filter((x) => x.id !== event.id)].slice(0, MAX_LOCAL_EVENTS)
    );
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("business_events").insert({
        id: event.id,
        event_type: event.eventType,
        module: event.module,
        severity: event.severity,
        actor_ref: event.actorRef,
        entity_type: event.entityType,
        entity_id: event.entityId,
        title: event.title,
        summary: event.summary,
        source_href: event.sourceHref,
        payload: event.payload,
        idempotency_key: event.idempotencyKey || null,
        created_at: event.createdAt,
      });
      if (
        error &&
        (event.eventType === "booking.created" ||
          event.eventType === "proposal.created" ||
          event.eventType === "application.received")
      ) {
        // Public unauthenticated ingestion uses the narrow SECURITY DEFINER RPC under strict RLS
        await supabase.rpc("ingest_public_business_event", {
          p_event_type: event.eventType,
          p_module: event.module,
          p_severity: event.severity,
          p_actor_ref: event.actorRef,
          p_entity_type: event.entityType,
          p_entity_id: event.entityId,
          p_title: event.title,
          p_summary: event.summary,
          p_source_href: event.sourceHref,
          p_payload: event.payload || {},
          p_idempotency_key: event.idempotencyKey || null,
        });
      }
    } catch {
      // Table may not be migrated yet; local event mirror remains durable.
    }
  }

  return event;
}

/**
 * Returns real business events strictly filtered by the authenticated actor's
 * RBAC permissions, unifying persisted event rows with derived events from
 * live bookings and recruitment applications so pre-existing records appear.
 */
export async function listBusinessEvents(
  actor: AuthActor,
  options?: { hoursBack?: number; limit?: number }
): Promise<BusinessEventRecord[]> {
  const limit = Math.min(80, Math.max(1, options?.limit ?? 25));
  const cutoffMs = options?.hoursBack
    ? Date.now() - options.hoursBack * 60 * 60 * 1000
    : 0;

  const byKey = new Map<string, BusinessEventRecord>();

  if (isLocalFallbackAllowed()) {
    const local = await readLocalCollection<BusinessEventRecord>("business-events");
    for (const item of [...local, ...memoryEvents]) {
      byKey.set(item.idempotencyKey || item.id, item);
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("business_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit * 2);
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const item: BusinessEventRecord = {
            id: String(row.id),
            eventType: row.event_type as BusinessEventRecord["eventType"],
            module: row.module as PermissionModule,
            severity: (row.severity as BusinessEventRecord["severity"]) || "info",
            actorRef: String(row.actor_ref || "system"),
            entityType: String(row.entity_type || "record"),
            entityId: String(row.entity_id || ""),
            title: String(row.title || ""),
            summary: String(row.summary || ""),
            sourceHref: String(row.source_href || "/admin"),
            payload:
              row.payload && typeof row.payload === "object"
                ? (row.payload as Record<string, unknown>)
                : {},
            idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : undefined,
            createdAt: String(row.created_at),
          };
          byKey.set(item.idempotencyKey || item.id, item);
        }
      }
    } catch {}
  }

  // Synthesize canonical events from existing CRM bookings/leads if actor has CRM/bookings access
  let authorizedLeadIds: Set<string> | null = null;
  if (hasPermission(actor, "crm", "view") || hasPermission(actor, "bookings", "view")) {
    const authorizedLeads = await listAuthorizedCrmLeads(actor);
    authorizedLeadIds = new Set(authorizedLeads.map((l) => l.id));
    for (const lead of authorizedLeads.slice(0, 25)) {
      const key = `lead-created:${lead.id}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: `evt-lead-${lead.id}`,
          eventType:
            lead.leadType === "discovery_call" ? "booking.created" : "proposal.created",
          module: lead.leadType === "discovery_call" ? "bookings" : "crm",
          severity: lead.stage === "meeting_booked" ? "attention" : "info",
          actorRef: lead.fullName,
          entityType: "lead",
          entityId: lead.id,
          title:
            lead.leadType === "discovery_call"
              ? `Discovery call: ${lead.company || lead.fullName}`
              : `Proposal request: ${lead.company || lead.fullName}`,
          summary: `${lead.referenceId} · ${lead.serviceTrack}${
            lead.scheduledSlotIso
              ? ` · Slot ${new Date(lead.scheduledSlotIso).toUTCString()}`
              : ""
          }`,
          sourceHref: `/admin/crm?lead=${encodeURIComponent(lead.id)}`,
          idempotencyKey: key,
          createdAt: lead.createdAt,
        });
      }
    }
  }

  // Synthesize canonical events from real job applications if actor has recruitment access
  if (hasPermission(actor, "recruitment", "view")) {
    try {
      const applications = await getApplications();
      for (const app of applications.slice(0, 20)) {
        const key = `app-received:${app.id}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            id: `evt-app-${app.id}`,
            eventType: "application.received",
            module: "recruitment",
            severity: app.status === "new" ? "attention" : "info",
            actorRef: app.name,
            entityType: "application",
            entityId: app.id,
            title: `New application: ${app.name} (${app.jobTitle})`,
            summary: `${app.id} · ${app.experience} · ${app.country} · Status: ${app.status}`,
            sourceHref: `/admin/applications?q=${encodeURIComponent(app.id)}`,
            idempotencyKey: key,
            createdAt: `${app.createdAt}T12:00:00.000Z`,
          });
        }
      }
    } catch {}
  }

  return Array.from(byKey.values())
    .filter((evt) => hasPermission(actor, evt.module, "view"))
    .filter((evt) => {
      if (actor.isSuperAdmin || actor.scope === "all") return true;
      if (evt.entityType === "lead" || evt.entityType === "booking") {
        return Boolean(authorizedLeadIds && authorizedLeadIds.has(evt.entityId));
      }
      return true;
    })
    .filter((evt) => (!cutoffMs ? true : new Date(evt.createdAt).getTime() >= cutoffMs))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Deterministic event-driven operational briefing — executes ZERO expensive LLM
 * calls on dashboard load while surfacing verified alerts, upcoming meetings,
 * overdue follow-ups, stalled deals, and recruitment updates strictly within
 * the calling user's RBAC permissions.
 */
export async function buildMorningBriefing(actor: AuthActor): Promise<MorningBriefingData> {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const staleCutoff = now - 5 * 24 * 60 * 60 * 1000;

  const canCrm = hasPermission(actor, "crm", "view") || hasPermission(actor, "bookings", "view");
  const canHr = hasPermission(actor, "recruitment", "view");
  const canTasks = hasPermission(actor, "tasks", "view");

  const [scopedLeads, tasks, metrics, recentApps] = await Promise.all([
    canCrm ? listAuthorizedCrmLeads(actor) : Promise.resolve([]),
    canTasks ? listTasks(actor, { status: "active" }) : Promise.resolve([]),
    canHr ? getMetrics().catch(() => null) : Promise.resolve(null),
    canHr ? getApplications().catch(() => []) : Promise.resolve([]),
  ]);

  const newLeads24h = scopedLeads.filter(
    (l) => new Date(l.createdAt).getTime() >= dayAgo
  );

  const upcomingBookings = scopedLeads
    .filter(
      (l) =>
        l.scheduledSlotIso &&
        l.stage !== "lost" &&
        new Date(l.scheduledSlotIso).getTime() >= now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledSlotIso!).getTime() - new Date(b.scheduledSlotIso!).getTime()
    );

  const overdueFollowUps = scopedLeads.filter((l) => {
    if (l.stage === "won" || l.stage === "lost") return false;
    if (l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() < now) return true;
    return l.stage === "new_lead" && new Date(l.updatedAt).getTime() < dayAgo;
  });

  const stalledDeals = scopedLeads.filter((l) => {
    if (l.stage === "won" || l.stage === "lost") return false;
    return new Date(l.updatedAt).getTime() < staleCutoff;
  });

  const overdueTasks = tasks.filter(
    (t) => Boolean(t.dueAt) && new Date(t.dueAt!).getTime() < now
  );

  const alerts: MorningBriefingData["alerts"] = [];

  for (const call of upcomingBookings.slice(0, 3)) {
    const hoursUntil = Math.round(
      (new Date(call.scheduledSlotIso!).getTime() - now) / (60 * 60 * 1000)
    );
    alerts.push({
      id: `alert-call-${call.id}`,
      severity: hoursUntil <= 24 ? "urgent" : "attention",
      title: `Discovery call prep: ${call.company || call.fullName}`,
      detail: `${call.serviceTrack} · ${
        hoursUntil <= 1
          ? "Starting within 1 hour"
          : `In ~${hoursUntil}h (${call.timezone})`
      }`,
      href: `/admin/crm?lead=${encodeURIComponent(call.id)}`,
      module: "bookings",
    });
  }

  for (const lead of overdueFollowUps.slice(0, 3)) {
    alerts.push({
      id: `alert-followup-${lead.id}`,
      severity: "attention",
      title: `Follow-up needed: ${lead.company || lead.fullName}`,
      detail: `${lead.referenceId} · Stage: ${lead.stage.replace(/_/g, " ")}`,
      href: `/admin/crm?lead=${encodeURIComponent(lead.id)}`,
      module: "crm",
    });
  }

  for (const task of overdueTasks.slice(0, 3)) {
    alerts.push({
      id: `alert-task-${task.id}`,
      severity: "urgent",
      title: `Overdue task: ${task.title}`,
      detail: `Due ${task.dueAt ? new Date(task.dueAt).toLocaleDateString("en-US") : "past due"}${
        task.entityLabel ? ` · ${task.entityLabel}` : ""
      }`,
      href:
        task.entityType === "lead" && task.entityId
          ? `/admin/crm?lead=${encodeURIComponent(task.entityId)}`
          : "/admin/agent",
      module: "tasks",
    });
  }

  if (canHr && metrics && metrics.newApplications > 0) {
    alerts.push({
      id: "alert-hr-new",
      severity: metrics.applicationsToday > 0 ? "attention" : "info",
      title: `${metrics.newApplications} unreviewed recruitment application${
        metrics.newApplications === 1 ? "" : "s"
      }`,
      detail: `${metrics.applicationsToday} received today across ${metrics.activeJobs} open role${
        metrics.activeJobs === 1 ? "" : "s"
      }.`,
      href: "/admin/applications",
      module: "recruitment",
    });
  }

  const bullets: string[] = [];
  if (canCrm) {
    bullets.push(
      `${newLeads24h.length} new lead${newLeads24h.length === 1 ? "" : "s"} in the last 24h · ${
        upcomingBookings.length
      } upcoming discovery call${upcomingBookings.length === 1 ? "" : "s"} · ${
        overdueFollowUps.length
      } follow-up${overdueFollowUps.length === 1 ? "" : "s"} needing attention.`
    );
  }
  if (canHr && metrics) {
    bullets.push(
      `Recruitment: ${metrics.applicationsToday} application${
        metrics.applicationsToday === 1 ? "" : "s"
      } today (${metrics.newApplications} awaiting initial review, ${metrics.interviews} in interview).`
    );
  }
  if (canTasks) {
    bullets.push(
      `Tasks: ${tasks.length} active (${overdueTasks.length} overdue).`
    );
  }
  if (bullets.length === 0) {
    bullets.push(
      `Signed in as ${actor.roleLabel} (${actor.scope} scope). Ask HIRZEXA Intelligence anything within your authorized modules.`
    );
  }

  const sourcesMap = new Map<string, AgentCitation>();
  const addSource = (citation: AgentCitation) => {
    if (sourcesMap.size < 10 && !sourcesMap.has(citation.href)) {
      sourcesMap.set(citation.href, citation);
    }
  };

  for (const lead of [...upcomingBookings.slice(0, 3), ...newLeads24h.slice(0, 3), ...overdueFollowUps.slice(0, 2)]) {
    addSource({
      label: `${lead.company || lead.fullName} (${lead.referenceId})`,
      href: `/admin/crm?lead=${encodeURIComponent(lead.id)}`,
      entityType: lead.leadType === "discovery_call" ? "booking" : "lead",
      entityId: lead.id,
    });
  }

  for (const app of recentApps.slice(0, 3)) {
    addSource({
      label: `${app.name} — ${app.jobTitle} (${app.id})`,
      href: `/admin/applications?q=${encodeURIComponent(app.id)}`,
      entityType: "application",
      entityId: app.id,
    });
  }

  for (const task of overdueTasks.slice(0, 2)) {
    addSource({
      label: `Task: ${task.title}`,
      href:
        task.entityType === "lead" && task.entityId
          ? `/admin/crm?lead=${encodeURIComponent(task.entityId)}`
          : "/admin",
      entityType: "task",
      entityId: task.id,
    });
  }

  const urgentCount = alerts.filter((a) => a.severity === "urgent").length;
  const headline =
    urgentCount > 0
      ? `${urgentCount} time-sensitive item${urgentCount === 1 ? "" : "s"} require attention today.`
      : alerts.length > 0
      ? `${alerts.length} operational update${alerts.length === 1 ? "" : "s"} ready for review.`
      : "Operations are clear — no overdue tasks or urgent alerts right now.";

  return {
    generatedAt: new Date().toISOString(),
    headline,
    summaryBullets: bullets,
    alerts: alerts.slice(0, 8),
    sources: Array.from(sourcesMap.values()),
    aiSynthesis: null,
    counts: {
      newLeads24h: newLeads24h.length,
      upcomingBookings: upcomingBookings.length,
      overdueFollowUps: overdueFollowUps.length,
      stalledDeals: stalledDeals.length,
      newApplications24h: metrics?.applicationsToday || 0,
      openTasks: tasks.length,
      overdueTasks: overdueTasks.length,
    },
  };
}
