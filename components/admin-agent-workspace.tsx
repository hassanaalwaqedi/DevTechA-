"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Languages,
  Plus,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  AgentLeftControlPanel,
  type PendingApprovalEntry,
} from "@/components/agent/AgentLeftControlPanel";
import { AIResponseCard } from "@/components/agent/AIResponseCard";
import { AuthorizedCapabilitiesPanel } from "@/components/agent/AuthorizedCapabilitiesPanel";
import type {
  AgentToolInspectorItem,
  ContextSourceFilter,
  ConversationMode,
  DomainCapability,
  VoiceState,
} from "@/components/agent/types";
import { VoiceComposer } from "@/components/agent/VoiceComposer";
import type {
  AgentConversationRecord,
  AgentMessageRecord,
  AgentPageContext,
  AgentPendingAction,
} from "@/lib/intelligence/types";

export type { AgentToolInspectorItem };

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function deriveCapabilities(tools: AgentToolInspectorItem[]): DomainCapability[] {
  const byModule = (mods: string[]) => tools.filter((t) => mods.includes(t.module));
  const crmTools = byModule(["crm"]);
  const bookingTools = byModule(["bookings"]);
  const recruitmentTools = byModule(["recruitment", "jobs"]);
  const analyticsTools = byModule(["dashboard", "audit"]);
  const commsTools = tools.filter(
    (t) => t.name.toLowerCase().includes("email") || t.name.toLowerCase().includes("draft")
  );
  const taskTools = byModule(["tasks"]);

  return [
    {
      id: "crm",
      label: "CRM",
      description: "Retrieve and update leads, contacts, opportunities, and pipeline stages.",
      icon: "crm",
      authorized: crmTools.some((t) => t.allowed),
      toolCount: crmTools.length,
    },
    {
      id: "bookings",
      label: "Bookings",
      description: "View discovery calls, scheduled slots, and upcoming client meetings.",
      icon: "bookings",
      authorized: bookingTools.some((t) => t.allowed),
      toolCount: bookingTools.length,
    },
    {
      id: "recruitment",
      label: "Recruitment",
      description: "Access job applications, candidate profiles, and open hiring roles.",
      icon: "recruitment",
      authorized: recruitmentTools.some((t) => t.allowed),
      toolCount: recruitmentTools.length,
    },
    {
      id: "analytics",
      label: "Analytics",
      description: "Track authorized operational briefings and recent scoped activity.",
      icon: "analytics",
      authorized: analyticsTools.some((t) => t.allowed),
      toolCount: analyticsTools.length,
    },
    {
      id: "communications",
      label: "Communications",
      description: "Draft client emails, proposals, and updates (always approval-gated).",
      icon: "communications",
      authorized: commsTools.some((t) => t.allowed),
      requiresApproval: true,
      toolCount: commsTools.length,
    },
    {
      id: "tasks",
      label: "Tasks",
      description: "Create and manage operational follow-ups and assigned action items.",
      icon: "tasks",
      authorized: taskTools.some((t) => t.allowed),
      toolCount: taskTools.length,
    },
  ];
}

function buildPermissionAwarePrompts(
  capabilities: DomainCapability[],
  locale: "en" | "ar",
  scope?: string
): { starter: string[]; followup: string[] } {
  const isAllowed = (id: DomainCapability["id"]) =>
    capabilities.some((c) => c.id === id && c.authorized);
  const ar = locale === "ar";
  const scoped = scope === "assigned" || scope === "own";

  const starter: string[] = [];
  const followup: string[] = [];

  starter.push(
    ar
      ? scoped
        ? "صباح الخير، ما أبرز أولوياتي ومستجدات عملي اليوم؟"
        : "صباح الخير، ماذا حدث في HIRZEXA ضمن نطاق صلاحياتي؟"
      : scoped
      ? "Good morning. What requires my attention today?"
      : "Good morning. What happened across HIRZEXA within my authorized scope?"
  );

  if (isAllowed("crm")) {
    starter.push(
      ar
        ? scoped
          ? "ما المستجدات لدى عملائي المسندين اليوم؟"
          : "لخّص خط المبيعات النشط والعملاء الذين يحتاجون متابعة."
        : scoped
        ? "What's happening with my assigned clients today?"
        : "Which clients in my authorized pipeline have not received a follow-up?"
    );
    followup.push(ar ? "اعرض أهم الفرص المفتوحة" : "Show top open leads");
  }

  if (isAllowed("bookings")) {
    starter.push(
      ar
        ? scoped
          ? "اعرض جلسات الاكتشاف المجدولة المسندة إليّ."
          : "اعرض أحدث جلسات الاكتشاف المحجوزة."
        : scoped
        ? "Show my upcoming discovery calls."
        : "Show me the latest discovery calls."
    );
  }

  if (isAllowed("recruitment")) {
    starter.push(
      ar
        ? "لخّص أحدث طلبات التوظيف وأبرز المرشحين."
        : "Show me the latest job applications and summarize top candidates."
    );
    followup.push(ar ? "لخّص طلبات التوظيف المعلقة" : "Summarize pending applications");
  }

  if (isAllowed("tasks")) {
    starter.push(
      ar
        ? "ما المهام المفتوحة والمتأخرة لدي حالياً؟"
        : "What open or overdue tasks are on my queue?"
    );
    followup.push(ar ? "ما المهام المتأخرة؟" : "What tasks are overdue?");
  }

  if (isAllowed("communications")) {
    followup.push(ar ? "اكتب مسودة متابعة لعميل" : "Draft a client follow-up email");
  }

  if (starter.length < 3) {
    starter.push(
      ar
        ? "اعرض صلاحياتي الفعالة والوحدات المصرح لي بها."
        : "Summarize my effective role permissions and authorized modules."
    );
  }
  if (followup.length < 2) {
    followup.push(
      ar ? "اعرض آخر التحديثات المصرح بها" : "Show recent authorized activity"
    );
  }

  return { starter: starter.slice(0, 4), followup: followup.slice(0, 4) };
}

export function AdminAgentWorkspace({
  initialConversations = [],
  pageContext,
  initialPrompt,
  compact = false,
  actorInfo,
  canManageTeam = false,
  tools = [],
  onClose,
}: {
  initialConversations?: AgentConversationRecord[];
  pageContext?: AgentPageContext;
  initialPrompt?: string;
  compact?: boolean;
  actorInfo?: { fullName: string; roleLabel: string; scope: string };
  canManageTeam?: boolean;
  tools?: AgentToolInspectorItem[];
  onClose?: () => void;
}) {
  const [conversations, setConversations] =
    useState<AgentConversationRecord[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(
    initialConversations[0]?.id
  );
  const [messages, setMessages] = useState<AgentMessageRecord[]>(
    initialConversations[0]?.messages || []
  );
  const [input, setInput] = useState("");
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [mode, setMode] = useState<ConversationMode>("executive");
  const [contextSource, setContextSource] = useState<ContextSourceFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceTtsEnabled, setVoiceTtsEnabled] = useState(true);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const autoRanPromptRef = useRef<string>("");

  const capabilities = useMemo(() => deriveCapabilities(tools), [tools]);
  const authorizedDomainsCount = useMemo(
    () => capabilities.filter((c) => c.authorized).length,
    [capabilities]
  );

  // Collect real pending approvals across all actor conversations
  const pendingApprovals = useMemo<PendingApprovalEntry[]>(() => {
    const entries: PendingApprovalEntry[] = [];
    const seen = new Set<string>();
    const allConvs = conversations.map((c) =>
      c.id === activeConvId ? { ...c, messages } : c
    );
    for (const conv of allConvs) {
      for (const msg of conv.messages) {
        if (msg.pendingAction && msg.pendingAction.status === "pending") {
          if (!seen.has(msg.pendingAction.id)) {
            seen.add(msg.pendingAction.id);
            entries.push({
              conversationId: conv.id,
              conversationTitle: conv.title,
              action: msg.pendingAction,
            });
          }
        }
      }
    }
    return entries;
  }, [activeConvId, conversations, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {}
      try {
        abortRef.current?.abort();
      } catch {}
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopAllAudioAndRequests = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {}
    try {
      abortRef.current?.abort();
    } catch {}
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setLoading(false);
    setVoiceState("idle");
    setVoiceTranscript("");
  }, []);

  const speakText = useCallback(
    (text: string, lang: "en" | "ar") => {
      if (!voiceTtsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const plain = text.replace(/[*`#]/g, "").slice(0, 650);
        const utter = new SpeechSynthesisUtterance(plain);
        utter.lang = lang === "ar" ? "ar-SA" : "en-US";
        utter.rate = 1.02;
        utter.onstart = () => setVoiceState("speaking");
        utter.onend = () => setVoiceState("idle");
        utter.onerror = () => setVoiceState("idle");
        window.speechSynthesis.speak(utter);
      } catch {
        setVoiceState("idle");
      }
    },
    [voiceTtsEnabled]
  );

  const effectivePageContext = useMemo<AgentPageContext>(() => {
    if (pageContext?.entityId) return pageContext;
    const baseRoute = pageContext?.route || "/admin/agent";
    if (contextSource === "crm") {
      return { route: baseRoute, entityType: "lead", entityLabel: "Sales CRM Focus" };
    }
    if (contextSource === "bookings") {
      return { route: baseRoute, entityType: "booking", entityLabel: "Discovery Calls Focus" };
    }
    if (contextSource === "recruitment") {
      return { route: baseRoute, entityType: "application", entityLabel: "Recruitment Focus" };
    }
    return pageContext || { route: baseRoute, entityType: "dashboard" };
  }, [contextSource, pageContext]);

  const sendMessage = useCallback(
    async (textToSend: string, fromVoice = false) => {
      const cleaned = textToSend.trim();
      if (!cleaned || loading) return;

      setError("");
      setLoading(true);
      setInput("");
      setVoiceTranscript("");
      if (fromVoice) setVoiceState("processing");

      const optimisticUser: AgentMessageRecord = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: cleaned,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/admin/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message: cleaned,
            conversationId: activeConvId,
            locale,
            inputChannel: fromVoice ? "voice" : "text",
            pageContext: effectivePageContext,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to reach HIRZEXA Intelligence.");
        }
        const conv = data.conversation as AgentConversationRecord;
        setActiveConvId(conv.id);
        setMessages(conv.messages);
        setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);

        if (fromVoice && data.reply?.content) {
          speakText(
            data.reply.content,
            /[\u0600-\u06FF]/.test(data.reply.content) ? "ar" : locale
          );
        } else {
          setVoiceState("idle");
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          setVoiceState("idle");
          return;
        }
        setError(err instanceof Error ? err.message : "Agent request failed.");
        setVoiceState("idle");
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [activeConvId, effectivePageContext, loading, locale, speakText]
  );

  useEffect(() => {
    if (initialPrompt && autoRanPromptRef.current !== initialPrompt) {
      autoRanPromptRef.current = initialPrompt;
      void sendMessage(initialPrompt, false);
    }
  }, [initialPrompt, sendMessage]);

  const startVoiceCapture = () => {
    if (typeof window === "undefined") return;
    const SpeechCtor =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognitionLike;
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).webkitSpeechRecognition;

    if (!SpeechCtor) {
      setError(
        locale === "ar"
          ? "التعرف الصوتي غير مدعوم في هذا المتصفح. يمكنك الكتابة مباشرة أو استخدام Chrome/Edge."
          : "Speech recognition is not supported in this browser. Use Chrome/Edge or type directly."
      );
      return;
    }

    if (voiceState === "listening") {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setVoiceState("idle");
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setError("");
    const recognition = new SpeechCtor();
    recognition.lang = locale === "ar" ? "ar-SA" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = "";
    recognition.onstart = () => {
      setVoiceState("listening");
      setVoiceTranscript("");
    };
    recognition.onresult = (event) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0]?.transcript || "";
      }
      finalText = combined.trim();
      setVoiceTranscript(finalText);
    };
    recognition.onerror = (ev) => {
      setVoiceState("idle");
      if (ev.error === "not-allowed") {
        setError(
          locale === "ar"
            ? "تم رفض إذن الميكروفون. يرجى السماح بالوصول للميكروفون من إعدادات المتصفح."
            : "Microphone permission was denied. Allow microphone access in your browser to use voice mode."
        );
      }
    };
    recognition.onend = () => {
      if (finalText) {
        void sendMessage(finalText, true);
      } else {
        setVoiceState("idle");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setVoiceState("idle");
    }
  };

  const handleConfirmAction = async (
    action: AgentPendingAction,
    decision: "approve" | "reject"
  ) => {
    setConfirmingId(action.id);
    setError("");
    try {
      const res = await fetch("/api/admin/agent/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id, decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Confirmation failed.");
      }

      const nextMessages: AgentMessageRecord[] = [
        ...messages.map((m) =>
          m.pendingAction?.id === action.id
            ? {
                ...m,
                pendingAction:
                  data.action || {
                    ...action,
                    status: decision === "approve" ? "executed" : "rejected",
                  },
              }
            : m
        ),
        {
          id: `confirm-${Date.now()}`,
          role: "assistant",
          content: data.message,
          createdAt: new Date().toISOString(),
        },
      ];
      setMessages(nextMessages);
      if (activeConvId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, messages: nextMessages } : c))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process confirmation.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(undefined);
    setMessages([]);
    setError("");
    setMobileLeftOpen(false);
  };

  const handleSelectConversation = (conv: AgentConversationRecord) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    setLocale(conv.locale === "ar" ? "ar" : "en");
    setMobileLeftOpen(false);
  };

  const handleOpenApproval = (conversationId: string) => {
    const target = conversations.find((c) => c.id === conversationId);
    if (target) {
      setActiveConvId(target.id);
      setMessages(target.messages);
    }
    setMobileLeftOpen(false);
  };

  const rolePrompts = useMemo(
    () => buildPermissionAwarePrompts(capabilities, locale, actorInfo?.scope),
    [actorInfo?.scope, capabilities, locale]
  );

  const activeSuggestions =
    messages.length === 0
      ? rolePrompts.starter.slice(0, compact ? 3 : 4)
      : rolePrompts.followup.slice(0, compact ? 2 : 3);

  const threadArea = (
    <div className="hz-ag-center-panel">
      {/* Compact Drawer Header (only rendered when used inside Ask HIRZEXA SlideOver) */}
      {compact ? (
        <div className="hz-ag-compact-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Sparkles size={16} color="#818CF8" />
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 13.5, color: "#F8FAFC" }}>
                HIRZEXA Intelligence
              </strong>
              <span style={{ fontSize: 11.5, color: "#9AA7C7" }}>
                {pageContext?.entityLabel
                  ? `Context: ${pageContext.entityLabel}`
                  : "Live authorized company records"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className="hz-btn hz-btn-secondary hz-btn-sm"
              onClick={() => setLocale((l) => (l === "en" ? "ar" : "en"))}
              title="Switch language"
            >
              <Languages size={13} />
              {locale === "en" ? "EN" : "العربية"}
            </button>
            <button
              type="button"
              className="hz-icon-btn"
              style={{ width: 29, height: 29 }}
              onClick={() => setVoiceTtsEnabled((v) => !v)}
              aria-label="Toggle voice output"
            >
              {voiceTtsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button
              type="button"
              className="hz-btn hz-btn-secondary hz-btn-sm"
              onClick={handleNewChat}
            >
              <Plus size={13} /> New
            </button>
            {onClose ? (
              <button
                type="button"
                className="hz-icon-btn"
                style={{ width: 29, height: 29 }}
                onClick={onClose}
                aria-label="Close Agent panel"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Conversation Scroll Stream */}
      <div className="hz-ag-stream">
        <div className="hz-ag-stream-inner">
          {messages.length > 0 ? (
            <div className="hz-ag-day-divider">
              <span>Today</span>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="hz-ag-empty">
              <div className="hz-ag-empty-orb" aria-hidden="true">
                <Sparkles size={22} />
              </div>
              <h2>
                {locale === "ar"
                  ? "مركز الذكاء التشغيلي لـ HIRZEXA"
                  : "What would you like to inspect or operate today?"}
              </h2>
              <p>
                {locale === "ar"
                  ? "استعلم عن بيانات Supabase الحية المصرح بها لدورك، راجع الحجوزات والمرشحين، أو نفّذ إجراءات معتمدة عبر الصوت أو النص."
                  : "Query live authorized Supabase records across CRM, bookings, recruitment, and tasks. Every response cites real records, and write actions always require your explicit approval."}
              </p>

              <div className="hz-ag-starter-grid" dir={locale === "ar" ? "rtl" : "ltr"}>
                {rolePrompts.starter.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="hz-ag-starter-card"
                    onClick={() => void sendMessage(prompt, false)}
                  >
                    <Sparkles size={13} color="#818CF8" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((msg) => (
            <AIResponseCard
              key={msg.id}
              message={msg}
              confirmingId={confirmingId}
              onConfirmAction={(action, decision) => void handleConfirmAction(action, decision)}
              onNavigate={onClose}
            />
          ))}

          {loading ? (
            <div className="hz-ag-turn is-assistant">
              <div className="hz-ag-avatar is-ai" aria-hidden="true">
                <Sparkles size={15} color="#A5B4FC" />
              </div>
              <div className="hz-ag-loading-card">
                <div className="hz-ag-loading-row">
                  <span className="hz-ag-loading-dot" />
                  <span>
                    {locale === "ar"
                      ? "جارٍ الاستعلام عن السجلات المصرح بها وتجميع المصادر الموثقة…"
                      : "Querying authorized live records and verifying source citations…"}
                  </span>
                </div>
                <div className="hz-ag-skeleton-line" style={{ width: "86%" }} />
                <div className="hz-ag-skeleton-line" style={{ width: "64%" }} />
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom Voice & Follow-up Composer */}
      <VoiceComposer
        input={input}
        locale={locale}
        loading={loading}
        error={error}
        voiceState={voiceState}
        voiceTranscript={voiceTranscript}
        voiceTtsEnabled={voiceTtsEnabled}
        suggestions={messages.length > 0 ? activeSuggestions : []}
        onInputChange={setInput}
        onSend={(text) => void sendMessage(text, false)}
        onNewChat={handleNewChat}
        onToggleVoice={startVoiceCapture}
        onStopVoice={stopAllAudioAndRequests}
        onToggleTts={() => setVoiceTtsEnabled((v) => !v)}
        onSelectSuggestion={(prompt) => void sendMessage(prompt, false)}
      />
    </div>
  );

  if (compact) {
    return <div className="hz-ag-compact-shell">{threadArea}</div>;
  }

  return (
    <div className="hz-ag-root">
      {/* Sweeping Cosmic Horizon Atmosphere (Unified with Command Center) */}
      <div className="hz-cc-atmosphere" aria-hidden="true">
        <div className="hz-cc-arc-glow" />
      </div>

      <AgentHeader
        mobileLeftOpen={mobileLeftOpen}
        mobileRightOpen={mobileRightOpen}
        authorizedDomainsCount={authorizedDomainsCount}
        onToggleLeft={() => {
          setMobileLeftOpen((v) => !v);
          setMobileRightOpen(false);
        }}
        onToggleRight={() => {
          setMobileRightOpen((v) => !v);
          setMobileLeftOpen(false);
        }}
      />

      {/* Responsive backdrop when drawer is open on smaller screens */}
      {mobileLeftOpen || mobileRightOpen ? (
        <div
          className="hz-ag-mobile-backdrop"
          onClick={() => {
            setMobileLeftOpen(false);
            setMobileRightOpen(false);
          }}
        />
      ) : null}

      <div className="hz-ag-workspace-grid">
        <div className={`hz-ag-left-slot ${mobileLeftOpen ? "is-open" : ""}`}>
          <AgentLeftControlPanel
            mode={mode}
            locale={locale}
            voiceTtsEnabled={voiceTtsEnabled}
            contextSource={contextSource}
            capabilities={capabilities}
            pendingApprovals={pendingApprovals}
            conversations={conversations}
            activeConvId={activeConvId}
            onModeChange={setMode}
            onLocaleChange={setLocale}
            onToggleTts={setVoiceTtsEnabled}
            onContextSourceChange={setContextSource}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            onOpenApproval={handleOpenApproval}
          />
        </div>

        {threadArea}

        <div className={`hz-ag-right-slot ${mobileRightOpen ? "is-open" : ""}`}>
          <AuthorizedCapabilitiesPanel
            capabilities={capabilities}
            tools={tools}
            actorInfo={actorInfo}
            canManageTeam={canManageTeam}
            onCloseMobile={() => setMobileRightOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
