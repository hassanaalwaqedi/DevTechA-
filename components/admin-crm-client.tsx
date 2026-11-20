"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CheckSquare,
  Columns3,
  Filter,
  List,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  CrmCompaniesView,
  CrmContactsView,
  CrmDataTable,
  CrmTasksView,
} from "@/components/crm/CrmDataTable";
import { CrmKpiStrip } from "@/components/crm/CrmKpiStrip";
import { CrmSidebarWidgets } from "@/components/crm/CrmSidebarWidgets";
import {
  CreateOpportunityModal,
  LeadDetailPanel,
} from "@/components/crm/LeadDetailPanel";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import {
  buildQualityMap,
  type CrmWorkspaceTab,
  type OwnerOption,
  type QualityFilter,
} from "@/components/crm/types";
import {
  canTransitionStage,
  CRM_STAGE_LABELS,
  CRM_STAGES,
  type CrmLeadRecord,
  type CrmStage,
} from "@/lib/crm-types";
import type { CrmTaskRecord } from "@/lib/intelligence/types";

const PAGE_SIZE = 10;

export function AdminCrmClient({
  initialLeads,
  initialTasks,
  owners,
  initialLeadId,
  actorScope,
  canCreate,
  canEdit,
  canAssign,
  canUseAgent,
  canCreateTask,
  isSuperAdmin,
}: {
  initialLeads: CrmLeadRecord[];
  initialTasks: CrmTaskRecord[];
  owners: OwnerOption[];
  initialLeadId: string | null;
  actorScope: string;
  canCreate: boolean;
  canEdit: boolean;
  canAssign: boolean;
  canUseAgent: boolean;
  canCreateTask: boolean;
  isSuperAdmin: boolean;
}) {
  const [leads, setLeads] = useState<CrmLeadRecord[]>(initialLeads);
  const [tasks, setTasks] = useState<CrmTaskRecord[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<CrmWorkspaceTab>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [stageFilter, setStageFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d" | "followup">("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "company" | "stage">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<CrmLeadRecord | null>(() => {
    if (initialLeadId) {
      return (
        initialLeads.find(
          (item) => item.id === initialLeadId || item.referenceId === initialLeadId
        ) || null
      );
    }
    return null;
  });

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => new Date().toISOString());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Search debounce (200ms) for smooth large-dataset filtering
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stageFilter, ownerFilter, dateFilter, qualityFilter]);

  const headerDate = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const headerTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date()),
    []
  );

  const qualityMap = useMemo(() => buildQualityMap(leads), [leads]);
  const flaggedCount = useMemo(
    () =>
      Array.from(qualityMap.values()).filter((q) => q.kind !== "genuine").length,
    [qualityMap]
  );

  const loadLeads = useCallback(async () => {
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/admin/crm", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to load CRM pipeline.");
        return;
      }
      setLeads(data.leads || []);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      setError("Unable to reach CRM service.");
    } finally {
      setSyncing(false);
    }
  }, []);

  function askAgentAboutLead(lead: CrmLeadRecord, prompt: string) {
    window.dispatchEvent(
      new CustomEvent("hirzexa:ask-agent", {
        detail: {
          prompt,
          pageContext: {
            route: "/admin/crm",
            entityType: "lead",
            entityId: lead.id,
            entityLabel: lead.company || lead.fullName,
          },
        },
      })
    );
  }

  async function patchLead(
    lead: CrmLeadRecord,
    patch: {
      stage?: CrmStage;
      notes?: string;
      nextFollowUpAt?: string | null;
      meetingLink?: string;
      activityNote?: string;
      sendReminder?: boolean;
      ownerId?: string | null;
      ownerEmail?: string | null;
      ownerName?: string | null;
    }
  ) {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    setNotice("");

    // Optimistic stage update with automatic rollback on server error
    const previousLeads = leads;
    const previousSelected = selected;
    if (patch.stage && patch.stage !== lead.stage) {
      const optimistic: CrmLeadRecord = { ...lead, stage: patch.stage };
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? optimistic : item)));
      if (selected?.id === lead.id) setSelected(optimistic);
    }

    try {
      const response = await fetch(`/api/admin/crm/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) {
        setLeads(previousLeads);
        setSelected(previousSelected);
        setError(data.error || "Unable to update lead.");
        return;
      }
      const updated = data.lead as CrmLeadRecord;
      if (selected?.id === updated.id) setSelected(updated);
      setLeads((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (patch.sendReminder) {
        setNotice(`Reminder logged for ${updated.email}.`);
      } else if (patch.activityNote) {
        setNotice("Activity added to client timeline.");
      } else if (patch.stage) {
        setNotice(
          `Moved ${updated.company || updated.fullName} to ${CRM_STAGE_LABELS[updated.stage].en}.`
        );
      } else {
        setNotice("Client record updated.");
      }
    } catch {
      setLeads(previousLeads);
      setSelected(previousSelected);
      setError("Network error while updating CRM record. Change reverted.");
    } finally {
      setSaving(false);
    }
  }

  function handleMoveStage(lead: CrmLeadRecord, targetStage: CrmStage) {
    if (!canEdit || lead.stage === targetStage) return;
    if (!isSuperAdmin && !canTransitionStage(lead.stage, targetStage)) {
      setError(
        `Cannot skip directly from ${CRM_STAGE_LABELS[lead.stage].en} to ${CRM_STAGE_LABELS[targetStage].en}. Move sequentially through pipeline stages.`
      );
      return;
    }
    void patchLead(lead, { stage: targetStage });
  }

  async function addLeadTask(lead: CrmLeadRecord, title: string, dueDate: string) {
    if (!title || !canCreateTask) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          priority: "high",
          dueAt: dueDate ? new Date(`${dueDate}T15:00:00Z`).toISOString() : null,
          entityType: "lead",
          entityId: lead.id,
          entityLabel: lead.company || lead.fullName,
          assignedToId: lead.ownerId || null,
          assignedToEmail: lead.ownerEmail || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to create follow-up task.");
        return;
      }
      if (data.task) {
        setTasks((prev) => [data.task as CrmTaskRecord, ...prev]);
        setNotice("Linked follow-up task created.");
      }
    } catch {
      setError("Network error while creating task.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTaskCompleted(task: CrmTaskRecord) {
    const nextStatus = task.status === "completed" ? "open" : "completed";
    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.task) {
        setTasks((prev) =>
          prev.map((item) => (item.id === task.id ? (data.task as CrmTaskRecord) : item))
        );
      }
    } catch {}
  }

  const stageCounts = useMemo(
    () =>
      CRM_STAGES.reduce<Record<CrmStage, number>>(
        (acc, stage) => {
          acc[stage] = leads.filter((item) => item.stage === stage).length;
          return acc;
        },
        {
          new_lead: 0,
          meeting_booked: 0,
          discovery_completed: 0,
          proposal_sent: 0,
          negotiation: 0,
          won: 0,
          lost: 0,
        }
      ),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    const now = Date.now();
    return leads
      .filter((lead) => {
        if (stageFilter !== "all" && lead.stage !== stageFilter) return false;
        if (ownerFilter === "unassigned" && lead.ownerId) return false;
        if (ownerFilter !== "all" && ownerFilter !== "unassigned" && lead.ownerId !== ownerFilter) {
          return false;
        }
        if (dateFilter === "7d") {
          if (now - new Date(lead.createdAt).getTime() > 7 * 86400_000) return false;
        } else if (dateFilter === "30d") {
          if (now - new Date(lead.createdAt).getTime() > 30 * 86400_000) return false;
        } else if (dateFilter === "followup") {
          const overdue =
            lead.stage !== "won" &&
            lead.stage !== "lost" &&
            ((lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < now) ||
              lead.stage === "new_lead");
          if (!overdue) return false;
        }
        if (qualityFilter !== "all") {
          const qState = qualityMap.get(lead.id)?.kind || "genuine";
          if (qualityFilter === "genuine" && qState !== "genuine") return false;
          if (qualityFilter === "review" && qState === "genuine") return false;
        }
        if (debouncedSearch) {
          const hay = [
            lead.referenceId,
            lead.company,
            lead.fullName,
            lead.email,
            lead.serviceTrack,
            lead.ownerName || "",
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(debouncedSearch)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const factor = sortDir === "asc" ? 1 : -1;
        if (sortBy === "company") {
          return (a.company || a.fullName).localeCompare(b.company || b.fullName) * factor;
        }
        if (sortBy === "stage") {
          return (CRM_STAGES.indexOf(a.stage) - CRM_STAGES.indexOf(b.stage)) * factor;
        }
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
      });
  }, [
    leads,
    stageFilter,
    ownerFilter,
    dateFilter,
    qualityFilter,
    qualityMap,
    debouncedSearch,
    sortBy,
    sortDir,
  ]);

  const activeFiltersCount =
    (stageFilter !== "all" ? 1 : 0) +
    (ownerFilter !== "all" ? 1 : 0) +
    (dateFilter !== "all" ? 1 : 0) +
    (qualityFilter !== "all" ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedTasks = useMemo(() => {
    if (!selected) return [];
    return tasks.filter(
      (task) => task.entityId === selected.id || task.entityId === selected.referenceId
    );
  }, [selected, tasks]);

  function toggleSort(column: "createdAt" | "company" | "stage") {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  return (
    <div className="hz-crm-root">
      {/* Unified Cosmic Horizon Atmosphere */}
      <div className="hz-cc-atmosphere" aria-hidden="true">
        <div className="hz-cc-arc-glow" />
      </div>

      {/* ROW 1: Compact Executive Header */}
      <header className="hz-cc-header">
        <div className="hz-cc-header-left">
          <div className="hz-cc-eyebrow">
            <span className="hz-cc-eyebrow-brand">HIRZEXA</span>
            <span>INTELLIGENCE · {actorScope.toUpperCase()} SCOPE</span>
            <span className="hz-cc-eyebrow-line" aria-hidden="true" />
          </div>
          <h1>Sales CRM &amp; Pipeline</h1>
          <p>
            Manage discovery calls, proposal requests, deal ownership, pipeline transitions,
            follow-up tasks, and record-aware AI briefings.
          </p>
        </div>

        <div className="hz-cc-date-block" aria-label="Current local date and time">
          <Calendar size={15} className="hz-cc-date-icon" />
          <div>
            <strong>{headerDate}</strong>
            <span>{headerTime}</span>
          </div>
        </div>
      </header>

      {/* ROW 2: 5-Column Intelligent KPI Strip */}
      <CrmKpiStrip
        leads={leads}
        stageCounts={stageCounts}
        onSelectStageFilter={(st) => {
          setStageFilter(st);
          setActiveTab("list");
        }}
      />

      {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}
      {notice ? <p className="hz-alert-success" style={{ margin: 0 }}>{notice}</p> : null}

      {/* ROW 3: 2-Column Enterprise CRM Workspace (Main Pipeline + Right Intelligence Sidebar) */}
      <div className={`hz-crm-layout ${activeTab === "board" ? "is-full" : ""}`}>
        <div className="hz-crm-main-col">
          {/* Unified Workspace Navigation & Controls Bar */}
          <div className="hz-crm-controls-bar">
            <div className="hz-crm-tabs" role="tablist" aria-label="Sales CRM Views">
              {(
                [
                  ["list", "List", List],
                  ["board", "Pipeline Board", Columns3],
                  ["companies", "Companies", Building2],
                  ["contacts", "Contacts", Users],
                  ["tasks", "Tasks", CheckSquare],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  className={`hz-crm-tab-btn ${activeTab === id ? "is-active" : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="hz-crm-action-cluster">
              <div className="hz-crm-search-box">
                <Search size={13} color="#7C8BB0" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search deals, companies, or contacts…"
                  aria-label="Search deals, companies, or contacts"
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="hz-crm-clear-x"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                className={`hz-crm-filter-btn ${filtersOpen || activeFiltersCount > 0 ? "is-active" : ""}`}
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                <Filter size={13} />
                <span>Filters</span>
                {activeFiltersCount > 0 ? (
                  <span className="hz-crm-filter-count">{activeFiltersCount}</span>
                ) : null}
              </button>

              {canCreate ? (
                <button
                  type="button"
                  className="hz-crm-new-btn"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={14} />
                  <span>New Opportunity</span>
                </button>
              ) : canUseAgent ? (
                <button
                  type="button"
                  className="hz-crm-new-btn"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("hirzexa:ask-agent", {
                        detail: {
                          prompt:
                            "Summarize the current sales pipeline and highlight leads needing follow-up today.",
                          pageContext: { route: "/admin/crm", entityType: "dashboard" },
                        },
                      })
                    )
                  }
                >
                  <Sparkles size={13} />
                  <span>Pipeline Brief</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Collapsible Advanced Filters Strip */}
          {filtersOpen ? (
            <div className="hz-crm-filters-drawer">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                aria-label="Filter by stage"
              >
                <option value="all">All stages ({leads.length})</option>
                {CRM_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {CRM_STAGE_LABELS[stage].en} ({stageCounts[stage]})
                  </option>
                ))}
              </select>

              {owners.length > 0 ? (
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  aria-label="Filter by owner"
                >
                  <option value="all">All owners</option>
                  <option value="unassigned">Unassigned</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.fullName}
                    </option>
                  ))}
                </select>
              ) : null}

              <select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value as "all" | "7d" | "30d" | "followup")
                }
                aria-label="Filter by timeframe"
              >
                <option value="all">Any timeframe</option>
                <option value="7d">Created last 7 days</option>
                <option value="30d">Created last 30 days</option>
                <option value="followup">Needs follow-up</option>
              </select>

              <select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
                aria-label="Filter by data quality"
              >
                <option value="all">All record quality ({leads.length})</option>
                <option value="genuine">Verified customer records</option>
                <option value="review">Needs review ({flaggedCount})</option>
              </select>

              {activeFiltersCount > 0 ? (
                <button
                  type="button"
                  className="hz-btn hz-btn-ghost hz-btn-sm"
                  onClick={() => {
                    setStageFilter("all");
                    setOwnerFilter("all");
                    setDateFilter("all");
                    setQualityFilter("all");
                  }}
                >
                  Reset
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Active Workspace View */}
          {activeTab === "list" ? (
            <CrmDataTable
              leads={paginatedLeads}
              totalFiltered={filteredLeads.length}
              page={page}
              totalPages={totalPages}
              pageSize={PAGE_SIZE}
              selectedId={selected?.id || null}
              qualityMap={qualityMap}
              flaggedCount={flaggedCount}
              lastSyncedAt={lastSyncedAt}
              syncing={syncing}
              canUseAgent={canUseAgent}
              onToggleSort={toggleSort}
              onSelectLead={(lead) => setSelected(lead)}
              onAskAgentLead={askAgentAboutLead}
              onPageChange={setPage}
              onSync={() => void loadLeads()}
              onOpenQualityReview={() => {
                setQualityFilter((cur) => (cur === "review" ? "all" : "review"));
                setFiltersOpen(true);
              }}
            />
          ) : activeTab === "board" ? (
            <PipelineBoard
              leads={filteredLeads}
              selectedId={selected?.id || null}
              qualityMap={qualityMap}
              canEdit={canEdit}
              onSelectLead={(lead) => setSelected(lead)}
              onMoveStage={handleMoveStage}
            />
          ) : activeTab === "companies" ? (
            <CrmCompaniesView leads={filteredLeads} onSelectLead={(lead) => setSelected(lead)} />
          ) : activeTab === "contacts" ? (
            <CrmContactsView leads={filteredLeads} onSelectLead={(lead) => setSelected(lead)} />
          ) : (
            <CrmTasksView
              tasks={tasks}
              leads={leads}
              onToggleTask={(task) => void toggleTaskCompleted(task)}
              onSelectLead={(lead) => setSelected(lead)}
            />
          )}
        </div>

        {/* Right Intelligence Sidebar (Hidden in full-width Kanban Board mode so columns stay wide) */}
        {activeTab !== "board" ? (
          <CrmSidebarWidgets
            leads={leads}
            tasks={tasks}
            stageCounts={stageCounts}
            canUseAgent={canUseAgent}
            onSelectLead={(lead) => setSelected(lead)}
            onAskAgentLead={askAgentAboutLead}
            onViewAllTasks={() => setActiveTab("tasks")}
          />
        ) : null}
      </div>

      {/* 680px Enterprise Client Detail SlideOver */}
      <LeadDetailPanel
        lead={selected}
        tasks={selectedTasks}
        owners={owners}
        quality={selected ? qualityMap.get(selected.id) : undefined}
        canEdit={canEdit}
        canAssign={canAssign}
        canUseAgent={canUseAgent}
        canCreateTask={canCreateTask}
        isSuperAdmin={isSuperAdmin}
        saving={saving}
        onClose={() => setSelected(null)}
        onPatchLead={patchLead}
        onAddTask={addLeadTask}
        onToggleTask={(task) => void toggleTaskCompleted(task)}
        onAskAgent={askAgentAboutLead}
      />

      {/* RBAC-Protected New Opportunity Modal */}
      {canCreate ? (
        <CreateOpportunityModal
          open={createOpen}
          owners={owners}
          canAssign={canAssign}
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setLeads((prev) => [created, ...prev.filter((l) => l.id !== created.id)]);
            setSelected(created);
            setNotice(`Created opportunity ${created.referenceId} (${created.company}).`);
          }}
        />
      ) : null}
    </div>
  );
}
