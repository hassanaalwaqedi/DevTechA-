"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  FileCheck2,
  Pause,
  Play,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Locale } from "@/lib/locale";
import {
  RECOGNITION_EVIDENCE,
  getRecognitionCopy,
  type RecognitionEvidenceItem,
} from "@/lib/awards";

export function RecognitionGallery({ locale }: { locale: Locale }) {
  const t = getRecognitionCopy(locale);
  const ar = locale === "ar";
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [certificateExpanded, setCertificateExpanded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const featuredItem = RECOGNITION_EVIDENCE[0];
  const presentationItem = RECOGNITION_EVIDENCE[1];
  const certificateItem = RECOGNITION_EVIDENCE[2];
  const videoItem = RECOGNITION_EVIDENCE[3];

  const openItem = useCallback((index: number, trigger?: HTMLElement | null) => {
    lastTriggerRef.current = trigger || (document.activeElement as HTMLElement | null);
    setZoomed(false);
    setActiveIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
    setZoomed(false);
    requestAnimationFrame(() => {
      lastTriggerRef.current?.focus();
    });
  }, []);

  const stepLightbox = useCallback(
    (delta: number) => {
      setActiveIndex((prev) => {
        if (prev === null) return null;
        const count = RECOGNITION_EVIDENCE.length;
        return (prev + delta + count) % count;
      });
      setZoomed(false);
    },
    []
  );

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepLightbox(ar ? -1 : 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepLightbox(ar ? 1 : -1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, ar, closeLightbox, stepLightbox]);

  function toggleInlineVideo() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setVideoPlaying(true);
    } else {
      el.pause();
      setVideoPlaying(false);
    }
  }

  const activeItem: RecognitionEvidenceItem | null =
    activeIndex !== null ? RECOGNITION_EVIDENCE[activeIndex] ?? null : null;

  return (
    <div
      ref={sectionRef}
      id="recognition-evidence"
      className={`dt-rec-evidence${revealed ? " is-revealed" : ""}`}
    >
      <div className="dt-rec-evidence-head">
        <div>
          <span className="dt-rec-eyebrow">{t.galleryEyebrow}</span>
          <h3 className="dt-rec-gallery-title">{t.galleryTitle}</h3>
        </div>
        <p className="dt-rec-gallery-subtitle">{t.gallerySubtitle}</p>
      </div>

      {/* Primary Documentary Pair: Wide Stage Hero + Portrait Presentation */}
      <div className="dt-rec-gallery-primary">
        <figure className="dt-rec-figure dt-rec-figure-featured">
          <button
            type="button"
            className="dt-rec-media-trigger"
            onClick={(e) => openItem(0, e.currentTarget)}
            aria-label={`${t.inspectAction}: ${featuredItem.title[locale]}`}
          >
            <div className="dt-rec-frame dt-rec-frame-wide">
              <Image
                src={featuredItem.src}
                alt={featuredItem.alt[locale]}
                width={featuredItem.width}
                height={featuredItem.height}
                sizes="(max-width: 980px) 100vw, 62vw"
                className="dt-rec-media-img"
                style={{ objectPosition: featuredItem.objectPosition || "center" }}
              />
              <span className="dt-rec-expand-pill" aria-hidden="true">
                <Expand size={14} />
                <span>{t.inspectAction}</span>
              </span>
            </div>
          </button>
          <figcaption className="dt-rec-caption">
            <span className="dt-rec-caption-index">{featuredItem.label[locale]}</span>
            <p>{featuredItem.caption[locale]}</p>
          </figcaption>
        </figure>

        <figure className="dt-rec-figure dt-rec-figure-supporting">
          <button
            type="button"
            className="dt-rec-media-trigger"
            onClick={(e) => openItem(1, e.currentTarget)}
            aria-label={`${t.inspectAction}: ${presentationItem.title[locale]}`}
          >
            <div className="dt-rec-frame dt-rec-frame-portrait">
              <Image
                src={presentationItem.src}
                alt={presentationItem.alt[locale]}
                width={presentationItem.width}
                height={presentationItem.height}
                sizes="(max-width: 980px) 100vw, 34vw"
                className="dt-rec-media-img"
                style={{
                  objectPosition: presentationItem.objectPosition || "center 14%",
                }}
              />
              <span className="dt-rec-expand-pill" aria-hidden="true">
                <Expand size={14} />
                <span>{t.inspectAction}</span>
              </span>
            </div>
          </button>
          <figcaption className="dt-rec-caption">
            <span className="dt-rec-caption-index">{presentationItem.label[locale]}</span>
            <p>{presentationItem.caption[locale]}</p>
          </figcaption>
        </figure>
      </div>

      {/* Secondary Documentary Row: Expandable Certificate View + Stage Video */}
      <div className="dt-rec-gallery-secondary">
        {/* Certificate & Award Inspection Module */}
        <article
          className={`dt-rec-certificate-panel${certificateExpanded ? " is-expanded" : ""}`}
        >
          <div className="dt-rec-panel-grid">
            <button
              type="button"
              className="dt-rec-cert-thumb-btn"
              onClick={(e) => openItem(2, e.currentTarget)}
              aria-label={`${t.inspectAction}: ${certificateItem.title[locale]}`}
            >
              <div className="dt-rec-frame dt-rec-frame-cert">
                <Image
                  src={certificateItem.src}
                  alt={certificateItem.alt[locale]}
                  width={certificateItem.width}
                  height={certificateItem.height}
                  sizes="(max-width: 980px) 100vw, 30vw"
                  className="dt-rec-media-img"
                />
                <span className="dt-rec-expand-pill" aria-hidden="true">
                  <ZoomIn size={14} />
                  <span>{t.inspectAction}</span>
                </span>
              </div>
            </button>

            <div className="dt-rec-cert-copy">
              <span className="dt-rec-caption-index">
                {certificateItem.label[locale]}
              </span>
              <h4>{certificateItem.title[locale]}</h4>
              <p>{certificateItem.caption[locale]}</p>
              <div className="dt-rec-cert-actions">
                <button
                  type="button"
                  className="dt-rec-action-btn"
                  aria-expanded={certificateExpanded}
                  onClick={() => setCertificateExpanded((prev) => !prev)}
                >
                  <FileCheck2 size={15} aria-hidden="true" />
                  <span>
                    {certificateExpanded
                      ? t.collapseCertificateAction
                      : t.expandCertificateAction}
                  </span>
                </button>
                <button
                  type="button"
                  className="dt-rec-action-link"
                  onClick={(e) => openItem(2, e.currentTarget)}
                >
                  {t.inspectAction}
                </button>
              </div>
            </div>
          </div>

          {certificateExpanded && certificateItem.certificateMeta ? (
            <div className="dt-rec-cert-drawer">
              <dl className="dt-rec-cert-meta-grid">
                {certificateItem.certificateMeta.map((row) => (
                  <div key={row.label.en} className="dt-rec-cert-meta-cell">
                    <dt>{row.label[locale]}</dt>
                    <dd>{row.value[locale]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </article>

        {/* Authentic Podium Presentation Footage */}
        <article className="dt-rec-video-panel">
          <div className="dt-rec-video-stage">
            <video
              ref={videoRef}
              className="dt-rec-video-el"
              src={videoItem.src}
              poster={videoItem.poster}
              playsInline
              preload="metadata"
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onEnded={() => setVideoPlaying(false)}
              aria-label={videoItem.alt[locale]}
            />
            <div className="dt-rec-video-controls">
              <button
                type="button"
                className="dt-rec-video-btn"
                onClick={toggleInlineVideo}
                aria-label={videoPlaying ? t.pauseVideoAction : t.playVideoAction}
              >
                {videoPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{videoPlaying ? t.pauseVideoAction : t.playVideoAction}</span>
              </button>
              <button
                type="button"
                className="dt-rec-video-btn dt-rec-video-btn-subtle"
                onClick={(e) => openItem(3, e.currentTarget)}
                aria-label={t.openFullscreenVideo}
              >
                <Expand size={14} />
              </button>
            </div>
          </div>
          <div className="dt-rec-caption">
            <span className="dt-rec-caption-index">{videoItem.label[locale]}</span>
            <p>{videoItem.caption[locale]}</p>
          </div>
        </article>
      </div>

      {/* Accessible Lightbox Modal */}
      {activeItem && activeIndex !== null ? (
        <div
          className="dt-rec-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title[locale]}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          <div className="dt-rec-lightbox-dialog">
            <header className="dt-rec-lightbox-bar">
              <div className="dt-rec-lightbox-meta">
                <span className="dt-rec-lightbox-count">
                  {String(activeIndex + 1).padStart(2, "0")} /{" "}
                  {String(RECOGNITION_EVIDENCE.length).padStart(2, "0")}
                </span>
                <strong>{activeItem.title[locale]}</strong>
              </div>
              <div className="dt-rec-lightbox-tools">
                {activeItem.kind !== "video" ? (
                  <button
                    type="button"
                    className="dt-rec-lightbox-icon-btn"
                    onClick={() => setZoomed((prev) => !prev)}
                    aria-label={zoomed ? t.zoomReset : t.zoomIn}
                    title={zoomed ? t.zoomReset : t.zoomIn}
                  >
                    {zoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="dt-rec-lightbox-icon-btn"
                  onClick={() => stepLightbox(-1)}
                  aria-label={t.lightboxPrevious}
                >
                  {ar ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                </button>
                <button
                  type="button"
                  className="dt-rec-lightbox-icon-btn"
                  onClick={() => stepLightbox(1)}
                  aria-label={t.lightboxNext}
                >
                  {ar ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
                </button>
                <button
                  type="button"
                  className="dt-rec-lightbox-icon-btn"
                  onClick={closeLightbox}
                  aria-label={t.lightboxClose}
                  autoFocus
                >
                  <X size={17} />
                </button>
              </div>
            </header>

            <div className="dt-rec-lightbox-stage">
              {activeItem.kind === "video" ? (
                <video
                  src={activeItem.src}
                  poster={activeItem.poster}
                  controls
                  autoPlay
                  playsInline
                  className="dt-rec-lightbox-video"
                />
              ) : (
                <div
                  className={`dt-rec-lightbox-img-wrap${zoomed ? " is-zoomed" : ""}`}
                >
                  <Image
                    src={activeItem.src}
                    alt={activeItem.alt[locale]}
                    width={activeItem.width}
                    height={activeItem.height}
                    sizes="92vw"
                    className="dt-rec-lightbox-img"
                    priority
                  />
                </div>
              )}
            </div>

            <footer className="dt-rec-lightbox-footer">
              <p>{activeItem.caption[locale]}</p>
              {activeItem.certificateMeta ? (
                <dl className="dt-rec-lightbox-cert-row">
                  {activeItem.certificateMeta.map((row) => (
                    <div key={row.label.en}>
                      <dt>{row.label[locale]}</dt>
                      <dd>{row.value[locale]}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

