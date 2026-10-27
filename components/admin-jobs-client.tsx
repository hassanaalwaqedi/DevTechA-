"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, EyeOff, Plus, Sparkles, X } from "lucide-react";
import type { Job, JobAccent, JobVisualCategory } from "@/lib/data";
import { jobVisualAccents, jobVisualCategories, jobVisualVariants, type JobVisualVariant } from "@/lib/job-visuals";
import { JobShareActions } from "@/components/job-share-actions";
import { JobVisualization } from "@/components/job-visualization";

type JobDraft = {
  title: string;
  slug: string;
  department: string;
  description: string;
  location: string;
  workMode: string;
  employmentType: string;
  duration: string;
  compensationType: string;
  compensationText: string;
  deadline: string;
  skills: string;
  responsibilities: string;
  requirements: string;
  niceToHave: string;
  visualCategory: JobVisualCategory;
  visualVariant: JobVisualVariant;
  accentColor: JobAccent;
  visualKeywords: string;
};
type VisualClassification = Pick<JobDraft, "visualCategory" | "visualVariant" | "accentColor"> & {visualKeywords: string[]};
type GeneratedJobDraft = {
  department: string;
  overview: string;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  technicalSkills: string[];
};

const blankDraft: JobDraft = {
  title: "",
  slug: "",
  department: "Product engineering",
  description: "",
  location: "Remote",
  workMode: "Remote",
  employmentType: "Full-time",
  duration: "Permanent",
  compensationType: "Paid",
  compensationText: "Details shared during the process.",
  deadline: "",
  skills: "",
  responsibilities: "",
  requirements: "",
  niceToHave: "",
  visualCategory: "default",
  visualVariant: "geometric",
  accentColor: "violet",
  visualKeywords: "",
};

const lines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const titleCase = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());

export function AdminJobsClient() {
  const [items, setItems] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<JobDraft>(blankDraft);
  const [editing, setEditing] = useState<Job | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [visualOverridden, setVisualOverridden] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [lastGeneratedTitle, setLastGeneratedTitle] = useState("");
  const [draftNotice, setDraftNotice] = useState("");

  async function load() {
    const response = await fetch("/api/jobs?admin=true", {cache: "no-store"});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || "Unable to load jobs."); return; }
    setItems(result.jobs || []);
  }

  useEffect(() => { void load(); }, []);

  function updateDraft<K extends keyof JobDraft>(key: K, value: JobDraft[K]) {
    setDraft((current) => ({...current, [key]: value}));
  }

  function updateTitle(value: string) {
    setDraft((current) => ({...current, title: value, slug: slugEdited ? current.slug : slugify(value)}));
    setDraftNotice("");
  }

  function startNew() {
    setEditing(null);
    setDraft(blankDraft);
    setVisualOverridden(false);
    setSlugEdited(false);
    setLastGeneratedTitle("");
    setDraftNotice("");
    setCreating(true);
    setError("");
  }

  function startEdit(job: Job) {
    setEditing(job);
    setDraft({
      title: job.title,
      slug: job.slug,
      department: job.department,
      description: job.description,
      location: job.location,
      workMode: job.workMode,
      employmentType: job.employmentType,
      duration: job.duration,
      compensationType: job.compensationType,
      compensationText: job.compensationText,
      deadline: job.deadline || "",
      skills: job.skills.join("\n"),
      responsibilities: job.responsibilities.join("\n"),
      requirements: job.requirements.join("\n"),
      niceToHave: job.niceToHave.join("\n"),
      visualCategory: job.visualCategory,
      visualVariant: jobVisualVariants.includes(job.visualVariant as JobVisualVariant) ? job.visualVariant as JobVisualVariant : "geometric",
      accentColor: job.accentColor,
      visualKeywords: job.visualKeywords.join("\n"),
    });
    setCreating(true);
    setVisualOverridden(true);
    setSlugEdited(true);
    setLastGeneratedTitle(job.title);
    setDraftNotice("");
    setError("");
  }

  async function generateJobContent(force = false) {
    const title = draft.title.trim();
    if (title.length < 3 || generatingDraft) return;
    const hasRoleContent = Boolean(draft.description.trim() || draft.responsibilities.trim() || draft.requirements.trim() || draft.niceToHave.trim() || draft.skills.trim());
    if (!force && (hasRoleContent || lastGeneratedTitle === title)) return;
    setGeneratingDraft(true);
    setDraftNotice("");
    setError("");
    const response = await fetch("/api/admin/ai/jobs/generate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({title, department: draft.department, employmentType: draft.employmentType, location: draft.location, workMode: draft.workMode}),
    });
    const result = await response.json().catch(() => ({}));
    setGeneratingDraft(false);
    if (!response.ok) { setError(result.error || "Unable to generate role content."); return; }
    const generated = result.draft as GeneratedJobDraft;
    setDraft((current) => ({
      ...current,
      slug: current.slug || slugify(current.title),
      department: force || current.department === blankDraft.department ? generated.department || current.department : current.department,
      description: force || !current.description.trim() ? generated.overview : current.description,
      responsibilities: force || !current.responsibilities.trim() ? generated.responsibilities.join("\n") : current.responsibilities,
      requirements: force || !current.requirements.trim() ? generated.requiredQualifications.join("\n") : current.requirements,
      niceToHave: force || !current.niceToHave.trim() ? generated.preferredQualifications.join("\n") : current.niceToHave,
      skills: force || !current.skills.trim() ? generated.technicalSkills.join("\n") : current.skills,
    }));
    setLastGeneratedTitle(title);
    setDraftNotice("Role content generated from the job title. Review and edit it before saving.");
  }

  async function requestVisualClassification(): Promise<VisualClassification> {
    const response = await fetch("/api/admin/ai/jobs/classify-visual", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({title: draft.title, department: draft.department, description: draft.description, skills: lines(draft.skills)}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Unable to classify this role.");
    return result.classification as VisualClassification;
  }

  async function recommendVisual() {
    if (!draft.title.trim()) { setError("Add a job title before asking Gemini for a visual identity."); return; }
    setClassifying(true);
    setError("");
    let classification: VisualClassification;
    try {
      classification = await requestVisualClassification();
    } catch (requestError) {
      setClassifying(false);
      setError(requestError instanceof Error ? requestError.message : "Unable to classify this role.");
      return;
    }
    setClassifying(false);
    setVisualOverridden(true);
    setDraft((current) => ({
      ...current,
      visualCategory: classification.visualCategory,
      visualVariant: classification.visualVariant,
      accentColor: classification.accentColor,
      visualKeywords: (classification.visualKeywords || []).join("\n"),
    }));
  }

  async function save() {
    if (!draft.title.trim() || !draft.description.trim() || !draft.department.trim()) {
      setError("Title, department, and role summary are required.");
      return;
    }
    setSaving(true);
    setError("");
    let visual = {visualCategory: draft.visualCategory, visualVariant: draft.visualVariant, accentColor: draft.accentColor, visualKeywords: lines(draft.visualKeywords)};
    if (!editing && !visualOverridden) {
      setClassifying(true);
      try {
        const recommended = await requestVisualClassification();
        visual = recommended;
        setDraft((current) => ({...current, ...recommended, visualKeywords: recommended.visualKeywords.join("\n")}));
      } catch {
        // Job creation remains available with the safe default when Gemini is unavailable.
      } finally {
        setClassifying(false);
      }
    }
    const payload = {
      title: draft.title.trim(),
      slug: slugify(draft.slug || draft.title),
      department: draft.department.trim(),
      description: draft.description.trim(),
      location: draft.location.trim(),
      workMode: draft.workMode,
      employmentType: draft.employmentType,
      duration: draft.duration,
      compensationType: draft.compensationType,
      compensationText: draft.compensationText.trim(),
      deadline: draft.deadline || null,
      skills: lines(draft.skills),
      responsibilities: lines(draft.responsibilities),
      requirements: lines(draft.requirements),
      niceToHave: lines(draft.niceToHave),
      status: editing?.status || "draft",
      ...visual,
    };
    const response = await fetch(editing ? `/api/jobs/${editing.id}` : "/api/jobs", {
      method: editing ? "PATCH" : "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setError(result.error || "Unable to save job."); return; }
    setCreating(false);
    setEditing(null);
    setDraft(blankDraft);
    setSlugEdited(false);
    setLastGeneratedTitle("");
    setDraftNotice(result.visualIdentityPending ? "Job saved. The visual identity is using its safe default until the Supabase careers migration is applied." : "Job saved successfully.");
    await load();
  }

  async function setStatus(id: string, status: Job["status"]) {
    const response = await fetch(`/api/jobs/${id}`, {method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({status})});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || "Unable to update job."); return; }
    await load();
  }

  const visibleItems = items.filter((job) => `${job.title} ${job.department} ${job.location}`.toLowerCase().includes(search.toLowerCase()));

  return <>
    <div className="admin-toolbar"><div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs" aria-label="Search jobs" /></div><button className="button-dark" onClick={startNew}><Plus size={15}/> New job</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {draftNotice && <p className="admin-notice" role="status">{draftNotice}</p>}
    {creating && <div className="admin-panel job-editor" style={{marginBottom: 15}}>
      <div className="admin-toolbar"><div><div className="eyebrow">{editing ? "Edit position" : "New position"}</div><h2 style={{margin: "7px 0 0"}}>{editing ? editing.title : "Build the role carefully"}</h2></div><button className="button-small" aria-label="Close editor" onClick={() => {setCreating(false); setEditing(null);}}><X size={15}/></button></div>
      <div className="field-grid">
        <div className="field"><label>Job title *</label><div className="job-title-control"><input value={draft.title} onChange={(event) => updateTitle(event.target.value)} onBlur={() => {void generateJobContent(false);}} placeholder="e.g. Senior full-stack engineer" /><button className="ai-fill-button" disabled={generatingDraft || draft.title.trim().length < 3} aria-busy={generatingDraft} onMouseDown={(event) => event.preventDefault()} onClick={() => {void generateJobContent(true);}}><Sparkles size={14}/>{generatingDraft ? "Writing…" : "AI fill role"}</button></div><small className="field-help">Enter a title and move to the next field to auto-generate the role content.</small></div>
        <div className="field"><label>Department *</label><input value={draft.department} onChange={(event) => updateDraft("department", event.target.value)} placeholder="e.g. Product engineering" /></div>
        <div className="field"><label>URL slug</label><input value={draft.slug} onChange={(event) => {setSlugEdited(true); updateDraft("slug", event.target.value);}} placeholder="senior-full-stack-engineer" /></div>
        <div className="field"><label>Location</label><input value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} /></div>
        <div className="field"><label>Work arrangement</label><select value={draft.workMode} onChange={(event) => updateDraft("workMode", event.target.value)}><option>Remote</option><option>Hybrid</option><option>On-site</option><option>Flexible</option></select></div>
        <div className="field"><label>Employment</label><select value={draft.employmentType} onChange={(event) => updateDraft("employmentType", event.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></div>
        <div className="field"><label>Duration</label><input value={draft.duration} onChange={(event) => updateDraft("duration", event.target.value)} /></div>
        <div className="field"><label>Application deadline</label><input type="date" value={draft.deadline} onChange={(event) => updateDraft("deadline", event.target.value)} /></div>
        <div className="field"><label>Compensation type</label><select value={draft.compensationType} onChange={(event) => updateDraft("compensationType", event.target.value)}><option>Paid</option><option>Unpaid</option><option>Details on request</option></select></div>
        <div className="field"><label>Compensation details</label><input value={draft.compensationText} onChange={(event) => updateDraft("compensationText", event.target.value)} /></div>
        <div className="field full"><label>Role summary *</label><textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="What is this role here to make possible?" /></div>
        <div className="field"><label>What you’ll do <small>(one item per line)</small></label><textarea value={draft.responsibilities} onChange={(event) => updateDraft("responsibilities", event.target.value)} placeholder={"Own delivery from brief to release\nPartner with product and design"} /></div>
        <div className="field"><label>What you bring <small>(one item per line)</small></label><textarea value={draft.requirements} onChange={(event) => updateDraft("requirements", event.target.value)} placeholder={"3+ years building production systems\nStrong written communication"} /></div>
        <div className="field"><label>Nice to have <small>(one item per line)</small></label><textarea value={draft.niceToHave} onChange={(event) => updateDraft("niceToHave", event.target.value)} /></div>
        <div className="field"><label>Skills <small>(one item per line)</small></label><textarea value={draft.skills} onChange={(event) => updateDraft("skills", event.target.value)} placeholder={"TypeScript\nPostgres\nApplied AI"} /></div>
      </div>

      <section className="visual-identity-editor" aria-labelledby="visual-identity-title">
        <div className="visual-identity-head"><div><div className="eyebrow">Role-aware experience</div><h3 id="visual-identity-title">AI visual identity</h3><p>New roles are classified automatically on save. Gemini can only select from a safe visual library, and you remain in control.</p></div><div className="visual-identity-actions"><button className="button-dark" disabled={classifying} aria-busy={classifying} onClick={recommendVisual}><Sparkles size={15}/>{classifying ? "Classifying…" : "Recommend with Gemini"}</button><button className="button-small" onClick={() => {setVisualOverridden(true); setDraft((current) => ({...current, visualCategory: "disabled", visualVariant: "disabled"}));}}><EyeOff size={14}/> Disable</button></div></div>
        <div className="visual-identity-grid"><div className="visual-controls">
          <div className="field"><label>Visual category</label><select value={draft.visualCategory} onChange={(event) => {setVisualOverridden(true); updateDraft("visualCategory", event.target.value as JobVisualCategory);}}>{jobVisualCategories.map((category) => <option value={category} key={category}>{titleCase(category)}</option>)}</select></div>
          <div className="field"><label>Visual variant</label><select value={draft.visualVariant} onChange={(event) => {setVisualOverridden(true); updateDraft("visualVariant", event.target.value as JobVisualVariant);}}>{jobVisualVariants.map((variant) => <option value={variant} key={variant}>{titleCase(variant)}</option>)}</select></div>
          <div className="field"><label>Accent color</label><select value={draft.accentColor} onChange={(event) => {setVisualOverridden(true); updateDraft("accentColor", event.target.value as JobAccent);}}>{jobVisualAccents.map((accent) => <option value={accent} key={accent}>{titleCase(accent)}</option>)}</select></div>
          <div className="field"><label>Visual keywords <small>(one per line)</small></label><textarea value={draft.visualKeywords} onChange={(event) => {setVisualOverridden(true); updateDraft("visualKeywords", event.target.value);}} placeholder={"signal processing\nreal-time inference"} /></div>
        </div><div className="visual-preview"><span>Public preview · conceptual illustration</span><JobVisualization compact category={draft.visualCategory} variant={draft.visualVariant} accent={draft.accentColor}/></div></div>
      </section>

      <div className="form-actions"><button className="button-dark" disabled={saving || generatingDraft} aria-busy={saving} onClick={save}>{saving ? "Saving…" : editing ? "Save changes" : "Save as draft"} {!saving && <ArrowUpRight size={15}/>}</button><p>Publish the role from the status control after reviewing the public page.</p></div>
    </div>}
    <div className="admin-panel"><h2>All jobs <span style={{color: "var(--muted)", fontSize: 13, fontFamily: "var(--sans)"}}>({visibleItems.length})</span></h2><table className="admin-table"><thead><tr><th>Position</th><th>Department</th><th>Visual</th><th>Location</th><th>Status</th><th>Published</th><th>Share</th><th></th></tr></thead><tbody>{visibleItems.map((job) => <tr key={job.id}><td><strong>{job.title}</strong><br/><span style={{color: "var(--muted)", fontSize: 11}}>/{job.slug}</span></td><td>{job.department}</td><td><span className="status">{titleCase(job.visualCategory)}</span></td><td>{job.location}</td><td><select className="button-small" value={job.status} onChange={(event) => setStatus(job.id, event.target.value as Job["status"])}><option>draft</option><option>open</option><option>paused</option><option>closed</option></select></td><td>{job.publishedAt || "—"}</td><td><JobShareActions slug={job.slug} title={job.title} compact /></td><td><button className="button-small" onClick={() => startEdit(job)}>Edit</button></td></tr>)}</tbody></table></div>
  </>;
}
