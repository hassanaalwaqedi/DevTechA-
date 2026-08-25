"use client";

import { useEffect, useState } from "react";
import type { ApplicantStatus, Application } from "@/lib/data";

const statuses: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "accepted", "rejected"];

export function AdminApplicationsClient() {
  const [items, setItems] = useState<Application[]>([]);
  const [filter, setFilter] = useState("All statuses");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "All statuses") params.set("status", filter);
    if (search.trim()) params.set("query", search.trim());
    try {
      const response = await fetch(`/api/applications${params.size ? `?${params.toString()}` : ""}`, {cache: "no-store"});
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to load applications."); return; }
      setItems(result.applications || []);
    } catch { setError("Unable to reach the application service."); }
    finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [filter, search]);

  async function update(app: Application, patch: Partial<Application>) {
    const response = await fetch(`/api/applications/${app.id}`, {method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify(patch)});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || "Unable to update application."); return; }
    await load();
    setSelected({...app, ...patch});
  }

  return <>
    <div className="admin-toolbar"><div className="admin-filter-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search applications"/><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter applications"><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><span style={{color: "var(--muted)", fontSize: 13}}>{loading ? "Loading…" : `${items.length} applications`}</span></div>
    {error && <p style={{color: "#a14e40", fontSize: 13}}>{error}</p>}
    <div className="admin-panel"><table className="admin-table"><thead><tr><th>Applicant</th><th>Position</th><th>Date</th><th>Experience</th><th>Status</th><th></th></tr></thead><tbody>{items.length ? items.map((app) => <tr key={app.id}><td><strong>{app.name}</strong><br/><span style={{color: "var(--muted)", fontSize: 11}}>{app.country} · {app.email}</span></td><td>{app.jobTitle}</td><td>{app.createdAt}</td><td>{app.experience}</td><td><span className={`status ${app.status}`}>{app.status}</span></td><td><button className="button-small" onClick={() => setSelected(app)}>Review</button></td></tr>) : <tr><td colSpan={6} style={{color: "var(--muted)", padding: 28}}>No applications match this view.</td></tr>}</tbody></table></div>
    {selected && <div className="admin-panel application-review" style={{marginTop: 15}}><div className="admin-toolbar"><div><div className="eyebrow">{selected.id} · Application review</div><h2 style={{margin: "7px 0 0"}}>{selected.name}</h2><p style={{margin: "5px 0 0", color: "var(--muted)"}}>{selected.email}{selected.phone ? ` · ${selected.phone}` : ""}</p></div><button className="button-small" onClick={() => setSelected(null)}>Close</button></div><div className="admin-detail-grid"><div><span>Position</span><strong>{selected.jobTitle}</strong></div><div><span>Current role</span><strong>{selected.role}</strong></div><div><span>Location</span><strong>{selected.location}, {selected.country}</strong></div><div><span>Experience</span><strong>{selected.experience}</strong></div><div><span>Work authorization</span><strong>{selected.workAuthorization || "Not provided"}</strong></div><div><span>Sponsorship</span><strong>{selected.sponsorshipRequired ? "Required" : "Not required"}</strong></div><div><span>Work preference</span><strong>{selected.remotePreference || "Not provided"}</strong></div><div><span>Availability</span><strong>{selected.availability}</strong></div><div><span>Start date</span><strong>{selected.startDate}</strong></div><div><span>Compensation expectation</span><strong>{selected.salaryExpectation || "Not provided"}</strong></div><div><span>Notice period</span><strong>{selected.noticePeriod || "Not provided"}</strong></div><div><span>Education</span><strong>{selected.education || "Not provided"}</strong></div></div><div className="application-links"><span>Documents</span><a href={`/api/applications/${selected.id}/cv`} target="_blank" rel="noreferrer">Download CV · {selected.cvName}</a>{selected.coverLetterName && <a href={`/api/applications/${selected.id}/cv?type=cover-letter`} target="_blank" rel="noreferrer">Download cover letter · {selected.coverLetterName}</a>}</div><div className="application-answer"><span>Why DevTech AI?</span><p>{selected.whyJoin}</p></div><div className="application-answer"><span>Why this candidate?</span><p>{selected.whyFit}</p></div>{selected.technologies && <div className="application-answer"><span>Technologies & strengths</span><p>{selected.technologies}</p></div>}{selected.coverLetterText && <div className="application-answer"><span>Cover letter</span><p>{selected.coverLetterText}</p></div>}{selected.additionalMessage && <div className="application-answer"><span>Additional context</span><p>{selected.additionalMessage}</p></div>}<div className="field" style={{marginTop: 24}}><label>Status</label><select value={selected.status} onChange={(e) => update(selected, {status: e.target.value as ApplicantStatus})}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div className="field"><label>Admin notes</label><textarea defaultValue={selected.note || ""} onBlur={(e) => update(selected, {note: e.target.value})} placeholder="Add a note for your team…" /></div></div>}
  </>;
}
