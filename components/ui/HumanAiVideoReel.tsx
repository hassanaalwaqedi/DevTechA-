"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export type HumanAiVideoReelProps = {
  videoSrc: string;
  posterSrc: string;
  badge?: string;
  title?: string;
  subtitle?: string;
  telemetry?: string;
  telemetryLabel?: string;
  compact?: boolean;
  className?: string;
};

export function HumanAiVideoReel({
  videoSrc,
  posterSrc,
  badge = "HUMAN-AI VISION · 10s LOOP",
  title = "Optical Eye-Contact & Edge Perception",
  subtitle = "Real-time human-centered computer vision",
  telemetry,
  telemetryLabel = "EYE CONTACT LOCK · 99.4% · 11.4 ms",
  compact = false,
  className = "",
}: HumanAiVideoReelProps) {
  const resolvedTelemetry = telemetry || telemetryLabel;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration && Number.isFinite(video.duration)) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener("timeupdate", updateProgress);
    return () => {
      video.removeEventListener("timeupdate", updateProgress);
    };
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <div
      className={`dt-human-video-reel${compact ? " dt-human-video-compact" : ""}${
        className ? ` ${className}` : ""
      }`}
      dir="ltr"
    >
      <div className="dt-human-video-stage">
        <video
          ref={videoRef}
          className="dt-human-video-el"
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />

        {/* Optical HUD Corner Brackets & Eye-Contact Reticle Overlay */}
        <svg
          className="dt-human-video-hud"
          viewBox="0 0 480 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Corner viewfinder brackets */}
          <path
            d="M18 36V18H36M462 36V18H444M18 244V262H36M462 244V262H444"
            stroke="rgba(165, 228, 255, 0.72)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Subtle optical eye-tracking focus ring */}
          <circle
            cx="240"
            cy="126"
            r="52"
            stroke="rgba(92, 225, 255, 0.42)"
            strokeWidth="1.2"
            strokeDasharray="5 4"
          />
          <circle
            cx="240"
            cy="126"
            r="68"
            stroke="rgba(135, 59, 255, 0.32)"
            strokeWidth="1"
          />
          <path
            d="M182 126H194M286 126H298M240 68V80M240 172V184"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>

        {/* Top HUD Bar */}
        <div className="dt-human-video-topbar">
          <span className="dt-human-video-badge">
            <i className="dt-human-video-dot" aria-hidden="true" />
            <span>{badge}</span>
          </span>

          <button
            type="button"
            className="dt-human-video-control"
            onClick={togglePlay}
            aria-label={playing ? "Pause 10-second vision video" : "Play 10-second vision video"}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            <span>00:10</span>
          </button>
        </div>

        {/* Bottom Glass Telemetry & 10s Progress Bar */}
        <div className="dt-human-video-bottombar">
          <div className="dt-human-video-meta">
            <div className="dt-human-video-titles">
              <strong>{title}</strong>
              <span>{subtitle}</span>
            </div>
            <span className="dt-human-video-telemetry">{resolvedTelemetry}</span>
          </div>
          <div className="dt-human-video-progress" aria-hidden="true">
            <span style={{ width: `${Math.max(8, Math.min(100, progress))}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

