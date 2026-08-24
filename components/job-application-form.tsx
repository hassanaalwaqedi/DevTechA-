"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { Job } from "@/lib/data";

export function JobApplicationForm({ job }: { job: Job }) {
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (job.compensationType === "Unpaid" && !data.get("compensationAcknowledged")) { setError("Please acknowledge the compensation status before submitting."); return; }
    if (!data.get("cv") || !(data.get("cv") as File).name) { setError("Please attach your CV in PDF or DOCX format."); return; }
    setError("");
    data.append("jobSlug", job.slug);
    const response = await fetch("/api/applications", {method: "POST", body: data});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || "Unable to submit application."); return; }
    setReference(result.reference);
    setSubmitted(true);
  }
  if (submitted) return <div className="success-card"><CheckCircle2 size={38} color="#2f5749"/><div className="eyebrow">Application received</div><h2>Thank you for putting your work in front of us.</h2><div className="reference">{reference}</div><p>We’ll review your application and be in touch if there’s a fit. Keep this reference for your records.</p><a href="/careers" className="button-dark">Back to careers <ArrowUpRight size={15}/></a></div>;
  return <form className="form" onSubmit={submit}><div className="form-section"><h3>Your details</h3><div className="field-grid"><div className="field"><label htmlFor="name">Full name *</label><input required id="name" name="name" /></div><div className="field"><label htmlFor="email">Email *</label><input required type="email" id="email" name="email" /></div><div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" /></div><div className="field"><label htmlFor="country">Country *</label><input required id="country" name="country" /></div><div className="field"><label htmlFor="location">Current location *</label><input required id="location" name="location" /></div></div></div><div className="form-section"><h3>Experience & links</h3><div className="field-grid"><div className="field"><label htmlFor="role">Current role or education *</label><input required id="role" name="role" /></div><div className="field"><label htmlFor="experience">Years / level of experience *</label><select required id="experience" name="experience" defaultValue=""><option value="" disabled>Select one</option><option>Student / entry-level</option><option>1–2 years</option><option>2–3 years</option><option>4+ years</option></select></div><div className="field"><label htmlFor="linkedin">LinkedIn URL</label><input type="url" id="linkedin" name="linkedin" placeholder="https://" /></div><div className="field"><label htmlFor="github">GitHub URL</label><input type="url" id="github" name="github" placeholder="https://" /></div><div className="field full"><label htmlFor="portfolio">Portfolio URL</label><input type="url" id="portfolio" name="portfolio" placeholder="https://" /></div><div className="field full"><label htmlFor="technologies">Relevant technologies *</label><input required id="technologies" name="technologies" placeholder="Flutter, Dart, TypeScript..." /></div><div className="field full"><label htmlFor="cv">CV / Resume *</label><input required type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" id="cv" name="cv" /><small>PDF or DOCX · max 10 MB</small></div></div></div><div className="form-section"><h3>Motivation</h3><div className="field"><label htmlFor="whyJoin">Why do you want to join DevTech AI? *</label><textarea required id="whyJoin" name="whyJoin" /></div><div className="field"><label htmlFor="whyFit">Why are you suitable for this position? *</label><textarea required id="whyFit" name="whyFit" /></div><div className="field"><label htmlFor="additionalMessage">Anything else you’d like us to know?</label><textarea id="additionalMessage" name="additionalMessage" /></div></div><div className="form-section"><h3>Availability</h3><div className="field-grid"><div className="field"><label htmlFor="availability">Availability *</label><input required id="availability" name="availability" placeholder="e.g. 15 hours / week" /></div><div className="field"><label htmlFor="startDate">Expected start date *</label><input required type="date" id="startDate" name="startDate" /></div></div>{job.compensationType === "Unpaid" && <label className="checkbox"><input type="checkbox" name="compensationAcknowledged" /> <span>I understand that this position is an unpaid internship, as described above. *</span></label>}</div>{error && <p style={{color: "#a14e40", fontSize: 13}}>{error}</p>}<div className="form-actions"><button className="button-dark" type="submit">Submit application <ArrowUpRight size={15}/></button><p>Your information is only used for this application.</p></div></form>;
}
