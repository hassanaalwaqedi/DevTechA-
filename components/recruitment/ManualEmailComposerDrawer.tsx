"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bold,
  Calendar,
  CheckCircle2,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mail,
  Monitor,
  Search,
  Send,
  Smartphone,
  UserPlus,
  X,
} from "lucide-react";
import { SlideOver, StatusBadge } from "@/components/admin-ui/primitives";
import type { Application } from "@/lib/data";
import { getRecruitmentTemplateDraft } from "@/lib/recruitment/templates-catalog";
import {
  CANDIDATE_SOURCE_LABELS,
  RECRUITMENT_MESSAGE_TYPES,
  RECRUITMENT_MESSAGE_TYPE_LABELS,
  type RecruitmentMessageType,
} from "@/lib/recruitment/types";

interface Props {
  open: boolean;
  candidates: Application[];
  initialRecipient?: {
    email: string;
    name?: string;
    applicationReferenceId?: string;
    positionTitle?: string;
    messageType?: RecruitmentMessageType;
  } | null;
  resendConfigured: boolean;
  canInviteInterview?: boolean;
  onClose: () => void;
  onSent?: () => void;
  onSaveAsCandidate?: (prefill: { email: string; fullName?: string }) => void;
  onLaunchInterviewInvite?: (candidate: {
    applicationReferenceId: string;
    candidateName: string;
    candidateEmail: string;
    positionTitle: string;
  }) => void;
}

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function ManualEmailComposerDrawer({
  open,
  candidates,
  initialRecipient,
  resendConfigured,
  canInviteInterview = false,
  onClose,
  onSent,
  onSaveAsCandidate,
  onLaunchInterviewInvite,
}: Props) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [linkedAppRef, setLinkedAppRef] = useState<string>("");
  const [positionTitle, setPositionTitle] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [showCandidateList, setShowCandidateList] = useState(false);

  const [messageType, setMessageType] = useState<RecruitmentMessageType>("general_recruitment");
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [subject, setSubject] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");

  const [tab, setTab] = useState<"compose" | "preview">("compose");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    template: { from: string; replyTo: string; to: string; subject: string; html: string; text: string };
    isSamplePreview: boolean;
    isRealRecipient: boolean;
    hasUnsafeLinksBlocked: boolean;
  } | null>(null);

  const [confirmedSend, setConfirmedSend] = useState(false);
  const [clientRequestId, setClientRequestId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentResult, setSentResult] = useState<{
    recipientEmail: string;
    subject: string;
    deliveryStatus: string;
    messageId?: string;
    deliveryError?: string;
    idempotent?: boolean;
    isLinkedCandidate: boolean;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Initialize state whenever drawer opens
  useEffect(() => {
    if (!open) return;
    const initEmail = initialRecipient?.email || "";
    const initName = initialRecipient?.name || "";
    const initRef = initialRecipient?.applicationReferenceId || "";
    const initPos = initialRecipient?.positionTitle || "";
    const initType: RecruitmentMessageType =
      initialRecipient?.messageType || "general_recruitment";

    setRecipientEmail(initEmail);
    setRecipientName(initName);
    setLinkedAppRef(initRef);
    setPositionTitle(initPos);
    setCandidateSearch("");
    setShowCandidateList(false);
    setMessageType(initType);
    setLocale("en");
    const draft = getRecruitmentTemplateDraft(initType, "en", {
      candidateName: initName,
      positionTitle: initPos,
    });
    setSubject(draft.subject);
    setBodyMarkdown(draft.body);
    setTab("compose");
    setConfirmedSend(false);
    setClientRequestId(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
    setError(null);
    setSentResult(null);
  }, [open, initialRecipient]);

  // Match typed email to an existing candidate automatically (read-only lookup; never silently creates!)
  const matchedCandidate = useMemo(() => {
    if (linkedAppRef) {
      const byRef = candidates.find((c) => c.id === linkedAppRef);
      if (byRef) return byRef;
    }
    const norm = recipientEmail.trim().toLowerCase();
    if (!norm) return null;
    return candidates.find((c) => c.email.trim().toLowerCase() === norm) || null;
  }, [candidates, linkedAppRef, recipientEmail]);

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return candidates.slice(0, 8);
    return candidates
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.jobTitle.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [candidates, candidateSearch]);

  const isEmailValid = EMAIL_RE.test(recipientEmail.trim());
  const isInterviewType = messageType === "interview_invitation";

  const applyTemplate = (nextType: RecruitmentMessageType, nextLocale: "en" | "ar") => {
    setMessageType(nextType);
    setLocale(nextLocale);
    setError(null);
    if (nextType === "interview_invitation") return;
    const draft = getRecruitmentTemplateDraft(nextType, nextLocale, {
      candidateName: recipientName || matchedCandidate?.name,
      positionTitle: positionTitle || matchedCandidate?.jobTitle,
    });
    setSubject(draft.subject);
    setBodyMarkdown(draft.body);
  };

  const selectCandidate = (cand: Application) => {
    setRecipientEmail(cand.email);
    setRecipientName(cand.name);
    setLinkedAppRef(cand.id);
    setPositionTitle(cand.jobTitle);
    setCandidateSearch("");
    setShowCandidateList(false);
    setError(null);
    if (messageType !== "custom" && messageType !== "interview_invitation") {
      const draft = getRecruitmentTemplateDraft(messageType, locale, {
        candidateName: cand.name,
        positionTitle: cand.jobTitle,
      });
      setSubject(draft.subject);
      setBodyMarkdown(draft.body);
    }
  };

  const insertFormat = (prefix: string, suffix = "", placeholder = "text") => {
    const el = textareaRef.current;
    if (!el) {
      setBodyMarkdown((prev) => `${prev}${prefix}${placeholder}${suffix}`);
      return;
    }
    const start = el.selectionStart ?? bodyMarkdown.length;
    const end = el.selectionEnd ?? bodyMarkdown.length;
    const selectedText = bodyMarkdown.slice(start, end) || placeholder;
    const updated =
      bodyMarkdown.slice(0, start) + prefix + selectedText + suffix + bodyMarkdown.slice(end);
    setBodyMarkdown(updated);
    window.setTimeout(() => {
      el.focus();
      const cursorPos = start + prefix.length + selectedText.length + suffix.length;
      el.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const handleInsertLink = () => {
    const rawUrl = window.prompt("Enter HTTPS link URL (e.g. https://hirzexa.com/careers):");
    if (!rawUrl || !rawUrl.trim()) return;
    const trimmed = rawUrl.trim();
    if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed)) {
      setError("Only safe https:// or mailto: links are permitted.");
      return;
    }
    insertFormat("[", `](${trimmed})`, "Link text");
  };

  const loadPreview = async () => {
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/recruitment/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "preview",
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || matchedCandidate?.name || null,
          applicationReferenceId: matchedCandidate?.id || linkedAppRef || null,
          positionTitle: positionTitle.trim() || matchedCandidate?.jobTitle || null,
          messageType,
          locale,
          subject,
          bodyMarkdown,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to render email preview.");
        return;
      }
      setPreviewData(data);
    } catch {
      setError("Network error while rendering email preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (open && tab === "preview" && !isInterviewType) {
      void loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, locale, messageType]);

  const handleSendEmail = async () => {
    setError(null);
    if (!isEmailValid) {
      setError("Please enter a valid single recipient email address.");
      return;
    }
    if (subject.trim().length < 3) {
      setError("Please enter an email subject line.");
      return;
    }
    if (bodyMarkdown.trim().length < 10) {
      setError("Please enter the message body before sending.");
      return;
    }
    if (!confirmedSend) {
      setError("Please confirm before sending.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/recruitment/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "send",
          confirmed: true,
          clientRequestId,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || matchedCandidate?.name || null,
          applicationReferenceId: matchedCandidate?.id || linkedAppRef || null,
          positionTitle: positionTitle.trim() || matchedCandidate?.jobTitle || null,
          messageType,
          locale,
          subject: subject.trim(),
          bodyMarkdown,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Unable to send recruitment email.");
        return;
      }

      setSentResult({
        recipientEmail: recipientEmail.trim().toLowerCase(),
        subject: subject.trim(),
        deliveryStatus: data.delivery?.status || "accepted_by_provider",
        messageId: data.delivery?.messageId,
        deliveryError: data.delivery?.error,
        idempotent: Boolean(data.idempotent),
        isLinkedCandidate: Boolean(matchedCandidate),
      });
      onSent?.();
    } catch {
      setError("Network error while sending email. Please retry safely.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      width={720}
      title="Compose Recruitment Email"
      subtitle="Send an official HIRZEXA Careers message from careers@hirzexa.com via verified Resend delivery."
    >
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
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <CheckCircle2 size={24} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: "#ffffff" }}>
                Recruitment Email{" "}
                {sentResult.deliveryStatus === "accepted_by_provider"
                  ? "Accepted by Resend"
                  : sentResult.deliveryStatus}
              </div>
              <div style={{ fontSize: 12.5, color: "#cbd5e1", marginTop: 4 }}>
                To: <strong>{sentResult.recipientEmail}</strong> · Subject:{" "}
                <span>{sentResult.subject}</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Status: <code style={{ color: "#6ee7b7" }}>{sentResult.deliveryStatus}</code>
                {sentResult.messageId ? (
                  <>
                    {" "}
                    · Provider ID: <code>{sentResult.messageId}</code>
                  </>
                ) : null}
                {sentResult.idempotent ? " · Duplicate send prevented (idempotent)" : ""}
              </div>
            </div>
          </div>

          {!sentResult.isLinkedCandidate && onSaveAsCandidate ? (
            <div className="hz-int-banner is-warn">
              <UserPlus size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", flexWrap: "wrap" }}>
                <span>
                  <strong>{sentResult.recipientEmail}</strong> is not saved in Recruitment yet.
                </span>
                <button
                  type="button"
                  className="hz-btn hz-btn-primary hz-btn-sm"
                  onClick={() => {
                    onClose();
                    onSaveAsCandidate({
                      email: sentResult.recipientEmail,
                      fullName: recipientName.trim() || undefined,
                    });
                  }}
                >
                  <UserPlus size={12} /> Save as Candidate
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="hz-btn hz-btn-secondary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {!isInterviewType ? (
            <div className="hz-int-segment" style={{ width: "100%" }}>
              <button
                type="button"
                style={{ flex: 1, justifyContent: "center" }}
                className={tab === "compose" ? "is-active" : ""}
                onClick={() => setTab("compose")}
              >
                <Mail size={13} /> 1. Compose Message
              </button>
              <button
                type="button"
                style={{ flex: 1, justifyContent: "center" }}
                className={tab === "preview" ? "is-active" : ""}
                onClick={() => setTab("preview")}
              >
                <Eye size={13} /> 2. Preview Email
              </button>
            </div>
          ) : null}

          {!resendConfigured ? (
            <div className="hz-int-banner is-warn">
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>RESEND_API_KEY is not configured</strong> on this server. Outbound emails
                will report <code>delivery_failed</code> until configured.
              </span>
            </div>
          ) : null}

          {error ? <div className="hz-int-banner is-error">{error}</div> : null}

          {tab === "compose" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Recipient Selection (Manual Email OR Search Existing Candidates) */}
              <div className="hz-int-field">
                <label>Recipient Email * (enter manually or search Recruitment)</label>
                <div className="hz-int-form-grid-2">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value);
                      setLinkedAppRef("");
                      setError(null);
                    }}
                    placeholder="candidate@domain.com"
                  />
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <Search
                        size={13}
                        style={{
                          position: "absolute",
                          left: 10,
                          color: "var(--hz-text-muted)",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="text"
                        value={candidateSearch}
                        onFocus={() => setShowCandidateList(true)}
                        onChange={(e) => {
                          setCandidateSearch(e.target.value);
                          setShowCandidateList(true);
                        }}
                        placeholder="Search existing candidate…"
                        style={{ paddingLeft: 30 }}
                      />
                    </div>
                    {showCandidateList && filteredCandidates.length > 0 ? (
                      <div className="hz-rec-dropdown">
                        <div className="hz-rec-dropdown-head">
                          <span>Select Recruitment Candidate</span>
                          <button
                            type="button"
                            className="hz-icon-btn"
                            style={{ width: 22, height: 22 }}
                            onClick={() => setShowCandidateList(false)}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {filteredCandidates.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="hz-rec-dropdown-item"
                            onClick={() => selectCandidate(c)}
                          >
                            <div>
                              <strong style={{ color: "#fff", fontSize: 12.5 }}>{c.name}</strong>
                              <div style={{ fontSize: 11.5, color: "var(--hz-text-secondary)" }}>
                                {c.email} · {c.jobTitle}
                              </div>
                            </div>
                            <StatusBadge
                              tone={CANDIDATE_SOURCE_LABELS[c.source || "website"].tone}
                            >
                              {CANDIDATE_SOURCE_LABELS[c.source || "website"].en}
                            </StatusBadge>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Selected Recipient Pill */}
                {recipientEmail.trim() ? (
                  <div className="hz-rec-recipient-chip">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <StatusBadge tone={isEmailValid ? "emerald" : "rose"} dot>
                        {isEmailValid ? "Valid Email" : "Invalid Email Format"}
                      </StatusBadge>
                      <strong style={{ fontSize: 12.5, color: "#fff" }}>
                        {matchedCandidate
                          ? `${matchedCandidate.name} <${recipientEmail.trim().toLowerCase()}>`
                          : recipientEmail.trim().toLowerCase()}
                      </strong>
                      {matchedCandidate ? (
                        <StatusBadge tone="blue">
                          Linked · {matchedCandidate.id}
                        </StatusBadge>
                      ) : isEmailValid ? (
                        <StatusBadge tone="neutral">External Recipient</StatusBadge>
                      ) : null}
                    </div>
                    {!matchedCandidate && isEmailValid && onSaveAsCandidate ? (
                      <button
                        type="button"
                        className="hz-btn hz-btn-secondary hz-btn-sm"
                        onClick={() =>
                          onSaveAsCandidate({
                            email: recipientEmail.trim().toLowerCase(),
                            fullName: recipientName.trim() || undefined,
                          })
                        }
                      >
                        <UserPlus size={12} /> Save as Candidate
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Optional Name & Role Context for Personalization */}
              <div className="hz-int-form-grid-2">
                <div className="hz-int-field">
                  <label>Recipient Name (optional)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g., Lina Al-Harbi"
                  />
                </div>
                <div className="hz-int-field">
                  <label>Position / Role Context (optional)</label>
                  <input
                    type="text"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    placeholder="e.g., Senior AI Engineer"
                  />
                </div>
              </div>

              {/* Email Type & Language */}
              <div className="hz-int-form-grid-2">
                <div className="hz-int-field">
                  <label>Email Type / Template</label>
                  <select
                    value={messageType}
                    onChange={(e) =>
                      applyTemplate(e.target.value as RecruitmentMessageType, locale)
                    }
                  >
                    {RECRUITMENT_MESSAGE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {RECRUITMENT_MESSAGE_TYPE_LABELS[t].en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hz-int-field">
                  <label>Language &amp; Direction</label>
                  <div className="hz-int-segment" style={{ width: "100%" }}>
                    <button
                      type="button"
                      style={{ flex: 1, justifyContent: "center" }}
                      className={locale === "en" ? "is-active" : ""}
                      onClick={() => applyTemplate(messageType, "en")}
                    >
                      English (LTR)
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, justifyContent: "center" }}
                      className={locale === "ar" ? "is-active" : ""}
                      onClick={() => applyTemplate(messageType, "ar")}
                    >
                      العربية (RTL)
                    </button>
                  </div>
                </div>
              </div>

              {/* Template A — Interview Invitation Real Workflow Integration */}
              {isInterviewType ? (
                <div className="hz-rec-interview-bridge">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <Calendar size={20} style={{ color: "#60a5fa", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <strong style={{ fontSize: 14, color: "#ffffff" }}>
                        Connected to HIRZEXA Live Interview Scheduling
                      </strong>
                      <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6 }}>
                        Interview invitations require real interviewer availability and a
                        cryptographically generated, SHA-256-hashed candidate booking link. Manual
                        emails never generate placeholder tokens.
                      </p>
                      {matchedCandidate ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                          {canInviteInterview && onLaunchInterviewInvite ? (
                            <button
                              type="button"
                              className="hz-btn hz-btn-primary"
                              onClick={() => {
                                onClose();
                                onLaunchInterviewInvite({
                                  applicationReferenceId: matchedCandidate.id,
                                  candidateName: matchedCandidate.name,
                                  candidateEmail: matchedCandidate.email,
                                  positionTitle: matchedCandidate.jobTitle,
                                });
                              }}
                            >
                              <Calendar size={14} /> Open Interview Invitation &amp; Scheduling
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "#fbbf24" }}>
                              You need <code>interviews:create</code> permission to send interview
                              scheduling invitations.
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                          {onSaveAsCandidate ? (
                            <button
                              type="button"
                              className="hz-btn hz-btn-primary"
                              onClick={() => {
                                onClose();
                                onSaveAsCandidate({
                                  email: recipientEmail.trim(),
                                  fullName: recipientName.trim() || undefined,
                                });
                              }}
                            >
                              <UserPlus size={14} /> Save External Candidate First, Then Invite
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Editable Subject Line */}
                  <div className="hz-int-field">
                    <label>Subject *</label>
                    <input
                      type="text"
                      dir={locale === "ar" ? "rtl" : "ltr"}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={
                        locale === "ar"
                          ? "موضوع الرسالة…"
                          : "HIRZEXA | Subject line…"
                      }
                    />
                  </div>

                  {/* Safe Rich-Text Editor with Compact Formatting Toolbar */}
                  <div className="hz-int-field">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <label style={{ margin: 0 }}>Message Content *</label>
                      <div className="hz-rec-rte-toolbar">
                        <button
                          type="button"
                          title="Bold"
                          onClick={() => insertFormat("**", "**", "bold text")}
                        >
                          <Bold size={13} />
                        </button>
                        <button
                          type="button"
                          title="Italic"
                          onClick={() => insertFormat("*", "*", "italic text")}
                        >
                          <Italic size={13} />
                        </button>
                        <button
                          type="button"
                          title="Bullet List"
                          onClick={() => insertFormat("\n- ", "", "List item")}
                        >
                          <List size={13} />
                        </button>
                        <button
                          type="button"
                          title="Numbered List"
                          onClick={() => insertFormat("\n1. ", "", "First point")}
                        >
                          <ListOrdered size={13} />
                        </button>
                        <button type="button" title="Insert Safe Link" onClick={handleInsertLink}>
                          <Link2 size={13} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={textareaRef}
                      rows={10}
                      dir={locale === "ar" ? "rtl" : "ltr"}
                      value={bodyMarkdown}
                      onChange={(e) => setBodyMarkdown(e.target.value)}
                      placeholder={
                        locale === "ar"
                          ? "اكتب رسالتك الاحترافية هنا… (يدعم **الخط العريض**، *المائل*، القوائم، والروابط الآمنة)"
                          : "Write your professional message here… (Supports paragraphs, **bold**, *italic*, lists, and safe https:// links)"
                      }
                      style={{ fontFamily: "inherit", lineHeight: 1.6 }}
                    />
                    <span style={{ fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                      Safe formatting only (no arbitrary HTML or scripts). Sent from{" "}
                      <code>HIRZEXA Careers &lt;careers@hirzexa.com&gt;</code>.
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* PREVIEW TAB */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                    HTML Preview
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
                  Rendering official HIRZEXA recruitment email preview…
                </div>
              ) : (
                <>
                  {previewData.isSamplePreview ? (
                    <div className="hz-int-banner is-warn">
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>
                        <strong>Sample Preview:</strong> Enter a valid recipient email and complete
                        your message before sending.
                      </span>
                    </div>
                  ) : (
                    <div className="hz-int-banner is-success">
                      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>
                        <strong>Real Sendable Content Ready:</strong> Exact email that will be
                        delivered to <strong>{previewData.template.to}</strong>.
                      </span>
                    </div>
                  )}

                  <div className="hz-int-email-meta" style={{ marginBottom: 0 }}>
                    <span className="hz-int-email-meta-label">From</span>
                    <span className="hz-int-email-meta-val">{previewData.template.from}</span>
                    <span className="hz-int-email-meta-label">Reply-To</span>
                    <span className="hz-int-email-meta-val">{previewData.template.replyTo}</span>
                    <span className="hz-int-email-meta-label">To</span>
                    <span className="hz-int-email-meta-val">{previewData.template.to}</span>
                    <span className="hz-int-email-meta-label">Subject</span>
                    <span className="hz-int-email-meta-val" style={{ fontWeight: 700 }}>
                      {previewData.template.subject}
                    </span>
                  </div>

                  {previewMode === "html" ? (
                    <div className="hz-int-preview-stage">
                      <iframe
                        title="HIRZEXA Recruitment Email Preview"
                        srcDoc={previewData.template.html}
                        className={`hz-int-preview-frame ${
                          previewViewport === "mobile" ? "is-mobile" : ""
                        }`}
                        style={{ height: 500 }}
                      />
                    </div>
                  ) : (
                    <pre className="hz-int-preview-plain">{previewData.template.text}</pre>
                  )}
                </>
              )}
            </div>
          )}

          {/* Explicit Confirmation & Action Footer */}
          {!isInterviewType ? (
            <div className="hz-int-drawer-footer">
              <label className="hz-int-confirm-check">
                <input
                  type="checkbox"
                  checked={confirmedSend}
                  onChange={(e) => setConfirmedSend(e.target.checked)}
                />
                <span>
                  I confirm sending this recruitment email to{" "}
                  <strong>{recipientEmail.trim() || "the entered recipient"}</strong> from{" "}
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
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="hz-btn hz-btn-ghost" onClick={onClose}>
                    Cancel
                  </button>
                  {tab === "compose" ? (
                    <button
                      type="button"
                      className="hz-btn hz-btn-secondary"
                      onClick={() => setTab("preview")}
                    >
                      <Eye size={14} /> Preview Email
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="hz-btn hz-btn-secondary"
                      onClick={() => setTab("compose")}
                    >
                      Back to Editor
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="hz-btn hz-btn-primary"
                  disabled={
                    sending ||
                    !confirmedSend ||
                    !isEmailValid ||
                    subject.trim().length < 3 ||
                    bodyMarkdown.trim().length < 10
                  }
                  onClick={handleSendEmail}
                >
                  <Send size={14} />
                  {sending ? "Sending Email…" : "Send Email"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SlideOver>
  );
}
