"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Mail,
  Monitor,
  Send,
  Smartphone,
} from "lucide-react";
import { SlideOver } from "@/components/admin-ui/primitives";
import {
  INTERVIEW_DURATIONS,
  INTERVIEW_FORMATS,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_TYPES,
  INTERVIEW_TYPE_LABELS,
  type InterviewDuration,
  type InterviewFormat,
  type InterviewType,
} from "@/lib/interviews/types";

export interface InterviewerOption {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  hasConfiguredAvailability: boolean;
}

export interface InviteInterviewCandidate {
  applicationReferenceId: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
}

interface Props {
  open: boolean;
  candidate: InviteInterviewCandidate | null;
  interviewers: InterviewerOption[];
  resendConfigured: boolean;
  onClose: () => void;
  onInvited?: () => void;
}

export function InviteInterviewDrawer({
  open,
  candidate,
  interviewers,
  resendConfigured,
  onClose,
  onInvited,
}: Props) {
  const [interviewType, setInterviewType] = useState<InterviewType>("initial_hr_screening");
  const [interviewFormat, setInterviewFormat] = useState<InterviewFormat>("online_video");
  const [durationMinutes, setDurationMinutes] = useState<InterviewDuration>(45);
  const [interviewerEmployeeId, setInterviewerEmployeeId] = useState<string>("");
  const [availabilityWindowStart, setAvailabilityWindowStart] = useState<string>("");
  const [availabilityWindowEnd, setAvailabilityWindowEnd] = useState<string>("");
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const [locationDetails, setLocationDetails] = useState<string>("");
  const [personalizedMessage, setPersonalizedMessage] = useState<string>("");
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [confirmedSend, setConfirmedSend] = useState(false);

  const [tab, setTab] = useState<"config" | "preview">("config");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    subject: string;
    from: string;
    replyTo: string;
    html: string;
    text: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentResult, setSentResult] = useState<{
    schedulingUrl?: string;
    deliveryStatus: string;
    deliveryError?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSentResult(null);
    setConfirmedSend(false);
    setTab("config");
    if (interviewers.length > 0 && !interviewerEmployeeId) {
      const configured = interviewers.find((i) => i.hasConfiguredAvailability) || interviewers[0];
      setInterviewerEmployeeId(configured.id);
    }
  }, [open, interviewers, interviewerEmployeeId]);

  const selectedInterviewer = interviewers.find((i) => i.id === interviewerEmployeeId);

  const loadPreview = async () => {
    if (!candidate) return;
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/interviews/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "invitation",
          locale,
          candidateName: candidate.candidateName,
          candidateEmail: candidate.candidateEmail,
          positionTitle: candidate.positionTitle,
          interviewType,
          interviewFormat,
          durationMinutes,
          interviewerName: selectedInterviewer?.fullName || "HIRZEXA Hiring Panel",
          personalizedMessage,
          meetingUrl: meetingUrl || null,
          locationDetails: locationDetails || null,
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (res.ok && data.template) {
        setPreviewData(data.template);
      }
    } catch {
      setError("Unable to load the email preview. Please check your connection and try again.");
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (open && tab === "preview") {
      void loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    tab,
    locale,
    interviewType,
    interviewFormat,
    durationMinutes,
    interviewerEmployeeId,
    personalizedMessage,
    expiresInDays,
  ]);

  const handleSendInvitation = async () => {
    if (!candidate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationReferenceId: candidate.applicationReferenceId,
          candidateName: candidate.candidateName,
          candidateEmail: candidate.candidateEmail,
          positionTitle: candidate.positionTitle,
          interviewStage: INTERVIEW_TYPE_LABELS[interviewType].en,
          interviewType,
          interviewFormat,
          durationMinutes,
          interviewerEmployeeId,
          availabilityWindowStart: availabilityWindowStart || null,
          availabilityWindowEnd: availabilityWindowEnd || null,
          meetingUrl: meetingUrl.trim() || null,
          locationDetails: locationDetails.trim() || null,
          personalizedMessage,
          locale,
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send interview invitation.");
        return;
      }
      setSentResult({
        schedulingUrl: data.schedulingUrl,
        deliveryStatus: data.delivery?.status || "created",
        deliveryError: data.delivery?.error,
      });
      onInvited?.();
    } catch {
      setError("Network error while sending interview invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SlideOver
      open={open && Boolean(candidate)}
      onClose={onClose}
      width={680}
      title={candidate ? `Invite ${candidate.candidateName} to Interview` : "Invite to Interview"}
      subtitle={
        candidate
          ? `${candidate.positionTitle} · ${candidate.candidateEmail} (${candidate.applicationReferenceId})`
          : ""
      }
    >
      {candidate ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!sentResult ? (
            <div className="hz-int-segment" style={{ width: "100%" }}>
              <button
                type="button"
                style={{ flex: 1, justifyContent: "center" }}
                className={tab === "config" ? "is-active" : ""}
                onClick={() => setTab("config")}
              >
                <Calendar size={13} /> 1. Configure Interview
              </button>
              <button
                type="button"
                style={{ flex: 1, justifyContent: "center" }}
                className={tab === "preview" ? "is-active" : ""}
                onClick={() => setTab("preview")}
              >
                <Eye size={13} /> 2. Preview Candidate Email
              </button>
            </div>
          ) : null}

          {!resendConfigured ? (
            <div className="hz-int-banner is-warn">
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>RESEND_API_KEY is not configured</strong> on this server. A secure link will
                still be generated, but email delivery will report <code>delivery_failed</code>.
              </span>
            </div>
          ) : null}

          {error ? <div className="hz-int-banner is-error">{error}</div> : null}

          {sentResult ? (
            <div
              className="hz-int-card"
              style={{
                borderColor: "rgba(16, 185, 129, 0.35)",
                background: "rgba(16, 185, 129, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle2 size={24} style={{ color: "#34d399", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#ffffff" }}>
                    Interview Invitation Created
                  </div>
                  <div style={{ fontSize: 12.5, color: "#cbd5e1", marginTop: 2 }}>
                    Email Delivery Status:{" "}
                    <code style={{ color: "#6ee7b7" }}>{sentResult.deliveryStatus}</code>
                    {sentResult.deliveryStatus === "accepted_by_provider"
                      ? " (Accepted by Resend; awaiting webhook delivery confirmation)"
                      : ""}
                  </div>
                </div>
              </div>

              {sentResult.deliveryError ? (
                <div className="hz-int-banner is-warn">{sentResult.deliveryError}</div>
              ) : null}

              {sentResult.schedulingUrl ? (
                <div className="hz-int-field">
                  <label>Candidate Secure Scheduling Link (shown once)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" readOnly value={sentResult.schedulingUrl} />
                    <button
                      type="button"
                      className="hz-btn hz-btn-primary hz-btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(sentResult.schedulingUrl || "");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <button type="button" className="hz-btn hz-btn-secondary" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : tab === "config" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="hz-int-form-grid-2">
                <div className="hz-int-field">
                  <label>Interview Stage / Type</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                  >
                    {INTERVIEW_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {INTERVIEW_TYPE_LABELS[t].en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hz-int-field">
                  <label>Duration</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value) as InterviewDuration)}
                  >
                    {INTERVIEW_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} minutes
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hz-int-field">
                  <label>Format</label>
                  <select
                    value={interviewFormat}
                    onChange={(e) => setInterviewFormat(e.target.value as InterviewFormat)}
                  >
                    {INTERVIEW_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {INTERVIEW_FORMAT_LABELS[f].en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hz-int-field">
                  <label>Email Language</label>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value === "ar" ? "ar" : "en")}
                  >
                    <option value="en">English (LTR)</option>
                    <option value="ar">العربية (RTL)</option>
                  </select>
                </div>
              </div>

              <div className="hz-int-field">
                <label>Assigned Interviewer</label>
                <select
                  value={interviewerEmployeeId}
                  onChange={(e) => setInterviewerEmployeeId(e.target.value)}
                >
                  <option value="">Select an interviewer…</option>
                  {interviewers.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.jobTitle || emp.department})
                      {emp.hasConfiguredAvailability
                        ? " — Availability Ready"
                        : " — No Availability Configured"}
                    </option>
                  ))}
                </select>
                {selectedInterviewer && !selectedInterviewer.hasConfiguredAvailability ? (
                  <div className="hz-int-banner is-warn" style={{ marginTop: 6 }}>
                    <span>
                      <strong>{selectedInterviewer.fullName}</strong> does not have configured
                      availability hours yet. Configure their hours in{" "}
                      <Link href="/admin/interviews" style={{ color: "#93c5fd" }}>
                        /admin/interviews
                      </Link>{" "}
                      before sending.
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="hz-int-form-grid-3">
                <div className="hz-int-field">
                  <label>Window Start (optional)</label>
                  <input
                    type="date"
                    value={availabilityWindowStart}
                    onChange={(e) => setAvailabilityWindowStart(e.target.value)}
                  />
                </div>
                <div className="hz-int-field">
                  <label>Window End (optional)</label>
                  <input
                    type="date"
                    value={availabilityWindowEnd}
                    onChange={(e) => setAvailabilityWindowEnd(e.target.value)}
                  />
                </div>
                <div className="hz-int-field">
                  <label>Link Expiry (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value) || 7)}
                  />
                </div>
              </div>

              {interviewFormat === "online_video" ? (
                <div className="hz-int-field">
                  <label>Verified Meeting Link (optional — only real URLs)</label>
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/... or https://zoom.us/..."
                  />
                </div>
              ) : (
                <div className="hz-int-field">
                  <label>Location / Dial-in Instructions (optional)</label>
                  <input
                    type="text"
                    value={locationDetails}
                    onChange={(e) => setLocationDetails(e.target.value)}
                    placeholder={
                      interviewFormat === "phone"
                        ? "Interviewer will call your application phone number"
                        : "Office address and check-in instructions"
                    }
                  />
                </div>
              )}

              <div className="hz-int-field">
                <label>Personalized Note for Candidate (optional)</label>
                <textarea
                  rows={3}
                  value={personalizedMessage}
                  onChange={(e) => setPersonalizedMessage(e.target.value)}
                  placeholder="Share preparation notes, topics to discuss, or a personal welcome…"
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="hz-int-banner is-warn">
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Preview Only:</strong> No scheduling token has been created yet. A unique,
                  cryptographically secure link on <code>https://hirzexa.com</code> will be
                  generated and stored (hashed) when you click <strong>Send Interview Invitation</strong>.
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div className="hz-int-segment">
                  <button
                    type="button"
                    className={previewViewport === "desktop" ? "is-active" : ""}
                    onClick={() => setPreviewViewport("desktop")}
                  >
                    <Monitor size={13} /> Desktop
                  </button>
                  <button
                    type="button"
                    className={previewViewport === "mobile" ? "is-active" : ""}
                    onClick={() => setPreviewViewport("mobile")}
                  >
                    <Smartphone size={13} /> Mobile
                  </button>
                </div>
                <div className="hz-int-segment">
                  <button
                    type="button"
                    className={previewMode === "html" ? "is-active" : ""}
                    onClick={() => setPreviewMode("html")}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    className={previewMode === "text" ? "is-active" : ""}
                    onClick={() => setPreviewMode("text")}
                  >
                    Plain Text
                  </button>
                </div>
              </div>

              {previewLoading || !previewData ? (
                <div style={{ padding: 36, textAlign: "center", color: "var(--hz-text-secondary)" }}>
                  Rendering official HIRZEXA candidate email preview…
                </div>
              ) : (
                <>
                  <div className="hz-int-email-meta" style={{ marginBottom: 0 }}>
                    <span className="hz-int-email-meta-label">From</span>
                    <span className="hz-int-email-meta-val">{previewData.from}</span>
                    <span className="hz-int-email-meta-label">Reply-To</span>
                    <span className="hz-int-email-meta-val">{previewData.replyTo}</span>
                    <span className="hz-int-email-meta-label">To</span>
                    <span className="hz-int-email-meta-val">{candidate.candidateEmail}</span>
                    <span className="hz-int-email-meta-label">Subject</span>
                    <span className="hz-int-email-meta-val" style={{ fontWeight: 700 }}>
                      {previewData.subject}
                    </span>
                  </div>

                  {previewMode === "html" ? (
                    <div className="hz-int-preview-stage">
                      <iframe
                        title="Candidate Interview Email Preview"
                        srcDoc={previewData.html}
                        className={`hz-int-preview-frame ${
                          previewViewport === "mobile" ? "is-mobile" : ""
                        }`}
                        style={{ height: 500 }}
                      />
                    </div>
                  ) : (
                    <pre className="hz-int-preview-plain">{previewData.text}</pre>
                  )}
                </>
              )}
            </div>
          )}

          {!sentResult ? (
            <div className="hz-int-drawer-footer">
              <label className="hz-int-confirm-check">
                <input
                  type="checkbox"
                  checked={confirmedSend}
                  onChange={(e) => setConfirmedSend(e.target.checked)}
                />
                <span>
                  I confirm sending this interview invitation to{" "}
                  <strong>{candidate.candidateEmail}</strong> from{" "}
                  <code>careers@hirzexa.com</code>.
                </span>
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {tab === "config" ? (
                  <button
                    type="button"
                    className="hz-btn hz-btn-secondary"
                    onClick={() => setTab("preview")}
                  >
                    <Mail size={14} /> Preview Email First
                  </button>
                ) : (
                  <button
                    type="button"
                    className="hz-btn hz-btn-secondary"
                    onClick={() => setTab("config")}
                  >
                    Back to Configuration
                  </button>
                )}

                <button
                  type="button"
                  className="hz-btn hz-btn-primary"
                  disabled={
                    submitting ||
                    !confirmedSend ||
                    !interviewerEmployeeId ||
                    Boolean(selectedInterviewer && !selectedInterviewer.hasConfiguredAvailability)
                  }
                  onClick={handleSendInvitation}
                >
                  <Send size={14} />
                  {submitting ? "Sending Invitation…" : "Send Interview Invitation"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </SlideOver>
  );
}
