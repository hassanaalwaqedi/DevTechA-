"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2, FileText, Upload } from "lucide-react";
import type { Job } from "@/lib/data";

const maxCvSize = 10 * 1024 * 1024;
const maxCoverLetterSize = 5 * 1024 * 1024;

export function JobApplicationForm({ job }: { job: Job }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const cv = data.get("cv");
    const coverLetter = data.get("coverLetterFile");
    if (!(cv instanceof File) || !cv.name) { setError("Please attach your CV in PDF or DOCX format."); return; }
    if (cv.size > maxCvSize) { setError("Your CV must be smaller than 10 MB."); return; }
    if (coverLetter instanceof File && coverLetter.name && coverLetter.size > maxCoverLetterSize) { setError("Your cover letter must be smaller than 5 MB."); return; }
    if (job.compensationType === "Unpaid" && !data.get("compensationAcknowledged")) { setError("Please acknowledge the compensation status before applying."); return; }
    if (!data.get("consent")) { setError("Please confirm that the information provided is accurate."); return; }
    setError("");
    setSubmitting(true);
    data.append("jobSlug", job.slug);
    try {
      const response = await fetch("/api/applications", {method: "POST", body: data});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error || "Unable to submit application."); return; }
      setReference(result.reference);
      setSubmitted(true);
    } catch {
      setError("We could not reach the application service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return <div className="success-card"><CheckCircle2 size={42} color="#2f5749"/><div className="eyebrow">Application received</div><h2>Thank you for putting your work in front of us.</h2><div className="reference">{reference}</div><p>We have received your application for <strong>{job.title}</strong>. Keep this reference for your records; our team will review your information and contact you if there is a next step.</p><a href="/careers" className="button-dark">Back to careers <ArrowUpRight size={15}/></a></div>;

  return <form className="form application-form" onSubmit={submit} noValidate>
    <fieldset className="form-section"><legend>Personal details</legend><p className="form-section-intro">The best way to reach you and where you are currently based.</p><div className="field-grid"><div className="field"><label htmlFor="name">Full name *</label><input required id="name" name="name" autoComplete="name" /></div><div className="field"><label htmlFor="email">Email address *</label><input required type="email" id="email" name="email" autoComplete="email" /></div><div className="field"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" /></div><div className="field"><label htmlFor="country">Country *</label><input required id="country" name="country" autoComplete="country-name" /></div><div className="field full"><label htmlFor="location">Current city / location *</label><input required id="location" name="location" autoComplete="address-level2" placeholder="e.g. Istanbul, Türkiye" /></div></div></fieldset>

    <fieldset className="form-section"><legend>Experience & background</legend><p className="form-section-intro">Help us understand the work you have done and the tools you use.</p><div className="field-grid"><div className="field"><label htmlFor="role">Current role or education *</label><input required id="role" name="role" placeholder="e.g. Software engineer" /></div><div className="field"><label htmlFor="experience">Experience level *</label><select required id="experience" name="experience" defaultValue=""><option value="" disabled>Select one</option><option>Student / entry-level</option><option>1–2 years</option><option>2–3 years</option><option>4–6 years</option><option>7+ years</option></select></div><div className="field full"><label htmlFor="education">Education / relevant training</label><input id="education" name="education" placeholder="Degree, bootcamp, certifications, or equivalent experience" /></div><div className="field full"><label htmlFor="technologies">Relevant technologies & strengths *</label><textarea required id="technologies" name="technologies" placeholder="Tell us what you work with and where you are strongest." /></div><div className="field"><label htmlFor="linkedin">LinkedIn URL</label><input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/..." /></div><div className="field"><label htmlFor="github">GitHub / code profile</label><input type="url" id="github" name="github" placeholder="https://github.com/..." /></div><div className="field full"><label htmlFor="portfolio">Portfolio / personal website</label><input type="url" id="portfolio" name="portfolio" placeholder="https://" /></div></div></fieldset>

    <fieldset className="form-section"><legend>Work preferences</legend><p className="form-section-intro">These answers help us understand practical fit before we speak.</p><div className="field-grid"><div className="field"><label htmlFor="workAuthorization">Work authorization *</label><select required id="workAuthorization" name="workAuthorization" defaultValue=""><option value="" disabled>Select one</option><option>Authorized to work in my location</option><option>Need sponsorship</option><option>Open to discussing options</option></select></div><div className="field"><label htmlFor="sponsorshipRequired">Will you need sponsorship? *</label><select required id="sponsorshipRequired" name="sponsorshipRequired" defaultValue=""><option value="" disabled>Select one</option><option value="no">No</option><option value="yes">Yes</option></select></div><div className="field"><label htmlFor="remotePreference">Work preference *</label><select required id="remotePreference" name="remotePreference" defaultValue=""><option value="" disabled>Select one</option><option>Remote</option><option>Hybrid</option><option>On-site</option><option>Flexible</option></select></div><div className="field"><label htmlFor="noticePeriod">Notice period</label><select id="noticePeriod" name="noticePeriod" defaultValue=""><option value="">Select one</option><option>Immediately available</option><option>Less than 2 weeks</option><option>2–4 weeks</option><option>More than 4 weeks</option></select></div><div className="field full"><label htmlFor="salaryExpectation">Compensation expectations</label><input id="salaryExpectation" name="salaryExpectation" placeholder="Optional — include currency and period if useful" /></div></div></fieldset>

    <fieldset className="form-section"><legend>Documents</legend><p className="form-section-intro">PDF or DOCX files only. Your CV is required; a cover letter file is optional.</p><div className="document-upload-grid"><label className="upload-card" htmlFor="cv"><span className="upload-icon"><Upload size={18}/></span><span><strong>Upload CV / resume *</strong><small>PDF or DOCX · max 10 MB</small></span><input required type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" id="cv" name="cv" /></label><label className="upload-card" htmlFor="coverLetterFile"><span className="upload-icon"><FileText size={18}/></span><span><strong>Upload cover letter</strong><small>PDF or DOCX · max 5 MB</small></span><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" id="coverLetterFile" name="coverLetterFile" /></label></div><div className="field" style={{marginTop: 20}}><label htmlFor="coverLetterText">Or write a short cover letter</label><textarea id="coverLetterText" name="coverLetterText" placeholder="What drew you to this role, and what would you bring to the team?" /></div></fieldset>

    <fieldset className="form-section"><legend>Motivation & availability</legend><p className="form-section-intro">Thoughtful answers help us understand how you think, not just what is on your CV.</p><div className="field"><label htmlFor="whyJoin">Why do you want to join DevTech AI? *</label><textarea required id="whyJoin" name="whyJoin" placeholder="What about our work or this role caught your attention?" /></div><div className="field"><label htmlFor="whyFit">Why are you a strong fit for this position? *</label><textarea required id="whyFit" name="whyFit" placeholder="Share a relevant project, outcome, or way of working." /></div><div className="field-grid"><div className="field"><label htmlFor="availability">Availability / hours *</label><input required id="availability" name="availability" placeholder="e.g. Full-time from June" /></div><div className="field"><label htmlFor="startDate">Earliest start date *</label><input required type="date" id="startDate" name="startDate" /></div></div><div className="field"><label htmlFor="additionalMessage">Anything else you would like us to know?</label><textarea id="additionalMessage" name="additionalMessage" placeholder="Optional context, constraints, or questions." /></div></fieldset>

    {job.compensationType === "Unpaid" && <label className="checkbox"><input type="checkbox" name="compensationAcknowledged" /> <span>I understand that this position is unpaid, as described on the role page. *</span></label>}
    <label className="checkbox consent-checkbox"><input required type="checkbox" name="consent" /> <span>I confirm that the information I have provided is accurate and I consent to DevTech AI using it to evaluate this application. *</span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="button-dark" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? "Submitting…" : "Submit application"} {!submitting && <ArrowUpRight size={15}/>}</button><p>Your application is stored securely and only accessed by the hiring team.</p></div>
  </form>;
}
