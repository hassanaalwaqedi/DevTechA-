"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  SlideOver,
  StatusBadge,
} from "@/components/admin-ui/primitives";
import {
  InviteInterviewDrawer,
  type InterviewerOption,
  type InviteInterviewCandidate,
} from "@/components/interviews/InviteInterviewDrawer";
import {
  AddCandidateDrawer,
  type CompanyJobOption,
} from "@/components/recruitment/AddCandidateDrawer";
import { ManualEmailComposerDrawer } from "@/components/recruitment/ManualEmailComposerDrawer";
import type { ApplicantStatus, Application, CandidateSource } from "@/lib/data";
import type {
  InterviewActivityRecord,
  InterviewAppointmentRecord,
  SafeInterviewInvitation,
} from "@/lib/interviews/types";
import {
  CANDIDATE_SOURCES,
  CANDIDATE_SOURCE_LABELS,
  type RecruitmentMessageType,
  type UnifiedCandidateTimelineItem,
} from "@/lib/recruitment/types";

const STATUSES: ApplicantStatus[] = [
  "new",
  "reviewing",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
];

function appStatusTone(
  status: ApplicantStatus
): "blue" | "violet" | "emerald" | "amber" | "rose" | "neutral" {
  switch (status) {
    case "accepted":
      return "emerald";
    case "rejected":
      return "rose";
    case "interview":
      return "violet";
    case "shortlisted":
      return "amber";
    case "new":
      return "blue";
    default:
      return "neutral";
  }
}

export function AdminApplicationsClient({
  initialQuery = "",
  canEdit = true,
  canAddCandidate = false,
  canSendEmail = false,
  canUseAgent = true,
  canInviteInterview = false,
  canViewInterviews = false,
}: {
  initialQuery?: string;
  canEdit?: boolean;
  canAddCandidate?: boolean;
  canSendEmail?: boolean;
  canUseAgent?: boolean;
  canInviteInterview?: boolean;
  canViewInterviews?: boolean;
}) {
  const [items, setItems] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState(initialQuery);
  const [selected, setSelected] = useState<Application | null>(null);
  const [drawerTab, setDrawerTab] = useState<"profile" | "communications">("profile");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // External Candidate + Manual Email Composer state
  const [companyJobs, setCompanyJobs] = useState<CompanyJobOption[]>([]);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [addCandidatePrefill, setAddCandidatePrefill] = useState<{
    fullName?: string;
    email?: string;
    source?: CandidateSource;
    customPositionTitle?: string;
  } | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerRecipient, setComposerRecipient] = useState<{
    email: string;
    name?: string;
    applicationReferenceId?: string;
    positionTitle?: string;
    messageType?: RecruitmentMessageType;
  } | null>(null);

  // Unified Candidate Communications Timeline state
  const [commSearch, setCommSearch] = useState("");
  const [commLoading, setCommLoading] = useState(false);
  const [candidateTimeline, setCandidateTimeline] = useState<UnifiedCandidateTimelineItem[]>([]);

  // Interview invitation & candidate timeline state
  const [inviteCandidate, setInviteCandidate] = useState<InviteInterviewCandidate | null>(null);
  const [interviewers, setInterviewers] = useState<InterviewerOption[]>([]);
  const [resendConfigured, setResendConfigured] = useState(true);
  const [candidateInterviews, setCandidateInterviews] = useState<{
    invitations: SafeInterviewInvitation[];
    appointments: InterviewAppointmentRecord[];
    activity: InterviewActivityRecord[];
  }>({ invitations: [], appointments: [], activity: [] });

  // Load company jobs for Add External Candidate drawer
  useEffect(() => {
    if (!canAddCandidate) return;
    let active = true;
    fetch("/api/admin/recruitment/candidates?includeJobs=true", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data.jobs)) {
          setCompanyJobs(data.jobs);
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [canAddCandidate]);

  const loadCandidateCommunications = useCallback(
    async (app: Application, query = "") => {
      setCommLoading(true);
      try {
        const qs = new URLSearchParams({
          applicationReferenceId: app.id,
          email: app.email,
        });
        if (query.trim()) qs.set("q", query.trim());
        const res = await fetch(`/api/admin/recruitment/emails?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          setCandidateTimeline(data.timeline || []);
          if (typeof data.resendConfigured === "boolean") {
            setResendConfigured(data.resendConfigured);
          }
        }
      } catch {
        // Non-fatal
      } finally {
        setCommLoading(false);
      }
    },
    []
  );

  const loadCandidateInterviews = useCallback(
    async (applicationReferenceId?: string) => {
      if (!canViewInterviews) return;
      try {
        const qs = applicationReferenceId
          ? `?applicationReferenceId=${encodeURIComponent(applicationReferenceId)}`
          : "";
        const res = await fetch(`/api/admin/interviews${qs}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) return;
        if (Array.isArray(data.interviewers)) setInterviewers(data.interviewers);
        setResendConfigured(Boolean(data.resendConfigured));
        if (applicationReferenceId) {
          setCandidateInterviews({
            invitations: data.invitations || [],
            appointments: data.appointments || [],
            activity: data.activity || [],
          });
        }
      } catch {
        // Non-fatal
      }
    },
    [canViewInterviews]
  );

  useEffect(() => {
    if (canViewInterviews) {
      void loadCandidateInterviews();
    }
  }, [canViewInterviews, loadCandidateInterviews]);

  useEffect(() => {
    if (selected) {
      setDrawerTab("profile");
      setCommSearch("");
      if (canViewInterviews) {
        void loadCandidateInterviews(selected.id);
      }
      void loadCandidateCommunications(selected, "");
    } else {
      setCandidateInterviews({ invitations: [], appointments: [], activity: [] });
      setCandidateTimeline([]);
    }
  }, [selected, canViewInterviews, loadCandidateInterviews, loadCandidateCommunications]);

  useEffect(() => {
    if (!selected || drawerTab !== "communications") return;
    const timer = window.setTimeout(() => {
      void loadCandidateCommunications(selected, commSearch);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [selected, drawerTab, commSearch, loadCandidateCommunications]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("query", search.trim());
    try {
      const response = await fetch(
        `/api/applications${params.size ? `?${params.toString()}` : ""}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to load applications.");
        return;
      }
      setItems(result.applications || []);
    } catch {
      setError("Unable to reach the application service.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  const jobTitles = useMemo(
    () => Array.from(new Set(items.map((a) => a.jobTitle).filter(Boolean))).sort(),
    [items]
  );

  const visibleItems = useMemo(() => {
    return items.filter((a) => {
      if (jobFilter !== "all" && a.jobTitle !== jobFilter) return false;
      if (sourceFilter !== "all" && (a.source || "website") !== sourceFilter) return false;
      return true;
    });
  }, [items, jobFilter, sourceFilter]);

  async function update(app: Application, patch: Partial<Application>) {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Unable to update application.");
        return;
      }
      await load();
      setSelected({ ...app, ...patch });
      setNotice("Candidate record updated.");
    } catch {
      setError("Unable to reach the server. Please check that the server is running and try again.");
    } finally {
      setSaving(false);
    }
  }

  function askAgentAboutCandidate(app: Application) {
    window.dispatchEvent(
      new CustomEvent("hirzexa:ask-agent", {
        detail: {
          prompt: `Compare candidate ${app.id} (${app.name}) against the verified requirements for ${app.jobTitle} and suggest interview questions.`,
          pageContext: {
            route: "/admin/applications",
            entityType: "application",
            entityId: app.id,
            entityLabel: `${app.name} (${app.jobTitle})`,
          },
        },
      })
    );
  }

  const newCount = items.filter((a) => a.status === "new").length;
  const shortlistedCount = items.filter((a) => a.status === "shortlisted").length;
  const interviewCount = items.filter((a) => a.status === "interview").length;

  return (
    <>
      <PageHeader
        eyebrow="Applicant Tracking System · Recruitment"
        title="Recruitment & Applications"
        description="Manage applicants from the HIRZEXA website, LinkedIn, referrals, and external outreach — review profiles, send branded emails, and schedule interviews."
        actions={
          <div className="hz-rec-header-actions">
            {canAddCandidate ? (
              <button
                type="button"
                className="hz-btn hz-btn-primary"
                onClick={() => {
                  setAddCandidatePrefill(null);
                  setAddCandidateOpen(true);
                }}
              >
                <UserPlus size={14} /> + Add Candidate
              </button>
            ) : null}
            {canSendEmail ? (
              <button
                type="button"
                className="hz-btn hz-btn-secondary"
                onClick={() => {
                  setComposerRecipient(null);
                  setComposerOpen(true);
                }}
              >
                <Mail size={14} /> Compose Email
              </button>
            ) : null}
            {canUseAgent ? (
              <button
                type="button"
                className="hz-btn hz-btn-secondary"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("hirzexa:ask-agent", {
                      detail: {
                        prompt: "Compare the new candidates against the job requirements.",
                        pageContext: { route: "/admin/applications", entityType: "dashboard" },
                      },
                    })
                  )
                }
              >
                <Sparkles size={14} /> Compare Candidates
              </button>
            ) : null}
          </div>
        }
      />

      <div className="hz-kpi-grid">
        <MetricCard
          label="Total Candidates"
          value={items.length}
          sublabel={`${jobTitles.length} active role${jobTitles.length === 1 ? "" : "s"}`}
          icon={<Users size={15} />}
        />
        <MetricCard
          label="Awaiting Review"
          value={newCount}
          sublabel="New submissions"
          tone={newCount > 0 ? "blue" : "neutral"}
          icon={<FileText size={15} />}
        />
        <MetricCard
          label="Shortlisted"
          value={shortlistedCount}
          sublabel="Qualified for next step"
          tone="amber"
          icon={<BriefcaseBusiness size={15} />}
        />
        <MetricCard
          label="In Interview"
          value={interviewCount}
          sublabel="Active hiring conversations"
          tone="emerald"
          icon={<CheckCircle2 size={15} />}
        />
      </div>

      <div className="hz-toolbar">
        <div className="hz-filter-group">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name, email, or reference ID…"
            aria-label="Search applications"
            style={{ minWidth: 250 }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            aria-label="Filter by job role"
          >
            <option value="all">All roles</option>
            {jobTitles.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by candidate source"
          >
            <option value="all">All sources</option>
            {CANDIDATE_SOURCES.map((src) => (
              <option key={src} value={src}>
                {CANDIDATE_SOURCE_LABELS[src].en}
              </option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: 12, color: "var(--hz-text-muted)" }}>
          {loading ? "Loading…" : `${visibleItems.length} application${visibleItems.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {error ? <p className="hz-alert-error">{error}</p> : null}
      {notice ? <p className="hz-alert-success">{notice}</p> : null}

      <div className="hz-table-wrap">
        <table className="hz-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Role</th>
              <th>Experience &amp; Location</th>
              <th>Submitted</th>
              <th>Status</th>
              <th style={{ textAlign: "end" }}>Review</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length > 0 ? (
              visibleItems.map((app) => (
                <tr
                  key={app.id}
                  className={selected?.id === app.id ? "is-selected" : ""}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(app)}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <strong style={{ color: "var(--hz-text-strong)" }}>{app.name}</strong>
                      <StatusBadge
                        tone={CANDIDATE_SOURCE_LABELS[app.source || "website"].tone}
                      >
                        {CANDIDATE_SOURCE_LABELS[app.source || "website"].en}
                      </StatusBadge>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--hz-text-secondary)" }}>
                      {app.email} · {app.id}
                    </div>
                  </td>
                  <td>
                    <strong>{app.jobTitle}</strong>
                    <div style={{ fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                      {app.isExternalProspect ? "External Prospect" : app.role}
                    </div>
                  </td>
                  <td>
                    <div>{app.experience}</div>
                    <div style={{ fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                      {app.location}, {app.country}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12.5, color: "var(--hz-text-secondary)" }}>
                    {app.createdAt}
                  </td>
                  <td>
                    <StatusBadge tone={appStatusTone(app.status)} dot>
                      {app.status}
                    </StatusBadge>
                  </td>
                  <td style={{ textAlign: "end", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      {canInviteInterview ? (
                        <button
                          type="button"
                          className="hz-btn hz-btn-primary hz-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInviteCandidate({
                              applicationReferenceId: app.id,
                              candidateName: app.name,
                              candidateEmail: app.email,
                              positionTitle: app.jobTitle,
                            });
                          }}
                        >
                          <Calendar size={12} /> Invite
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="hz-btn hz-btn-secondary hz-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(app);
                        }}
                      >
                        Review
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: 24 }}>
                  <EmptyState
                    title={loading ? "Loading applications…" : "No applications match this filter"}
                    description="Candidate submissions from /careers appear here automatically."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Candidate Review SlideOver */}
      <SlideOver
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        width={640}
        title={selected?.name || ""}
        subtitle={
          selected
            ? `${selected.id} · ${selected.jobTitle} · ${selected.email}${selected.phone ? ` · ${selected.phone}` : ""
            }`
            : ""
        }
        headerActions={
          selected ? (
            <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
              {canInviteInterview ? (
                <button
                  type="button"
                  className="hz-btn hz-btn-primary hz-btn-sm"
                  onClick={() =>
                    setInviteCandidate({
                      applicationReferenceId: selected.id,
                      candidateName: selected.name,
                      candidateEmail: selected.email,
                      positionTitle: selected.jobTitle,
                    })
                  }
                >
                  <Calendar size={12} /> Invite to Interview
                </button>
              ) : null}
              {canSendEmail ? (
                <>
                  <button
                    type="button"
                    className="hz-btn hz-btn-secondary hz-btn-sm"
                    onClick={() => {
                      setComposerRecipient({
                        email: selected.email,
                        name: selected.name,
                        applicationReferenceId: selected.id,
                        positionTitle: selected.jobTitle,
                        messageType: "application_thank_you",
                      });
                      setComposerOpen(true);
                    }}
                  >
                    <Mail size={12} /> Thank You Email
                  </button>
                  <button
                    type="button"
                    className="hz-btn hz-btn-secondary hz-btn-sm"
                    onClick={() => {
                      setComposerRecipient({
                        email: selected.email,
                        name: selected.name,
                        applicationReferenceId: selected.id,
                        positionTitle: selected.jobTitle,
                        messageType: "general_recruitment",
                      });
                      setComposerOpen(true);
                    }}
                  >
                    <Mail size={12} /> Send Email
                  </button>
                </>
              ) : null}
              {canUseAgent ? (
                <button
                  type="button"
                  className="hz-btn hz-btn-secondary hz-btn-sm"
                  onClick={() => askAgentAboutCandidate(selected)}
                >
                  <Sparkles size={12} /> Role Fit Summary
                </button>
              ) : null}
            </div>
          ) : null
        }
      >
        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Candidate Profile vs Communications Tabs */}
            <div className="hz-int-segment" style={{ width: "100%" }}>
              <button
                type="button"
                style={{ flex: 1, justifyContent: "center" }}
                className={drawerTab === "profile" ? "is-active" : ""}
                onClick={() => setDrawerTab("profile")}
              >
                <FileText size={13} /> Profile &amp; Application
              </button>
              <button
                type="button"
                style={{ flex: 1, justifyContent: "center" }}
                className={drawerTab === "communications" ? "is-active" : ""}
                onClick={() => setDrawerTab("communications")}
              >
                <MessageSquare size={13} /> Communications ({candidateTimeline.length})
              </button>
            </div>

            {drawerTab === "communications" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                    <Search
                      size={13}
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--hz-text-muted)",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type="text"
                      value={commSearch}
                      onChange={(e) => setCommSearch(e.target.value)}
                      placeholder="Search subject, message, or status…"
                      style={{ width: "100%", paddingLeft: 30 }}
                    />
                  </div>
                  {canSendEmail ? (
                    <button
                      type="button"
                      className="hz-btn hz-btn-primary hz-btn-sm"
                      onClick={() => {
                        setComposerRecipient({
                          email: selected.email,
                          name: selected.name,
                          applicationReferenceId: selected.id,
                          positionTitle: selected.jobTitle,
                        });
                        setComposerOpen(true);
                      }}
                    >
                      <Mail size={12} /> Compose Email
                    </button>
                  ) : null}
                </div>

                <div style={{ fontSize: 11.5, color: "var(--hz-text-muted)", lineHeight: 1.5 }}>
                  Showing recruitment emails, interview invitations, confirmations, delivery
                  statuses, and scheduling events recorded in HIRZEXA. External platform messages
                  (e.g., LinkedIn inbox) are not automatically synced.
                </div>

                {commLoading ? (
                  <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: "var(--hz-text-secondary)" }}>
                    Loading communication history…
                  </div>
                ) : candidateTimeline.length === 0 ? (
                  <EmptyState
                    icon={<Mail size={18} />}
                    title="No recorded communications yet"
                    description="Emails sent through HIRZEXA and interview scheduling events for this candidate will appear here automatically."
                  />
                ) : (
                  <div className="hz-rec-timeline">
                    {candidateTimeline.map((ev) => (
                      <div key={ev.id} className="hz-rec-timeline-item">
                        <div className="hz-rec-timeline-head">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 650, fontSize: 13, color: "var(--hz-text-strong)" }}>
                              {ev.title}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--hz-text-secondary)", marginTop: 2 }}>
                              {ev.subtitle}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                            <StatusBadge tone={ev.statusTone} dot>
                              {ev.status}
                            </StatusBadge>
                            <span style={{ fontSize: 11, color: "var(--hz-text-muted)" }}>
                              {ev.createdAt.slice(0, 16).replace("T", " ")} UTC
                            </span>
                          </div>
                        </div>
                        {ev.bodyPreview ? (
                          <p className="hz-rec-timeline-body">{ev.bodyPreview}</p>
                        ) : null}
                        {ev.senderName || ev.senderEmail || ev.providerMessageId ? (
                          <div className="hz-rec-timeline-meta">
                            {ev.senderName || ev.senderEmail ? (
                              <span>
                                By: {ev.senderName || ev.senderEmail}
                              </span>
                            ) : null}
                            {ev.providerMessageId ? (
                              <span>Resend ID: <code>{ev.providerMessageId}</code></span>
                            ) : null}
                          </div>
                        ) : null}
                        {ev.errorDetail ? (
                          <div className="hz-int-banner is-error" style={{ marginTop: 6, padding: "6px 10px", fontSize: 11.5 }}>
                            {ev.errorDetail}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Status, Source & Documents */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--hz-text-secondary)" }}>Stage:</span>
                    <select
                      value={selected.status}
                      disabled={!canEdit || saving}
                      style={{ width: "auto", minWidth: 150 }}
                      onChange={(e) =>
                        void update(selected, { status: e.target.value as ApplicantStatus })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <StatusBadge tone={CANDIDATE_SOURCE_LABELS[selected.source || "website"].tone}>
                      {CANDIDATE_SOURCE_LABELS[selected.source || "website"].en}
                    </StatusBadge>
                    {selected.isExternalProspect ? (
                      <StatusBadge tone="neutral">External Prospect</StatusBadge>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selected.hasCv !== false && selected.cvName ? (
                      <a
                        href={`/api/applications/${selected.id}/cv`}
                        target="_blank"
                        rel="noreferrer"
                        className="hz-btn hz-btn-secondary hz-btn-sm"
                      >
                        <Download size={12} /> CV · {selected.cvName}
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--hz-text-muted)" }}>
                        No CV attached
                      </span>
                    )}
                    {selected.coverLetterName ? (
                      <a
                        href={`/api/applications/${selected.id}/cv?type=cover-letter`}
                        target="_blank"
                        rel="noreferrer"
                        className="hz-btn hz-btn-secondary hz-btn-sm"
                      >
                        <Download size={12} /> Cover Letter
                      </a>
                    ) : null}
                    {selected.linkedin ? (
                      <a
                        href={selected.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="hz-btn hz-btn-secondary hz-btn-sm"
                      >
                        <ExternalLink size={12} /> LinkedIn
                      </a>
                    ) : null}
                  </div>
                </div>

                {selected.createdByEmail ? (
                  <div style={{ fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                    Added manually by <strong>{selected.createdByEmail}</strong> · Source:{" "}
                    <strong>{CANDIDATE_SOURCE_LABELS[selected.source || "website"].en}</strong>
                  </div>
                ) : null}

                <div className="admin-detail-grid">
                  <div>
                    <span>Current Role</span>
                    <strong>{selected.role}</strong>
                  </div>
                  <div>
                    <span>Experience</span>
                    <strong>{selected.experience}</strong>
                  </div>
                  <div>
                    <span>Location</span>
                    <strong>
                      {selected.location}, {selected.country}
                    </strong>
                  </div>
                  <div>
                    <span>Work Authorization</span>
                    <strong>{selected.workAuthorization || "Not provided"}</strong>
                  </div>
                  <div>
                    <span>Sponsorship</span>
                    <strong>{selected.sponsorshipRequired ? "Required" : "Not required"}</strong>
                  </div>
                  <div>
                    <span>Availability &amp; Start</span>
                    <strong>
                      {selected.availability} · {selected.startDate}
                    </strong>
                  </div>
                  <div>
                    <span>Compensation</span>
                    <strong>{selected.salaryExpectation || "Not provided"}</strong>
                  </div>
                  <div>
                    <span>Education</span>
                    <strong>{selected.education || "Not provided"}</strong>
                  </div>
                </div>

                {selected.technologies ? (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: "var(--hz-radius-md)",
                      border: "1px solid var(--hz-border-subtle)",
                      background: "var(--hz-surface-inset)",
                    }}
                  >
                    <span className="hz-eyebrow">Technologies &amp; Skills</span>
                    <p style={{ margin: "4px 0 0", fontSize: 13 }}>{selected.technologies}</p>
                  </div>
                ) : null}

                <div
                  style={{
                    padding: 12,
                    borderRadius: "var(--hz-radius-md)",
                    border: "1px solid var(--hz-border-subtle)",
                    background: "var(--hz-surface-inset)",
                  }}
                >
                  <span className="hz-eyebrow">Why HIRZEXA?</span>
                  <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.6 }}>
                    {selected.whyJoin}
                  </p>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: "var(--hz-radius-md)",
                    border: "1px solid var(--hz-border-subtle)",
                    background: "var(--hz-surface-inset)",
                  }}
                >
                  <span className="hz-eyebrow">Role Suitability Statement</span>
                  <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.6 }}>
                    {selected.whyFit}
                  </p>
                </div>

                {selected.coverLetterText ? (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: "var(--hz-radius-md)",
                      border: "1px solid var(--hz-border-subtle)",
                      background: "var(--hz-surface-inset)",
                    }}
                  >
                    <span className="hz-eyebrow">Cover Letter</span>
                    <p style={{ margin: "4px 0 0", fontSize: 13, whiteSpace: "pre-wrap" }}>
                      {selected.coverLetterText}
                    </p>
                  </div>
                ) : null}

                {canViewInterviews ? (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: "var(--hz-radius-md)",
                      border: "1px solid var(--hz-border-subtle)",
                      background: "var(--hz-surface-inset)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span className="hz-eyebrow">Interview Scheduling &amp; Timeline</span>
                      <Link
                        href="/admin/interviews"
                        style={{ fontSize: 12, color: "var(--hz-accent-blue)", textDecoration: "none" }}
                      >
                        Open Interviews Workspace
                      </Link>
                    </div>
                    {candidateInterviews.appointments.length === 0 &&
                      candidateInterviews.invitations.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12.5, color: "var(--hz-text-secondary)" }}>
                        No interview invitations or scheduled sessions for this candidate yet.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
                        {candidateInterviews.appointments.map((appt) => (
                          <div
                            key={appt.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span>
                              <strong>{appt.interviewStage}</strong> ·{" "}
                              {appt.scheduledStartUtc.slice(0, 16).replace("T", " ")} UTC (
                              {appt.interviewerName})
                            </span>
                            <StatusBadge
                              tone={
                                appt.status === "confirmed"
                                  ? "blue"
                                  : appt.status === "completed"
                                    ? "emerald"
                                    : "rose"
                              }
                              dot
                            >
                              {appt.status}
                            </StatusBadge>
                          </div>
                        ))}
                        {candidateInterviews.invitations.map((inv) => (
                          <div
                            key={inv.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ color: "var(--hz-text-secondary)" }}>
                              Invitation ({inv.interviewerName}) · Email: {inv.emailDeliveryStatus}
                            </span>
                            <StatusBadge
                              tone={
                                inv.status === "scheduled"
                                  ? "emerald"
                                  : inv.status === "sent"
                                    ? "blue"
                                    : "amber"
                              }
                            >
                              {inv.status}
                            </StatusBadge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="field">
                  <label>Hiring Team Notes</label>
                  <textarea
                    key={`note-${selected.id}`}
                    disabled={!canEdit}
                    defaultValue={selected.note || ""}
                    placeholder="Record interview impressions, technical evaluation notes, or next steps…"
                    onBlur={(e) => void update(selected, { note: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        ) : null}
      </SlideOver>

      <AddCandidateDrawer
        open={addCandidateOpen}
        jobs={companyJobs}
        initialValues={addCandidatePrefill}
        canInviteInterview={canInviteInterview}
        onClose={() => {
          setAddCandidateOpen(false);
          setAddCandidatePrefill(null);
        }}
        onCreated={(candidate, merged) => {
          setNotice(
            merged
              ? `Updated existing candidate record ${candidate.name} (${candidate.id}).`
              : `Added external candidate ${candidate.name} (${candidate.id}) to Recruitment.`
          );
          void load();
        }}
        onInviteInterview={(cand) => {
          setInviteCandidate({
            applicationReferenceId: cand.id,
            candidateName: cand.name,
            candidateEmail: cand.email,
            positionTitle: cand.jobTitle,
          });
        }}
        onComposeEmail={(cand, messageType) => {
          setComposerRecipient({
            email: cand.email,
            name: cand.name,
            applicationReferenceId: cand.id,
            positionTitle: cand.jobTitle,
            messageType: messageType || "application_thank_you",
          });
          setComposerOpen(true);
        }}
      />

      <ManualEmailComposerDrawer
        open={composerOpen}
        candidates={items}
        initialRecipient={composerRecipient}
        resendConfigured={resendConfigured}
        canInviteInterview={canInviteInterview}
        onClose={() => {
          setComposerOpen(false);
          setComposerRecipient(null);
        }}
        onSent={() => {
          setNotice("Recruitment email sent and recorded in communication history.");
          if (selected) void loadCandidateCommunications(selected, commSearch);
        }}
        onSaveAsCandidate={(prefill) => {
          setAddCandidatePrefill({
            email: prefill.email,
            fullName: prefill.fullName,
            source: "email",
          });
          setAddCandidateOpen(true);
        }}
        onLaunchInterviewInvite={(cand) => {
          setInviteCandidate(cand);
        }}
      />

      <InviteInterviewDrawer
        open={Boolean(inviteCandidate)}
        candidate={inviteCandidate}
        interviewers={interviewers}
        resendConfigured={resendConfigured}
        onClose={() => setInviteCandidate(null)}
        onInvited={() => {
          setNotice("Interview invitation created successfully.");
          if (selected) {
            void loadCandidateInterviews(selected.id);
            void loadCandidateCommunications(selected, commSearch);
          }
          void load();
        }}
      />
    </>
  );
}
