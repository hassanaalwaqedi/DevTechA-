import Link from "next/link";
import { ArrowUpRight, ChevronDown, Play, ShieldCheck, Volume2 } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { getAegisCopy } from "@/lib/aegis-data";
import { VideoShowcase } from "@/components/aegis/VideoShowcase";
import { EngineeringMetrics } from "@/components/aegis/EngineeringMetrics";
import { CaseStudyExplorer } from "@/components/aegis/CaseStudyExplorer";
import { ArchitectureExplorer } from "@/components/aegis/ArchitectureExplorer";
import { EngineeringJourneySection } from "@/components/aegis/EngineeringJourneySection";

export function AegisExperience({ locale }: { locale: Locale }) {
  const t = getAegisCopy(locale);
  const ar = locale === "ar";

  return (
    <main className="aegis-page" dir={ar ? "rtl" : "ltr"}>
      {/* CINEMATIC EDITORIAL HERO */}
      <section className="aegis-hero" aria-labelledby="aegis-hero-heading">
        <div className="container aegis-hero-grid">
          <div className="aegis-hero-copy">
            <span className="aegis-eyebrow aegis-eyebrow-light">{t.eyebrow}</span>
            <h1 id="aegis-hero-heading" className="aegis-hero-title">
              {t.heroHeadline}
            </h1>
            <p className="aegis-hero-subtitle">{t.heroSubtitle}</p>

            <div className="aegis-hero-ctas">
              <a href="#case-studies" className="aegis-cta-primary">
                <span>{t.ctaPrimary}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              <a href="#architecture" className="aegis-cta-secondary-dark">
                <span>{t.ctaSecondary}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </a>
              <a href="#video-showcase" className="aegis-cta-ghost-dark">
                <Play size={14} aria-hidden="true" />
                <span>{t.ctaWatch}</span>
              </a>
            </div>

            <div className="aegis-hero-meta">
              <span className="aegis-meta-pill">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>{t.statusChip}</span>
              </span>
              <span className="aegis-meta-pill">
                <Volume2 size={14} aria-hidden="true" />
                <span>{t.heroAudioHint}</span>
              </span>
            </div>
          </div>

          <div className="aegis-hero-stage" dir="ltr">
            <a
              href="#video-showcase"
              className="aegis-hero-stage-card"
              aria-label={t.ctaWatch}
            >
              <video
                className="aegis-hero-preview-video"
                src="/aegis/aegis-os-walkthrough.mp4#t=0.5"
                muted
                playsInline
                preload="metadata"
              />
              <div className="aegis-hero-stage-bar">
                <div>
                  <span className="aegis-stage-dot" aria-hidden="true" />
                  <strong>AEGIS INTELLIGENCE · OS WALKTHROUGH</strong>
                </div>
                <span className="aegis-stage-play-badge">
                  <Play size={13} aria-hidden="true" />
                  <span>{t.play}</span>
                </span>
              </div>
            </a>

            <div className="aegis-hero-facts-mini">
              <div>
                <span>95.3%</span>
                <small>{ar ? "نتيجة مبلّغ عنها" : "Reported Evaluation"}</small>
              </div>
              <div>
                <span>878.1 ms</span>
                <small>{ar ? "استعلام دلالي (2,776 مساراً)" : "2,776 Tracks Queried"}</small>
              </div>
              <div>
                <span>2nd Place</span>
                <small>{ar ? "إسطنبول 2026" : "Istanbul · 2026"}</small>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Quick-Jump Section Bar */}
        <div className="container">
          <nav
            className="aegis-jump-nav"
            aria-label={ar ? "أقسام صفحة AEGIS AI" : "AEGIS AI page sections"}
          >
            {t.navQuick.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="aegis-jump-pill">
                {item.label}
              </a>
            ))}
            <Link href="/products" className="aegis-jump-pill is-back">
              {ar ? "كل المنتجات" : "All Products"}
            </Link>
          </nav>
        </div>
      </section>

      {/* AUTHENTIC SYSTEM FOOTAGE WITH ORIGINAL AUDIO */}
      <VideoShowcase locale={locale} />

      {/* REAL-WORLD CASE STUDIES (MEDICAL & RETAIL) */}
      <CaseStudyExplorer locale={locale} />

      {/* 95.3% REPORTED EVALUATION & VERIFIED TELEMETRY DASHBOARD */}
      <EngineeringMetrics locale={locale} />

      {/* INTERACTIVE 6-LAYER SYSTEM ARCHITECTURE */}
      <ArchitectureExplorer locale={locale} />

      {/* ENGINEERING JOURNEY, CHALLENGES, EVOLUTION, RECOGNITION & PILOTS */}
      <EngineeringJourneySection locale={locale} />
    </main>
  );
}

