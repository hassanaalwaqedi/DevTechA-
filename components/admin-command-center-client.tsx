"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  FileText,
  Flag,
  FolderKanban,
  Info,
  Languages,
  Layers,
  Megaphone,
  Package,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import {
  EmptyState,
  MarkdownContent,
  StatusBadge,
} from "@/components/admin-ui/primitives";
import type { RoleWorkspaceProfile, ScopedMetricsPayload } from "@/lib/authorization";
import { CRM_STAGE_LABELS, type CrmLeadRecord } from "@/lib/crm-types";
import type {
  BusinessEventRecord,
  CrmTaskRecord,
  MorningBriefingData,
} from "@/lib/intelligence/types";
import type { AccessScope, RoleKey } from "@/lib/rbac";

interface ApplicationSummary {
  id: string;
  name: string;
  jobTitle: string;
  status: string;
  experience: string;
  country: string;
  createdAt: string;
}

interface JobSummary {
  id: string;
  title: string;
  department: string;
  status: string;
  location: string;
}

interface ProductSummary {
  slug: string;
  name: string;
  status: string;
  eyebrow: string;
}

interface TeamSummary {
  total: number;
  active: number;
  invited: number;
  suspended: number;
}

interface DashboardPermissions {
  crm: boolean;
  crmAssign: boolean;
  bookings: boolean;
  recruitment: boolean;
  jobs: boolean;
  products: boolean;
  demonstrations: boolean;
  tasksView: boolean;
  tasksCreate: boolean;
  tasksEdit: boolean;
  team: boolean;
  audit: boolean;
  agent: boolean;
  settings: boolean;
}

function buildDailySeries(timestamps: Array<string | null | undefined>, days = 7): number[] {
  const now = Date.now();
  const buckets = new Array<number>(days).fill(0);
  for (const raw of timestamps) {
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) continue;
    const diffDays = Math.floor((now - t) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays < days) {
      buckets[days - 1 - diffDays] += 1;
    }
  }
  return buckets;
}

function SparklineSvg({
  values,
  strokeStart,
  strokeEnd,
  id,
}: {
  values: number[];
  strokeStart: string;
  strokeEnd: string;
  id: string;
}) {
  const width = 92;
  const height = 28;
  const padY = 4;
  const maxVal = Math.max(...values, 1);
  const allZero = values.every((v) => v === 0);

  const points = values.map((v, idx) => {
    const x = values.length > 1 ? (idx / (values.length - 1)) * width : width;
    const y = allZero
      ? height - 7
      : height - padY - (v / maxVal) * (height - padY * 2);
    return { x, y };
  });

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const areaD = `${d} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      className="hz-cc-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={strokeStart} stopOpacity="0.65" />
          <stop offset="100%" stopColor={strokeEnd} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={strokeEnd} stopOpacity="0.22" />
          <stop offset="100%" stopColor={strokeEnd} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#fill-${id})`} />
      <path
        d={d}
        stroke={`url(#stroke-${id})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IsometricBriefingMark() {
  return (
    <svg
      className="hz-cc-briefing-emblem"
      width="74"
      height="74"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="isoTop" x1="16" y1="12" x2="64" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="55%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="isoMid" x1="16" y1="28" x2="64" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.78" />
        </linearGradient>
        <linearGradient id="isoBot" x1="16" y1="44" x2="64" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <path d="M40 70L14 55.5L40 41L66 55.5L40 70Z" fill="url(#isoBot)" stroke="rgba(167,139,250,0.28)" strokeWidth="1" />
      <path d="M40 56L14 41.5L40 27L66 41.5L40 56Z" fill="url(#isoMid)" stroke="rgba(147,197,253,0.42)" strokeWidth="1" />
      <path d="M40 42L14 27.5L40 13L66 27.5L40 42Z" fill="url(#isoTop)" stroke="rgba(224,231,255,0.68)" strokeWidth="1.1" />
    </svg>
  );
}

function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminCommandCenterClient({
  actorName,
  actorRole,
  actorRoleKey,
  actorScope,
  actorDepartment,
  workspace,
  supabaseConnected,
  aiConfigured,
  initialBriefing,
  initialTasks,
  initialEvents,
  leads,
  applications,
  jobs,
  products,
  teamSummary,
  metrics,
  permissions,
}: {
  actorName: string;
  actorRole: string;
  actorRoleKey: RoleKey;
  actorScope: AccessScope;
  actorDepartment: string;
  workspace: RoleWorkspaceProfile;
  supabaseConnected: boolean;
  aiConfigured: boolean;
  initialBriefing: MorningBriefingData;
  initialTasks: CrmTaskRecord[];
  initialEvents: BusinessEventRecord[];
  leads: CrmLeadRecord[];
  applications: ApplicationSummary[];
  jobs: JobSummary[];
  products: ProductSummary[];
  teamSummary: TeamSummary | null;
  metrics: ScopedMetricsPayload | null;
  permissions: DashboardPermissions;
}) {
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const ar = locale === "ar";
  const [briefing, setBriefing] = useState<MorningBriefingData>(initialBriefing);
  const [events, setEvents] = useState<BusinessEventRecord[]>(initialEvents);
  const [refreshing, setRefreshing] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [tasks, setTasks] = useState<CrmTaskRecord[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const [opsOpen, setOpsOpen] = useState(
    actorRoleKey === "marketing_intern" ||
      actorRoleKey === "engineer" ||
      actorRoleKey === "project_manager"
  );

  const firstName = actorName.split(/\s+/)[0] || actorName;
  const generatedDate = useMemo(() => new Date(briefing.generatedAt), [briefing.generatedAt]);

  const headerDate = useMemo(
    () =>
      new Intl.DateTimeFormat(ar ? "ar" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(generatedDate),
    [ar, generatedDate]
  );

  const headerTime = useMemo(
    () =>
      `${new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(generatedDate)} (UTC)`,
    [generatedDate]
  );

  async function refreshBriefing(synthesize = false) {
    if (synthesize) setSynthesizing(true);
    else setRefreshing(true);
    try {
      const qs = new URLSearchParams();
      if (synthesize) qs.set("synthesize", "1");
      qs.set("locale", locale);
      const res = await fetch(`/api/admin/briefing?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        if (data.briefing) setBriefing(data.briefing);
        if (Array.isArray(data.events)) setEvents(data.events);
      }
    } finally {
      setSynthesizing(false);
      setRefreshing(false);
    }
  }

  async function handleQuickCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || taskBusy || !permissions.tasksCreate) return;
    setTaskBusy(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          priority: "normal",
          dueAt: newTaskDue ? new Date(`${newTaskDue}T17:00:00Z`).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => [data.task as CrmTaskRecord, ...prev]);
        setNewTaskTitle("");
        setNewTaskDue("");
      }
    } finally {
      setTaskBusy(false);
    }
  }

  async function toggleTaskStatus(task: CrmTaskRecord) {
    if (!permissions.tasksEdit) return;
    const nextStatus = task.status === "completed" ? "open" : "completed";
    const res = await fetch(`/api/admin/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (res.ok && data.task) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
    }
  }

  function triggerAgent(prompt: string) {
    if (!permissions.agent) return;
    window.dispatchEvent(
      new CustomEvent("hirzexa:ask-agent", {
        detail: {
          prompt,
          pageContext: { route: "/admin", entityType: "dashboard" },
        },
      })
    );
  }

  // Strictly derived from authorized records only
  const activeLeads = useMemo(
    () => leads.filter((l) => l.stage !== "won" && l.stage !== "lost"),
    [leads]
  );
  const unassignedLeads = useMemo(
    () => leads.filter((l) => !l.ownerId && l.stage !== "won" && l.stage !== "lost"),
    [leads]
  );
  const upcomingCalls = useMemo(
    () =>
      leads
        .filter(
          (l) =>
            l.scheduledSlotIso &&
            l.stage !== "lost" &&
            new Date(l.scheduledSlotIso).getTime() >= Date.now()
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledSlotIso!).getTime() - new Date(b.scheduledSlotIso!).getTime()
        ),
    [leads]
  );
  const overdueLeads = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;
    return leads.filter(
      (l) =>
        (l.nextFollowUpAt &&
          l.stage !== "won" &&
          l.stage !== "lost" &&
          new Date(l.nextFollowUpAt).getTime() < now) ||
        (l.stage === "new_lead" && new Date(l.updatedAt).getTime() < cutoff)
    );
  }, [leads]);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "completed"), [tasks]);
  const overdueTasks = useMemo(
    () =>
      openTasks.filter((t) => Boolean(t.dueAt) && new Date(t.dueAt!).getTime() < Date.now()),
    [openTasks]
  );

  const openJobs = useMemo(() => jobs.filter((j) => j.status === "open"), [jobs]);
  const pendingApps = useMemo(
    () => applications.filter((a) => a.status === "new" || a.status === "reviewing"),
    [applications]
  );

  // Representative ownership breakdown for Sales Manager (strictly from authorized leads)
  const repBreakdown = useMemo(() => {
    if (actorRoleKey !== "sales_manager") return [];
    const map = new Map<string, { label: string; active: number; total: number }>();
    for (const lead of leads) {
      const key = lead.ownerId || "unassigned";
      const label =
        lead.ownerName ||
        lead.ownerEmail ||
        (lead.ownerId ? "Assigned Representative" : "Unassigned Queue");
      const entry = map.get(key) || { label, active: 0, total: 0 };
      entry.total += 1;
      if (lead.stage !== "won" && lead.stage !== "lost") entry.active += 1;
      map.set(key, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.active - a.active)
      .slice(0, 5);
  }, [actorRoleKey, leads]);

  // Personalized, grounded greeting tailored to the employee's actual authorized records
  const personalizedGreeting = useMemo(() => {
    if (actorRoleKey === "sales_rep") {
      const needsFollowUp = overdueLeads.length;
      if (needsFollowUp > 0) {
        return ar
          ? `صباح الخير، ${firstName}. لديك ${needsFollowUp} عميل مسند يحتاج إلى متابعة حالياً.`
          : `Good morning, ${firstName}. You have ${needsFollowUp} assigned lead${
              needsFollowUp === 1 ? "" : "s"
            } requiring follow-up.`;
      }
      if (leads.length > 0) {
        return ar
          ? `صباح الخير، ${firstName}. لديك ${leads.length} فرصة مسندة و${upcomingCalls.length} جلسة اكتشاف قادمة.`
          : `Good morning, ${firstName}. You have ${leads.length} assigned opportunit${
              leads.length === 1 ? "y" : "ies"
            } and ${upcomingCalls.length} upcoming discovery call${
              upcomingCalls.length === 1 ? "" : "s"
            }.`;
      }
      return ar
        ? `مرحباً ${firstName}. لا توجد فرص مبيعات مسندة إليك حالياً ضمن نطاقك.`
        : `Good morning, ${firstName}. You have no leads currently assigned in your queue.`;
    }
    if (actorRoleKey === "hr_manager") {
      const reviewCount = metrics?.newApplications ?? pendingApps.length;
      return ar
        ? `مرحباً ${firstName}. لديك ${reviewCount} طلب توظيف ينتظر المراجعة عبر ${openJobs.length} وظيفة مفتوحة.`
        : `Good morning, ${firstName}. ${reviewCount} candidate application${
            reviewCount === 1 ? "" : "s"
          } await review across ${openJobs.length} open position${
            openJobs.length === 1 ? "" : "s"
          }.`;
    }
    if (actorRoleKey === "marketing_intern") {
      return ar
        ? `مرحباً ${firstName}. لديك ${openTasks.length} مهمة تسويقية مفتوحة (${overdueTasks.length} متأخرة).`
        : `Good morning, ${firstName}. You have ${openTasks.length} assigned task${
            openTasks.length === 1 ? "" : "s"
          }${overdueTasks.length > 0 ? ` (${overdueTasks.length} overdue)` : ""}.`;
    }
    if (actorRoleKey === "engineer" || actorRoleKey === "project_manager") {
      return ar
        ? `مرحباً ${firstName}. لديك ${openTasks.length} مهمة نشطة و${products.length} منتج مصرح به للمتابعة.`
        : `Good morning, ${firstName}. You have ${openTasks.length} active task${
            openTasks.length === 1 ? "" : "s"
          }${overdueTasks.length > 0 ? ` (${overdueTasks.length} overdue)` : ""} in ${actorDepartment}.`;
    }
    return ar ? workspace.subtitleAr : `Welcome back, ${actorName}. ${workspace.subtitleEn}`;
  }, [
    actorDepartment,
    actorName,
    actorRoleKey,
    ar,
    firstName,
    leads.length,
    metrics?.newApplications,
    openJobs.length,
    openTasks.length,
    overdueLeads.length,
    overdueTasks.length,
    pendingApps.length,
    products.length,
    upcomingCalls.length,
    workspace.subtitleAr,
    workspace.subtitleEn,
  ]);

  // Real 7-day sparklines strictly from authorized arrays
  const leadsSeries = useMemo(() => buildDailySeries(leads.map((l) => l.createdAt)), [leads]);
  const callsSeries = useMemo(
    () => buildDailySeries(leads.map((l) => l.scheduledSlotIso)),
    [leads]
  );
  const appsSeries = useMemo(
    () => buildDailySeries(applications.map((a) => `${a.createdAt}T12:00:00.000Z`)),
    [applications]
  );
  const tasksSeries = useMemo(() => buildDailySeries(tasks.map((t) => t.createdAt)), [tasks]);

  // Permission-driven KPI strip (ZERO unauthorized metrics or links!)
  const kpiCards = useMemo(() => {
    const cards: Array<{
      id: string;
      label: string;
      value: number | string;
      sub: string;
      tone?: "emerald" | "amber" | "neutral";
      href?: string;
      onClick?: () => void;
      icon: "leads" | "calls" | "recruitment" | "tasks" | "jobs" | "products" | "demos" | "team" | "health";
      series?: number[];
      strokeStart?: string;
      strokeEnd?: string;
      highlightHealth?: boolean;
    }> = [];

    if (actorRoleKey === "sales_rep") {
      cards.push({
        id: "my-leads",
        label: ar ? "عملائي المسندون" : "My Assigned Leads",
        value: leads.length,
        sub: ar ? `${activeLeads.length} نشط` : `${activeLeads.length} active`,
        tone: "emerald",
        href: "/admin/crm",
        icon: "leads",
        series: leadsSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#60A5FA",
      });
      cards.push({
        id: "my-calls",
        label: ar ? "جلسات الاكتشاف" : "My Discovery Calls",
        value: upcomingCalls.length,
        sub: ar ? "مجدولة" : "Scheduled",
        href: "/admin/crm",
        icon: "calls",
        series: callsSeries,
        strokeStart: "#6366F1",
        strokeEnd: "#A855F7",
      });
      cards.push({
        id: "my-followups",
        label: ar ? "متابعات مطلوبة" : "Needs Follow-Up",
        value: overdueLeads.length,
        sub: ar ? "ضمن نطاقي" : "In my pipeline",
        tone: overdueLeads.length > 0 ? "amber" : "emerald",
        href: "/admin/crm",
        icon: "leads",
        series: leadsSeries,
        strokeStart: "#F59E0B",
        strokeEnd: "#F97316",
      });
      if (permissions.tasksView) {
        cards.push({
          id: "my-tasks",
          label: ar ? "مهام المتابعة" : "My Follow-Up Tasks",
          value: openTasks.length,
          sub: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "Active queue",
          onClick: () => setOpsOpen((v) => !v),
          icon: "tasks",
          series: tasksSeries,
          strokeStart: "#3B82F6",
          strokeEnd: "#818CF8",
        });
      }
      return cards;
    }

    if (actorRoleKey === "sales_manager") {
      cards.push({
        id: "team-pipeline",
        label: ar ? "خط مبيعات الفريق" : "Active Pipeline",
        value: activeLeads.length,
        sub: `${leads.length} total authorized`,
        tone: "emerald",
        href: "/admin/crm",
        icon: "leads",
        series: leadsSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#60A5FA",
      });
      cards.push({
        id: "team-calls",
        label: ar ? "جلسات الاكتشاف" : "Discovery Calls",
        value: upcomingCalls.length,
        sub: "Upcoming scheduled",
        href: "/admin/crm",
        icon: "calls",
        series: callsSeries,
        strokeStart: "#6366F1",
        strokeEnd: "#A855F7",
      });
      cards.push({
        id: "overdue-followups",
        label: ar ? "متابعات متأخرة" : "Overdue Follow-Ups",
        value: overdueLeads.length,
        sub: "Require rep action",
        tone: overdueLeads.length > 0 ? "amber" : "emerald",
        href: "/admin/crm",
        icon: "leads",
        series: leadsSeries,
        strokeStart: "#F59E0B",
        strokeEnd: "#F97316",
      });
      if (workspace.allowUnassignedQueue) {
        cards.push({
          id: "unassigned-queue",
          label: ar ? "قائمة غير المسندين" : "Unassigned Queue",
          value: unassignedLeads.length,
          sub: "Ready to assign",
          href: "/admin/crm",
          icon: "team",
          series: leadsSeries,
          strokeStart: "#8B5CF6",
          strokeEnd: "#EC4899",
        });
      }
      if (permissions.tasksView) {
        cards.push({
          id: "sales-tasks",
          label: ar ? "مهام المبيعات" : "Sales Tasks",
          value: openTasks.length,
          sub: `${overdueTasks.length} overdue`,
          onClick: () => setOpsOpen((v) => !v),
          icon: "tasks",
          series: tasksSeries,
          strokeStart: "#3B82F6",
          strokeEnd: "#818CF8",
        });
      }
      return cards;
    }

    if (actorRoleKey === "hr_manager") {
      cards.push({
        id: "new-apps",
        label: ar ? "طلبات جديدة اليوم" : "Applications Today",
        value: metrics?.applicationsToday ?? 0,
        sub: `${metrics?.totalApplications ?? applications.length} total`,
        tone: "emerald",
        href: "/admin/applications",
        icon: "recruitment",
        series: appsSeries,
        strokeStart: "#6366F1",
        strokeEnd: "#C084FC",
      });
      cards.push({
        id: "awaiting-review",
        label: ar ? "بانتظار المراجعة" : "Awaiting Review",
        value: metrics?.newApplications ?? pendingApps.length,
        sub: "Initial screening",
        href: "/admin/applications",
        icon: "recruitment",
        series: appsSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#60A5FA",
      });
      cards.push({
        id: "interviews",
        label: ar ? "المقابلات المجدولة" : "Interviews",
        value: metrics?.interviews ?? 0,
        sub: `${metrics?.shortlisted ?? 0} shortlisted`,
        href: "/admin/applications",
        icon: "calls",
        series: appsSeries,
        strokeStart: "#8B5CF6",
        strokeEnd: "#34D399",
      });
      cards.push({
        id: "open-jobs",
        label: ar ? "الوظائف المفتوحة" : "Open Positions",
        value: openJobs.length,
        sub: `${jobs.length} total roles`,
        href: "/admin/jobs",
        icon: "jobs",
        series: tasksSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#818CF8",
      });
      if (permissions.tasksView) {
        cards.push({
          id: "hr-tasks",
          label: ar ? "مهام التوظيف" : "Hiring Tasks",
          value: openTasks.length,
          sub: `${overdueTasks.length} overdue`,
          onClick: () => setOpsOpen((v) => !v),
          icon: "tasks",
          series: tasksSeries,
          strokeStart: "#6366F1",
          strokeEnd: "#A855F7",
        });
      }
      return cards;
    }

    if (actorRoleKey === "marketing_intern") {
      cards.push({
        id: "intern-tasks",
        label: ar ? "مهامي المسندة" : "Assigned Tasks",
        value: openTasks.length,
        sub: ar ? "مهام نشطة" : "Open in my queue",
        onClick: () => setOpsOpen((v) => !v),
        icon: "tasks",
        series: tasksSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#60A5FA",
      });
      cards.push({
        id: "intern-overdue",
        label: ar ? "مواعيد متأخرة" : "Overdue Deadlines",
        value: overdueTasks.length,
        sub: overdueTasks.length > 0 ? "Needs immediate update" : "All on schedule",
        tone: overdueTasks.length > 0 ? "amber" : "emerald",
        onClick: () => setOpsOpen(true),
        icon: "calls",
        series: tasksSeries,
        strokeStart: "#F59E0B",
        strokeEnd: "#F97316",
      });
      if (permissions.products) {
        cards.push({
          id: "intern-products",
          label: ar ? "المنتجات المنشورة" : "Published Products",
          value: products.length,
          sub: "Approved brand catalog",
          href: "/admin/products",
          icon: "products",
          series: tasksSeries,
          strokeStart: "#6366F1",
          strokeEnd: "#A855F7",
        });
      }
      if (permissions.jobs) {
        cards.push({
          id: "intern-jobs",
          label: ar ? "الوظائف المفتوحة" : "Open Roles",
          value: openJobs.length,
          sub: "Published openings",
          href: "/admin/jobs",
          icon: "jobs",
          series: tasksSeries,
          strokeStart: "#3B82F6",
          strokeEnd: "#34D399",
        });
      }
      return cards;
    }

    if (actorRoleKey === "marketing_specialist") {
      cards.push({
        id: "mkt-tasks",
        label: ar ? "مهام التسويق" : "Marketing Tasks",
        value: openTasks.length,
        sub: `${overdueTasks.length} overdue`,
        onClick: () => setOpsOpen((v) => !v),
        icon: "tasks",
        series: tasksSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#60A5FA",
      });
      if (permissions.products) {
        cards.push({
          id: "mkt-products",
          label: ar ? "المنتجات" : "Products",
          value: products.length,
          sub: "Positioning & catalog",
          href: "/admin/products",
          icon: "products",
          series: tasksSeries,
          strokeStart: "#6366F1",
          strokeEnd: "#A855F7",
        });
      }
      if (permissions.demonstrations) {
        cards.push({
          id: "mkt-demos",
          label: ar ? "العروض التفاعلية" : "Interactive Demos",
          value: "Live",
          sub: "Demo Studio access",
          href: "/admin/website/demonstrations",
          icon: "demos",
        });
      }
      if (permissions.crm) {
        cards.push({
          id: "mkt-leads",
          label: ar ? "مؤشرات العملاء المعتمدة" : "Approved Lead Insights",
          value: leads.length,
          sub: "Values redacted by role",
          href: "/admin/crm",
          icon: "leads",
          series: leadsSeries,
          strokeStart: "#3B82F6",
          strokeEnd: "#34D399",
        });
      }
      return cards;
    }

    if (actorRoleKey === "engineer" || actorRoleKey === "project_manager") {
      cards.push({
        id: "eng-tasks",
        label:
          actorRoleKey === "engineer"
            ? ar
              ? "مهامي الهندسية"
              : "Assigned Tasks"
            : ar
            ? "مهام الفريق"
            : "Team Delivery Tasks",
        value: openTasks.length,
        sub: `${overdueTasks.length} overdue`,
        onClick: () => setOpsOpen((v) => !v),
        icon: "tasks",
        series: tasksSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#60A5FA",
      });
      if (permissions.products) {
        cards.push({
          id: "eng-products",
          label: ar ? "المنتجات والأنظمة" : "Product Platforms",
          value: products.length,
          sub: "Authorized catalog",
          href: "/admin/products",
          icon: "products",
          series: tasksSeries,
          strokeStart: "#6366F1",
          strokeEnd: "#A855F7",
        });
      }
      if (permissions.bookings || permissions.crm) {
        cards.push({
          id: "eng-sessions",
          label:
            actorRoleKey === "engineer"
              ? ar
                ? "الجلسات المسندة"
                : "Assigned Sessions"
              : ar
              ? "تسليمات العملاء"
              : "Authorized Handoffs",
          value: upcomingCalls.length,
          sub: `${leads.length} scoped record${leads.length === 1 ? "" : "s"}`,
          href: permissions.crm ? "/admin/crm" : "/admin",
          icon: "calls",
          series: callsSeries,
          strokeStart: "#3B82F6",
          strokeEnd: "#818CF8",
        });
      }
      if (permissions.demonstrations) {
        cards.push({
          id: "eng-demos",
          label: ar ? "العروض التفاعلية" : "Interactive Demos",
          value: "Ready",
          sub: "Engineering demo studio",
          href: "/admin/website/demonstrations",
          icon: "demos",
        });
      }
      return cards;
    }

    // Super Admin & Administrator (strictly permission-gated!)
    if (permissions.crm) {
      cards.push({
        id: "exec-leads",
        label: ar ? "عملاء جدد (24 ساعة)" : "New Leads (24h)",
        value: briefing.counts.newLeads24h,
        sub: `${leads.length} total`,
        tone: "emerald",
        href: "/admin/crm",
        icon: "leads",
        series: leadsSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#60A5FA",
      });
      cards.push({
        id: "exec-calls",
        label: ar ? "جلسات الاكتشاف" : "Discovery Calls",
        value: briefing.counts.upcomingBookings,
        sub: "Scheduled",
        href: "/admin/crm",
        icon: "calls",
        series: callsSeries,
        strokeStart: "#6366F1",
        strokeEnd: "#A855F7",
      });
    }
    if (permissions.recruitment) {
      cards.push({
        id: "exec-recruitment",
        label: ar ? "خط التوظيف" : "Recruitment Pipeline",
        value: metrics?.newApplications ?? pendingApps.length,
        sub: "In review",
        href: "/admin/applications",
        icon: "recruitment",
        series: appsSeries,
        strokeStart: "#6366F1",
        strokeEnd: "#C084FC",
      });
    }
    if (permissions.tasksView) {
      cards.push({
        id: "exec-tasks",
        label: ar ? "المهام النشطة" : "Active Tasks",
        value: openTasks.length,
        sub: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "Require attention",
        onClick: () => setOpsOpen((v) => !v),
        icon: "tasks",
        series: tasksSeries,
        strokeStart: "#3B82F6",
        strokeEnd: "#818CF8",
      });
    }
    if (permissions.settings || permissions.team) {
      cards.push({
        id: "exec-health",
        label: permissions.team ? (ar ? "الفريق والنظام" : "Team & Health") : "Platform Status",
        value: supabaseConnected ? "Healthy" : "Check Status",
        sub: teamSummary
          ? `${teamSummary.active} active · ${teamSummary.invited} pending`
          : supabaseConnected
          ? "Supabase live"
          : "Local mode",
        href: permissions.team ? "/admin/team" : permissions.settings ? "/admin/settings" : undefined,
        icon: "health",
        highlightHealth: true,
      });
    }
    return cards;
  }, [
    activeLeads.length,
    actorRoleKey,
    applications.length,
    appsSeries,
    ar,
    briefing.counts.newLeads24h,
    briefing.counts.upcomingBookings,
    callsSeries,
    jobs.length,
    leads.length,
    leadsSeries,
    metrics,
    openJobs.length,
    openTasks.length,
    overdueLeads.length,
    overdueTasks.length,
    pendingApps.length,
    permissions,
    products.length,
    supabaseConnected,
    tasksSeries,
    teamSummary,
    unassignedLeads.length,
    upcomingCalls.length,
    workspace.allowUnassignedQueue,
  ]);

  // Structured Morning Briefing bullets strictly grounded in authorized modules only
  const structuredBullets = useMemo(() => {
    const rows: Array<{ lead: string; rest: string }> = [];

    if (permissions.crm || permissions.bookings) {
      const leadNames = Array.from(
        new Set(
          leads
            .slice(0, 4)
            .map((l) => l.company || l.fullName)
            .filter(Boolean)
        )
      ).slice(0, 2);
      const nameSuffix = leadNames.length > 0 ? ` (${leadNames.join(", ")})` : "";
      const scopeQualifier =
        actorScope === "assigned" || actorScope === "own"
          ? ar
            ? " ضمن عملائك المسندين"
            : " in your assigned pipeline"
          : actorScope === "team"
          ? ar
            ? ` ضمن فريق ${actorDepartment}`
            : ` in ${actorDepartment}`
          : "";
      rows.push({
        lead: ar
          ? `${leads.length} فرصة مصرح بها`
          : `${leads.length} authorized opportunit${leads.length === 1 ? "y" : "ies"}`,
        rest: ar
          ? `${scopeQualifier}، مع ${upcomingCalls.length} جلسة اكتشاف قادمة و${overdueLeads.length} متابعة مطلوبة${nameSuffix}.`
          : `${scopeQualifier}, with ${upcomingCalls.length} upcoming discovery call${
              upcomingCalls.length === 1 ? "" : "s"
            } and ${overdueLeads.length} follow-up${overdueLeads.length === 1 ? "" : "s"} needing attention${nameSuffix}.`,
      });
    }

    if (permissions.recruitment && metrics?.totalApplications !== null) {
      rows.push({
        lead: ar ? "التوظيف:" : "Recruitment:",
        rest: ar
          ? ` ${metrics?.applicationsToday ?? 0} طلب اليوم (${metrics?.newApplications ?? 0} بانتظار المراجعة، ${metrics?.interviews ?? 0} مقابلات).`
          : ` ${metrics?.applicationsToday ?? 0} new application${
              (metrics?.applicationsToday ?? 0) === 1 ? "" : "s"
            } today (${metrics?.newApplications ?? 0} awaiting review, ${metrics?.interviews ?? 0} interview${
              (metrics?.interviews ?? 0) === 1 ? "" : "s"
            } scheduled).`,
      });
    }

    if (permissions.tasksView) {
      const focusName = openTasks[0]?.title;
      rows.push({
        lead: ar
          ? `${openTasks.length} مهمة نشطة`
          : `${openTasks.length} active task${openTasks.length === 1 ? "" : "s"}`,
        rest:
          overdueTasks.length > 0
            ? ar
              ? ` (${overdueTasks.length} متأخرة) في قائمتك المصرح بها${focusName ? ` — أبرزها: ${focusName}` : ""}.`
              : ` (${overdueTasks.length} overdue) in your authorized queue${focusName ? ` — next: ${focusName}` : ""}.`
            : ar
            ? " في قائمتك المصرح بها بدون أي تأخير حالياً."
            : " in your authorized queue with zero overdue deadlines.",
      });
    }

    if (metrics && metrics.totalVisitors !== null) {
      rows.push({
        lead: ar ? "النظام والزيارات:" : "Organization Traffic:",
        rest: ar
          ? ` ${metrics.totalVisitors.toLocaleString("en-US")} زيارة إجمالية (${metrics.visitorsToday ?? 0} اليوم).`
          : ` ${metrics.totalVisitors.toLocaleString("en-US")} total visitors (${
              metrics.visitorsToday ?? 0
            } today) · ${supabaseConnected ? "Supabase live" : "Local staging"}.`,
      });
    }

    if (rows.length === 0) {
      rows.push({
        lead: `${actorRole}:`,
        rest: ` ${workspace.subtitleEn}`,
      });
    }

    return rows;
  }, [
    actorDepartment,
    actorRole,
    actorScope,
    ar,
    leads,
    metrics,
    openTasks,
    overdueLeads.length,
    overdueTasks.length,
    permissions.bookings,
    permissions.crm,
    permissions.recruitment,
    permissions.tasksView,
    supabaseConnected,
    upcomingCalls.length,
    workspace.subtitleEn,
  ]);

  // Verified source pills strictly gated by actor permissions
  const verifiedSourceChips = useMemo(() => {
    const chips: Array<{
      label: string;
      href: string;
      kind: "crm" | "recruitment" | "analytics" | "record";
    }> = [];
    if (permissions.crm) {
      chips.push({
        label: actorScope === "assigned" ? `My CRM (${leads.length})` : `CRM (${leads.length})`,
        href: "/admin/crm",
        kind: "crm",
      });
    }
    if (permissions.recruitment) {
      chips.push({
        label: `Recruitment (${metrics?.totalApplications ?? applications.length})`,
        href: "/admin/applications",
        kind: "recruitment",
      });
    }
    if (permissions.jobs) {
      chips.push({ label: `Jobs (${openJobs.length})`, href: "/admin/jobs", kind: "record" });
    }
    if (permissions.products) {
      chips.push({
        label: `Products (${products.length})`,
        href: "/admin/products",
        kind: "record",
      });
    }
    if (permissions.audit) {
      chips.push({ label: "Audit Trail", href: "/admin/audit", kind: "analytics" });
    }
    return chips.slice(0, 5);
  }, [
    actorScope,
    applications.length,
    leads.length,
    metrics?.totalApplications,
    openJobs.length,
    permissions.audit,
    permissions.crm,
    permissions.jobs,
    permissions.products,
    permissions.recruitment,
    products.length,
  ]);

  // Actionable Priorities strictly composed from authorized records
  const priorityRows = useMemo(() => {
    const items: Array<{
      id: string;
      icon: "flag" | "calendar" | "users" | "shield" | "package";
      tone: "rose" | "blue" | "violet" | "emerald" | "amber";
      title: string;
      detail: string;
      badge: string;
      meta: string;
      href: string;
    }> = [];

    if (permissions.crm && overdueLeads.length > 0) {
      const targetLead = overdueLeads[0];
      items.push({
        id: "priority-followup",
        icon: "flag",
        tone: "rose",
        title: `Follow-up Needed: ${targetLead.company || targetLead.fullName}`,
        detail: `${targetLead.serviceTrack} (${targetLead.referenceId}) · ${CRM_STAGE_LABELS[targetLead.stage].en}.`,
        badge: "High",
        meta: `${overdueLeads.length} pending`,
        href: `/admin/crm?lead=${encodeURIComponent(targetLead.id)}`,
      });
    }

    if ((permissions.crm || permissions.bookings) && upcomingCalls.length > 0) {
      const nextCall = upcomingCalls[0];
      items.push({
        id: "priority-meetings",
        icon: "calendar",
        tone: "blue",
        title: `Upcoming Discovery Call: ${nextCall.company || nextCall.fullName}`,
        detail: `${nextCall.serviceTrack} (${nextCall.referenceId}) · ${upcomingCalls.length} scheduled.`,
        badge: "Upcoming",
        meta: nextCall.scheduledSlotIso
          ? new Date(nextCall.scheduledSlotIso).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "Scheduled",
        href: permissions.crm
          ? `/admin/crm?lead=${encodeURIComponent(nextCall.id)}`
          : "/admin",
      });
    }

    if (permissions.recruitment && pendingApps.length > 0) {
      const topApp = pendingApps[0];
      items.push({
        id: "priority-recruitment",
        icon: "users",
        tone: "violet",
        title: `Candidate Review: ${topApp.name} (${topApp.jobTitle})`,
        detail: `${pendingApps.length} application${pendingApps.length === 1 ? "" : "s"} awaiting review · ${topApp.experience} · ${topApp.country}.`,
        badge: "Review",
        meta: topApp.status,
        href: `/admin/applications?q=${encodeURIComponent(topApp.id)}`,
      });
    }

    if (permissions.tasksView && openTasks.length > 0) {
      const firstTask = openTasks[0];
      const isOverdue =
        Boolean(firstTask.dueAt) && new Date(firstTask.dueAt!).getTime() < Date.now();
      items.push({
        id: `priority-task-${firstTask.id}`,
        icon: "flag",
        tone: isOverdue ? "rose" : "amber",
        title: firstTask.title,
        detail: firstTask.entityLabel
          ? `Linked to ${firstTask.entityLabel} · ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}.`
          : `${openTasks.length} active task${openTasks.length === 1 ? "" : "s"} in your queue.`,
        badge: isOverdue ? "Overdue" : firstTask.priority,
        meta: firstTask.dueAt
          ? `Due ${new Date(firstTask.dueAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}`
          : "Open",
        href:
          firstTask.entityType === "lead" && firstTask.entityId && permissions.crm
            ? `/admin/crm?lead=${encodeURIComponent(firstTask.entityId)}`
            : "/admin",
      });
    }

    if (permissions.products && products.length > 0 && items.length < 3) {
      items.push({
        id: "priority-products",
        icon: "package",
        tone: "emerald",
        title: `Authorized Product Catalog (${products.length})`,
        detail: products
          .slice(0, 3)
          .map((p) => p.name)
          .join(", "),
        badge: "Active",
        meta: "Catalog",
        href: "/admin/products",
      });
    }

    if (items.length === 0) {
      items.push({
        id: "priority-clear",
        icon: "shield",
        tone: "emerald",
        title: ar ? "لا توجد أولويات عاجلة حالياً" : "All clear in your workspace",
        detail: ar
          ? "لا توجد متابعات متأخرة أو مهام عاجلة ضمن صلاحياتك الحالية."
          : "No overdue follow-ups, pending reviews, or urgent tasks in your authorized scope.",
        badge: "Clear",
        meta: workspace.scopeLabelEn,
        href: "/admin",
      });
    }

    return items.slice(0, 4);
  }, [
    ar,
    openTasks,
    overdueLeads,
    pendingApps,
    permissions.bookings,
    permissions.crm,
    permissions.products,
    permissions.recruitment,
    permissions.tasksView,
    products,
    upcomingCalls,
    workspace.scopeLabelEn,
  ]);

  const roleAgentPrompts = ar ? workspace.agentPromptsAr : workspace.agentPromptsEn;

  const primaryActionHref = permissions.crm
    ? "/admin/crm"
    : permissions.recruitment
    ? "/admin/applications"
    : permissions.products
    ? "/admin/products"
    : permissions.jobs
    ? "/admin/jobs"
    : "/admin";

  return (
    <div className="hz-cc-root" dir={ar ? "rtl" : "ltr"}>
      <div className="hz-cc-atmosphere" aria-hidden="true">
        <div className="hz-cc-arc-glow" />
      </div>

      {/* ROW 1: Role-Aware Workspace Header */}
      <header className="hz-cc-header">
        <div className="hz-cc-header-left">
          <div className="hz-cc-eyebrow">
            <span className="hz-cc-eyebrow-brand">HIRZEXA</span>
            <span>
              {actorRole.toUpperCase()} · {(ar ? workspace.scopeLabelAr : workspace.scopeLabelEn).toUpperCase()}
            </span>
            <span className="hz-cc-eyebrow-line" aria-hidden="true" />
          </div>
          <h1>{ar ? workspace.titleAr : workspace.titleEn}</h1>
          <p>{personalizedGreeting}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="hz-btn hz-btn-secondary hz-btn-sm"
            onClick={() => setLocale((l) => (l === "en" ? "ar" : "en"))}
            aria-label="Toggle workspace language"
          >
            <Languages size={13} />
            <span>{ar ? "English" : "العربية"}</span>
          </button>

          <div className="hz-cc-date-block" aria-label="Current briefing date and time">
            <Calendar size={15} className="hz-cc-date-icon" />
            <div>
              <strong>{headerDate}</strong>
              <span>{headerTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ROW 2: Role-Scoped Morning Briefing Card */}
      <section className="hz-cc-briefing" aria-label="Morning Briefing">
        <div className="hz-cc-briefing-grid">
          <div className="hz-cc-briefing-left">
            <IsometricBriefingMark />
            <div className="hz-cc-briefing-intro">
              <h2>{ar ? workspace.briefingTitleAr : workspace.briefingTitleEn}</h2>
              <p>
                {ar
                  ? "ملخص تشغيلي مبني حصرياً على السجلات المصرح بها لدورك."
                  : `Grounded strictly in your authorized ${actorRole} records (${workspace.scopeLabelEn}).`}
              </p>
              <div
                className="hz-cc-briefing-pill"
                title="Grounded strictly in live authorized Supabase records"
              >
                <Sparkles size={11} />
                <span>
                  {aiConfigured ? "AI BRIEFING · SCOPED DATA" : "LIVE SCOPED BRIEFING"}
                </span>
                <Info size={11} style={{ opacity: 0.75 }} />
              </div>
            </div>
          </div>

          <div className="hz-cc-briefing-right">
            <ul className="hz-cc-bullet-list">
              {structuredBullets.map((item, idx) => (
                <li key={idx}>
                  <span className="hz-cc-bullet-dot" aria-hidden="true" />
                  <span>
                    <strong>{item.lead}</strong>
                    {item.rest}
                  </span>
                </li>
              ))}
            </ul>

            {briefing.aiSynthesis ? (
              <div className="hz-cc-synthesis-box">
                <div className="hz-cc-synthesis-label">
                  <Sparkles size={11} /> {ar ? "ملخص HIRZEXA الذكي" : "AI Scoped Brief"}
                </div>
                <MarkdownContent content={briefing.aiSynthesis} />
              </div>
            ) : null}

            <div className="hz-cc-sources-bar">
              <div className="hz-cc-sources-chips">
                <span className="hz-cc-sources-title">
                  {ar ? "المصادر المصرح بها:" : "Authorized Sources:"}
                </span>
                {verifiedSourceChips.map((chip) => (
                  <Link key={chip.label} href={chip.href} className="hz-cc-source-pill">
                    {chip.kind === "crm" ? (
                      <Target size={11} />
                    ) : chip.kind === "recruitment" ? (
                      <Users size={11} />
                    ) : chip.kind === "analytics" ? (
                      <BarChart3 size={11} />
                    ) : (
                      <BriefcaseBusiness size={11} />
                    )}
                    <span>{chip.label}</span>
                  </Link>
                ))}
              </div>

              <button
                type="button"
                className="hz-cc-updated-btn"
                disabled={refreshing}
                onClick={() => void refreshBriefing(false)}
                title="Refresh live briefing data"
              >
                <RefreshCw size={11} className={refreshing ? "hz-spin" : ""} />
                <span>
                  {refreshing
                    ? "Refreshing…"
                    : `Updated ${formatRelativeTime(briefing.generatedAt)}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ROW 3: Dynamic Permission-Driven KPI Strip */}
      <section className="hz-cc-kpi-grid" aria-label="Role-Scoped Operational Metrics">
        {kpiCards.map((card) => {
          const iconEl =
            card.icon === "leads" ? (
              <Target size={14} color="#60A5FA" />
            ) : card.icon === "calls" ? (
              <CalendarClock size={14} color="#A78BFA" />
            ) : card.icon === "recruitment" ? (
              <Users size={14} color="#818CF8" />
            ) : card.icon === "jobs" ? (
              <BriefcaseBusiness size={14} color="#60A5FA" />
            ) : card.icon === "products" ? (
              <Package size={14} color="#A78BFA" />
            ) : card.icon === "demos" ? (
              <PlayCircle size={14} color="#34D399" />
            ) : card.icon === "team" ? (
              <UserCheck size={14} color="#F472B6" />
            ) : card.icon === "health" ? (
              <Activity size={14} color="#34D399" />
            ) : (
              <Zap size={14} color="#60A5FA" />
            );

          const inner = card.highlightHealth ? (
            <>
              <div className="hz-cc-kpi-head">
                {iconEl}
                <span>{card.label}</span>
              </div>
              <div className="hz-cc-kpi-health-body">
                <div>
                  <strong className={supabaseConnected ? "hz-health-ok" : "hz-health-warn"}>
                    {card.value}
                  </strong>
                  <span className="hz-cc-kpi-sub" style={{ display: "block", marginTop: 2 }}>
                    {card.sub}
                  </span>
                </div>
                <span className={`hz-cc-health-pill ${supabaseConnected ? "is-ok" : "is-warn"}`}>
                  {supabaseConnected ? "Live" : "Local"}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="hz-cc-kpi-head">
                {iconEl}
                <span>{card.label}</span>
              </div>
              <div className="hz-cc-kpi-body">
                <div className="hz-cc-kpi-val-wrap">
                  <strong>{card.value}</strong>
                  <span
                    className={`hz-cc-kpi-sub ${
                      card.tone === "emerald"
                        ? "hz-tone-emerald"
                        : card.tone === "amber"
                        ? "hz-tone-amber"
                        : ""
                    }`}
                  >
                    {card.sub}
                  </span>
                </div>
                {card.series ? (
                  <SparklineSvg
                    id={card.id}
                    values={card.series}
                    strokeStart={card.strokeStart || "#3B82F6"}
                    strokeEnd={card.strokeEnd || "#60A5FA"}
                  />
                ) : null}
              </div>
            </>
          );

          if (card.onClick) {
            return (
              <button
                key={card.id}
                type="button"
                className={`hz-cc-kpi-card hz-cc-kpi-btn ${card.highlightHealth ? "hz-cc-kpi-health" : ""}`}
                onClick={card.onClick}
              >
                {inner}
              </button>
            );
          }
          if (card.href) {
            return (
              <Link
                key={card.id}
                href={card.href}
                className={`hz-cc-kpi-card ${card.highlightHealth ? "hz-cc-kpi-health" : ""}`}
              >
                {inner}
              </Link>
            );
          }
          return (
            <div
              key={card.id}
              className={`hz-cc-kpi-card ${card.highlightHealth ? "hz-cc-kpi-health" : ""}`}
            >
              {inner}
            </div>
          );
        })}
      </section>

      {/* ROW 4: 2-Column Main Split — Role Priorities / Workspace Module + Role AI Assistant */}
      <section className="hz-cc-split" aria-label="Role Priorities and AI Assistant">
        {/* Left: Role-Focused Priorities & Live Queue */}
        <div className="hz-cc-panel">
          <div className="hz-cc-panel-head">
            <div className="hz-cc-panel-title-group">
              <Target size={18} color="#818CF8" className="hz-cc-panel-icon" />
              <div>
                <h2>
                  {actorRoleKey === "sales_rep"
                    ? ar
                      ? "عملائي المسندون والأولويات"
                      : "My Assigned Leads & Priorities"
                    : actorRoleKey === "hr_manager"
                    ? ar
                      ? "المرشحون بانتظار المراجعة"
                      : "Candidates & Hiring Priorities"
                    : actorRoleKey === "sales_manager"
                    ? ar
                      ? "أولويات مبيعات الفريق"
                      : "Team Sales Priorities"
                    : ar
                    ? "الأولويات القابلة للتنفيذ"
                    : "Actionable Priorities"}
                </h2>
                <p>
                  {ar
                    ? "عناصر حقيقية مصرح بها تتطلب انتباهك اليوم."
                    : "Authorized records requiring your focus today."}
                </p>
              </div>
            </div>
            <div className="hz-cc-panel-meta">
              <span className="hz-cc-count-pill">{priorityRows.length} items</span>
              {primaryActionHref !== "/admin" ? (
                <Link href={primaryActionHref} className="hz-cc-link">
                  {ar ? "عرض الكل" : "Open Module"} <ArrowRight size={12} />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="hz-cc-stack">
            {priorityRows.map((row) => (
              <Link key={row.id} href={row.href} className="hz-cc-priority-row">
                <span className={`hz-cc-row-icon is-${row.tone}`} aria-hidden="true">
                  {row.icon === "flag" ? (
                    <Flag size={15} />
                  ) : row.icon === "calendar" ? (
                    <CalendarClock size={15} />
                  ) : row.icon === "users" ? (
                    <Users size={15} />
                  ) : row.icon === "package" ? (
                    <Package size={15} />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                </span>
                <div className="hz-cc-row-copy">
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                </div>
                <div className="hz-cc-row-right">
                  <span className={`hz-cc-sev-pill is-${row.tone}`}>{row.badge}</span>
                  <span className="hz-cc-row-time">{row.meta}</span>
                  <ChevronRight size={14} className="hz-cc-chevron" />
                </div>
              </Link>
            ))}
          </div>

          {/* Role-Specific Live Module Snippet (strictly real data or truthful empty state!) */}
          {actorRoleKey === "sales_rep" && permissions.crm ? (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--hz-border-subtle)" }}>
              <div className="hz-panel-head" style={{ marginBottom: 8 }}>
                <h3 style={{ fontSize: 13 }}>{ar ? "قائمة عملائي المسندين" : "My Assigned Pipeline"}</h3>
                <Link href="/admin/crm" className="hz-cc-link">
                  Sales CRM <ArrowRight size={12} />
                </Link>
              </div>
              {leads.length > 0 ? (
                <div className="hz-row-list">
                  {leads.slice(0, 4).map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/admin/crm?lead=${encodeURIComponent(lead.id)}`}
                      className="hz-list-row"
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong>{lead.company || lead.fullName}</strong>
                        <small>
                          {lead.referenceId} · {lead.serviceTrack}
                        </small>
                      </div>
                      <StatusBadge tone="blue">{CRM_STAGE_LABELS[lead.stage].en}</StatusBadge>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={ar ? "لا توجد فرص مسندة حالياً" : "No assigned leads yet"}
                  description={
                    ar
                      ? "عندما يقوم مدير المبيعات بإسناد فرصة إليك ستظهر هنا فوراً."
                      : "Leads assigned to your employee account appear here immediately under Assigned scope."
                  }
                />
              )}
            </div>
          ) : null}

          {actorRoleKey === "sales_manager" && repBreakdown.length > 0 ? (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--hz-border-subtle)" }}>
              <div className="hz-panel-head" style={{ marginBottom: 8 }}>
                <h3 style={{ fontSize: 13 }}>
                  {ar ? "توزيع الفرص حسب الممثلين" : "Sales Representative Assignments"}
                </h3>
                <Link href="/admin/crm" className="hz-cc-link">
                  Manage Assignments <ArrowRight size={12} />
                </Link>
              </div>
              <div className="hz-row-list">
                {repBreakdown.map((rep) => (
                  <div key={rep.label} className="hz-list-row">
                    <strong>{rep.label}</strong>
                    <StatusBadge tone={rep.label === "Unassigned Queue" ? "amber" : "blue"}>
                      {rep.active} active / {rep.total} total
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {actorRoleKey === "hr_manager" && permissions.recruitment ? (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--hz-border-subtle)" }}>
              <div className="hz-panel-head" style={{ marginBottom: 8 }}>
                <h3 style={{ fontSize: 13 }}>{ar ? "أحدث طلبات التوظيف" : "Recent Applications"}</h3>
                <Link href="/admin/applications" className="hz-cc-link">
                  Recruitment <ArrowRight size={12} />
                </Link>
              </div>
              {applications.length > 0 ? (
                <div className="hz-row-list">
                  {applications.slice(0, 4).map((app) => (
                    <Link
                      key={app.id}
                      href={`/admin/applications?q=${encodeURIComponent(app.id)}`}
                      className="hz-list-row"
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong>{app.name}</strong>
                        <small>
                          {app.jobTitle} · {app.experience} · {app.country}
                        </small>
                      </div>
                      <StatusBadge tone={app.status === "new" ? "amber" : "blue"}>
                        {app.status}
                      </StatusBadge>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No candidate applications yet"
                  description="New submissions from /careers will appear here for review."
                />
              )}
            </div>
          ) : null}

          {workspace.showProjectsEmptyState ? (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--hz-border-subtle)" }}>
              <EmptyState
                icon={<FolderKanban size={18} />}
                title={ar ? "وحدة المشاريع قيد الإعداد" : "Projects & Milestones Module"}
                description={
                  ar
                    ? "لم يتم ربط جدول مشاريع مخصص في قاعدة البيانات بعد. يمكنك إدارة المهام والمنتجات المعتمدة أدناه."
                    : "A dedicated Projects & Milestones backend table has not been provisioned yet. Manage your active delivery tasks and authorized products below without mock project records."
                }
              />
            </div>
          ) : null}

          {workspace.showCampaignsEmptyState ? (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--hz-border-subtle)" }}>
              <EmptyState
                icon={<Megaphone size={18} />}
                title={ar ? "سجلات الحملات التسويقية" : "Campaign Tracking Records"}
                description={
                  ar
                    ? "لا يوجد نظام حملات إعلانية متصل بعد. يمكنك إدارة العروض التفاعلية والمنتجات ومهام التسويق المصرح بها."
                    : "No external campaign analytics integration is connected yet. Manage Interactive Demos, Products, and team marketing tasks directly from your authorized modules."
                }
              />
            </div>
          ) : null}
        </div>

        {/* Right: Personalized Role AI Assistant */}
        <div className="hz-cc-panel hz-cc-panel-insights">
          <div className="hz-cc-panel-head">
            <div className="hz-cc-panel-title-group">
              <Sparkles size={18} color="#A78BFA" className="hz-cc-panel-icon" />
              <div>
                <h2>
                  {actorRoleKey === "sales_rep"
                    ? ar
                      ? "مساعد المبيعات الذكي"
                      : "AI Sales Assistant"
                    : actorRoleKey === "hr_manager"
                    ? ar
                      ? "مساعد التوظيف الذكي"
                      : "AI Recruitment Assistant"
                    : actorRoleKey === "engineer"
                    ? ar
                      ? "مساعد الهندسة الذكي"
                      : "Engineering AI Assistant"
                    : ar
                    ? "رؤى وتوصيات HIRZEXA الذكية"
                    : "AI Insights & Role Assistant"}
                </h2>
                <p>
                  {ar
                    ? "تحليل فوري مقيد تماماً بصلاحياتك ونطاق سجلاتك."
                    : `Strictly constrained to your ${actorRole} permissions and ${workspace.scopeLabelEn}.`}
                </p>
              </div>
            </div>
            <span
              className="hz-cc-ai-pill"
              title="Derived strictly from your real authorized HIRZEXA database records"
            >
              <span>RBAC Scoped</span>
              <Info size={11} />
            </span>
          </div>

          <div className="hz-cc-stack">
            {roleAgentPrompts.slice(0, 3).map((prompt, idx) =>
              permissions.agent ? (
                <button
                  key={prompt}
                  type="button"
                  className="hz-cc-insight-row"
                  onClick={() => triggerAgent(prompt)}
                >
                  <span className="hz-cc-row-icon is-indigo" aria-hidden="true">
                    {idx === 0 ? (
                      <TrendingUp size={15} />
                    ) : idx === 1 ? (
                      <Sparkles size={15} />
                    ) : (
                      <Layers size={15} />
                    )}
                  </span>
                  <div className="hz-cc-row-copy">
                    <strong>{prompt}</strong>
                    <small>
                      {ar
                        ? "اضغط لتشغيل استعلام موثق ضمن صلاحياتك"
                        : "Run grounded query strictly within your authorized records"}
                    </small>
                  </div>
                  <ChevronRight size={14} className="hz-cc-chevron" />
                </button>
              ) : null
            )}
          </div>

          <div className="hz-cc-insights-foot">
            <button
              type="button"
              className="hz-cc-brief-cta"
              disabled={synthesizing}
              onClick={() => void refreshBriefing(true)}
            >
              <FileText size={14} />
              <span>
                {synthesizing
                  ? ar
                    ? "جارٍ إنشاء الملخص…"
                    : "Generating Brief…"
                  : ar
                  ? "توليد الملخص الذكي"
                  : "Generate Scoped AI Brief"}
              </span>
            </button>

            {permissions.agent ? (
              <Link href="/admin/agent" className="hz-cc-link">
                {ar ? "فتح مساحة الوكيل" : "Open AI Workspace"} <ArrowRight size={12} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* BELOW THE FOLD: Authorized Tasks & Scoped Live Activity Feed */}
      <section className="hz-cc-ops-drawer">
        <button
          type="button"
          className="hz-cc-ops-toggle"
          onClick={() => setOpsOpen((v) => !v)}
          aria-expanded={opsOpen}
        >
          <span>
            {permissions.tasksView
              ? ar
                ? `المهام (${openTasks.length} مفتوحة) والنشاط المصرح به (${events.length})`
                : `Authorized Tasks (${openTasks.length} open) & Scoped Activity Feed (${events.length})`
              : ar
              ? `النشاط المصرح به (${events.length})`
              : `Scoped Operational Activity (${events.length})`}
          </span>
          {opsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {opsOpen ? (
          <div className="hz-cc-ops-body">
            {permissions.tasksView ? (
              <div>
                <div className="hz-panel-head" style={{ marginBottom: 10 }}>
                  <h3>{ar ? "المهام والمتابعات" : "Follow-Up Tasks"}</h3>
                  <StatusBadge tone="neutral">{openTasks.length} open</StatusBadge>
                </div>

                {permissions.tasksCreate ? (
                  <form
                    onSubmit={handleQuickCreateTask}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) 136px auto",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder={ar ? "أضف مهمة متابعة…" : "Add a task to your queue…"}
                      aria-label="New task title"
                    />
                    <input
                      type="date"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                      aria-label="Task due date"
                    />
                    <button
                      type="submit"
                      className="hz-btn hz-btn-primary"
                      disabled={taskBusy || !newTaskTitle.trim()}
                    >
                      <Plus size={14} /> {ar ? "إضافة" : "Add"}
                    </button>
                  </form>
                ) : null}

                {tasks.length > 0 ? (
                  <div className="hz-row-list">
                    {tasks.slice(0, 6).map((task) => {
                      const isOverdue =
                        task.status !== "completed" &&
                        Boolean(task.dueAt) &&
                        new Date(task.dueAt!).getTime() < Date.now();
                      return (
                        <div key={task.id} className="hz-list-row">
                          <button
                            type="button"
                            onClick={() => void toggleTaskStatus(task)}
                            disabled={!permissions.tasksEdit}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 10,
                              border: 0,
                              background: "transparent",
                              color: "inherit",
                              textAlign: "start",
                              cursor: permissions.tasksEdit ? "pointer" : "default",
                              padding: 0,
                              minWidth: 0,
                            }}
                          >
                            {task.status === "completed" ? (
                              <CheckCircle2 size={15} color="#10B981" style={{ flexShrink: 0 }} />
                            ) : (
                              <Circle
                                size={15}
                                color={isOverdue ? "#F43F5E" : "#64748B"}
                                style={{ flexShrink: 0 }}
                              />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <strong
                                style={
                                  task.status === "completed"
                                    ? { textDecoration: "line-through", opacity: 0.55 }
                                    : undefined
                                }
                              >
                                {task.title}
                              </strong>
                              <small>
                                {task.entityLabel ? `${task.entityLabel} · ` : ""}
                                {task.dueAt
                                  ? `Due ${new Date(task.dueAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}`
                                  : "No due date"}
                              </small>
                            </div>
                          </button>

                          <StatusBadge
                            tone={
                              isOverdue
                                ? "rose"
                                : task.status === "completed"
                                ? "emerald"
                                : "neutral"
                            }
                          >
                            {isOverdue ? "Overdue" : task.status}
                          </StatusBadge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CheckCircle2 size={18} />}
                    title={ar ? "لا توجد مهام حالياً" : "No tasks queued"}
                    description={
                      ar
                        ? "أضف مهمة متابعة أعلاه للبدء."
                        : "Create a follow-up task above or ask HIRZEXA to stage one."
                    }
                  />
                )}
              </div>
            ) : null}

            <div>
              <div className="hz-panel-head" style={{ marginBottom: 10 }}>
                <h3>{ar ? "النشاط المصرح به مؤخراً" : "Recent Authorized Activity"}</h3>
                {permissions.audit ? (
                  <Link href="/admin/audit" className="hz-cc-link">
                    Audit Logs <ArrowRight size={12} />
                  </Link>
                ) : null}
              </div>
              {events.length > 0 ? (
                <div className="hz-row-list">
                  {events.slice(0, 6).map((evt) => (
                    <Link key={evt.id} href={evt.sourceHref} className="hz-list-row">
                      <div style={{ minWidth: 0 }}>
                        <strong>{evt.title}</strong>
                        <small>{evt.summary}</small>
                      </div>
                      <StatusBadge
                        tone={
                          evt.severity === "urgent"
                            ? "rose"
                            : evt.severity === "attention"
                            ? "amber"
                            : "neutral"
                        }
                      >
                        {evt.module}
                      </StatusBadge>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={ar ? "لا يوجد نشاط حديث" : "No recent activity"}
                  description={
                    ar
                      ? "ستظهر هنا التحديثات المصرح بها لدورك فور حدوثها."
                      : "Authorized updates for your modules and assigned records appear here."
                  }
                />
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
