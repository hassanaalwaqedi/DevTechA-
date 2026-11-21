"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  ChevronRight,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { CRM_STAGE_LABELS, type CrmLeadRecord, type CrmStage } from "@/lib/crm-types";
import type { CrmTaskRecord } from "@/lib/intelligence/types";
import { formatLocalDateTime } from "@/components/crm/types";

export function CrmSidebarWidgets({
  leads,
  tasks,
  stageCounts,
  canUseAgent,
  onSelectLead,
  onAskAgentLead,
  onViewAllTasks,
}: {
  leads: CrmLeadRecord[];
  tasks: CrmTaskRecord[];
  stageCounts: Record<CrmStage, number>;
  canUseAgent: boolean;
  onSelectLead: (lead: CrmLeadRecord) => void;
  onAskAgentLead: (lead: CrmLeadRecord, prompt: string) => void;
  onViewAllTasks: () => void;
}) {
  // Grounded AI Opportunity Recommendations derived strictly from real live leads
  const recommendations = useMemo(() => {
    const items: Array<{
      id: string;
      icon: "trend" | "target" | "layers";
      title: string;
      detail: string;
      lead: CrmLeadRecord;
      prompt: string;
    }> = [];

    const now = Date.now();
    const proposalLeads = leads.filter(
      (l) => l.stage === "proposal_sent" || l.stage === "negotiation"
    );
    const upcomingLeads = leads
      .filter(
        (l) =>
          l.scheduledSlotIso &&
          l.stage !== "won" &&
          l.stage !== "lost" &&
          new Date(l.scheduledSlotIso).getTime() >= now
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledSlotIso!).getTime() - new Date(b.scheduledSlotIso!).getTime()
      );
    const uncontactedNew = leads.filter((l) => l.stage === "new_lead");

    if (proposalLeads[0]) {
      const lead = proposalLeads[0];
      items.push({
        id: `rec-prop-${lead.id}`,
        icon: "trend",
        title: `Advance ${lead.referenceId} (${lead.company || lead.fullName})`,
        detail: `${CRM_STAGE_LABELS[lead.stage].en} · ${lead.serviceTrack}. Draft a tailored follow-up or next milestone.`,
        lead,
        prompt: `Summarize ${lead.referenceId} (${lead.company || lead.fullName}) and recommend the next commercial step to advance this proposal.`,
      });
    }

    if (upcomingLeads[0]) {
      const lead = upcomingLeads[0];
      const { dateLabel, timeLabel } = formatLocalDateTime(lead.scheduledSlotIso);
      items.push({
        id: `rec-call-${lead.id}`,
        icon: "target",
        title: `Prepare for ${lead.company || lead.fullName}`,
        detail: `Scheduled ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""} · ${lead.serviceTrack}.`,
        lead,
        prompt: `Prepare discovery call talking points and key technical questions for ${lead.referenceId} (${lead.company || lead.fullName}).`,
      });
    }

    const fallbackLead =
      uncontactedNew[0] ||
      leads.find(
        (l) =>
          l.stage !== "won" &&
          l.stage !== "lost" &&
          !items.some((x) => x.lead.id === l.id)
      );

    if (fallbackLead) {
      items.push({
        id: `rec-new-${fallbackLead.id}`,
        icon: "layers",
        title: `Qualify ${fallbackLead.company || fallbackLead.fullName}`,
        detail: `${fallbackLead.serviceTrack}${fallbackLead.budgetRange ? ` · Stated budget: ${fallbackLead.budgetRange}` : " · Identify missing scope details."}`,
        lead: fallbackLead,
        prompt: `Review ${fallbackLead.referenceId} (${fallbackLead.company || fallbackLead.fullName}), identify missing qualification info, and suggest a follow-up.`,
      });
    }

    return items.slice(0, 3);
  }, [leads]);

  // Real Follow-Up Reminders from open CRM tasks + leads with nextFollowUpAt
  const reminders = useMemo(() => {
    const openTasks = tasks
      .filter((t) => t.status !== "completed")
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.entityLabel ? `${t.entityLabel} — ${t.title}` : t.title,
        dueLabel: t.dueAt ? formatLocalDateTime(t.dueAt, { includeTime: false }).dateLabel : "Open task",
        ownerLabel: t.assignedToEmail || "Unassigned",
        urgent: Boolean(t.dueAt && new Date(t.dueAt).getTime() < Date.now()) || t.priority === "urgent",
        leadId: t.entityType === "lead" ? t.entityId : null,
      }));

    const leadReminders = leads
      .filter((l) => l.stage !== "won" && l.stage !== "lost" && l.nextFollowUpAt)
      .map((l) => ({
        id: `lead-fu-${l.id}`,
        title: `${l.referenceId} (${l.company || l.fullName}) — Follow-up`,
        dueLabel: formatLocalDateTime(l.nextFollowUpAt, { includeTime: false }).dateLabel,
        ownerLabel:
          l.ownerName ||
          l.ownerEmail ||
          (l.ownerId ? "Assigned Representative" : "Unassigned"),
        urgent: new Date(l.nextFollowUpAt!).getTime() < Date.now(),
        leadId: l.id,
      }));

    return [...openTasks, ...leadReminders].slice(0, 4);
  }, [leads, tasks]);

  const totalOpenReminders =
    tasks.filter((t) => t.status !== "completed").length +
    leads.filter((l) => l.stage !== "won" && l.stage !== "lost" && l.nextFollowUpAt).length;

  // Real Pipeline Stage Funnel breakdown (zero fabricated financial values)
  const funnelTotal = Math.max(
    1,
    leads.filter((l) => l.stage !== "lost").length
  );
  const funnelRows = [
    {
      label: "New & Booked",
      count: stageCounts.new_lead + stageCounts.meeting_booked,
      color: "#3B82F6",
    },
    {
      label: "Discovery",
      count: stageCounts.discovery_completed,
      color: "#60A5FA",
    },
    {
      label: "Proposal",
      count: stageCounts.proposal_sent,
      color: "#818CF8",
    },
    {
      label: "Negotiation",
      count: stageCounts.negotiation,
      color: "#A855F7",
    },
    {
      label: "Won",
      count: stageCounts.won,
      color: "#34D399",
    },
  ];

  return (
    <aside className="hz-crm-side-col" aria-label="CRM Intelligence & Reminders">
      {/* 1. AI Opportunity Recommendations */}
      <section className="hz-cc-panel hz-cc-panel-insights">
        <div className="hz-cc-panel-head" style={{ marginBottom: 12 }}>
          <div className="hz-cc-panel-title-group">
            <Sparkles size={17} color="#A78BFA" className="hz-cc-panel-icon" />
            <div>
              <h2>AI Opportunity Recommendations</h2>
              <p>Grounded next steps from your live pipeline.</p>
            </div>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <div className="hz-cc-stack">
            {recommendations.map((rec) => (
              <button
                key={rec.id}
                type="button"
                className="hz-cc-insight-row"
                onClick={() =>
                  canUseAgent
                    ? onAskAgentLead(rec.lead, rec.prompt)
                    : onSelectLead(rec.lead)
                }
              >
                <span
                  className={`hz-cc-row-icon ${
                    rec.icon === "trend"
                      ? "is-blue"
                      : rec.icon === "target"
                      ? "is-violet"
                      : "is-indigo"
                  }`}
                  aria-hidden="true"
                >
                  {rec.icon === "trend" ? (
                    <TrendingUp size={15} />
                  ) : rec.icon === "target" ? (
                    <Target size={15} />
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
            ))}
          </div>
        ) : (
          <p className="hz-ag-empty-note">
            Create or receive a lead to unlock record-aware AI recommendations.
          </p>
        )}
      </section>

      {/* 2. Follow-Up Reminders */}
      <section className="hz-cc-panel">
        <div className="hz-cc-panel-head" style={{ marginBottom: 12 }}>
          <div className="hz-cc-panel-title-group">
            <Bell size={16} color="#818CF8" className="hz-cc-panel-icon" />
            <div>
              <h2>Follow-Up Reminders</h2>
            </div>
          </div>
          <button
            type="button"
            className="hz-cc-link"
            style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}
            onClick={onViewAllTasks}
          >
            View All ({totalOpenReminders}) <ArrowRight size={12} />
          </button>
        </div>

        {reminders.length > 0 ? (
          <div className="hz-cc-stack">
            {reminders.map((rem) => {
              const linkedLead = rem.leadId
                ? leads.find((l) => l.id === rem.leadId || l.referenceId === rem.leadId)
                : undefined;
              return (
                <button
                  key={rem.id}
                  type="button"
                  className="hz-crm-reminder-row"
                  onClick={() => (linkedLead ? onSelectLead(linkedLead) : onViewAllTasks())}
                >
                  <span
                    className={`hz-crm-rem-dot ${rem.urgent ? "is-urgent" : ""}`}
                    aria-hidden="true"
                  />
                  <div className="hz-cc-row-copy">
                    <strong>{rem.title}</strong>
                    <small>
                      {rem.dueLabel} · Owner: {rem.ownerLabel}
                    </small>
                  </div>
                  <ChevronRight size={13} className="hz-cc-chevron" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="hz-ag-empty-note">No overdue or scheduled follow-ups right now.</p>
        )}
      </section>

      {/* 3. Pipeline Stage Funnel (Real Counts & Shares) */}
      <section className="hz-cc-panel">
        <div className="hz-cc-panel-head" style={{ marginBottom: 12 }}>
          <div className="hz-cc-panel-title-group">
            <BarChart3 size={16} color="#60A5FA" className="hz-cc-panel-icon" />
            <div>
              <h2>Pipeline Stage Funnel</h2>
            </div>
          </div>
          <span className="hz-cc-count-pill">
            {leads.filter((l) => l.stage !== "lost").length} In Funnel
          </span>
        </div>

        <div className="hz-crm-funnel-layout">
          {/* Luminous Layered Funnel SVG */}
          <svg
            width="106"
            height="122"
            viewBox="0 0 110 124"
            fill="none"
            aria-hidden="true"
            className="hz-crm-funnel-svg"
          >
            <polygon points="4,4 106,4 97,23 13,23" fill="rgba(59,130,246,0.85)" />
            <polygon points="15,28 95,28 87,47 23,47" fill="rgba(96,165,250,0.8)" />
            <polygon points="25,52 85,52 77,71 33,71" fill="rgba(129,140,248,0.82)" />
            <polygon points="35,76 75,76 68,95 42,95" fill="rgba(168,85,247,0.84)" />
            <polygon points="44,100 66,100 61,119 49,119" fill="rgba(52,211,153,0.9)" />
          </svg>

          <div className="hz-crm-funnel-rows">
            {funnelRows.map((row) => {
              const pct =
                leads.filter((l) => l.stage !== "lost").length > 0
                  ? Math.round((row.count / funnelTotal) * 100)
                  : 0;
              return (
                <div key={row.label} className="hz-crm-funnel-row">
                  <span className="hz-crm-funnel-name">
                    <i style={{ background: row.color }} />
                    {row.label}
                  </span>
                  <strong className="hz-crm-funnel-val">
                    {row.count} <span>({pct}%)</span>
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </aside>
  );
}
