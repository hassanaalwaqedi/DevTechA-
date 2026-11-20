"use client";

import {
  Check,
  ChevronRight,
  Globe,
  History,
  Layers,
  Mic,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type {
  ContextSourceFilter,
  ConversationMode,
  DomainCapability,
} from "@/components/agent/types";
import type {
  AgentConversationRecord,
  AgentPendingAction,
} from "@/lib/intelligence/types";

export interface PendingApprovalEntry {
  conversationId: string;
  conversationTitle: string;
  action: AgentPendingAction;
}

export function AgentLeftControlPanel({
  mode,
  locale,
  voiceTtsEnabled,
  contextSource,
  capabilities,
  pendingApprovals,
  conversations,
  activeConvId,
  onModeChange,
  onLocaleChange,
  onToggleTts,
  onContextSourceChange,
  onNewChat,
  onSelectConversation,
  onOpenApproval,
}: {
  mode: ConversationMode;
  locale: "en" | "ar";
  voiceTtsEnabled: boolean;
  contextSource: ContextSourceFilter;
  capabilities: DomainCapability[];
  pendingApprovals: PendingApprovalEntry[];
  conversations: AgentConversationRecord[];
  activeConvId?: string;
  onModeChange: (mode: ConversationMode) => void;
  onLocaleChange: (locale: "en" | "ar") => void;
  onToggleTts: (enabled: boolean) => void;
  onContextSourceChange: (source: ContextSourceFilter) => void;
  onNewChat: () => void;
  onSelectConversation: (conv: AgentConversationRecord) => void;
  onOpenApproval: (conversationId: string) => void;
}) {
  return (
    <aside className="hz-ag-left-panel" aria-label="Agent Controls and History">
      {/* 1. Conversation Mode */}
      <div className="hz-ag-ctrl-block">
        <label className="hz-ag-ctrl-label" htmlFor="hz-ag-mode-select">
          <SlidersHorizontal size={13} color="#818CF8" />
          <span>Conversation Mode</span>
        </label>
        <div className="hz-ag-select-wrap">
          <Sparkles size={13} className="hz-ag-select-icon" />
          <select
            id="hz-ag-mode-select"
            value={mode}
            onChange={(e) => onModeChange(e.target.value as ConversationMode)}
          >
            <option value="executive">Executive Assistant</option>
            <option value="sales">Sales &amp; CRM Copilot</option>
            <option value="recruitment">Recruitment Analyst</option>
            <option value="operations">Operations Brief</option>
          </select>
        </div>
        <span className="hz-ag-ctrl-hint">Company-wide insights, analysis, and actions</span>
      </div>

      {/* 2. Voice Profile */}
      <div className="hz-ag-ctrl-block">
        <label className="hz-ag-ctrl-label" htmlFor="hz-ag-voice-select">
          <Mic size={13} color="#818CF8" />
          <span>Voice</span>
        </label>
        <select
          id="hz-ag-voice-select"
          value={voiceTtsEnabled ? (locale === "ar" ? "ar-exec" : "en-exec") : "muted"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "muted") {
              onToggleTts(false);
            } else {
              onToggleTts(true);
              onLocaleChange(v === "ar-exec" ? "ar" : "en");
            }
          }}
        >
          <option value="en-exec">English (US) — Executive</option>
          <option value="ar-exec">العربية (SA) — التنفيذي</option>
          <option value="muted">Text Only (Voice Muted)</option>
        </select>
        <span className="hz-ag-ctrl-hint">Natural, explicit-activation enterprise voice</span>
      </div>

      {/* 3. Signature Gradient New Chat CTA */}
      <button type="button" className="hz-ag-newchat-btn" onClick={onNewChat}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Mic size={14} />
          <span>New Chat</span>
        </span>
        <Plus size={15} />
      </button>

      {/* 4. Language Segmented Switch */}
      <div className="hz-ag-ctrl-block">
        <span className="hz-ag-ctrl-label">
          <Globe size={13} color="#818CF8" />
          <span>Language</span>
        </span>
        <div className="hz-ag-lang-switch" role="group" aria-label="Conversation language">
          <button
            type="button"
            className={locale === "en" ? "is-active" : ""}
            onClick={() => onLocaleChange("en")}
          >
            English
          </button>
          <button
            type="button"
            className={locale === "ar" ? "is-active" : ""}
            onClick={() => onLocaleChange("ar")}
          >
            العربية
          </button>
        </div>
      </div>

      {/* 5. Context Sources (Real RBAC-backed badges) */}
      <div className="hz-ag-ctrl-block">
        <label className="hz-ag-ctrl-label" htmlFor="hz-ag-source-select">
          <Layers size={13} color="#818CF8" />
          <span>Context Sources</span>
        </label>
        <select
          id="hz-ag-source-select"
          value={contextSource}
          onChange={(e) => onContextSourceChange(e.target.value as ContextSourceFilter)}
        >
          <option value="all">All Company Data (Live)</option>
          <option value="crm">Sales CRM Focus</option>
          <option value="bookings">Discovery Calls Focus</option>
          <option value="recruitment">Recruitment Focus</option>
          <option value="tasks">Tasks &amp; Follow-ups</option>
        </select>

        <div className="hz-ag-source-checks">
          {capabilities.slice(0, 5).map((cap) => (
            <span
              key={cap.id}
              className={`hz-ag-source-check ${cap.authorized ? "is-on" : "is-off"}`}
            >
              <Check size={11} />
              <span>{cap.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 6. Real Pending Approvals Queue */}
      <div className="hz-ag-ctrl-block hz-ag-approvals-block">
        <div className="hz-ag-ctrl-label-row">
          <span className="hz-ag-ctrl-label" style={{ margin: 0 }}>
            <ShieldCheck size={13} color="#A78BFA" />
            <span>Pending Approvals</span>
          </span>
          <span className="hz-ag-count-badge">{pendingApprovals.length}</span>
        </div>

        {pendingApprovals.length > 0 ? (
          <div className="hz-ag-approval-mini-list">
            {pendingApprovals.slice(0, 3).map((item) => (
              <button
                key={item.action.id}
                type="button"
                className="hz-ag-approval-mini-card"
                onClick={() => onOpenApproval(item.conversationId)}
              >
                <div style={{ minWidth: 0 }}>
                  <strong>{item.action.title}</strong>
                  <small>{item.conversationTitle}</small>
                </div>
                <ChevronRight size={13} color="#7C8BB0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="hz-ag-empty-note">No actions awaiting approval.</p>
        )}
      </div>

      {/* 7. Recent Conversations Switcher */}
      <div className="hz-ag-ctrl-block hz-ag-history-block">
        <div className="hz-ag-ctrl-label-row">
          <span className="hz-ag-ctrl-label" style={{ margin: 0 }}>
            <History size={13} color="#818CF8" />
            <span>Recent Threads</span>
          </span>
          <span className="hz-ag-muted-count">{conversations.length}</span>
        </div>

        <div className="hz-ag-history-list">
          {conversations.length > 0 ? (
            conversations.slice(0, 8).map((conv) => (
              <button
                key={conv.id}
                type="button"
                className={`hz-ag-history-item ${activeConvId === conv.id ? "is-active" : ""}`}
                onClick={() => onSelectConversation(conv)}
              >
                <strong>{conv.title}</strong>
                <span>{conv.messages.length} msgs</span>
              </button>
            ))
          ) : (
            <p className="hz-ag-empty-note">Start a conversation to build history.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
