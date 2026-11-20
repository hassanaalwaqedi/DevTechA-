import type { AccessScope, ModulePermissionMap, PermissionModule, RoleKey } from "@/lib/rbac";

export interface EmployeeRecord {
  id: string;
  authUserId?: string | null;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  roleKey: RoleKey;
  scopeOverride?: AccessScope | null;
  permissionOverrides: ModulePermissionMap;
  status: "invited" | "active" | "suspended";
  mfaEnrolled: boolean;
  sessionVersion: number;
  lastActiveAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InvitationDeliveryStatus =
  | "created"
  | "sending"
  | "accepted_by_provider"
  | "delivered"
  | "delivery_failed"
  | "bounced"
  | "complained";

export interface EmployeeInvitationRecord {
  id: string;
  employeeId: string;
  email: string;
  roleKey: RoleKey;
  tokenHash: string;
  expiresAt: string;
  consumedAt?: string | null;
  revokedAt?: string | null;
  deliveryStatus?: InvitationDeliveryStatus;
  emailProvider?: string | null;
  providerMessageId?: string | null;
  deliveryError?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  lastWebhookEvent?: string | null;
  lastWebhookAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

/** Safe public-to-admin summary of an employee's latest invitation (never exposes tokenHash). */
export interface EmployeeInvitationSummary {
  id: string;
  employeeId: string;
  email: string;
  expiresAt: string;
  consumedAt: string | null;
  revokedAt: string | null;
  deliveryStatus: InvitationDeliveryStatus;
  emailProvider: string | null;
  providerMessageId: string | null;
  deliveryError: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  lastWebhookEvent: string | null;
  lastWebhookAt: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  module: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  outcome: "allowed" | "denied" | "error" | "pending_confirmation";
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskEntityType = "lead" | "booking" | "application" | "job" | "general";

export interface CrmTaskRecord {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  entityType?: TaskEntityType | null;
  entityId?: string | null;
  entityLabel?: string | null;
  assignedToId?: string | null;
  assignedToEmail?: string | null;
  createdById: string;
  createdByEmail: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessEventRecord {
  id: string;
  eventType:
    | "booking.created"
    | "proposal.created"
    | "lead.stage_changed"
    | "application.received"
    | "application.status_changed"
    | "task.created"
    | "task.overdue"
    | "employee.invited"
    | "employee.updated"
    | "agent.action_executed";
  module: PermissionModule;
  severity: "info" | "attention" | "urgent";
  actorRef: string;
  entityType: string;
  entityId: string;
  title: string;
  summary: string;
  sourceHref: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  createdAt: string;
}

export interface AgentCitation {
  label: string;
  href: string;
  entityType: "lead" | "booking" | "application" | "job" | "task" | "employee" | "dashboard";
  entityId: string;
}

export interface AgentToolTrace {
  tool: string;
  status: "ok" | "denied" | "error" | "pending_confirmation";
  durationMs: number;
  summary: string;
}

export interface AgentPendingAction {
  id: string;
  conversationId: string;
  actorId: string;
  actorEmail: string;
  toolName: "create_followup_task" | "update_lead_stage" | "send_email_draft";
  title: string;
  summary: string;
  preview: Record<string, unknown>;
  args: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "expired" | "executed";
  executionResult?: Record<string, unknown> | null;
  expiresAt: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface AgentMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: AgentToolTrace[];
  citations?: AgentCitation[];
  pendingAction?: AgentPendingAction | null;
  createdAt: string;
}

export interface AgentConversationRecord {
  id: string;
  actorId: string;
  actorEmail: string;
  title: string;
  locale: "en" | "ar";
  pageContext?: AgentPageContext;
  messages: AgentMessageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentPageContext {
  route: string;
  entityType?: "lead" | "booking" | "application" | "job" | "employee" | "dashboard";
  entityId?: string;
  entityLabel?: string;
}

export interface MorningBriefingData {
  generatedAt: string;
  headline: string;
  summaryBullets: string[];
  alerts: Array<{
    id: string;
    severity: "info" | "attention" | "urgent";
    title: string;
    detail: string;
    href: string;
    module: PermissionModule;
  }>;
  sources: AgentCitation[];
  aiSynthesis?: string | null;
  counts: {
    newLeads24h: number;
    upcomingBookings: number;
    overdueFollowUps: number;
    stalledDeals: number;
    newApplications24h: number;
    openTasks: number;
    overdueTasks: number;
  };
}
