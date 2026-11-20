"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Database,
  FileText,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { MarkdownContent, StatusBadge } from "@/components/admin-ui/primitives";
import { ApprovalCard } from "@/components/agent/ApprovalCard";
import type {
  AgentMessageRecord,
  AgentPendingAction,
} from "@/lib/intelligence/types";

function formatMsgTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getFriendlyDomainLabel(toolName: string): string {
  const lower = toolName.toLowerCase();
  if (lower.includes("lead") || lower.includes("crm") || lower.includes("pipeline")) return "CRM";
  if (lower.includes("booking") || lower.includes("call") || lower.includes("meeting"))
    return "Bookings";
  if (lower.includes("application") || lower.includes("candidate") || lower.includes("job"))
    return "Recruitment";
  if (lower.includes("task")) return "Tasks";
  if (lower.includes("email") || lower.includes("draft")) return "Communications";
  if (lower.includes("briefing") || lower.includes("event") || lower.includes("metric"))
    return "Analytics";
  return "Operations";
}

function CitationIcon({ entityType }: { entityType: string }) {
  if (entityType === "lead") return <Database size={11} />;
  if (entityType === "booking") return <CalendarClock size={11} />;
  if (entityType === "application") return <Users size={11} />;
  if (entityType === "job") return <BriefcaseBusiness size={11} />;
  return <FileText size={11} />;
}

export function AIResponseCard({
  message,
  confirmingId,
  onConfirmAction,
  onNavigate,
}: {
  message: AgentMessageRecord;
  confirmingId: string | null;
  onConfirmAction: (action: AgentPendingAction, decision: "approve" | "reject") => void;
  onNavigate?: () => void;
}) {
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const isArabic = /[\u0600-\u06FF]/.test(message.content);
  const timestamp = formatMsgTime(message.createdAt);

  if (message.role === "user") {
    return (
      <div className="hz-ag-turn is-user">
        <div className="hz-ag-avatar is-user" aria-hidden="true">
          <User size={15} />
        </div>
        <div className="hz-ag-user-bubble" dir={isArabic ? "rtl" : "ltr"}>
          <span>{message.content}</span>
        </div>
        {timestamp ? <time className="hz-ag-time">{timestamp}</time> : null}
      </div>
    );
  }

  const toolCalls = message.toolCalls || [];
  const citations = message.citations || [];
  const totalDurationMs = toolCalls.reduce((sum, t) => sum + (t.durationMs || 0), 0);
  const hasDenied = toolCalls.some((t) => t.status === "denied");
  const friendlyDomains = Array.from(
    new Set(toolCalls.map((t) => getFriendlyDomainLabel(t.tool)))
  );

  return (
    <div className="hz-ag-turn is-assistant">
      <div className="hz-ag-avatar is-ai" aria-hidden="true">
        <Image src="/brand/hirzexa-mark.png" alt="" width={20} height={20} />
      </div>

      <div className="hz-ag-ai-card">
        <div className="hz-ag-ai-card-head">
          <div className="hz-ag-ai-card-identity">
            <strong>HIRZEXA Intelligence</strong>
            {friendlyDomains.length > 0 ? (
              <span className="hz-ag-domain-summary">
                Used {friendlyDomains.join(" + ")}
              </span>
            ) : null}
          </div>
          {timestamp ? <time className="hz-ag-time">{timestamp}</time> : null}
        </div>

        <div className="hz-ag-ai-body" dir={isArabic ? "rtl" : "ltr"}>
          <MarkdownContent content={message.content} />
        </div>

        {/* Verified Source Citations */}
        {citations.length > 0 ? (
          <div className="hz-ag-meta-strip" dir="ltr">
            <span className="hz-ag-meta-label">
              <ShieldCheck size={13} color="#34D399" />
              <span>Verified Citations</span>
            </span>
            <div className="hz-ag-chip-row">
              {citations.map((citation) => (
                <Link
                  key={`${citation.entityType}-${citation.entityId}`}
                  href={citation.href}
                  className="hz-ag-citation-chip"
                  onClick={onNavigate}
                >
                  <CitationIcon entityType={citation.entityType} />
                  <span>{citation.label}</span>
                  <ArrowUpRight size={11} />
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* Compact Expandable Tool Activity Row (Hidden Developer Detail Until Expanded) */}
        {toolCalls.length > 0 ? (
          <div className="hz-ag-tools-strip" dir="ltr">
            <button
              type="button"
              className="hz-ag-tools-toggle"
              onClick={() => setToolsExpanded((v) => !v)}
              aria-expanded={toolsExpanded}
            >
              <span className="hz-ag-meta-label">
                {hasDenied ? (
                  <ShieldAlert size={13} color="#FDA4AF" />
                ) : (
                  <Code2 size={13} color="#818CF8" />
                )}
                <span>
                  Tool Activity ({toolCalls.length} executed · {totalDurationMs}ms)
                </span>
              </span>
              <span className="hz-ag-tools-pills">
                {!toolsExpanded
                  ? toolCalls.slice(0, 3).map((t, idx) => (
                      <span
                        key={`${t.tool}-${idx}`}
                        className={`hz-ag-tool-mini ${t.status === "denied" ? "is-denied" : ""}`}
                      >
                        <CheckCircle2 size={10} />
                        {getFriendlyDomainLabel(t.tool)}
                      </span>
                    ))
                  : null}
                {toolsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </span>
            </button>

            {toolsExpanded ? (
              <div className="hz-ag-tools-detail">
                {toolCalls.map((t, idx) => (
                  <div key={`${t.tool}-${idx}`} className="hz-ag-tool-row">
                    <div>
                      <code>{t.tool}</code>
                      <span> — {t.summary}</span>
                    </div>
                    <StatusBadge
                      tone={
                        t.status === "denied"
                          ? "rose"
                          : t.status === "ok"
                          ? "emerald"
                          : "amber"
                      }
                    >
                      {t.status} · {t.durationMs}ms
                    </StatusBadge>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Human-in-the-loop Approval Confirmation Card */}
        {message.pendingAction ? (
          <ApprovalCard
            action={message.pendingAction}
            busy={confirmingId === message.pendingAction.id}
            onDecision={onConfirmAction}
          />
        ) : null}
      </div>
    </div>
  );
}
