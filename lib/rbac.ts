export const ROLE_KEYS = [
  "super_admin",
  "administrator",
  "sales_manager",
  "sales_rep",
  "marketing_specialist",
  "marketing_intern",
  "hr_manager",
  "engineer",
  "project_manager",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const PERMISSION_MODULES = [
  "dashboard",
  "crm",
  "bookings",
  "recruitment",
  "jobs",
  "products",
  "demonstrations",
  "tasks",
  "team",
  "audit",
  "agent",
  "settings",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "assign",
  "export",
  "manage",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ACCESS_SCOPES = ["own", "assigned", "team", "all"] as const;
export type AccessScope = (typeof ACCESS_SCOPES)[number];

export type ModulePermissionMap = Partial<Record<PermissionModule, PermissionAction[]>>;

export interface RoleTemplate {
  key: RoleKey;
  label: string;
  description: string;
  defaultScope: AccessScope;
  permissions: ModulePermissionMap;
}

const ALL_ACTIONS: PermissionAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "assign",
  "export",
  "manage",
];

export const ROLE_TEMPLATES: Record<RoleKey, RoleTemplate> = {
  super_admin: {
    key: "super_admin",
    label: "Super Admin",
    description: "Founder / executive owner with full organizational control across all modules, RBAC, and audit logs.",
    defaultScope: "all",
    permissions: {
      dashboard: ALL_ACTIONS,
      crm: ALL_ACTIONS,
      bookings: ALL_ACTIONS,
      recruitment: ALL_ACTIONS,
      jobs: ALL_ACTIONS,
      products: ALL_ACTIONS,
      demonstrations: ALL_ACTIONS,
      tasks: ALL_ACTIONS,
      team: ALL_ACTIONS,
      audit: ALL_ACTIONS,
      agent: ALL_ACTIONS,
      settings: ALL_ACTIONS,
    },
  },
  administrator: {
    key: "administrator",
    label: "Administrator",
    description: "Operations administrator managing CRM, bookings, recruitment, jobs, products, and team operations.",
    defaultScope: "all",
    permissions: {
      dashboard: ["view", "export"],
      crm: ["view", "create", "edit", "assign", "export", "manage"],
      bookings: ["view", "create", "edit", "assign", "manage"],
      recruitment: ["view", "edit", "assign", "export", "manage"],
      jobs: ["view", "create", "edit", "delete", "manage"],
      products: ["view", "create", "edit", "delete", "manage"],
      demonstrations: ["view", "edit", "manage"],
      tasks: ["view", "create", "edit", "delete", "assign", "manage"],
      team: ["view", "create", "edit"],
      audit: ["view"],
      agent: ["view", "create"],
      settings: ["view", "edit"],
    },
  },
  sales_manager: {
    key: "sales_manager",
    label: "Sales Manager",
    description: "Leads B2B revenue operations, discovery call pipelines, deal assignments, and proposals.",
    defaultScope: "all",
    permissions: {
      dashboard: ["view"],
      crm: ["view", "create", "edit", "assign", "export", "manage"],
      bookings: ["view", "create", "edit", "assign", "manage"],
      jobs: ["view"],
      products: ["view"],
      tasks: ["view", "create", "edit", "assign", "manage"],
      agent: ["view", "create"],
    },
  },
  sales_rep: {
    key: "sales_rep",
    label: "Sales Representative",
    description: "Manages assigned leads, discovery calls, client notes, and personal follow-up tasks.",
    defaultScope: "assigned",
    permissions: {
      dashboard: ["view"],
      crm: ["view", "create", "edit"],
      bookings: ["view", "edit"],
      products: ["view"],
      tasks: ["view", "create", "edit"],
      agent: ["view", "create"],
    },
  },
  marketing_specialist: {
    key: "marketing_specialist",
    label: "Marketing Specialist",
    description: "Manages interactive website demonstrations, product positioning, campaign metrics, and team tasks.",
    defaultScope: "team",
    permissions: {
      dashboard: ["view"],
      crm: ["view"],
      bookings: ["view"],
      jobs: ["view"],
      products: ["view", "edit"],
      demonstrations: ["view", "edit", "manage"],
      tasks: ["view", "create", "edit"],
      agent: ["view", "create"],
    },
  },
  marketing_intern: {
    key: "marketing_intern",
    label: "Marketing Intern",
    description: "Scoped read-only workspace access to published roles, products, and own assigned tasks. No confidential HR/CRM access.",
    defaultScope: "own",
    permissions: {
      dashboard: ["view"],
      jobs: ["view"],
      products: ["view"],
      tasks: ["view", "create"],
      agent: ["view"],
    },
  },
  hr_manager: {
    key: "hr_manager",
    label: "HR Manager",
    description: "Manages job openings, candidate review pipelines, interviews, recruitment notes, and team directory visibility.",
    defaultScope: "all",
    permissions: {
      dashboard: ["view"],
      recruitment: ["view", "create", "edit", "assign", "export", "manage"],
      jobs: ["view", "create", "edit", "delete", "manage"],
      tasks: ["view", "create", "edit", "assign"],
      team: ["view"],
      agent: ["view", "create"],
    },
  },
  engineer: {
    key: "engineer",
    label: "Engineer",
    description: "Technical delivery access to assigned discovery sessions, product demos, engineering tasks, and technical AI assistance.",
    defaultScope: "assigned",
    permissions: {
      dashboard: ["view"],
      bookings: ["view"],
      products: ["view", "edit"],
      demonstrations: ["view", "edit"],
      jobs: ["view"],
      tasks: ["view", "create", "edit"],
      agent: ["view"],
    },
  },
  project_manager: {
    key: "project_manager",
    label: "Project Manager",
    description: "Coordinates client delivery, handoffs from discovery calls, cross-team tasks, and execution milestones.",
    defaultScope: "team",
    permissions: {
      dashboard: ["view"],
      crm: ["view"],
      bookings: ["view"],
      products: ["view"],
      jobs: ["view"],
      tasks: ["view", "create", "edit", "assign", "manage"],
      agent: ["view", "create"],
    },
  },
};

export interface AuthActor {
  id: string;
  employeeId: string;
  email: string;
  fullName: string;
  department: string;
  roleKey: RoleKey;
  roleLabel: string;
  status: "invited" | "active" | "suspended";
  scope: AccessScope;
  permissions: ModulePermissionMap;
  mfaEnrolled: boolean;
  sessionVersion: number;
  isSuperAdmin: boolean;
}

export function resolveEffectivePermissions(
  roleKey: RoleKey,
  overrides?: ModulePermissionMap | null
): ModulePermissionMap {
  const base = ROLE_TEMPLATES[roleKey]?.permissions || ROLE_TEMPLATES.engineer.permissions;
  const merged: ModulePermissionMap = {};
  for (const mod of PERMISSION_MODULES) {
    const overrideActions = overrides?.[mod];
    if (Array.isArray(overrideActions)) {
      merged[mod] = Array.from(new Set(overrideActions));
    } else if (base[mod]) {
      merged[mod] = [...base[mod]!];
    }
  }
  return merged;
}

export function hasPermission(
  actor: Pick<AuthActor, "roleKey" | "status" | "permissions">,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (actor.status !== "active") return false;
  if (actor.roleKey === "super_admin") return true;
  const allowed = actor.permissions[module];
  if (!allowed || allowed.length === 0) return false;
  if (allowed.includes("manage")) return true;
  return allowed.includes(action);
}

export function assertPermission(
  actor: AuthActor,
  module: PermissionModule,
  action: PermissionAction
): void {
  if (!hasPermission(actor, module, action)) {
    throw new RbacDeniedError(module, action, actor.roleKey);
  }
}

export class RbacDeniedError extends Error {
  readonly code = "FORBIDDEN";
  readonly status = 403;
  readonly module: PermissionModule;
  readonly action: PermissionAction;
  readonly roleKey: RoleKey;

  constructor(module: PermissionModule, action: PermissionAction, roleKey: RoleKey) {
    super(`Access denied: role "${roleKey}" lacks "${action}" permission on "${module}".`);
    this.name = "RbacDeniedError";
    this.module = module;
    this.action = action;
    this.roleKey = roleKey;
  }
}

export function canAccessScopedRecord(
  actor: AuthActor,
  record: { ownerId?: string | null; ownerEmail?: string | null; assignedToId?: string | null; assignedToEmail?: string | null; createdById?: string | null; department?: string | null }
): boolean {
  if (actor.status !== "active") return false;
  if (actor.roleKey === "super_admin" || actor.scope === "all") return true;

  const actorIds = new Set([actor.id, actor.employeeId].filter(Boolean));
  const actorEmail = actor.email.toLowerCase();

  const matchesOwner =
    (record.ownerId && actorIds.has(record.ownerId)) ||
    (record.ownerEmail && record.ownerEmail.toLowerCase() === actorEmail) ||
    (record.createdById && actorIds.has(record.createdById));

  const matchesAssignee =
    (record.assignedToId && actorIds.has(record.assignedToId)) ||
    (record.assignedToEmail && record.assignedToEmail.toLowerCase() === actorEmail);

  if (actor.scope === "own") {
    return Boolean(matchesOwner || matchesAssignee);
  }
  if (actor.scope === "assigned") {
    return Boolean(matchesOwner || matchesAssignee);
  }
  if (actor.scope === "team") {
    if (matchesOwner || matchesAssignee) return true;
    if (!record.department || !actor.department) return true;
    return record.department.toLowerCase() === actor.department.toLowerCase();
  }
  return false;
}

export function isValidRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && (ROLE_KEYS as readonly string[]).includes(value);
}
