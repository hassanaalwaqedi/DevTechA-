"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  SlideOver,
  StatusBadge,
} from "@/components/admin-ui/primitives";
import type { ApplicantStatus, Application } from "@/lib/data";

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
  canUseAgent = true,
}: {
  initialQuery?: string;
  canEdit?: boolean;
  canUseAgent?: boolean;
}) {
  const [items, setItems] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [search, setSearch] = useState(initialQuery);
  const [selected, setSelected] = useState<Application | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    if (jobFilter === "all") return items;
    return items.filter((a) => a.jobTitle === jobFilter);
  }, [items, jobFilter]);

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
        description="Review candidate profiles, verify CVs via short-lived signed links, manage hiring stages, and inspect role alignment."
        actions={
          canUseAgent ? (
            <button
              type="button"
              className="hz-btn hz-btn-primary"
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
          ) : null
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
                    <strong style={{ color: "var(--hz-text-strong)" }}>{app.name}</strong>
                    <div style={{ fontSize: 11.5, color: "var(--hz-text-secondary)" }}>
                      {app.email} · {app.id}
                    </div>
                  </td>
                  <td>
                    <strong>{app.jobTitle}</strong>
                    <div style={{ fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                      {app.role}
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
                  <td style={{ textAlign: "end" }}>
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
            ? `${selected.id} · ${selected.jobTitle} · ${selected.email}${
                selected.phone ? ` · ${selected.phone}` : ""
              }`
            : ""
        }
        headerActions={
          selected && canUseAgent ? (
            <button
              type="button"
              className="hz-btn hz-btn-primary hz-btn-sm"
              onClick={() => askAgentAboutCandidate(selected)}
            >
              <Sparkles size={12} /> Role Fit Summary
            </button>
          ) : null
        }
      >
        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Status & Documents */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <a
                  href={`/api/applications/${selected.id}/cv`}
                  target="_blank"
                  rel="noreferrer"
                  className="hz-btn hz-btn-secondary hz-btn-sm"
                >
                  <Download size={12} /> CV · {selected.cvName}
                </a>
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
              </div>
            </div>

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
          </div>
        ) : null}
      </SlideOver>
    </>
  );
}
