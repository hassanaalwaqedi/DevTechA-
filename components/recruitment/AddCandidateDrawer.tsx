"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileUp,
  Linkedin,
  Mail,
  UserPlus,
  X,
} from "lucide-react";
import { SlideOver, StatusBadge } from "@/components/admin-ui/primitives";
import type { Application, CandidateSource } from "@/lib/data";
import {
  CANDIDATE_SOURCES,
  CANDIDATE_SOURCE_LABELS,
  type CandidateDuplicateMatch,
} from "@/lib/recruitment/types";

export interface CompanyJobOption {
  id: string;
  title: string;
  department: string;
  status: string;
}

interface Props {
  open: boolean;
  jobs: CompanyJobOption[];
  initialValues?: {
    fullName?: string;
    email?: string;
    source?: CandidateSource;
    customPositionTitle?: string;
  } | null;
  canInviteInterview?: boolean;
  onClose: () => void;
  onCreated: (candidate: Application, merged?: boolean) => void;
  onInviteInterview?: (candidate: Application) => void;
  onComposeEmail?: (candidate: Application, messageType?: "application_thank_you" | "general_recruitment") => void;
}

export function AddCandidateDrawer({
  open,
  jobs,
  initialValues,
  canInviteInterview = false,
  onClose,
  onCreated,
  onInviteInterview,
  onComposeEmail,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobId, setJobId] = useState<string>("__prospect__");
  const [customPositionTitle, setCustomPositionTitle] = useState("");
  const [source, setSource] = useState<CandidateSource>("linkedin");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [experience, setExperience] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [duplicates, setDuplicates] = useState<CandidateDuplicateMatch[]>([]);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCandidate, setSavedCandidate] = useState<{
    candidate: Application;
    merged: boolean;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(initialValues?.fullName || "");
    setEmail(initialValues?.email || "");
    setPhone("");
    setJobId("__prospect__");
    setCustomPositionTitle(initialValues?.customPositionTitle || "");
    setSource(initialValues?.source || "linkedin");
    setLinkedinUrl("");
    setLocation("");
    setCountry("");
    setCurrentRole("");
    setExperience("");
    setInternalNotes("");
    setCvFile(null);
    setDuplicates([]);
    setError(null);
    setSavedCandidate(null);
  }, [open, initialValues]);

  const checkDuplicates = async (targetEmail: string, targetJobId: string) => {
    const cleaned = targetEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes("@")) {
      setDuplicates([]);
      return;
    }
    setCheckingDupes(true);
    try {
      const qs = new URLSearchParams({
        email: cleaned,
        includeJobs: "false",
      });
      if (targetJobId && targetJobId !== "__prospect__") {
        qs.set("jobId", targetJobId);
      }
      const res = await fetch(`/api/admin/recruitment/candidates?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.duplicates)) {
        setDuplicates(data.duplicates);
      }
    } catch {
      // Non-fatal
    } finally {
      setCheckingDupes(false);
    }
  };

  const submitCandidate = async (
    dedupeAction: "check" | "merge" | "create_separate",
    mergeTargetReferenceId?: string
  ) => {
    setError(null);
    if (fullName.trim().length < 2) {
      setError("Full Name is required (at least 2 characters).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("A valid Email Address is required.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("fullName", fullName.trim());
      form.set("email", email.trim());
      if (phone.trim()) form.set("phone", phone.trim());
      if (jobId && jobId !== "__prospect__") {
        form.set("jobId", jobId);
      } else if (customPositionTitle.trim()) {
        form.set("customPositionTitle", customPositionTitle.trim());
      }
      form.set("source", source);
      if (linkedinUrl.trim()) form.set("linkedinUrl", linkedinUrl.trim());
      if (location.trim()) form.set("location", location.trim());
      if (country.trim()) form.set("country", country.trim());
      if (currentRole.trim()) form.set("currentRole", currentRole.trim());
      if (experience.trim()) form.set("experience", experience.trim());
      if (internalNotes.trim()) form.set("internalNotes", internalNotes.trim());
      form.set("dedupeAction", dedupeAction);
      if (mergeTargetReferenceId) {
        form.set("mergeTargetReferenceId", mergeTargetReferenceId);
      }
      if (cvFile) {
        form.set("cv", cvFile);
      }

      const res = await fetch("/api/admin/recruitment/candidates", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.duplicateDetected && Array.isArray(data.duplicates)) {
        setDuplicates(data.duplicates);
        setError(data.error || "Matching candidate found. Choose how to proceed below.");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Unable to save candidate record.");
        return;
      }

      if (data.candidate) {
        setSavedCandidate({
          candidate: data.candidate as Application,
          merged: Boolean(data.merged),
        });
        onCreated(data.candidate as Application, Boolean(data.merged));
      }
    } catch {
      setError("Network error while saving external candidate. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openJobs = jobs.filter((j) => j.status === "open");
  const otherJobs = jobs.filter((j) => j.status !== "open");

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      width={660}
      title="Add External Candidate"
      subtitle="Import a LinkedIn applicant, referral, or external prospect directly into HIRZEXA Recruitment."
    >
      {savedCandidate ? (
        <div
          className="hz-int-card"
          style={{
            borderColor: "rgba(16, 185, 129, 0.35)",
            background: "rgba(16, 185, 129, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <CheckCircle2 size={24} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: "#ffffff" }}>
                {savedCandidate.merged
                  ? "Existing Candidate Record Updated"
                  : "External Candidate Added to Recruitment"}
              </div>
              <div style={{ fontSize: 12.5, color: "#cbd5e1", marginTop: 4 }}>
                <strong>{savedCandidate.candidate.name}</strong> ({savedCandidate.candidate.email}) ·{" "}
                <code>{savedCandidate.candidate.id}</code>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <StatusBadge
                  tone={
                    CANDIDATE_SOURCE_LABELS[savedCandidate.candidate.source || "linkedin"].tone
                  }
                >
                  {CANDIDATE_SOURCE_LABELS[savedCandidate.candidate.source || "linkedin"].en}
                </StatusBadge>
                <StatusBadge tone="neutral">{savedCandidate.candidate.jobTitle}</StatusBadge>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canInviteInterview && onInviteInterview ? (
              <button
                type="button"
                className="hz-btn hz-btn-primary"
                onClick={() => {
                  const cand = savedCandidate.candidate;
                  onClose();
                  onInviteInterview(cand);
                }}
              >
                <Calendar size={14} /> Invite to Interview
              </button>
            ) : null}
            {onComposeEmail ? (
              <>
                <button
                  type="button"
                  className="hz-btn hz-btn-secondary"
                  onClick={() => {
                    const cand = savedCandidate.candidate;
                    onClose();
                    onComposeEmail(cand, "application_thank_you");
                  }}
                >
                  <Mail size={14} /> Send Thank You Email
                </button>
                <button
                  type="button"
                  className="hz-btn hz-btn-secondary"
                  onClick={() => {
                    const cand = savedCandidate.candidate;
                    onClose();
                    onComposeEmail(cand, "general_recruitment");
                  }}
                >
                  Compose Custom Email
                </button>
              </>
            ) : null}
            <button type="button" className="hz-btn hz-btn-ghost" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitCandidate("check");
          }}
          style={{ display: "flex", flexDirection: "column", gap: 15 }}
        >
          {error ? <div className="hz-int-banner is-error">{error}</div> : null}

          {/* Candidate Source Pills */}
          <div className="hz-int-field">
            <label>Candidate Source</label>
            <div className="hz-rec-pill-row">
              {CANDIDATE_SOURCES.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={`hz-rec-pill ${source === src ? "is-active" : ""}`}
                  onClick={() => setSource(src)}
                >
                  {src === "linkedin" ? <Linkedin size={12} /> : null}
                  {CANDIDATE_SOURCE_LABELS[src].en}
                </button>
              ))}
            </div>
          </div>

          {/* Core Identity */}
          <div className="hz-int-form-grid-2">
            <div className="hz-int-field">
              <label>Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Lina Al-Harbi"
              />
            </div>

            <div className="hz-int-field">
              <label>Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setDuplicates([]);
                }}
                onBlur={() => void checkDuplicates(email, jobId)}
                placeholder="candidate@domain.com"
              />
            </div>
          </div>

          {/* Explicit Deduplication Resolution Card */}
          {checkingDupes ? (
            <div style={{ fontSize: 12, color: "var(--hz-text-muted)" }}>
              Checking existing recruitment records for duplicates…
            </div>
          ) : duplicates.length > 0 ? (
            <div className="hz-rec-dedupe-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={15} style={{ color: "#fbbf24", flexShrink: 0 }} />
                <strong style={{ fontSize: 13, color: "#fef3c7" }}>
                  Existing Candidate Record{duplicates.length > 1 ? "s" : ""} Found for{" "}
                  {email.trim().toLowerCase()}
                </strong>
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>
                HIRZEXA never silently combines distinct applications. Choose whether to update an
                existing record or create a separate application entry:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {duplicates.map((dup) => (
                  <div key={dup.referenceId} className="hz-rec-dedupe-row">
                    <div>
                      <div style={{ fontWeight: 650, fontSize: 12.5, color: "#ffffff" }}>
                        {dup.fullName} · <code>{dup.referenceId}</code>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--hz-text-secondary)" }}>
                        {dup.jobTitle} · Source: {CANDIDATE_SOURCE_LABELS[dup.source].en} · Stage:{" "}
                        {dup.status}
                        {dup.isExactJobMatch ? " (Same role match)" : " (Different role)"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="hz-btn hz-btn-secondary hz-btn-sm"
                      disabled={submitting}
                      onClick={() => void submitCandidate("merge", dup.referenceId)}
                    >
                      Merge / Update This Record
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="hz-btn hz-btn-primary hz-btn-sm"
                  disabled={submitting}
                  onClick={() => void submitCandidate("create_separate")}
                >
                  Create Separate Application Anyway
                </button>
              </div>
            </div>
          ) : null}

          {/* Position / Prospect Selection */}
          <div className="hz-int-field">
            <label>Position Applied For</label>
            <select
              value={jobId}
              onChange={(e) => {
                setJobId(e.target.value);
                if (email.includes("@")) void checkDuplicates(email, e.target.value);
              }}
            >
              <option value="__prospect__">
                External Prospect — Not yet tied to a specific HIRZEXA job
              </option>
              {openJobs.length > 0 ? (
                <optgroup label="Open HIRZEXA Positions">
                  {openJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.department})
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {otherJobs.length > 0 ? (
                <optgroup label="Draft / Paused / Closed Positions">
                  {otherJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.status})
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>

          {jobId === "__prospect__" ? (
            <div className="hz-int-field">
              <label>Target Role / Prospect Specialty (optional)</label>
              <input
                type="text"
                value={customPositionTitle}
                onChange={(e) => setCustomPositionTitle(e.target.value)}
                placeholder="e.g., Senior AI Systems Engineer (LinkedIn Prospect)"
              />
            </div>
          ) : null}

          {/* Contact & Profile Metadata */}
          <div className="hz-int-form-grid-2">
            <div className="hz-int-field">
              <label>Phone Number (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 555 000 0000"
              />
            </div>
            <div className="hz-int-field">
              <label>LinkedIn Profile URL (optional)</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/username"
              />
            </div>
            <div className="hz-int-field">
              <label>City / Location (optional)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Istanbul / Riyadh / Remote"
              />
            </div>
            <div className="hz-int-field">
              <label>Country (optional)</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g., Turkey, Saudi Arabia, UAE"
              />
            </div>
            <div className="hz-int-field">
              <label>Current Title / Role (optional)</label>
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g., Staff Full-Stack Engineer"
              />
            </div>
            <div className="hz-int-field">
              <label>Experience Summary (optional)</label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g., 6 years"
              />
            </div>
          </div>

          {/* Optional Secure CV Upload */}
          <div className="hz-int-field">
            <label>Resume / CV (optional · PDF or DOCX up to 10MB)</label>
            <div className="hz-rec-file-box">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: "none" }}
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
              {cvFile ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
                  <span style={{ fontSize: 12.5, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cvFile.name} ({Math.max(1, Math.round(cvFile.size / 1024))} KB)
                  </span>
                  <button
                    type="button"
                    className="hz-icon-btn"
                    onClick={() => {
                      setCvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="Remove CV"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="hz-btn hz-btn-secondary hz-btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={13} /> Attach Resume / CV
                </button>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="hz-int-field">
            <label>Internal Recruiting Notes (optional)</label>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="LinkedIn message summary, referral context, salary expectations, or screening highlights…"
            />
          </div>

          <div className="hz-int-drawer-footer">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <button type="button" className="hz-btn hz-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="hz-btn hz-btn-primary"
                disabled={submitting || !fullName.trim() || !email.trim()}
              >
                <UserPlus size={14} />
                {submitting ? "Saving Candidate…" : "Save External Candidate"}
              </button>
            </div>
          </div>
        </form>
      )}
    </SlideOver>
  );
}
