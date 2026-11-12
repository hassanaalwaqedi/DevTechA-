"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Locale } from "@/lib/locale";
import { AEGIS_VIDEOS, getAegisCopy } from "@/lib/aegis-data";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function VideoShowcase({ locale }: { locale: Locale }) {
  const t = getAegisCopy(locale);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideo = AEGIS_VIDEOS[selectedIndex] ?? AEGIS_VIDEOS[0];

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = isMuted;
    el.volume = volume;
  }, [isMuted, volume, selectedIndex]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    setShowTranscript(false);
  }, [selectedIndex]);

  async function togglePlayPause() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.muted = isMuted;
      el.volume = volume;
      try {
        await el.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }

  function handleSeek(nextTime: number) {
    const el = videoRef.current;
    if (!el || !Number.isFinite(nextTime)) return;
    el.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function toggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  }

  function handleVolumeChange(nextVolume: number) {
    const clamped = Math.max(0, Math.min(1, nextVolume));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
  }

  async function handleFullscreen() {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      // Mobile browsers handle native fullscreen inside player controls
    }
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section
      className="aegis-band aegis-band-dark"
      id="video-showcase"
      aria-labelledby="aegis-video-heading"
    >
      <div className="container">
        <div className="aegis-section-head">
          <div>
            <span className="aegis-eyebrow aegis-eyebrow-light">
              {t.videoSectionEyebrow}
            </span>
            <h2 id="aegis-video-heading" className="aegis-heading aegis-heading-light">
              {t.videoSectionTitle}
            </h2>
          </div>
          <p className="aegis-subcopy aegis-subcopy-light">
            {t.videoSectionSubtitle}
          </p>
        </div>

        <div className="aegis-video-shell">
          <div className="aegis-player-card">
            <div className="aegis-player-stage" dir="ltr">
              <video
                key={activeVideo.id}
                ref={videoRef}
                className="aegis-player-video"
                src={activeVideo.src}
                poster={activeVideo.poster}
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (Number.isFinite(dur)) setDuration(dur);
                }}
                onTimeUpdate={(e) => {
                  setCurrentTime(e.currentTarget.currentTime);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlayPause}
                aria-label={activeVideo.title[locale]}
              />

              {!isPlaying ? (
                <button
                  type="button"
                  className="aegis-player-overlay-play"
                  onClick={togglePlayPause}
                  aria-label={`${t.play}: ${activeVideo.title[locale]}`}
                >
                  <span className="aegis-player-play-circle">
                    <Play size={22} />
                  </span>
                  <span>
                    {activeVideo.hasSpokenAudio ? t.play : activeVideo.durationLabel}
                  </span>
                </button>
              ) : null}
            </div>

            {/* Accessible Custom Transport + Original Audio Bar */}
            <div className="aegis-player-controls" dir="ltr">
              <div className="aegis-seek-row">
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  aria-label={locale === "ar" ? "شريط التمرير" : "Video seek bar"}
                  className="aegis-seek-slider"
                  style={{
                    background: `linear-gradient(to right, #35BEFF 0%, #35BEFF ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />
              </div>

              <div className="aegis-transport-row">
                <div className="aegis-transport-left">
                  <button
                    type="button"
                    className="aegis-ctrl-btn aegis-ctrl-btn-primary"
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? t.pause : t.play}
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                    <span>{isPlaying ? t.pause : t.play}</span>
                  </button>

                  <span className="aegis-time-readout">
                    {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : activeVideo.durationLabel.split(" · ")[0]}
                  </span>
                </div>

                <div className="aegis-transport-right">
                  <button
                    type="button"
                    className="aegis-ctrl-icon-btn"
                    onClick={toggleMute}
                    aria-label={isMuted ? t.unmute : t.mute}
                    title={isMuted ? t.unmute : t.mute}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    aria-label={locale === "ar" ? "مستوى الصوت" : "Audio volume"}
                    className="aegis-volume-slider"
                  />

                  <button
                    type="button"
                    className="aegis-ctrl-icon-btn"
                    onClick={handleFullscreen}
                    aria-label={t.fullscreen}
                    title={t.fullscreen}
                  >
                    <Maximize2 size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="aegis-player-meta">
              <div className="aegis-player-meta-head">
                <div>
                  <span className="aegis-video-badge">{activeVideo.badge[locale]}</span>
                  <h3>{activeVideo.title[locale]}</h3>
                </div>
                <span className="aegis-audio-pill">
                  <Volume2 size={14} aria-hidden="true" />
                  <span>{activeVideo.audioNote[locale]}</span>
                </span>
              </div>
              <p>{activeVideo.caption[locale]}</p>

              {activeVideo.transcript ? (
                <div className="aegis-transcript-box">
                  <button
                    type="button"
                    className="aegis-transcript-toggle"
                    aria-expanded={showTranscript}
                    onClick={() => setShowTranscript((prev) => !prev)}
                  >
                    <FileText size={15} aria-hidden="true" />
                    <span>{showTranscript ? t.hideTranscript : t.showTranscript}</span>
                  </button>

                  {showTranscript ? (
                    <div className="aegis-transcript-list">
                      {activeVideo.transcript[locale].map((entry, idx) => (
                        <div key={idx} className="aegis-transcript-item">
                          <strong>{entry.speaker}</strong>
                          <p>{entry.line}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <aside
            className="aegis-video-playlist"
            aria-label={locale === "ar" ? "قائمة مقاطع الفيديو" : "Video evidence playlist"}
          >
            {AEGIS_VIDEOS.map((item, idx) => {
              const active = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  aria-current={active ? "true" : undefined}
                  className={`aegis-playlist-card${active ? " is-active" : ""}`}
                >
                  <div className="aegis-playlist-top">
                    <span>{String(idx + 1).padStart(2, "0")}</span>
                    <span>{item.durationLabel}</span>
                  </div>
                  <strong>{item.title[locale]}</strong>
                  <p>{item.audioNote[locale]}</p>
                </button>
              );
            })}
          </aside>
        </div>
      </div>
    </section>
  );
}

