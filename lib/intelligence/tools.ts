import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  getScopedMetrics,
  getWorkspaceProfileForActor,
} from "@/lib/authorization";
import {
  getAuthorizedCrmLeadById,
  listAuthorizedCrmLeads,
  updateCrmLead,
} from "@/lib/crm";
import {
  canTransitionStage,
  CRM_STAGE_LABELS,
  CRM_STAGES,
  type CrmStage,
} from "@/lib/crm-types";
import { getAdminJobs, getApplications } from "@/lib/db";
import { listAuditLogs, recordAuditLog } from "@/lib/intelligence/audit";
import { listEmployees } from "@/lib/intelligence/employees";
import {
  buildMorningBriefing,
  emitBusinessEvent,
  listBusinessEvents,
} from "@/lib/intelligence/events";
import {
  isLocalFallbackAllowed,
  readLocalCollection,
  writeLocalCollection,
} from "@/lib/intelligence/store";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createTask, listTasks } from "@/lib/intelligence/tasks";
import {
  assertPermission,
  hasPermission,
  RbacDeniedError,
  ROLE_TEMPLATES,
  type AuthActor,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/rbac";
import type {
  AgentCitation,
  AgentPendingAction,
  AgentToolTrace,
} from "@/lib/intelligence/types";

const PENDING_ACTION_TTL_MS = 15 * 60 * 1000;
const memoryPendingActions = new Map<string, AgentPendingAction>();

export function sanitizeUntrustedText(value: unknown, maxLen = 480): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ")
    .replace(/<\/?(?:system|assistant|tool|instruction|prompt)[^>]*>/gi, "[redacted-tag]")
    .trim()
    .slice(0, maxLen);
}

export async function savePendingAction(action: AgentPendingAction): Promise<void> {
  if (isLocalFallbackAllowed()) {
    memoryPendingActions.set(action.id, action);
    const disk = await readLocalCollection<AgentPendingAction>("pending-actions");
    await writeLocalCollection(
      "pending-actions",
      [action, ...disk.filter((x) => x.id !== action.id)].slice(0, 150)
    );
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from("agent_pending_actions").upsert({
        id: action.id,
        conversation_id: action.conversationId,
        actor_id: action.actorId,
        actor_email: action.actorEmail,
        tool_name: action.toolName,
        summary: action.summary,
        args: { ...action.args, __title: action.title, __preview: action.preview },
        status: action.status,
        execution_result: action.executionResult || null,
        expires_at: action.expiresAt,
        created_at: action.createdAt,
        resolved_at: action.resolvedAt || null,
      });
    } catch {}
  }
}

export async function getPendingActionById(id: string): Promise<AgentPendingAction | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("agent_pending_actions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        const rawArgs =
          data.args && typeof data.args === "object"
            ? (data.args as Record<string, unknown>)
            : {};
        const title =
          typeof rawArgs.__title === "string"
            ? rawArgs.__title
            : `Confirm ${String(data.tool_name)}`;
        const preview =
          rawArgs.__preview && typeof rawArgs.__preview === "object"
            ? (rawArgs.__preview as Record<string, unknown>)
            : rawArgs;
        return {
          id: String(data.id),
          conversationId: String(data.conversation_id),
          actorId: String(data.actor_id),
          actorEmail: String(data.actor_email),
          toolName: data.tool_name as AgentPendingAction["toolName"],
          title,
          summary: String(data.summary),
          preview,
          args: rawArgs,
          status: data.status as AgentPendingAction["status"],
          executionResult:
            data.execution_result && typeof data.execution_result === "object"
              ? (data.execution_result as Record<string, unknown>)
              : null,
          expiresAt: String(data.expires_at),
          createdAt: String(data.created_at),
          resolvedAt: data.resolved_at ? String(data.resolved_at) : null,
        };
      }
    } catch {}
  }

  if (isLocalFallbackAllowed()) {
    const mem = memoryPendingActions.get(id);
    if (mem) return mem;
    const disk = await readLocalCollection<AgentPendingAction>("pending-actions");
    return disk.find((x) => x.id === id) || null;
  }
  return null;
}

export interface ToolExecutionResult {
  ok: boolean;
  denied?: boolean;
  requiresConfirmation?: boolean;
  data?: unknown;
  error?: string;
  citations: AgentCitation[];
  pendingAction?: AgentPendingAction;
  trace: AgentToolTrace;
}

interface RegisteredTool<TInput> {
  name: string;
  description: string;
  module: PermissionModule;
  action: PermissionAction;
  schema: z.ZodType<TInput>;
  requiresConfirmation?: boolean;
  execute: (
    actor: AuthActor,
    args: TInput,
    meta: { conversationId: string }
  ) => Promise<{
    data: unknown;
    summary: string;
    citations?: AgentCitation[];
    pendingAction?: AgentPendingAction;
  }>;
}

const getBusinessOverviewTool: RegisteredTool<{ hoursBack?: number }> = {
  name: "get_business_overview",
  description: "Returns real operational counts, alerts, and morning briefing strictly filtered by the user's effective permissions and record scope.",
  module: "dashboard",
  action: "view",
  schema: z.object({ hoursBack: z.number().int().min(1).max(720).optional() }),
  async execute(actor) {
    const [briefing, scopedMetrics] = await Promise.all([
      buildMorningBriefing(actor),
      getScopedMetrics(actor),
    ]);
    const workspace = getWorkspaceProfileForActor(actor);
    return {
      summary: briefing.headline,
      data: {
        workspaceTitle: workspace.titleEn,
        scope: actor.scope,
        briefing,
        traffic:
          scopedMetrics &&
          (scopedMetrics.totalVisitors !== null || scopedMetrics.activeJobs !== null)
            ? {
                totalVisitors: scopedMetrics.totalVisitors,
                visitorsToday: scopedMetrics.visitorsToday,
                activeJobs: scopedMetrics.activeJobs,
              }
            : null,
      },
      citations: [
        {
          label: workspace.titleEn,
          href: "/admin",
          entityType: "dashboard",
          entityId: "overview",
        },
      ],
    };
  },
};

const getRecentEventsTool: RegisteredTool<{ hoursBack?: number; limit?: number }> = {
  name: "get_recent_events",
  description: "Lists recent business events across authorized modules.",
  module: "dashboard",
  action: "view",
  schema: z.object({
    hoursBack: z.number().int().min(1).max(720).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async execute(actor, args) {
    const events = await listBusinessEvents(actor, {
      hoursBack: args.hoursBack,
      limit: args.limit ?? 15,
    });
    return {
      summary: `Retrieved ${events.length} authorized business event(s).`,
      data: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        module: e.module,
        severity: e.severity,
        title: sanitizeUntrustedText(e.title, 180),
        summary: sanitizeUntrustedText(e.summary, 300),
        sourceHref: e.sourceHref,
        createdAt: e.createdAt,
      })),
      citations: events.slice(0, 6).map((e) => ({
        label: e.title,
        href: e.sourceHref,
        entityType:
          e.entityType === "lead" || e.entityType === "application"
            ? e.entityType
            : "dashboard",
        entityId: e.entityId,
      })),
    };
  },
};

const listDiscoveryBookingsTool: RegisteredTool<{ upcomingOnly?: boolean; limit?: number }> = {
  name: "list_discovery_bookings",
  description: "Lists real discovery call bookings from the CRM.",
  module: "bookings",
  action: "view",
  schema: z.object({
    upcomingOnly: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async execute(actor, args) {
    const now = Date.now();
    let bookings = (await listAuthorizedCrmLeads(actor)).filter(
      (l) => l.leadType === "discovery_call"
    );

    if (args.upcomingOnly) {
      bookings = bookings.filter(
        (b) => b.scheduledSlotIso && b.stage !== "lost" && new Date(b.scheduledSlotIso).getTime() >= now
      );
    }

    const sliced = bookings.slice(0, args.limit ?? 15);
    return {
      summary: `Found ${bookings.length} discovery call booking(s).`,
      data: sliced.map((b) => ({
        id: b.id,
        referenceId: b.referenceId,
        company: sanitizeUntrustedText(b.company, 120),
        fullName: sanitizeUntrustedText(b.fullName, 100),
        email: b.email,
        serviceTrack: b.serviceTrack,
        stage: b.stage,
        stageLabel: CRM_STAGE_LABELS[b.stage].en,
        scheduledSlotIso: b.scheduledSlotIso,
        preferredWindow: sanitizeUntrustedText(b.preferredWindow, 140),
        timezone: b.timezone,
        durationMinutes: b.durationMinutes,
        nextFollowUpAt: b.nextFollowUpAt,
        createdAt: b.createdAt,
      })),
      citations: sliced.slice(0, 6).map((b) => ({
        label: `${b.company || b.fullName} (${b.referenceId})`,
        href: `/admin/crm?lead=${encodeURIComponent(b.id)}`,
        entityType: "booking",
        entityId: b.id,
      })),
    };
  },
};

const getBookingDetailsTool: RegisteredTool<{ query: string }> = {
  name: "get_booking_details",
  description: "Fetches full details of a specific discovery booking by ID, reference ID, company, or email.",
  module: "bookings",
  action: "view",
  schema: z.object({ query: z.string().trim().min(1).max(160) }),
  async execute(actor, args) {
    const q = args.query.toLowerCase();
    const match = (await listAuthorizedCrmLeads(actor)).find(
      (l) =>
        l.id.toLowerCase() === q ||
        l.referenceId.toLowerCase() === q ||
        l.company.toLowerCase().includes(q) ||
        l.fullName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
    );

    if (!match) {
      return { summary: `No booking matched "${args.query}".`, data: null, citations: [] };
    }

    return {
      summary: `Loaded booking ${match.referenceId} (${match.company || match.fullName}).`,
      data: {
        id: match.id,
        referenceId: match.referenceId,
        fullName: sanitizeUntrustedText(match.fullName, 100),
        email: match.email,
        company: sanitizeUntrustedText(match.company, 120),
        roleTitle: sanitizeUntrustedText(match.roleTitle, 100),
        serviceTrack: match.serviceTrack,
        stage: match.stage,
        scheduledSlotIso: match.scheduledSlotIso,
        timezone: match.timezone,
        durationMinutes: match.durationMinutes,
        meetingLink: match.meetingLink,
        budgetRange: match.budgetRange,
        projectSummary: sanitizeUntrustedText(match.projectSummary, 600),
        notes: sanitizeUntrustedText(match.notes, 400),
        activities: match.activities.slice(0, 8),
      },
      citations: [
        {
          label: `${match.company || match.fullName} (${match.referenceId})`,
          href: `/admin/crm?lead=${encodeURIComponent(match.id)}`,
          entityType: "booking",
          entityId: match.id,
        },
      ],
    };
  },
};

const listJobApplicationsTool: RegisteredTool<{
  jobQuery?: string;
  status?: string;
  limit?: number;
}> = {
  name: "list_job_applications",
  description: "Lists real candidate job applications from Supabase.",
  module: "recruitment",
  action: "view",
  schema: z.object({
    jobQuery: z.string().trim().max(140).optional(),
    status: z.string().trim().max(40).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async execute(_actor, args) {
    let apps = await getApplications({
      status: args.status && args.status !== "all" ? args.status : undefined,
    });
    if (args.jobQuery) {
      const q = args.jobQuery.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.jobTitle.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.technologies.toLowerCase().includes(q)
      );
    }
    const sliced = apps.slice(0, args.limit ?? 20);
    return {
      summary: `Found ${apps.length} recruitment application(s).`,
      data: sliced.map((a) => ({
        referenceId: a.id,
        name: sanitizeUntrustedText(a.name, 100),
        email: a.email,
        jobTitle: sanitizeUntrustedText(a.jobTitle, 140),
        status: a.status,
        experience: sanitizeUntrustedText(a.experience, 80),
        country: sanitizeUntrustedText(a.country, 80),
        technologies: sanitizeUntrustedText(a.technologies, 240),
        whyFit: sanitizeUntrustedText(a.whyFit, 260),
        createdAt: a.createdAt,
      })),
      citations: sliced.slice(0, 6).map((a) => ({
        label: `${a.name} — ${a.jobTitle} (${a.id})`,
        href: `/admin/applications?q=${encodeURIComponent(a.id)}`,
        entityType: "application",
        entityId: a.id,
      })),
    };
  },
};

const getCandidateProfileTool: RegisteredTool<{ query: string }> = {
  name: "get_candidate_profile",
  description: "Retrieves verified applicant profile details by reference ID, name, or email.",
  module: "recruitment",
  action: "view",
  schema: z.object({ query: z.string().trim().min(1).max(160) }),
  async execute(_actor, args) {
    const q = args.query.toLowerCase();
    const apps = await getApplications();
    const candidate = apps.find(
      (a) =>
        a.id.toLowerCase() === q ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
    if (!candidate) {
      return { summary: `No applicant matched "${args.query}".`, data: null, citations: [] };
    }
    return {
      summary: `Loaded candidate ${candidate.name} (${candidate.id}) for ${candidate.jobTitle}.`,
      data: {
        referenceId: candidate.id,
        name: sanitizeUntrustedText(candidate.name, 120),
        email: candidate.email,
        jobId: candidate.jobId,
        jobTitle: sanitizeUntrustedText(candidate.jobTitle, 140),
        status: candidate.status,
        role: sanitizeUntrustedText(candidate.role, 120),
        experience: sanitizeUntrustedText(candidate.experience, 100),
        education: sanitizeUntrustedText(candidate.education, 180),
        technologies: sanitizeUntrustedText(candidate.technologies, 380),
        country: sanitizeUntrustedText(candidate.country, 80),
        location: sanitizeUntrustedText(candidate.location, 100),
        availability: sanitizeUntrustedText(candidate.availability, 100),
        startDate: candidate.startDate,
        whyJoin: sanitizeUntrustedText(candidate.whyJoin, 380),
        whyFit: sanitizeUntrustedText(candidate.whyFit, 380),
        note: sanitizeUntrustedText(candidate.note, 260),
        createdAt: candidate.createdAt,
      },
      citations: [
        {
          label: `${candidate.name} (${candidate.id})`,
          href: `/admin/applications?q=${encodeURIComponent(candidate.id)}`,
          entityType: "application",
          entityId: candidate.id,
        },
      ],
    };
  },
};

const getJobRequirementsTool: RegisteredTool<{ query?: string }> = {
  name: "get_job_requirements",
  description: "Retrieves job descriptions, responsibilities, requirements, and required skills.",
  module: "jobs",
  action: "view",
  schema: z.object({ query: z.string().trim().max(140).optional() }),
  async execute(_actor, args) {
    let jobs = await getAdminJobs();
    if (args.query) {
      const q = args.query.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.slug.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q)
      );
    }
    const sliced = jobs.slice(0, 12);
    return {
      summary: `Retrieved ${sliced.length} job specification(s).`,
      data: sliced.map((j) => ({
        id: j.id,
        title: j.title,
        slug: j.slug,
        department: j.department,
        status: j.status,
        employmentType: j.employmentType,
        workMode: j.workMode,
        skills: j.skills,
        requirements: j.requirements,
        responsibilities: j.responsibilities.slice(0, 5),
      })),
      citations: sliced.slice(0, 5).map((j) => ({
        label: `${j.title} (${j.status})`,
        href: `/admin/jobs`,
        entityType: "job",
        entityId: j.id,
      })),
    };
  },
};

const listSalesLeadsTool: RegisteredTool<{
  stage?: string;
  needsFollowUp?: boolean;
  query?: string;
  limit?: number;
}> = {
  name: "list_sales_leads",
  description: "Lists real B2B CRM leads, optionally filtered by stage, follow-up urgency, or search text.",
  module: "crm",
  action: "view",
  schema: z.object({
    stage: z.string().trim().max(40).optional(),
    needsFollowUp: z.boolean().optional(),
    query: z.string().trim().max(140).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async execute(actor, args) {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    let leads = await listAuthorizedCrmLeads(actor);

    if (args.stage && args.stage !== "all") {
      leads = leads.filter((l) => l.stage === args.stage);
    }
    if (args.needsFollowUp) {
      leads = leads.filter((l) => {
        if (l.stage === "won" || l.stage === "lost") return false;
        const hasOverdueFollowUp =
          Boolean(l.nextFollowUpAt) && new Date(l.nextFollowUpAt!).getTime() < now;
        const untouchedNew =
          l.stage === "new_lead" && new Date(l.updatedAt).getTime() < dayAgo;
        const noActivitiesAfterCreate = l.activities.length <= 1;
        return hasOverdueFollowUp || untouchedNew || noActivitiesAfterCreate;
      });
    }
    if (args.query) {
      const q = args.query.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.company.toLowerCase().includes(q) ||
          l.fullName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.referenceId.toLowerCase().includes(q) ||
          l.serviceTrack.toLowerCase().includes(q)
      );
    }

    const sliced = leads.slice(0, args.limit ?? 20);
    return {
      summary: `Found ${leads.length} matching CRM lead(s).`,
      data: sliced.map((l) => ({
        id: l.id,
        referenceId: l.referenceId,
        leadType: l.leadType,
        stage: l.stage,
        stageLabel: CRM_STAGE_LABELS[l.stage].en,
        company: sanitizeUntrustedText(l.company, 120),
        fullName: sanitizeUntrustedText(l.fullName, 100),
        email: l.email,
        serviceTrack: l.serviceTrack,
        budgetRange: l.budgetRange,
        ownerEmail: l.ownerEmail || null,
        scheduledSlotIso: l.scheduledSlotIso,
        nextFollowUpAt: l.nextFollowUpAt,
        activityCount: l.activities.length,
        updatedAt: l.updatedAt,
      })),
      citations: sliced.slice(0, 6).map((l) => ({
        label: `${l.company || l.fullName} (${l.referenceId})`,
        href: `/admin/crm?lead=${encodeURIComponent(l.id)}`,
        entityType: "lead",
        entityId: l.id,
      })),
    };
  },
};

const getLeadHistoryTool: RegisteredTool<{ leadIdOrQuery: string }> = {
  name: "get_lead_history",
  description: "Retrieves full lead record, timeline activities, notes, meetings, and linked tasks.",
  module: "crm",
  action: "view",
  schema: z.object({ leadIdOrQuery: z.string().trim().min(1).max(160) }),
  async execute(actor, args) {
    const q = args.leadIdOrQuery.toLowerCase();
    const leads = await listAuthorizedCrmLeads(actor);
    const lead = leads.find(
      (l) =>
        l.id.toLowerCase() === q ||
        l.referenceId.toLowerCase() === q ||
        l.company.toLowerCase().includes(q) ||
        l.fullName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
    );
    if (!lead) {
      return {
        summary: `No authorized CRM lead matched "${args.leadIdOrQuery}".`,
        data: null,
        citations: [],
      };
    }

    const linkedTasks = hasPermission(actor, "tasks", "view")
      ? await listTasks(actor, { entityId: lead.id })
      : [];

    return {
      summary: `Loaded complete history for ${lead.company || lead.fullName} (${lead.referenceId}).`,
      data: {
        id: lead.id,
        referenceId: lead.referenceId,
        leadType: lead.leadType,
        stage: lead.stage,
        stageLabel: CRM_STAGE_LABELS[lead.stage].en,
        fullName: sanitizeUntrustedText(lead.fullName, 100),
        company: sanitizeUntrustedText(lead.company, 120),
        roleTitle: sanitizeUntrustedText(lead.roleTitle, 100),
        email: lead.email,
        phone: lead.phone,
        serviceTrack: lead.serviceTrack,
        budgetRange: lead.budgetRange,
        timeline: lead.timeline,
        scheduledSlotIso: lead.scheduledSlotIso,
        timezone: lead.timezone,
        meetingLink: lead.meetingLink,
        nextFollowUpAt: lead.nextFollowUpAt,
        ownerEmail: lead.ownerEmail || null,
        projectSummary: sanitizeUntrustedText(lead.projectSummary, 600),
        currentStack: sanitizeUntrustedText(lead.currentStack, 200),
        notes: sanitizeUntrustedText(lead.notes, 480),
        activities: lead.activities.slice(0, 12),
        tasks: linkedTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueAt: t.dueAt,
        })),
      },
      citations: [
        {
          label: `${lead.company || lead.fullName} (${lead.referenceId})`,
          href: `/admin/crm?lead=${encodeURIComponent(lead.id)}`,
          entityType: "lead",
          entityId: lead.id,
        },
      ],
    };
  },
};

const getPipelineSummaryTool: RegisteredTool<Record<string, never>> = {
  name: "get_pipeline_summary",
  description: "Summarizes real CRM lead distribution across pipeline stages without fabricating revenue.",
  module: "crm",
  action: "view",
  schema: z.object({}),
  async execute(actor) {
    const leads = await listAuthorizedCrmLeads(actor);
    const byStage = CRM_STAGES.map((stage) => ({
      stage,
      label: CRM_STAGE_LABELS[stage].en,
      count: leads.filter((l) => l.stage === stage).length,
    }));
    const activeOpportunities = leads.filter(
      (l) => l.stage !== "won" && l.stage !== "lost"
    ).length;

    return {
      summary: `Pipeline contains ${leads.length} total lead(s), ${activeOpportunities} active.`,
      data: {
        totalLeads: leads.length,
        activeOpportunities,
        discoveryCalls: leads.filter((l) => l.leadType === "discovery_call").length,
        proposalRequests: leads.filter((l) => l.leadType === "proposal_request").length,
        byStage,
        note: "Counts reflect verified CRM records only; no unverified revenue is fabricated.",
      },
      citations: [
        {
          label: "Sales CRM Pipeline",
          href: "/admin/crm",
          entityType: "dashboard",
          entityId: "crm-pipeline",
        },
      ],
    };
  },
};

const listOverdueTasksTool: RegisteredTool<{ includeAllOpen?: boolean }> = {
  name: "list_overdue_tasks",
  description: "Lists overdue (and optionally open) follow-up tasks authorized for the current user.",
  module: "tasks",
  action: "view",
  schema: z.object({ includeAllOpen: z.boolean().optional() }),
  async execute(actor, args) {
    const overdue = await listTasks(actor, { overdueOnly: true });
    const open = args.includeAllOpen ? await listTasks(actor, { status: "active" }) : overdue;
    return {
      summary: `Found ${overdue.length} overdue task(s) (${open.length} shown).`,
      data: {
        overdueCount: overdue.length,
        tasks: open.slice(0, 20).map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          dueAt: t.dueAt,
          entityLabel: t.entityLabel,
          assignedToEmail: t.assignedToEmail,
        })),
      },
      citations: open.slice(0, 5).map((t) => ({
        label: t.title,
        href:
          t.entityType === "lead" && t.entityId
            ? `/admin/crm?lead=${encodeURIComponent(t.entityId)}`
            : "/admin",
        entityType: "task",
        entityId: t.id,
      })),
    };
  },
};

const createFollowupTaskTool: RegisteredTool<{
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  dueAt?: string;
  entityType?: "lead" | "booking" | "application" | "job" | "general";
  entityId?: string;
  entityLabel?: string;
}> = {
  name: "create_followup_task",
  description: "Stages a follow-up task creation preview requiring explicit human confirmation before writing.",
  module: "tasks",
  action: "create",
  requiresConfirmation: true,
  schema: z.object({
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().max(1000).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    dueAt: z.string().trim().max(40).optional(),
    entityType: z.enum(["lead", "booking", "application", "job", "general"]).optional(),
    entityId: z.string().trim().max(120).optional(),
    entityLabel: z.string().trim().max(140).optional(),
  }),
  async execute(actor, args, meta) {
    const now = Date.now();
    const dueIso = args.dueAt || new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const pendingAction: AgentPendingAction = {
      id: randomUUID(),
      conversationId: meta.conversationId,
      actorId: actor.id,
      actorEmail: actor.email,
      toolName: "create_followup_task",
      title: "Confirm Follow-Up Task Creation",
      summary: `Create ${args.priority || "normal"}-priority task "${args.title}" assigned to ${actor.email}.`,
      preview: {
        title: args.title,
        description: args.description || "",
        priority: args.priority || "normal",
        dueAt: dueIso,
        entityLabel: args.entityLabel || "General Operations",
        assignedTo: actor.email,
      },
      args: { ...args, dueAt: dueIso },
      status: "pending",
      expiresAt: new Date(now + PENDING_ACTION_TTL_MS).toISOString(),
      createdAt: new Date(now).toISOString(),
    };
    await savePendingAction(pendingAction);
    return {
      summary: "Prepared follow-up task preview awaiting confirmation.",
      data: { pendingActionId: pendingAction.id, preview: pendingAction.preview },
      pendingAction,
    };
  },
};

const updateLeadStageTool: RegisteredTool<{
  leadIdOrQuery: string;
  newStage: CrmStage;
  note?: string;
}> = {
  name: "update_lead_stage",
  description: "Validates a CRM pipeline stage update and stages an approval preview before mutating.",
  module: "crm",
  action: "edit",
  requiresConfirmation: true,
  schema: z.object({
    leadIdOrQuery: z.string().trim().min(1).max(160),
    newStage: z.enum(CRM_STAGES),
    note: z.string().trim().max(400).optional(),
  }),
  async execute(actor, args, meta) {
    const q = args.leadIdOrQuery.toLowerCase();
    const lead = (await listAuthorizedCrmLeads(actor)).find(
      (l) =>
        l.id.toLowerCase() === q ||
        l.referenceId.toLowerCase() === q ||
        l.company.toLowerCase().includes(q) ||
        l.fullName.toLowerCase().includes(q)
    );

    if (!lead) {
      throw new Error(`Lead "${args.leadIdOrQuery}" not found within your authorized scope.`);
    }

    if (!actor.isSuperAdmin && !canTransitionStage(lead.stage, args.newStage)) {
      throw new Error(
        `Invalid pipeline transition from ${CRM_STAGE_LABELS[lead.stage].en} to ${CRM_STAGE_LABELS[args.newStage].en}.`
      );
    }

    const now = Date.now();
    const pendingAction: AgentPendingAction = {
      id: randomUUID(),
      conversationId: meta.conversationId,
      actorId: actor.id,
      actorEmail: actor.email,
      toolName: "update_lead_stage",
      title: "Confirm CRM Pipeline Stage Change",
      summary: `Move ${lead.company || lead.fullName} (${lead.referenceId}) from ${CRM_STAGE_LABELS[lead.stage].en} → ${CRM_STAGE_LABELS[args.newStage].en}.`,
      preview: {
        referenceId: lead.referenceId,
        client: lead.company || lead.fullName,
        fromStage: CRM_STAGE_LABELS[lead.stage].en,
        toStage: CRM_STAGE_LABELS[args.newStage].en,
        note: args.note || "",
      },
      args: { leadId: lead.id, newStage: args.newStage, note: args.note || "" },
      status: "pending",
      expiresAt: new Date(now + PENDING_ACTION_TTL_MS).toISOString(),
      createdAt: new Date(now).toISOString(),
    };
    await savePendingAction(pendingAction);
    return {
      summary: "Prepared CRM stage transition preview awaiting human confirmation.",
      data: { pendingActionId: pendingAction.id, preview: pendingAction.preview },
      pendingAction,
      citations: [
        {
          label: `${lead.company || lead.fullName} (${lead.referenceId})`,
          href: `/admin/crm?lead=${encodeURIComponent(lead.id)}`,
          entityType: "lead",
          entityId: lead.id,
        },
      ],
    };
  },
};

const draftClientEmailTool: RegisteredTool<{
  recipientType: "lead" | "candidate";
  query: string;
  purpose: "followup" | "interview_invite" | "proposal_followup";
  locale?: "en" | "ar";
}> = {
  name: "draft_client_email",
  description: "Generates an editable email draft grounded in an authorized lead or candidate record. Never sends external email autonomously.",
  module: "crm",
  action: "view",
  schema: z.object({
    recipientType: z.enum(["lead", "candidate"]),
    query: z.string().trim().min(1).max(160),
    purpose: z.enum(["followup", "interview_invite", "proposal_followup"]),
    locale: z.enum(["en", "ar"]).optional(),
  }),
  async execute(actor, args) {
    const ar = args.locale === "ar";
    const q = args.query.toLowerCase();

    if (args.recipientType === "candidate") {
      assertPermission(actor, "recruitment", "view");
      const apps = await getApplications();
      const cand = apps.find(
        (a) =>
          a.id.toLowerCase() === q ||
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
      );
      if (!cand) {
        return { summary: `No applicant matched "${args.query}".`, data: null, citations: [] };
      }
      const subject = ar
        ? `دعوة لمقابلة — وظيفة ${cand.jobTitle} في HIRZEXA (${cand.id})`
        : `Interview Invitation — ${cand.jobTitle} at HIRZEXA (${cand.id})`;
      const body = ar
        ? `مرحباً ${cand.name}،\n\nشكراً لتقديمك على فرصة "${cand.jobTitle}" لدى HIRZEXA (المرجع: ${cand.id}). يسعدنا دعوتك لمقابلة عن بُعد لمناقشة خبرتك وملاءمتك للدور.\n\nيرجى الرد بأوقاتك المناسبة خلال الأسبوع الحالي.\n\nمع التحية،\nفريق التوظيف — HIRZEXA`
        : `Hello ${cand.name},\n\nThank you for applying for the ${cand.jobTitle} role at HIRZEXA (Ref: ${cand.id}). After reviewing your application, we would like to invite you to an online interview to discuss your experience and next steps.\n\nPlease reply with two time windows that work well for you this week.\n\nBest regards,\nHIRZEXA Hiring Team`;
      return {
        summary: `Drafted interview email for ${cand.name} (NOT sent automatically).`,
        data: { to: cand.email, subject, body, sent: false, note: "Draft only — external email is never sent autonomously." },
        citations: [
          {
            label: `${cand.name} (${cand.id})`,
            href: `/admin/applications?q=${encodeURIComponent(cand.id)}`,
            entityType: "application",
            entityId: cand.id,
          },
        ],
      };
    }

    const lead = (await listAuthorizedCrmLeads(actor)).find(
      (l) =>
        l.id.toLowerCase() === q ||
        l.referenceId.toLowerCase() === q ||
        l.company.toLowerCase().includes(q) ||
        l.fullName.toLowerCase().includes(q)
    );
    if (!lead) {
      return { summary: `No lead matched "${args.query}".`, data: null, citations: [] };
    }
    const subject = ar
      ? `متابعة مشروع ${lead.company || lead.fullName} مع HIRZEXA (${lead.referenceId})`
      : `Following up on ${lead.company || lead.fullName} — HIRZEXA (${lead.referenceId})`;
    const body = ar
      ? `مرحباً ${lead.fullName}،\n\nنتابع معكم بخصوص طلبكم في مسار "${lead.serviceTrack}" (المرجع: ${lead.referenceId}). يسعدنا مراجعة المتطلبات الفنية وتحديد الخطوة التالية الأنسب لفريقكم.\n\nمع التحية،\n${actor.fullName}\nHIRZEXA`
      : `Hello ${lead.fullName},\n\nFollowing up regarding your ${lead.serviceTrack} inquiry with HIRZEXA (Ref: ${lead.referenceId}). We would be glad to walk through the technical architecture options and next milestones whenever convenient.\n\nBest regards,\n${actor.fullName}\nHIRZEXA`;

    return {
      summary: `Drafted client follow-up email for ${lead.company || lead.fullName} (NOT sent automatically).`,
      data: { to: lead.email, subject, body, sent: false, note: "Draft only — review and send manually." },
      citations: [
        {
          label: `${lead.company || lead.fullName} (${lead.referenceId})`,
          href: `/admin/crm?lead=${encodeURIComponent(lead.id)}`,
          entityType: "lead",
          entityId: lead.id,
        },
      ],
    };
  },
};

const getEmployeePermissionsTool: RegisteredTool<{ emailOrSelf?: string }> = {
  name: "get_employee_permissions",
  description: "Returns the calling user's own effective permissions, or another employee's permissions if authorized for team:view.",
  module: "dashboard",
  action: "view",
  schema: z.object({ emailOrSelf: z.string().trim().max(160).optional() }),
  async execute(actor, args) {
    const query = args.emailOrSelf?.trim().toLowerCase();
    if (!query || query === "self" || query === actor.email.toLowerCase()) {
      return {
        summary: `Returned effective RBAC permissions for ${actor.email} (${actor.roleLabel}).`,
        data: {
          email: actor.email,
          fullName: actor.fullName,
          roleKey: actor.roleKey,
          roleLabel: actor.roleLabel,
          scope: actor.scope,
          permissions: actor.permissions,
        },
        citations: [],
      };
    }

    assertPermission(actor, "team", "view");
    const employees = await listEmployees();
    const target = employees.find(
      (e) => e.email.toLowerCase().includes(query) || e.fullName.toLowerCase().includes(query)
    );
    if (!target) {
      return { summary: `No employee found matching "${args.emailOrSelf}".`, data: null, citations: [] };
    }
    return {
      summary: `Retrieved RBAC profile for ${target.fullName} (${target.roleKey}).`,
      data: {
        id: target.id,
        fullName: target.fullName,
        email: target.email,
        roleKey: target.roleKey,
        roleLabel: ROLE_TEMPLATES[target.roleKey]?.label || target.roleKey,
        status: target.status,
        scope: target.scopeOverride || ROLE_TEMPLATES[target.roleKey]?.defaultScope || "own",
        permissionOverrides: target.permissionOverrides,
      },
      citations: [
        {
          label: `${target.fullName} (${target.roleKey})`,
          href: "/admin/team",
          entityType: "employee",
          entityId: target.id,
        },
      ],
    };
  },
};

const listTeamDirectoryTool: RegisteredTool<{ query?: string }> = {
  name: "list_team_directory",
  description: "Lists organizational employee accounts and roles. Strictly requires team:view permission. Never exposes payroll/salary data (not stored).",
  module: "team",
  action: "view",
  schema: z.object({ query: z.string().trim().max(120).optional() }),
  async execute(_actor, args) {
    let employees = await listEmployees();
    if (args.query) {
      const q = args.query.toLowerCase();
      employees = employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.roleKey.toLowerCase().includes(q)
      );
    }
    const sliced = employees.slice(0, 25);
    return {
      summary: `Found ${employees.length} employee account(s) in the authorized team directory.`,
      data: {
        totalEmployees: employees.length,
        payrollDataAvailable: false,
        note: "Payroll and employee compensation records are not stored in HIRZEXA Intelligence.",
        employees: sliced.map((e) => ({
          id: e.id,
          fullName: sanitizeUntrustedText(e.fullName, 120),
          email: e.email,
          department: e.department,
          roleKey: e.roleKey,
          roleLabel: ROLE_TEMPLATES[e.roleKey]?.label || e.roleKey,
          scope: e.scopeOverride || ROLE_TEMPLATES[e.roleKey]?.defaultScope || "own",
          status: e.status,
        })),
      },
      citations: [
        {
          label: "Team & Access Directory",
          href: "/admin/team",
          entityType: "employee",
          entityId: "team-directory",
        },
      ],
    };
  },
};

const listAuditLogsTool: RegisteredTool<{ limit?: number }> = {
  name: "list_audit_logs",
  description: "Retrieves immutable security and operational audit logs. Strictly requires audit:view permission.",
  module: "audit",
  action: "view",
  schema: z.object({ limit: z.number().int().min(1).max(30).optional() }),
  async execute(_actor, args) {
    const logs = await listAuditLogs({ limit: args.limit ?? 15 });
    return {
      summary: `Retrieved ${logs.length} security and operational audit log entr${logs.length === 1 ? "y" : "ies"}.`,
      data: logs.map((l) => ({
        id: l.id,
        actorEmail: l.actorEmail,
        actorRole: l.actorRole,
        module: l.module,
        action: l.action,
        outcome: l.outcome,
        summary: sanitizeUntrustedText(l.summary, 240),
        createdAt: l.createdAt,
      })),
      citations: [
        {
          label: "Security Audit Logs",
          href: "/admin/audit",
          entityType: "dashboard",
          entityId: "audit-logs",
        },
      ],
    };
  },
};

export const AGENT_TOOL_REGISTRY = {
  get_business_overview: getBusinessOverviewTool,
  get_recent_events: getRecentEventsTool,
  list_discovery_bookings: listDiscoveryBookingsTool,
  get_booking_details: getBookingDetailsTool,
  list_job_applications: listJobApplicationsTool,
  get_candidate_profile: getCandidateProfileTool,
  get_job_requirements: getJobRequirementsTool,
  list_sales_leads: listSalesLeadsTool,
  get_lead_history: getLeadHistoryTool,
  get_pipeline_summary: getPipelineSummaryTool,
  list_overdue_tasks: listOverdueTasksTool,
  create_followup_task: createFollowupTaskTool,
  update_lead_stage: updateLeadStageTool,
  draft_client_email: draftClientEmailTool,
  get_employee_permissions: getEmployeePermissionsTool,
  list_team_directory: listTeamDirectoryTool,
  list_audit_logs: listAuditLogsTool,
} as const;

export type AgentToolName = keyof typeof AGENT_TOOL_REGISTRY;

export function listRegisteredToolsMetadata() {
  return Object.values(AGENT_TOOL_REGISTRY).map((t) => ({
    name: t.name,
    description: t.description,
    module: t.module,
    action: t.action,
    requiresConfirmation: Boolean(t.requiresConfirmation),
  }));
}

export async function executeAuthorizedTool<TName extends AgentToolName>(
  actor: AuthActor,
  toolName: TName,
  rawArgs: unknown,
  meta: { conversationId: string; inputChannel?: "text" | "voice" }
): Promise<ToolExecutionResult> {
  const started = Date.now();
  const tool = AGENT_TOOL_REGISTRY[toolName] as RegisteredTool<unknown>;
  if (!tool) {
    return {
      ok: false,
      error: `Unknown tool "${toolName}".`,
      citations: [],
      trace: { tool: toolName, status: "error", durationMs: 0, summary: "Unknown tool." },
    };
  }

  // Special case: draft_client_email for candidate checks recruitment:view inside execute
  const needsBaseModule =
    toolName === "draft_client_email" &&
    typeof rawArgs === "object" &&
    rawArgs !== null &&
    (rawArgs as Record<string, unknown>).recipientType === "candidate"
      ? "recruitment"
      : tool.module;

  try {
    assertPermission(actor, needsBaseModule, tool.action);
  } catch (err) {
    const message = err instanceof RbacDeniedError ? err.message : "Permission denied.";
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: needsBaseModule,
      action: `agent:${toolName}`,
      entityType: "agent_tool",
      outcome: "denied",
      summary: message,
      metadata: { inputChannel: meta.inputChannel || "text" },
    });
    return {
      ok: false,
      denied: true,
      error: message,
      citations: [],
      trace: {
        tool: toolName,
        status: "denied",
        durationMs: Date.now() - started,
        summary: message,
      },
    };
  }

  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    const errorText = `Invalid arguments for ${toolName}: ${parsed.error.issues
      .map((i) => i.message)
      .join(", ")}`;
    return {
      ok: false,
      error: errorText,
      citations: [],
      trace: {
        tool: toolName,
        status: "error",
        durationMs: Date.now() - started,
        summary: errorText,
      },
    };
  }

  try {
    const result = await tool.execute(actor, parsed.data, meta);
    const status = result.pendingAction ? "pending_confirmation" : "ok";
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: needsBaseModule,
      action: `agent:${toolName}`,
      entityType: "agent_tool",
      entityId: result.pendingAction?.id || null,
      outcome: result.pendingAction ? "pending_confirmation" : "allowed",
      summary: result.summary,
      metadata: { inputChannel: meta.inputChannel || "text" },
    });

    return {
      ok: true,
      requiresConfirmation: Boolean(result.pendingAction),
      data: result.data,
      citations: result.citations || [],
      pendingAction: result.pendingAction,
      trace: {
        tool: toolName,
        status,
        durationMs: Date.now() - started,
        summary: result.summary,
      },
    };
  } catch (err) {
    if (err instanceof RbacDeniedError) {
      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.roleKey,
        module: err.module,
        action: `agent:${toolName}`,
        entityType: "agent_tool",
        outcome: "denied",
        summary: err.message,
      });
      return {
        ok: false,
        denied: true,
        error: err.message,
        citations: [],
        trace: {
          tool: toolName,
          status: "denied",
          durationMs: Date.now() - started,
          summary: err.message,
        },
      };
    }

    const message = err instanceof Error ? err.message : "Tool execution failed.";
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: needsBaseModule,
      action: `agent:${toolName}`,
      entityType: "agent_tool",
      outcome: "error",
      summary: message,
    });
    return {
      ok: false,
      error: message,
      citations: [],
      trace: {
        tool: toolName,
        status: "error",
        durationMs: Date.now() - started,
        summary: message,
      },
    };
  }
}

export async function confirmAndExecutePendingAction(
  actor: AuthActor,
  actionId: string,
  decision: "approve" | "reject"
): Promise<{
  ok: boolean;
  action?: AgentPendingAction;
  message: string;
}> {
  const pending = await getPendingActionById(actionId);
  if (!pending) {
    return { ok: false, message: "Pending action not found." };
  }
  if (pending.actorId !== actor.id && !actor.isSuperAdmin) {
    return { ok: false, message: "Only the requesting user can confirm this action." };
  }
  if (pending.status !== "pending") {
    return { ok: false, message: `Action already ${pending.status}.`, action: pending };
  }
  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    const expired: AgentPendingAction = {
      ...pending,
      status: "expired",
      resolvedAt: new Date().toISOString(),
    };
    await savePendingAction(expired);
    return { ok: false, message: "This confirmation preview has expired.", action: expired };
  }

  const nowIso = new Date().toISOString();

  if (decision === "reject") {
    const rejected: AgentPendingAction = {
      ...pending,
      status: "rejected",
      resolvedAt: nowIso,
    };
    await savePendingAction(rejected);
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "agent",
      action: `reject:${pending.toolName}`,
      entityType: "agent_pending_action",
      entityId: pending.id,
      outcome: "allowed",
      summary: `User cancelled proposed action: ${pending.summary}`,
    });
    return { ok: true, action: rejected, message: "Action cancelled. No changes were made." };
  }

  // Re-verify RBAC right at execution time!
  if (pending.toolName === "create_followup_task") {
    assertPermission(actor, "tasks", "create");
    const entityType =
      (pending.args.entityType as "lead" | "booking" | "application" | "job" | "general") ||
      "general";
    const entityId = pending.args.entityId ? String(pending.args.entityId) : null;
    if ((entityType === "lead" || entityType === "booking") && entityId) {
      const scopeCheck = await getAuthorizedCrmLeadById(actor, entityId);
      if (scopeCheck.denied || !scopeCheck.lead) {
        await recordAuditLog({
          actorId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.roleKey,
          module: "tasks",
          action: "agent_confirm:create_followup_task",
          entityType: "lead",
          entityId,
          outcome: "denied",
          summary: `Blocked confirmed task creation linked to unauthorized lead ${entityId}.`,
        });
        return {
          ok: false,
          message: "Access denied: you no longer have authorized scope over the linked lead.",
        };
      }
    }
    const task = await createTask(actor, {
      title: String(pending.args.title || "Follow-up task"),
      description: String(pending.args.description || ""),
      priority:
        (pending.args.priority as "low" | "normal" | "high" | "urgent") || "normal",
      dueAt: pending.args.dueAt ? String(pending.args.dueAt) : null,
      entityType,
      entityId,
      entityLabel: pending.args.entityLabel ? String(pending.args.entityLabel) : null,
    });

    const executed: AgentPendingAction = {
      ...pending,
      status: "executed",
      executionResult: { taskId: task.id, title: task.title },
      resolvedAt: nowIso,
    };
    await savePendingAction(executed);

    await emitBusinessEvent({
      eventType: "task.created",
      module: "tasks",
      actorRef: actor.email,
      entityType: "task",
      entityId: task.id,
      title: `Task created: ${task.title}`,
      summary: `Created via HIRZEXA Intelligence confirmation by ${actor.fullName}.`,
      sourceHref:
        task.entityType === "lead" && task.entityId
          ? `/admin/crm?lead=${encodeURIComponent(task.entityId)}`
          : "/admin",
    });

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "tasks",
      action: "agent_confirm:create_followup_task",
      entityType: "task",
      entityId: task.id,
      outcome: "allowed",
      summary: `Executed confirmed task creation: ${task.title}`,
    });

    return {
      ok: true,
      action: executed,
      message: `Task "${task.title}" has been created and assigned to ${actor.email}.`,
    };
  }

  if (pending.toolName === "update_lead_stage") {
    assertPermission(actor, "crm", "edit");
    const leadId = String(pending.args.leadId || "");
    const newStage = pending.args.newStage as CrmStage;
    const note = pending.args.note ? String(pending.args.note) : undefined;

    // Re-verify record scope right at execution time to prevent TOCTOU if lead was reassigned
    const scopeCheck = await getAuthorizedCrmLeadById(actor, leadId);
    if (scopeCheck.denied || !scopeCheck.lead) {
      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.roleKey,
        module: "crm",
        action: "agent_confirm:update_lead_stage",
        entityType: "lead",
        entityId: leadId,
        outcome: "denied",
        summary: `Blocked confirmed stage update on lead ${leadId}: actor no longer has scope access.`,
      });
      return {
        ok: false,
        message: "Access denied: you no longer have authorized scope over this lead.",
      };
    }

    const updated = await updateCrmLead(leadId, {
      stage: newStage,
      activityNote: note,
      actorEmail: actor.email,
    });

    if (!updated) {
      return { ok: false, message: "Target lead no longer exists." };
    }

    const executed: AgentPendingAction = {
      ...pending,
      status: "executed",
      executionResult: { leadId: updated.id, stage: updated.stage },
      resolvedAt: nowIso,
    };
    await savePendingAction(executed);

    await emitBusinessEvent({
      eventType: "lead.stage_changed",
      module: "crm",
      actorRef: actor.email,
      entityType: "lead",
      entityId: updated.id,
      title: `Lead moved to ${CRM_STAGE_LABELS[updated.stage].en}: ${updated.company || updated.fullName}`,
      summary: `${updated.referenceId} confirmed via HIRZEXA Intelligence by ${actor.fullName}.`,
      sourceHref: `/admin/crm?lead=${encodeURIComponent(updated.id)}`,
    });

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "crm",
      action: "agent_confirm:update_lead_stage",
      entityType: "lead",
      entityId: updated.id,
      outcome: "allowed",
      summary: `Confirmed lead stage update on ${updated.referenceId} → ${CRM_STAGE_LABELS[updated.stage].en}.`,
    });

    return {
      ok: true,
      action: executed,
      message: `Updated ${updated.company || updated.fullName} (${updated.referenceId}) to ${CRM_STAGE_LABELS[updated.stage].en}.`,
    };
  }

  return { ok: false, message: "Unsupported pending action tool." };
}
