"use client";

import {
  AudioLines,
  Mic,
  MicOff,
  Plus,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { VoiceState } from "@/components/agent/types";

const WAVE_HEIGHTS = [
  6, 10, 8, 14, 11, 18, 12, 22, 16, 26, 20, 28, 18, 24, 14, 20, 11, 15, 9, 12, 7,
];

export function VoiceComposer({
  input,
  locale,
  loading,
  error,
  voiceState,
  voiceTranscript,
  voiceTtsEnabled,
  suggestions,
  onInputChange,
  onSend,
  onNewChat,
  onToggleVoice,
  onStopVoice,
  onToggleTts,
  onSelectSuggestion,
}: {
  input: string;
  locale: "en" | "ar";
  loading: boolean;
  error: string;
  voiceState: VoiceState;
  voiceTranscript: string;
  voiceTtsEnabled: boolean;
  suggestions: readonly string[];
  onInputChange: (val: string) => void;
  onSend: (text: string) => void;
  onNewChat: () => void;
  onToggleVoice: () => void;
  onStopVoice: () => void;
  onToggleTts: () => void;
  onSelectSuggestion: (prompt: string) => void;
}) {
  return (
    <div className="hz-ag-composer-dock">
      {error ? (
        <p className="hz-alert-error" style={{ margin: "0 0 10px" }}>
          {error}
        </p>
      ) : null}

      {/* Suggested Follow-ups Bar */}
      {suggestions.length > 0 ? (
        <div className="hz-ag-suggestions" dir={locale === "ar" ? "rtl" : "ltr"}>
          <span className="hz-ag-suggestions-label">
            <Sparkles size={12} color="#A78BFA" />
            <span>{locale === "ar" ? "متابعات مقترحة" : "Suggested Follow-ups"}</span>
          </span>
          <div className="hz-ag-suggestions-list">
            {suggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="hz-ag-suggestion-chip"
                disabled={loading}
                onClick={() => onSelectSuggestion(prompt)}
              >
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Main Rounded Input Capsule */}
      <form
        className={`hz-ag-input-shell ${voiceState === "listening" ? "is-listening" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          onSend(input);
        }}
      >
        <button
          type="button"
          className="hz-ag-input-icon-btn"
          onClick={onNewChat}
          title={locale === "ar" ? "محادثة جديدة" : "Start a new conversation"}
          aria-label="Start a new conversation"
        >
          <Plus size={16} />
        </button>

        <input
          value={input}
          dir={locale === "ar" ? "rtl" : "ltr"}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={
            locale === "ar"
              ? "اسأل عن المبيعات، الحجوزات، المتقدمين، أو تحدث مع HIRZEXA..."
              : "Ask a follow-up, or speak with HIRZEXA..."
          }
          aria-label="Message HIRZEXA Intelligence"
        />

        <button
          type="button"
          className="hz-ag-input-icon-btn"
          onClick={onToggleTts}
          title={voiceTtsEnabled ? "Mute spoken replies" : "Enable spoken replies"}
          aria-label={voiceTtsEnabled ? "Mute spoken replies" : "Enable spoken replies"}
        >
          {voiceTtsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        {input.trim().length > 0 ? (
          <button
            type="submit"
            className="hz-ag-action-orb"
            disabled={loading}
            aria-label="Send message"
            title="Send message"
          >
            <Send size={15} />
          </button>
        ) : (
          <button
            type="button"
            className={`hz-ag-action-orb ${voiceState === "listening" ? "is-recording" : ""}`}
            onClick={onToggleVoice}
            aria-label={voiceState === "listening" ? "Stop listening" : "Speak with HIRZEXA"}
            title={
              voiceState === "listening"
                ? "Stop voice capture"
                : "Click to activate microphone (explicit activation)"
            }
          >
            {voiceState === "listening" ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </form>

      {/* Active Voice Status Bar — ONLY rendered when microphone / voice playback is truly active */}
      {voiceState !== "idle" ? (
        <div className="hz-ag-voice-bar" role="status" aria-live="polite">
          <div className="hz-ag-voice-state">
            <span
              className={`hz-ag-voice-dot ${
                voiceState === "listening"
                  ? "is-live"
                  : voiceState === "speaking"
                  ? "is-speaking"
                  : "is-processing"
              }`}
            />
            <strong>
              {voiceState === "listening"
                ? locale === "ar"
                  ? "جاري الاستماع..."
                  : "Listening..."
                : voiceState === "processing"
                ? locale === "ar"
                  ? "جاري تحليل الطلب الصوتي..."
                  : "Processing voice query..."
                : locale === "ar"
                ? "جاري قراءة الرد..."
                : "Speaking response..."}
            </strong>
            {voiceState === "listening" && voiceTranscript ? (
              <span className="hz-ag-voice-transcript">&ldquo;{voiceTranscript}&rdquo;</span>
            ) : null}
          </div>

          {voiceState === "listening" ? (
            <div className="hz-ag-waveform" aria-hidden="true">
              {WAVE_HEIGHTS.map((h, i) => (
                <span
                  key={i}
                  className="hz-ag-wave-bar"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${(i % 7) * 90}ms`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="hz-ag-voice-icon-mid" aria-hidden="true">
              <AudioLines size={16} color="#818CF8" />
            </div>
          )}

          <button
            type="button"
            className="hz-ag-voice-stop"
            onClick={onStopVoice}
          >
            <span>{locale === "ar" ? "إيقاف" : "Tap to stop"}</span>
            <Square size={11} fill="currentColor" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
