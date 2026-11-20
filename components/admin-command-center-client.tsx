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
  Info,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  EmptyState,
  MarkdownContent,
  StatusBadge,
} from "@/components/admin-ui/primitives";
import type { CrmLeadRecord } from "@/lib/crm-types";
import type {
  BusinessEventRecord,
  CrmTaskRecord,
  MorningBriefingData,
} from "@/lib/intelligence/types";

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

  // Build smooth path strictly from real bucket values (flat baseline when all zeros)
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
      {/* Bottom layer */}
      <path
        d="M40 70L14 55.5L40 41L66 55.5L40 70Z"
        fill="url(#isoBot)"
        stroke="rgba(167,139,250,0.28)"
        strokeWidth="1"
      />
      {/* Middle layer */}
      <path
        d="M40 56L14 41.5L40 27L66 41.5L40 56Z"
        fill="url(#isoMid)"
        stroke="rgba(147,197,253,0.42)"
        strokeWidth="1"
      />
      {/* Top luminous layer */}
      <path
        d="M40 42L14 27.5L40 13L66 27.5L40 42Z"
        fill="url(#isoTop)"
        stroke="rgba(224,231,255,0.68)"
        strokeWidth="1.1"
      />
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
  supabaseConnected,
  aiConfigured,
  initialBriefing,
  initialTasks,
  initialEvents,
  leads,
  metrics,
  permissions,
}: {
  actorName: string;
  actorRole: string;
  supabaseConnected: boolean;
  aiConfigured: boolean;
  initialBriefing: MorningBriefingData;
  initialTasks: CrmTaskRecord[];
  initialEvents: BusinessEventRecord[];
  leads: CrmLeadRecord[];
  metrics: {
    totalVisitors: number;
    visitorsToday: number;
    totalApplications: number;
    applicationsToday: number;
    activeJobs: number;
    newApplications: number;
    shortlisted: number;
    interviews: number;
  } | null;
  permissions: {
    crm: boolean;
    recruitment: boolean;
    tasksCreate: boolean;
    tasksEdit: boolean;
    agent: boolean;
  };
}) {
  const [briefing, setBriefing] = useState<MorningBriefingData>(initialBriefing);
  const [events, setEvents] = useState<BusinessEventRecord[]>(initialEvents);
  const [refreshing, setRefreshing] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [tasks, setTasks] = useState<CrmTaskRecord[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);

  const generatedDate = useMemo(() => new Date(briefing.generatedAt), [briefing.generatedAt]);

  const headerDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(generatedDate),
    [generatedDate]
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
      const res = await fetch(
        `/api/admin/briefing${synthesize ? "?synthesize=1" : ""}`,
        { cache: "no-store" }
      );
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
    if (!newTaskTitle.trim() || taskBusy) return;
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
    window.dispatchEvent(
      new CustomEvent("hirzexa:ask-agent", {
        detail: {
          prompt,
          pageContext: { route: "/admin", entityType: "dashboard" },
        },
      })
    );
  }

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
    const cutoff = now - 48 * 60 * 60 * 1000;
    return leads.filter(
      (l) =>
        (l.nextFollowUpAt &&
          l.stage !== "won" &&
          l.stage !== "lost" &&
          new Date(l.nextFollowUpAt).getTime() < now) ||
        (l.stage === "new_lead" && new Date(l.createdAt).getTime() < cutoff)
    );
  }, [leads]);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "completed"), [tasks]);

  // Real 7-day sparkline arrays computed directly from Supabase timestamps
  const leadsSeries = useMemo(() => buildDailySeries(leads.map((l) => l.createdAt)), [leads]);
  const callsSeries = useMemo(
    () => buildDailySeries(leads.map((l) => l.scheduledSlotIso)),
    [leads]
  );
  const eventsSeries = useMemo(
    () =>
      buildDailySeries(
        events
          .filter((e) => e.module === "recruitment")
          .map((e) => e.createdAt)
      ),
    [events]
  );
  const tasksSeries = useMemo(() => buildDailySeries(tasks.map((t) => t.createdAt)), [tasks]);

  // Structured Morning Briefing bullets strictly grounded in live records
  const structuredBullets = useMemo(() => {
    const rows: Array<{ lead: string; rest: string }> = [];

    if (permissions.crm) {
      const leadNames = Array.from(
        new Set(
          leads
            .slice(0, 4)
            .map((l) => l.company || l.fullName)
            .filter(Boolean)
        )
      ).slice(0, 2);
      const nameSuffix = leadNames.length > 0 ? ` (${leadNames.join(", ")})` : "";
      rows.push({
        lead: `${briefing.counts.newLeads24h} new lead${briefing.counts.newLeads24h === 1 ? "" : "s"}`,
        rest: ` registered in the last 24 hours, with ${briefing.counts.upcomingBookings} discovery call${briefing.counts.upcomingBookings === 1 ? "" : "s"} scheduled${nameSuffix}.`,
      });
    }

    if (permissions.recruitment && metrics) {
      rows.push({
        lead: "Recruitment:",
        rest: ` ${metrics.applicationsToday} new application${metrics.applicationsToday === 1 ? "" : "s"} today (${metrics.newApplications} in review, ${metrics.interviews} interview${metrics.interviews === 1 ? "" : "s"} scheduled).`,
      });
    }

    const followUpCount = briefing.counts.overdueFollowUps + briefing.counts.overdueTasks;
    const focusName = overdueLeads[0]?.company || overdueLeads[0]?.fullName || openTasks[0]?.entityLabel;
    rows.push({
      lead: `${followUpCount > 0 ? followUpCount : openTasks.length} ${followUpCount > 0 ? "follow-up" : "active task"}${
        (followUpCount > 0 ? followUpCount : openTasks.length) === 1 ? "" : "s"
      }`,
      rest:
        followUpCount > 0
          ? ` require attention${focusName ? ` (${focusName})` : ""} across active CRM and task queues.`
          : ` open in your operational queue, with zero overdue client deadlines.`,
    });

    if (metrics) {
      rows.push({
        lead: "System:",
        rest: ` ${metrics.totalVisitors.toLocaleString("en-US")} total visitors (${metrics.visitorsToday} today) · ${
          supabaseConnected ? "Supabase live" : "Local storage"
        }.`,
      });
    }

    return rows;
  }, [
    briefing.counts,
    leads,
    metrics,
    openTasks,
    overdueLeads,
    permissions.crm,
    permissions.recruitment,
    supabaseConnected,
  ]);

  // Verified source pills strictly from live counts & briefing sources
  const verifiedSourceChips = useMemo(() => {
    const chips: Array<{ label: string; href: string; kind: "crm" | "recruitment" | "analytics" | "record" }> = [];
    if (permissions.crm) {
      chips.push({ label: `CRM (${leads.length})`, href: "/admin/crm", kind: "crm" });
    }
    if (permissions.recruitment && metrics) {
      chips.push({
        label: `Recruitment (${metrics.totalApplications})`,
        href: "/admin/applications",
        kind: "recruitment",
      });
    }
    if (metrics) {
      chips.push({ label: "Analytics", href: "/admin/audit", kind: "analytics" });
    }
    for (const src of (briefing.sources || []).slice(0, 2)) {
      if (!chips.some((c) => c.href === src.href)) {
        chips.push({ label: src.label.slice(0, 24), href: src.href, kind: "record" });
      }
    }
    return chips;
  }, [briefing.sources, leads.length, metrics, permissions.crm, permissions.recruitment]);

  // Actionable Priorities rows strictly derived from live alerts, calls, recruitment, and system health
  const priorityRows = useMemo(() => {
    const items: Array<{
      id: string;
      icon: "flag" | "calendar" | "users" | "shield";
      tone: "rose" | "blue" | "violet" | "emerald" | "amber";
      title: string;
      detail: string;
      badge: string;
      meta: string;
      href: string;
    }> = [];

    if (permissions.crm && (overdueLeads.length > 0 || briefing.counts.overdueFollowUps > 0)) {
      const targetLead = overdueLeads[0];
      items.push({
        id: "priority-followup",
        icon: "flag",
        tone: "rose",
        title: targetLead
          ? `Follow-up Needed: ${targetLead.company || targetLead.fullName}`
          : `Follow-up Needed (${briefing.counts.overdueFollowUps})`,
        detail: targetLead
          ? `${targetLead.serviceTrack} inquiry awaiting initial response (${targetLead.referenceId}).`
          : "Proposal requests or inbound bookings require operator follow-up.",
        badge: "High",
        meta: "Action needed",
        href: targetLead ? `/admin/crm?lead=${encodeURIComponent(targetLead.id)}` : "/admin/crm",
      });
    } else if (openTasks.length > 0) {
      const firstTask = openTasks[0];
      const overdue =
        Boolean(firstTask.dueAt) && new Date(firstTask.dueAt!).getTime() < Date.now();
      items.push({
        id: `priority-task-${firstTask.id}`,
        icon: "flag",
        tone: overdue ? "rose" : "amber",
        title: `Follow-up Task: ${firstTask.title}`,
        detail: firstTask.entityLabel
          ? `Linked to ${firstTask.entityLabel} · ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} total.`
          : `${openTasks.length} active operational task${openTasks.length === 1 ? "" : "s"} queued.`,
        badge: overdue ? "High" : firstTask.priority === "high" ? "High" : "Active",
        meta: firstTask.dueAt
          ? `Due ${new Date(firstTask.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "Open queue",
        href:
          firstTask.entityType === "lead" && firstTask.entityId
            ? `/admin/crm?lead=${encodeURIComponent(firstTask.entityId)}`
            : "/admin/crm",
      });
    }

    if (permissions.crm) {
      const nextCall = upcomingCalls[0];
      const companyNames = Array.from(
        new Set(upcomingCalls.map((c) => c.company || c.fullName).filter(Boolean))
      ).slice(0, 2);
      items.push({
        id: "priority-meetings",
        icon: "calendar",
        tone: "blue",
        title: `Meetings to Prepare (${upcomingCalls.length})`,
        detail:
          upcomingCalls.length > 0
            ? `Discovery calls with ${companyNames.join(", ")}${upcomingCalls.length > 2 ? " and other clients" : ""}.`
            : "No upcoming discovery calls scheduled yet via /book.",
        badge: upcomingCalls.length > 0 ? "Upcoming" : "Clear",
        meta: nextCall?.scheduledSlotIso
          ? `Next ${new Date(nextCall.scheduledSlotIso).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "No calls",
        href: nextCall ? `/admin/crm?lead=${encodeURIComponent(nextCall.id)}` : "/admin/crm",
      });
    }

    if (permissions.recruitment && metrics) {
      items.push({
        id: "priority-recruitment",
        icon: "users",
        tone: "violet",
        title: `Recruitment Review (${metrics.newApplications})`,
        detail: `${metrics.newApplications} application${metrics.newApplications === 1 ? "" : "s"} awaiting review, ${metrics.interviews} interview${metrics.interviews === 1 ? "" : "s"} scheduled across ${metrics.activeJobs} active role${metrics.activeJobs === 1 ? "" : "s"}.`,
        badge: metrics.newApplications > 0 ? "Medium" : "Current",
        meta: metrics.newApplications > 0 ? "Review today" : "Up to date",
        href: "/admin/applications",
      });
    }

    const urgentEvents = events.filter((e) => e.severity === "urgent");
    const latestEvt = events[0];
    items.push({
      id: "priority-system",
      icon: "shield",
      tone: urgentEvents.length > 0 ? "rose" : "emerald",
      title: "System & Activity Status",
      detail:
        urgentEvents.length > 0
          ? `${urgentEvents.length} urgent operational event${urgentEvents.length === 1 ? "" : "s"} logged: ${urgentEvents[0].title}.`
          : `No critical issues. ${events.length} authorized operational event${events.length === 1 ? "" : "s"} recorded.`,
      badge: urgentEvents.length > 0 ? "Urgent" : "Normal",
      meta: latestEvt ? `Updated ${formatRelativeTime(latestEvt.createdAt)}` : "Operational",
      href: "/admin/audit",
    });

    return items.slice(0, 4);
  }, [
    briefing.counts.overdueFollowUps,
    events,
    metrics,
    openTasks,
    overdueLeads,
    permissions.crm,
    permissions.recruitment,
    upcomingCalls,
  ]);

  // Grounded AI Insights & Recommendations strictly backed by real live records
  const aiRecommendations = useMemo(() => {
    const list: Array<{
      id: string;
      icon: "trend" | "users" | "layers";
      title: string;
      detail: string;
      prompt: string;
      href: string;
    }> = [];

    if (permissions.crm) {
      const activeCount = leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length;
      list.push({
        id: "rec-crm",
        icon: "trend",
        title:
          upcomingCalls.length > 0
            ? "Convert discovery calls to proposals"
            : "Review active sales pipeline",
        detail:
          upcomingCalls.length > 0
            ? `${upcomingCalls.length} scheduled call${upcomingCalls.length === 1 ? "" : "s"} and ${activeCount} active opportunit${activeCount === 1 ? "y" : "ies"} ready for discovery preparation.`
            : `${activeCount} active lead${activeCount === 1 ? "" : "s"} currently tracked across HIRZEXA CRM stages.`,
        prompt:
          upcomingCalls.length > 0
            ? "Summarize our upcoming discovery calls and prepare tailored proposal talking points."
            : "Give me a prioritized breakdown of all open leads in Sales CRM and recommended next steps.",
        href: "/admin/crm",
      });
    }

    if (permissions.recruitment && metrics) {
      list.push({
        id: "rec-recruitment",
        icon: "users",
        title:
          metrics.newApplications > 0
            ? "Accelerate recruitment review"
            : "Audit open hiring pipelines",
        detail:
          metrics.newApplications > 0
            ? `${metrics.newApplications} application${metrics.newApplications === 1 ? "" : "s"} pending review across ${metrics.activeJobs} open role${metrics.activeJobs === 1 ? "" : "s"}.`
            : `${metrics.totalApplications} total applications processed across ${metrics.activeJobs} published job${metrics.activeJobs === 1 ? "" : "s"}.`,
        prompt:
          "Evaluate pending job applications against our active job requirements and highlight top candidates.",
        href: "/admin/applications",
      });
    }

    list.push({
      id: "rec-engagement",
      icon: "layers",
      title:
        metrics && metrics.totalVisitors > 0
          ? "Review website traffic & conversion flow"
          : "Audit daily operational events",
      detail: metrics
        ? `${metrics.totalVisitors.toLocaleString("en-US")} total visitors (${metrics.visitorsToday} today) and ${openTasks.length} open operational task${openTasks.length === 1 ? "" : "s"}.`
        : `${events.length} recent business events and ${openTasks.length} open tasks tracked across authorized modules.`,
      prompt:
        "Analyze recent HIRZEXA business events, visitor inquiries, and open tasks to identify the highest-leverage actions for today.",
      href: "/admin/agent",
    });

    return list.slice(0, 3);
  }, [events.length, leads, metrics, openTasks.length, permissions.crm, permissions.recruitment, upcomingCalls.length]);

  const systemHealthy = supabaseConnected && metrics !== null;

  return (
    <div className="hz-cc-root">
      {/* Subtle Cosmic Orbital Horizon Backdrop */}
      <div className="hz-cc-atmosphere" aria-hidden="true">
        <div className="hz-cc-arc-glow" />
      </div>

      {/* ROW 1: Executive Header */}
      <header className="hz-cc-header">
        <div className="hz-cc-header-left">
          <div className="hz-cc-eyebrow">
            <span className="hz-cc-eyebrow-brand">HIRZEXA</span>
            <span>INTELLIGENCE</span>
            <span className="hz-cc-eyebrow-line" aria-hidden="true" />
          </div>
          <h1>Executive Command Center</h1>
          <p>
            Welcome back, {actorName}. Here&apos;s your operational overview, AI briefing, and
            prioritized actions across HIRZEXA.
          </p>
        </div>

        <div className="hz-cc-date-block" aria-label="Current briefing date and time">
          <Calendar size={15} className="hz-cc-date-icon" />
          <div>
            <strong>{headerDate}</strong>
            <span>{headerTime}</span>
          </div>
        </div>
      </header>

      {/* ROW 2: Signature 2-Column Glassy Morning Briefing Card */}
      <section className="hz-cc-briefing" aria-label="Morning Briefing">
        <div className="hz-cc-briefing-grid">
          {/* Left identity column */}
          <div className="hz-cc-briefing-left">
            <IsometricBriefingMark />
            <div className="hz-cc-briefing-intro">
              <h2>Morning Briefing</h2>
              <p>AI-generated operational summary from your live business data.</p>
              <div className="hz-cc-briefing-pill" title="Grounded strictly in live authorized Supabase records">
                <Sparkles size={11} />
                <span>
                  {aiConfigured ? "AI BRIEFING · LIVE DATA" : "LIVE DATA BRIEFING"}
                </span>
                <Info size={11} style={{ opacity: 0.75 }} />
              </div>
            </div>
          </div>

          {/* Right structured summary & verified sources */}
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
                  <Sparkles size={11} /> Executive AI Brief
                </div>
                <MarkdownContent content={briefing.aiSynthesis} />
              </div>
            ) : null}

            <div className="hz-cc-sources-bar">
              <div className="hz-cc-sources-chips">
                <span className="hz-cc-sources-title">Verified Sources:</span>
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

      {/* ROW 3: 5-Column Compact KPI Sparkline Strip */}
      <section className="hz-cc-kpi-grid" aria-label="Live Operational Metrics">
        {/* 1. New Leads (24h) */}
        <Link href={permissions.crm ? "/admin/crm" : "/admin"} className="hz-cc-kpi-card">
          <div className="hz-cc-kpi-head">
            <Users size={14} color="#60A5FA" />
            <span>New Leads (24h)</span>
          </div>
          <div className="hz-cc-kpi-body">
            <div className="hz-cc-kpi-val-wrap">
              <strong>{briefing.counts.newLeads24h}</strong>
              <span className="hz-cc-kpi-sub hz-tone-emerald">
                {leads.length} total
              </span>
            </div>
            <SparklineSvg
              id="leads"
              values={leadsSeries}
              strokeStart="#3B82F6"
              strokeEnd="#60A5FA"
            />
          </div>
        </Link>

        {/* 2. Discovery Calls */}
        <Link href={permissions.crm ? "/admin/crm" : "/admin"} className="hz-cc-kpi-card">
          <div className="hz-cc-kpi-head">
            <CalendarClock size={14} color="#A78BFA" />
            <span>Discovery Calls</span>
          </div>
          <div className="hz-cc-kpi-body">
            <div className="hz-cc-kpi-val-wrap">
              <strong>{briefing.counts.upcomingBookings}</strong>
              <span className="hz-cc-kpi-sub">Scheduled</span>
            </div>
            <SparklineSvg
              id="calls"
              values={callsSeries}
              strokeStart="#6366F1"
              strokeEnd="#A855F7"
            />
          </div>
        </Link>

        {/* 3. Recruitment Pipeline */}
        <Link
          href={permissions.recruitment ? "/admin/applications" : "/admin"}
          className="hz-cc-kpi-card"
        >
          <div className="hz-cc-kpi-head">
            <Users size={14} color="#818CF8" />
            <span>Recruitment Pipeline</span>
          </div>
          <div className="hz-cc-kpi-body">
            <div className="hz-cc-kpi-val-wrap">
              <strong>{metrics ? metrics.newApplications : 0}</strong>
              <span className="hz-cc-kpi-sub">In review</span>
            </div>
            <SparklineSvg
              id="recruitment"
              values={eventsSeries}
              strokeStart="#6366F1"
              strokeEnd="#C084FC"
            />
          </div>
        </Link>

        {/* 4. Active Tasks */}
        <button
          type="button"
          className="hz-cc-kpi-card hz-cc-kpi-btn"
          onClick={() => setOpsOpen((v) => !v)}
        >
          <div className="hz-cc-kpi-head">
            <Zap size={14} color="#60A5FA" />
            <span>Active Tasks</span>
          </div>
          <div className="hz-cc-kpi-body">
            <div className="hz-cc-kpi-val-wrap">
              <strong>{openTasks.length}</strong>
              <span className="hz-cc-kpi-sub">
                {briefing.counts.overdueTasks > 0
                  ? `${briefing.counts.overdueTasks} overdue`
                  : "Require attention"}
              </span>
            </div>
            <SparklineSvg
              id="tasks"
              values={tasksSeries}
              strokeStart="#3B82F6"
              strokeEnd="#818CF8"
            />
          </div>
        </button>

        {/* 5. Business Health (Real monitored database & API status) */}
        <Link href="/admin/settings" className="hz-cc-kpi-card hz-cc-kpi-health">
          <div className="hz-cc-kpi-head">
            <Activity size={14} color="#34D399" />
            <span>Business Health</span>
          </div>
          <div className="hz-cc-kpi-health-body">
            <div>
              <strong className={systemHealthy ? "hz-health-ok" : "hz-health-warn"}>
                {systemHealthy ? "Healthy" : "Check Status"}
              </strong>
              <span className="hz-cc-kpi-sub" style={{ display: "block", marginTop: 2 }}>
                {systemHealthy ? "All systems operational" : "Verify Supabase connection"}
              </span>
            </div>
            <span className={`hz-cc-health-pill ${systemHealthy ? "is-ok" : "is-warn"}`}>
              {systemHealthy ? "Live" : "Alert"}
            </span>
          </div>
        </Link>
      </section>

      {/* ROW 4: 2-Column Main Split — Actionable Priorities + AI Insights & Recommendations */}
      <section className="hz-cc-split" aria-label="Priorities and Intelligence Insights">
        {/* Left: Actionable Priorities */}
        <div className="hz-cc-panel">
          <div className="hz-cc-panel-head">
            <div className="hz-cc-panel-title-group">
              <Target size={18} color="#818CF8" className="hz-cc-panel-icon" />
              <div>
                <h2>Actionable Priorities</h2>
                <p>High-impact items that need your attention today.</p>
              </div>
            </div>
            <div className="hz-cc-panel-meta">
              <span className="hz-cc-count-pill">{priorityRows.length} items</span>
              <Link href={permissions.crm ? "/admin/crm" : "/admin/audit"} className="hz-cc-link">
                View All <ArrowRight size={12} />
              </Link>
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
        </div>

        {/* Right: AI Insights & Recommendations */}
        <div className="hz-cc-panel hz-cc-panel-insights">
          <div className="hz-cc-panel-head">
            <div className="hz-cc-panel-title-group">
              <Sparkles size={18} color="#A78BFA" className="hz-cc-panel-icon" />
              <div>
                <h2>AI Insights &amp; Recommendations</h2>
                <p>HIRZEXA Intelligence analysis and next best actions.</p>
              </div>
            </div>
            <span
              className="hz-cc-ai-pill"
              title="Derived strictly from your real authorized HIRZEXA database records"
            >
              <span>AI Grounded</span>
              <Info size={11} />
            </span>
          </div>

          <div className="hz-cc-stack">
            {aiRecommendations.map((rec) =>
              permissions.agent ? (
                <button
                  key={rec.id}
                  type="button"
                  className="hz-cc-insight-row"
                  onClick={() => triggerAgent(rec.prompt)}
                >
                  <span className="hz-cc-row-icon is-indigo" aria-hidden="true">
                    {rec.icon === "trend" ? (
                      <TrendingUp size={15} />
                    ) : rec.icon === "users" ? (
                      <Users size={15} />
                    ) : (
                      <Layers size={15} />
                    )}
                  </span>
                  <div className="hz-cc-row-copy">
                    <strong>{rec.title}</strong>
                    <small>{rec.detail}</small>
                  </div>
                  <ChevronRight size={14} className="hz-cc-chevron" />
                </button>
              ) : (
                <Link key={rec.id} href={rec.href} className="hz-cc-insight-row">
                  <span className="hz-cc-row-icon is-indigo" aria-hidden="true">
                    {rec.icon === "trend" ? (
                      <TrendingUp size={15} />
                    ) : rec.icon === "users" ? (
                      <Users size={15} />
                    ) : (
                      <Layers size={15} />
                    )}
                  </span>
                  <div className="hz-cc-row-copy">
                    <strong>{rec.title}</strong>
                    <small>{rec.detail}</small>
                  </div>
                  <ChevronRight size={14} className="hz-cc-chevron" />
                </Link>
              )
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
              <span>{synthesizing ? "Generating Brief…" : "Generate AI Executive Brief"}</span>
            </button>

            {permissions.agent ? (
              <Link href="/admin/agent" className="hz-cc-link">
                View All Recommendations <ArrowRight size={12} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* BELOW THE FOLD: Collapsible Quick Tasks & Recent Activity Drawer (Preserves 100% Task Interactivity Without Cluttering Hero Viewport) */}
      <section className="hz-cc-ops-drawer">
        <button
          type="button"
          className="hz-cc-ops-toggle"
          onClick={() => setOpsOpen((v) => !v)}
          aria-expanded={opsOpen}
        >
          <span>
            Operational Tasks ({openTasks.length} open) &amp; Live Activity Feed ({events.length})
          </span>
          {opsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {opsOpen ? (
          <div className="hz-cc-ops-body">
            <div>
              <div className="hz-panel-head" style={{ marginBottom: 10 }}>
                <h3>Follow-Up Tasks</h3>
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
                    placeholder="Add an operational task…"
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
                    <Plus size={14} /> Add
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
                  title="No tasks queued"
                  description="Create a follow-up task above or ask HIRZEXA to stage one."
                />
              )}
            </div>

            <div>
              <div className="hz-panel-head" style={{ marginBottom: 10 }}>
                <h3>Recent Operational Events</h3>
                <Link href="/admin/audit" className="hz-cc-link">
                  Audit Logs <ArrowRight size={12} />
                </Link>
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
                  title="No recent activity"
                  description="New bookings, leads, applications, and tasks appear here."
                />
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
