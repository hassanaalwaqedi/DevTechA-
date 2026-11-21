import "server-only";
import { listAuthorizedCrmLeads } from "@/lib/crm";
import { getAdminJobs, getAdminProducts, getApplications, getMetrics } from "@/lib/db";
import { listEmployees } from "@/lib/intelligence/employees";
import { listTasks } from "@/lib/intelligence/tasks";
import { listAuthorizedInterviewAppointments } from "@/lib/interviews/service";
import {
  canAccessScopedRecord,
  hasPermission,
  PERMISSION_MODULES,
  type AccessScope,
  type AuthActor,
  type PermissionAction,
  type PermissionModule,
  type RoleKey,
} from "@/lib/rbac";

export interface ScopedRecordDescriptor {
  ownerId?: string | null;
  ownerEmail?: string | null;
  assignedToId?: string | null;
  assignedToEmail?: string | null;
  createdById?: string | null;
  department?: string | null;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
}

/**
 * Authoritative centralized authorization check:
 * Actor -> Active Status -> Role/Overrides -> Module Permission -> Action -> Record Scope & Ownership.
 * Both module permission AND record-level scope must pass.
 */
export function authorizeAccess(
  actor: AuthActor,
  request: {
    module: PermissionModule;
    action: PermissionAction;
    record?: ScopedRecordDescriptor | null;
  }
): AuthorizationDecision {
  if (actor.status !== "active") {
    return {
      allowed: false,
      reason: `Account status "${actor.status}" is not permitted to access HIRZEXA Intelligence.`,
    };
  }

  if (!hasPermission(actor, request.module, request.action)) {
    return {
      allowed: false,
      reason: `Role "${actor.roleLabel}" does not hold "${request.action}" permission on "${request.module}".`,
    };
  }

  if (request.record) {
    if (!canAccessScopedRecord(actor, request.record)) {
      return {
        allowed: false,
        reason: `Record falls outside "${actor.scope}" scope for ${actor.email}.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Filters a collection strictly by BOTH module:action permission AND record-level scope.
 * Never returns records when the actor lacks module:action permission, even if assigned.
 */
export function filterAuthorizedRecords<T>(
  actor: AuthActor,
  module: PermissionModule,
  action: PermissionAction,
  records: readonly T[],
  describeRecord: (item: T) => ScopedRecordDescriptor
): T[] {
  if (!hasPermission(actor, module, action)) {
    return [];
  }
  return records.filter((item) => canAccessScopedRecord(actor, describeRecord(item)));
}

export function getEffectiveModulesForActor(actor: AuthActor): PermissionModule[] {
  return PERMISSION_MODULES.filter((mod) => hasPermission(actor, mod, "view"));
}

export interface ScopedMetricsPayload {
  totalVisitors: number | null;
  visitorsToday: number | null;
  totalApplications: number | null;
  applicationsToday: number | null;
  activeJobs: number | null;
  newApplications: number | null;
  shortlisted: number | null;
  interviews: number | null;
}

/**
 * Permission-scrubbed metrics query. Never exposes recruitment counts to non-HR
 * roles, open job counts to roles without jobs:view, or org traffic to scoped reps.
 */
export async function getScopedMetrics(
  actor: AuthActor
): Promise<ScopedMetricsPayload | null> {
  if (!hasPermission(actor, "dashboard", "view")) return null;

  const canRecruitment = hasPermission(actor, "recruitment", "view");
  const canJobs = hasPermission(actor, "jobs", "view");
  const canOrgAnalytics =
    actor.isSuperAdmin ||
    actor.scope === "all" ||
    hasPermission(actor, "audit", "view") ||
    hasPermission(actor, "demonstrations", "view");

  if (!canRecruitment && !canJobs && !canOrgAnalytics) {
    return null;
  }

  const raw = await getMetrics().catch(() => null);
  if (!raw) return null;

  return {
    totalVisitors: canOrgAnalytics ? raw.totalVisitors : null,
    visitorsToday: canOrgAnalytics ? raw.visitorsToday : null,
    totalApplications: canRecruitment ? raw.totalApplications : null,
    applicationsToday: canRecruitment ? raw.applicationsToday : null,
    activeJobs: canJobs || canRecruitment ? raw.activeJobs : null,
    newApplications: canRecruitment ? raw.newApplications : null,
    shortlisted: canRecruitment ? raw.shortlisted : null,
    interviews: canRecruitment ? raw.interviews : null,
  };
}

export interface RoleWorkspaceProfile {
  roleKey: RoleKey;
  titleEn: string;
  titleAr: string;
  navLabelEn: string;
  navLabelAr: string;
  subtitleEn: string;
  subtitleAr: string;
  briefingTitleEn: string;
  briefingTitleAr: string;
  searchPlaceholderEn: string;
  searchPlaceholderAr: string;
  agentPromptsEn: string[];
  agentPromptsAr: string[];
  scopeLabelEn: string;
  scopeLabelAr: string;
  showProjectsEmptyState: boolean;
  showCampaignsEmptyState: boolean;
  allowUnassignedQueue: boolean;
  hideCommercialValues: boolean;
}

const SCOPE_LABELS: Record<AccessScope, { en: string; ar: string }> = {
  own: { en: "Own Scope", ar: "نطاقي الشخصي" },
  assigned: { en: "Assigned Scope", ar: "نطاق المهام المسندة" },
  team: { en: "Team Scope", ar: "نطاق الفريق" },
  all: { en: "Organization Scope", ar: "نطاق المؤسسة بالكامل" },
};

const ROLE_WORKSPACE_DEFS: Record<
  RoleKey,
  Omit<RoleWorkspaceProfile, "scopeLabelEn" | "scopeLabelAr" | "allowUnassignedQueue">
> = {
  super_admin: {
    roleKey: "super_admin",
    titleEn: "Executive Command Center",
    titleAr: "مركز القيادة التنفيذي",
    navLabelEn: "Executive Command Center",
    navLabelAr: "مركز القيادة التنفيذي",
    subtitleEn:
      "Organization-wide operations, sales pipeline, recruitment, team activity, approvals, and AI executive briefing.",
    subtitleAr:
      "نظرة شاملة على عمليات المؤسسة، خط المبيعات، التوظيف، نشاط الفريق، الموافقات، والملخص التنفيذي الذكي.",
    briefingTitleEn: "AI Executive Morning Briefing",
    briefingTitleAr: "الملخص الصباحي التنفيذي الذكي",
    searchPlaceholderEn: "Search leads, candidates, jobs, tasks, employees, or ask HIRZEXA...",
    searchPlaceholderAr: "ابحث في العملاء، المرشحين، الوظائف، المهام، الموظفين أو اسأل HIRZEXA...",
    agentPromptsEn: [
      "Good morning. What happened across HIRZEXA since yesterday?",
      "Summarize our active sales pipeline and upcoming discovery calls.",
      "Review new job applications and highlight top candidates.",
      "What operational tasks or follow-ups are overdue today?",
    ],
    agentPromptsAr: [
      "صباح الخير، ماذا حدث في HIRZEXA منذ أمس؟",
      "لخّص خط المبيعات النشط وجلسات الاكتشاف القادمة.",
      "راجع طلبات التوظيف الجديدة وأبرز المرشحين.",
      "ما المهام أو المتابعات المتأخرة اليوم؟",
    ],
    showProjectsEmptyState: false,
    showCampaignsEmptyState: false,
    hideCommercialValues: false,
  },
  administrator: {
    roleKey: "administrator",
    titleEn: "Operations Command Center",
    titleAr: "مركز قيادة العمليات",
    navLabelEn: "Operations Command Center",
    navLabelAr: "مركز قيادة العمليات",
    subtitleEn:
      "Coordinate operational tasks, authorized business workflows, upcoming meetings, and team activity.",
    subtitleAr:
      "تنسيق المهام التشغيلية وسير العمل المصرح به والاجتماعات القادمة ونشاط الفريق.",
    briefingTitleEn: "Operations Morning Briefing",
    briefingTitleAr: "الملخص الصباحي للعمليات",
    searchPlaceholderEn: "Search authorized leads, candidates, jobs, tasks, or ask HIRZEXA...",
    searchPlaceholderAr: "ابحث في السجلات المصرح بها أو اسأل HIRZEXA...",
    agentPromptsEn: [
      "Summarize today's operational priorities and overdue tasks.",
      "Show upcoming discovery calls and pending follow-ups.",
      "List pending recruitment applications awaiting review.",
      "Review recent authorized operational events.",
    ],
    agentPromptsAr: [
      "لخّص أولويات العمليات والمهام المتأخرة اليوم.",
      "اعرض جلسات الاكتشاف القادمة والمتابعات المعلقة.",
      "اعرض طلبات التوظيف التي تنتظر المراجعة.",
      "راجع آخر الأحداث التشغيلية المصرح بها.",
    ],
    showProjectsEmptyState: false,
    showCampaignsEmptyState: false,
    hideCommercialValues: false,
  },
  sales_manager: {
    roleKey: "sales_manager",
    titleEn: "Sales Management",
    titleAr: "إدارة المبيعات",
    navLabelEn: "Sales Management",
    navLabelAr: "إدارة المبيعات",
    subtitleEn:
      "Oversee team pipeline progression, representative assignments, discovery calls, and follow-up discipline.",
    subtitleAr:
      "متابعة خط مبيعات الفريق، توزيع الفرص على الممثلين، جلسات الاكتشاف، وأداء المتابعات.",
    briefingTitleEn: "Sales Leadership Briefing",
    briefingTitleAr: "ملخص قيادة المبيعات",
    searchPlaceholderEn: "Search pipeline opportunities, contacts, tasks, or ask HIRZEXA...",
    searchPlaceholderAr: "ابحث في الفرص، العملاء، المهام أو اسأل HIRZEXA...",
    agentPromptsEn: [
      "Summarize our active sales pipeline by stage.",
      "Which leads have not received a follow-up yet?",
      "Show upcoming discovery calls and preparation priorities.",
      "What sales follow-up tasks are overdue?",
    ],
    agentPromptsAr: [
      "لخّص خط المبيعات النشط حسب المراحل.",
      "ما العملاء الذين لم تتم متابعتهم بعد؟",
      "اعرض جلسات الاكتشاف القادمة وأولويات التحضير.",
      "ما مهام المتابعة المتأخرة في المبيعات؟",
    ],
    showProjectsEmptyState: false,
    showCampaignsEmptyState: false,
    hideCommercialValues: false,
  },
  sales_rep: {
    roleKey: "sales_rep",
    titleEn: "My Sales Workspace",
    titleAr: "مساحة المبيعات الخاصة بي",
    navLabelEn: "My Sales Workspace",
    navLabelAr: "مساحة المبيعات",
    subtitleEn:
      "Your assigned leads, scheduled discovery calls, personal pipeline, and client follow-up tasks.",
    subtitleAr:
      "عملاؤك المسندون، جلسات الاكتشاف المجدولة، خط مبيعاتك الشخصي، ومهام المتابعة.",
    briefingTitleEn: "My Daily Sales Briefing",
    briefingTitleAr: "ملخص مبيعاتي اليومي",
    searchPlaceholderEn: "Search your assigned leads, tasks, products, or ask HIRZEXA...",
    searchPlaceholderAr: "ابحث في عملائك المسندين ومهامك أو اسأل HIRZEXA...",
    agentPromptsEn: [
      "What's happening with my assigned clients today?",
      "Which of my leads need a follow-up right now?",
      "Show my upcoming discovery calls.",
      "What follow-up tasks are on my queue?",
    ],
    agentPromptsAr: [
      "ما المستجدات لدى عملائي المسندين اليوم؟",
      "أي من عملائي يحتاج إلى متابعة الآن؟",
      "اعرض جلسات الاكتشاف القادمة الخاصة بي.",
      "ما مهام المتابعة المفتوحة لدي؟",
    ],
    showProjectsEmptyState: false,
    showCampaignsEmptyState: false,
    hideCommercialValues: false,
  },
  marketing_specialist: {
    roleKey: "marketing_specialist",
    titleEn: "Marketing Workspace",
    titleAr: "مساحة التسويق",
    navLabelEn: "Marketing Workspace",
    navLabelAr: "مساحة التسويق",
    subtitleEn:
      "Manage interactive demos, product positioning, team marketing tasks, and approved lead insights.",
    subtitleAr:
      "إدارة العروض التفاعلية، تموضع المنتجات، مهام فريق التسويق، ومؤشرات العملاء المعتمدة.",
    briefingTitleEn: "Marketing Activity Briefing",
    briefingTitleAr: "ملخص نشاط التسويق",
    searchPlaceholderEn: "Search products, marketing tasks, demos, or ask HIRZEXA...",
    searchPlaceholderAr: "ابحث في المنتجات والمهام والعروض أو اسأل HIRZEXA...",
    agentPromptsEn: [
      "Summarize my team's active marketing tasks and deadlines.",
      "What approved lead insights and service tracks are trending?",
      "Review upcoming discovery call topics for positioning.",
      "Check what operational tasks are overdue.",
    ],
    agentPromptsAr: [
      "لخّص مهام فريق التسويق النشطة والمواعيد النهائية.",
      "ما مسارات الخدمات الأكثر طلباً في المؤشرات المعتمدة؟",
      "راجع مواضيع جلسات الاكتشاف القادمة لتحسين المحتوى.",
      "تحقق من المهام المتأخرة حالياً.",
    ],
    showProjectsEmptyState: false,
    showCampaignsEmptyState: true,
    hideCommercialValues: true,
  },
  marketing_intern: {
    roleKey: "marketing_intern",
    titleEn: "My Marketing Tasks",
    titleAr: "مهامي التسويقية",
    navLabelEn: "My Marketing Tasks",
    navLabelAr: "مهامي التسويقية",
    subtitleEn:
      "Focused view of your assigned tasks, deadlines, published products, and open roles.",
    subtitleAr:
      "عرض مبسط لمهامك المسندة، المواعيد النهائية، المنتجات المنشورة، والوظائف المفتوحة.",
    briefingTitleEn: "My Daily Focus",
    briefingTitleAr: "تركيزي اليومي",
    searchPlaceholderEn: "Search your tasks, products, or open roles...",
    searchPlaceholderAr: "ابحث في مهامك أو المنتجات أو الوظائف المفتوحة...",
    agentPromptsEn: [
      "Show my assigned tasks and upcoming deadlines.",
      "What tasks are overdue on my list?",
      "Summarize my current permissions and authorized modules.",
      "List published job requirements for marketing content.",
    ],
    agentPromptsAr: [
      "اعرض مهامي المسندة والمواعيد النهائية القادمة.",
      "ما المهام المتأخرة في قائمتي؟",
      "اعرض صلاحياتي والوحدات المصرح لي بها.",
      "اعرض متطلبات الوظائف المفتوحة للمحتوى التسويقي.",
    ],
    showProjectsEmptyState: false,
    showCampaignsEmptyState: false,
    hideCommercialValues: true,
  },
  hr_manager: {
    roleKey: "hr_manager",
    titleEn: "Recruitment Workspace",
    titleAr: "مساحة التوظيف",
    navLabelEn: "Recruitment Workspace",
    navLabelAr: "مساحة التوظيف",
    subtitleEn:
      "Review new candidate applications, manage interview pipelines, open positions, and hiring tasks.",
    subtitleAr:
      "مراجعة طلبات المرشحين الجديدة، إدارة المقابلات، الوظائف المفتوحة، ومهام التوظيف.",
    briefingTitleEn: "Recruitment Morning Briefing",
    briefingTitleAr: "ملخص التوظيف الصباحي",
    searchPlaceholderEn: "Search candidates, open jobs, hiring tasks, team, or ask HIRZEXA...",
    searchPlaceholderAr: "ابحث في المرشحين، الوظائف المفتوحة، مهام التوظيف أو اسأل HIRZEXA...",
    agentPromptsEn: [
      "Show me the latest job applications awaiting review.",
      "Compare pending candidates against our open job requirements.",
      "Draft an interview invitation email for a shortlisted candidate.",
      "What hiring tasks are overdue today?",
    ],
    agentPromptsAr: [
      "اعرض أحدث طلبات التوظيف التي تنتظر المراجعة.",
      "قارن المرشحين المعلقين بمتطلبات الوظائف المفتوحة.",
      "جهّز مسودة دعوة مقابلة لمرشح مختار.",
      "ما مهام التوظيف المتأخرة اليوم؟",
    ],
    showProjectsEmptyState: false,
    showCampaignsEmptyState: false,
    hideCommercialValues: true,
  },
  engineer: {
    roleKey: "engineer",
    titleEn: "Engineering Workspace",
    titleAr: "مساحة الهندسة",
    navLabelEn: "Engineering Workspace",
    navLabelAr: "مساحة الهندسة",
    subtitleEn:
      "Track assigned engineering tasks, product platforms, interactive demos, and assigned technical sessions.",
    subtitleAr:
      "متابعة المهام الهندسية المسندة، منصات المنتجات، العروض التفاعلية، والجلسات الفنية المسندة.",
    briefingTitleEn: "Engineering Briefing",
    briefingTitleAr: "الملخص الهندسي",
    searchPlaceholderEn: "Search your tasks, products, assigned sessions, or ask HIRZEXA...",
    searchPlaceholderAr: "ابحث في مهامك والمنتجات والجلسات المسندة أو اسأل HIRZEXA...",
    agentPromptsEn: [
      "Show my assigned engineering tasks and overdue deadlines.",
      "List discovery sessions currently assigned to me.",
      "Summarize my effective role permissions and scope.",
      "What operational notifications require my attention?",
    ],
    agentPromptsAr: [
      "اعرض مهامي الهندسية المسندة والمواعيد المتأخرة.",
      "اعرض جلسات الاكتشاف الفنية المسندة إليّ.",
      "اعرض صلاحيات دوري ونطاق وصولي الحالي.",
      "ما الإشعارات التشغيلية التي تتطلب انتباهي؟",
    ],
    showProjectsEmptyState: true,
    showCampaignsEmptyState: false,
    hideCommercialValues: true,
  },
  project_manager: {
    roleKey: "project_manager",
    titleEn: "Project Delivery",
    titleAr: "تسليم المشاريع",
    navLabelEn: "Project Delivery",
    navLabelAr: "تسليم المشاريع",
    subtitleEn:
      "Coordinate team execution tasks, delivery deadlines, product milestones, and authorized client handoffs.",
    subtitleAr:
      "تنسيق مهام تنفيذ الفريق، المواعيد النهائية للتسليم، مراحل المنتجات، وتسليمات العملاء المصرح بها.",
    briefingTitleEn: "Delivery Operations Briefing",
    briefingTitleAr: "ملخص عمليات التسليم",
    searchPlaceholderEn: "Search team tasks, authorized handoffs, products, or ask HIRZEXA...",
    searchPlaceholderAr: "ابحث في مهام الفريق والتسليمات والمنتجات أو اسأل HIRZEXA...",
    agentPromptsEn: [
      "Summarize open team tasks and upcoming delivery deadlines.",
      "Which team tasks are overdue right now?",
      "Review authorized client discovery handoffs for delivery planning.",
      "Show recent authorized operational activity.",
    ],
    agentPromptsAr: [
      "لخّص مهام الفريق المفتوحة والمواعيد النهائية للتسليم.",
      "ما مهام الفريق المتأخرة حالياً؟",
      "راجع جلسات الاكتشاف المصرح بها لتخطيط التسليم.",
      "اعرض آخر الأنشطة التشغيلية المصرح بها.",
    ],
    showProjectsEmptyState: true,
    showCampaignsEmptyState: false,
    hideCommercialValues: false,
  },
};

export function getWorkspaceProfileForActor(actor: AuthActor): RoleWorkspaceProfile {
  const def = ROLE_WORKSPACE_DEFS[actor.roleKey] || ROLE_WORKSPACE_DEFS.engineer;
  const scopeLabel = SCOPE_LABELS[actor.scope] || SCOPE_LABELS.assigned;
  const allowUnassignedQueue =
    hasPermission(actor, "crm", "assign") &&
    (actor.scope === "all" || actor.isSuperAdmin);

  return {
    ...def,
    scopeLabelEn: scopeLabel.en,
    scopeLabelAr: scopeLabel.ar,
    allowUnassignedQueue,
  };
}

export interface GlobalSearchResultItem {
  id: string;
  category: "crm" | "recruitment" | "interviews" | "jobs" | "products" | "tasks" | "team";
  title: string;
  subtitle: string;
  badge: string;
  href: string;
}

/**
 * Strictly permission-aware & record-scoped global search across ONLY the modules
 * the authenticated actor is authorized to view. Never queries or counts restricted
 * modules or out-of-scope records.
 */
export async function searchAuthorizedRecords(
  actor: AuthActor,
  rawQuery: string,
  limitPerCategory = 5
): Promise<{
  results: GlobalSearchResultItem[];
  searchedModules: PermissionModule[];
}> {
  if (actor.status !== "active") {
    return { results: [], searchedModules: [] };
  }

  const q = rawQuery.trim().toLowerCase();
  const searchedModules: PermissionModule[] = [];
  if (q.length < 2) {
    return { results: [], searchedModules };
  }

  const results: GlobalSearchResultItem[] = [];
  const tasksToRun: Array<Promise<void>> = [];

  // 1. Sales CRM & Bookings (strictly record-scoped via listAuthorizedCrmLeads)
  if (hasPermission(actor, "crm", "view") || hasPermission(actor, "bookings", "view")) {
    searchedModules.push(hasPermission(actor, "crm", "view") ? "crm" : "bookings");
    tasksToRun.push(
      (async () => {
        const leads = await listAuthorizedCrmLeads(actor);
        const matched = leads
          .filter(
            (l) =>
              l.company.toLowerCase().includes(q) ||
              l.fullName.toLowerCase().includes(q) ||
              l.email.toLowerCase().includes(q) ||
              l.referenceId.toLowerCase().includes(q) ||
              l.serviceTrack.toLowerCase().includes(q)
          )
          .slice(0, limitPerCategory);
        for (const lead of matched) {
          results.push({
            id: `crm:${lead.id}`,
            category: "crm",
            title: lead.company ? `${lead.company} — ${lead.fullName}` : lead.fullName,
            subtitle: `${lead.referenceId} · ${lead.serviceTrack}`,
            badge: lead.stage.replace(/_/g, " "),
            href: `/admin/crm?lead=${encodeURIComponent(lead.id)}`,
          });
        }
      })()
    );
  }

  // 2. Recruitment Applications (ONLY if actor has recruitment:view)
  if (hasPermission(actor, "recruitment", "view")) {
    searchedModules.push("recruitment");
    tasksToRun.push(
      (async () => {
        const apps = await getApplications().catch(() => []);
        const matched = apps
          .filter(
            (a) =>
              a.name.toLowerCase().includes(q) ||
              a.email.toLowerCase().includes(q) ||
              a.jobTitle.toLowerCase().includes(q) ||
              a.id.toLowerCase().includes(q)
          )
          .slice(0, limitPerCategory);
        for (const app of matched) {
          results.push({
            id: `recruitment:${app.id}`,
            category: "recruitment",
            title: `${app.name} — ${app.jobTitle}`,
            subtitle: `${app.id} · ${app.country} · ${app.experience}`,
            badge: app.status,
            href: `/admin/applications?q=${encodeURIComponent(app.id)}`,
          });
        }
      })()
    );
  }

  // 3. Jobs (ONLY if actor has jobs:view)
  if (hasPermission(actor, "jobs", "view")) {
    searchedModules.push("jobs");
    tasksToRun.push(
      (async () => {
        const jobs = await getAdminJobs().catch(() => []);
        const matched = jobs
          .filter(
            (j) =>
              j.title.toLowerCase().includes(q) ||
              j.department.toLowerCase().includes(q) ||
              j.slug.toLowerCase().includes(q)
          )
          .slice(0, limitPerCategory);
        for (const job of matched) {
          results.push({
            id: `job:${job.id}`,
            category: "jobs",
            title: job.title,
            subtitle: `${job.department} · ${job.location}`,
            badge: job.status,
            href: "/admin/jobs",
          });
        }
      })()
    );
  }

  // 4. Products (ONLY if actor has products:view)
  if (hasPermission(actor, "products", "view")) {
    searchedModules.push("products");
    tasksToRun.push(
      (async () => {
        const products = await getAdminProducts().catch(() => []);
        const matched = products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.slug.toLowerCase().includes(q) ||
              p.eyebrow.toLowerCase().includes(q)
          )
          .slice(0, limitPerCategory);
        for (const prod of matched) {
          results.push({
            id: `product:${prod.slug}`,
            category: "products",
            title: prod.name,
            subtitle: prod.eyebrow || prod.slug,
            badge: prod.status,
            href: "/admin/products",
          });
        }
      })()
    );
  }

  // 5. Tasks (strictly record-scoped via listTasks)
  if (hasPermission(actor, "tasks", "view")) {
    searchedModules.push("tasks");
    tasksToRun.push(
      (async () => {
        const tasks = await listTasks(actor, { status: "all" });
        const matched = tasks
          .filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              (t.entityLabel || "").toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q)
          )
          .slice(0, limitPerCategory);
        for (const task of matched) {
          results.push({
            id: `task:${task.id}`,
            category: "tasks",
            title: task.title,
            subtitle: task.entityLabel || `${task.priority} priority`,
            badge: task.status,
            href:
              task.entityType === "lead" &&
              task.entityId &&
              (hasPermission(actor, "crm", "view") || hasPermission(actor, "bookings", "view"))
                ? `/admin/crm?lead=${encodeURIComponent(task.entityId)}`
                : "/admin",
          });
        }
      })()
    );
  }

  // 6. Team Directory (ONLY if actor has team:view)
  if (hasPermission(actor, "team", "view")) {
    searchedModules.push("team");
    tasksToRun.push(
      (async () => {
        const employees = await listEmployees().catch(() => []);
        const matched = employees
          .filter(
            (e) =>
              e.fullName.toLowerCase().includes(q) ||
              e.email.toLowerCase().includes(q) ||
              e.department.toLowerCase().includes(q) ||
              e.jobTitle.toLowerCase().includes(q)
          )
          .slice(0, limitPerCategory);
        for (const emp of matched) {
          results.push({
            id: `team:${emp.id}`,
            category: "team",
            title: emp.fullName,
            subtitle: `${emp.email} · ${emp.department}`,
            badge: emp.roleKey.replace(/_/g, " "),
            href: "/admin/team",
          });
        }
      })()
    );
  }

  // 7. Interviews (strictly scoped via listAuthorizedInterviewAppointments)
  if (hasPermission(actor, "interviews", "view")) {
    searchedModules.push("interviews");
    tasksToRun.push(
      (async () => {
        const interviews = await listAuthorizedInterviewAppointments(actor).catch(() => []);
        const matched = interviews
          .filter(
            (i) =>
              i.candidateName.toLowerCase().includes(q) ||
              i.candidateEmail.toLowerCase().includes(q) ||
              i.positionTitle.toLowerCase().includes(q) ||
              i.interviewerName.toLowerCase().includes(q) ||
              i.applicationReferenceId.toLowerCase().includes(q)
          )
          .slice(0, limitPerCategory);
        for (const item of matched) {
          results.push({
            id: `interview:${item.id}`,
            category: "interviews",
            title: `${item.candidateName} — ${item.positionTitle}`,
            subtitle: `${item.interviewerName} · ${item.scheduledStartUtc.slice(0, 16).replace("T", " ")} UTC`,
            badge: item.status,
            href: "/admin/interviews",
          });
        }
      })()
    );
  }

  await Promise.all(tasksToRun);
  return { results: results.slice(0, 20), searchedModules };
}
