"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Award, Check, Clock3, Compass, Mail, Wrench } from "lucide-react";
import type { Locale } from "@/lib/locale";
import {
  ENGINEERING_CHALLENGES,
  ENGINEERING_TIMELINE,
  PRODUCT_EVOLUTION_STAGES,
  getAegisCopy,
} from "@/lib/aegis-data";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";

export function EngineeringJourneySection({ locale }: { locale: Locale }) {
  const t = getAegisCopy(locale);
  const ar = locale === "ar";
  const [selectedChallengeId, setSelectedChallengeId] = useState(
    ENGINEERING_CHALLENGES[0].id
  );
  const activeChallenge =
    ENGINEERING_CHALLENGES.find((c) => c.id === selectedChallengeId) ??
    ENGINEERING_CHALLENGES[0];

  return (
    <>
      {/* SECTION: ENGINEERING JOURNEY TIMELINE */}
      <section
        className="aegis-band aegis-band-light"
        id="engineering-journey"
        aria-labelledby="aegis-journey-heading"
      >
        <div className="container">
          <div className="aegis-section-head">
            <div>
              <span className="aegis-eyebrow">{t.journeyEyebrow}</span>
              <h2 id="aegis-journey-heading" className="aegis-heading">
                {t.journeyTitle}
              </h2>
            </div>
            <p className="aegis-subcopy">{t.journeySubtitle}</p>
          </div>

          <ol className="aegis-timeline">
            {ENGINEERING_TIMELINE.map((milestone) => (
              <li
                key={milestone.id}
                className={`aegis-timeline-item is-${milestone.status}`}
              >
                <div className="aegis-timeline-rail" aria-hidden="true">
                  <span className="aegis-timeline-dot" />
                </div>

                <div className="aegis-timeline-card">
                  <div className="aegis-timeline-top">
                    <div className="aegis-timeline-tags">
                      <span className="aegis-timeline-phase">{milestone.phase}</span>
                      <span className="aegis-timeline-date">
                        {milestone.dateLabel[locale]}
                      </span>
                      <span className="aegis-timeline-version">{milestone.version}</span>
                    </div>
                    <span className={`aegis-status-chip is-${milestone.status}`}>
                      {t.statusBadges[milestone.status]}
                    </span>
                  </div>

                  <div
                    className={`aegis-timeline-body${
                      milestone.image ? " has-media" : ""
                    }`}
                  >
                    <div>
                      <h3>{milestone.title[locale]}</h3>
                      <p>{milestone.summary[locale]}</p>
                      <div className="aegis-timeline-arch-note">
                        <Wrench size={14} aria-hidden="true" />
                        <span>{milestone.architectureNote[locale]}</span>
                      </div>
                    </div>

                    {milestone.image ? (
                      <div className="aegis-timeline-thumb">
                        <Image
                          src={milestone.image.src}
                          alt={milestone.image.alt[locale]}
                          width={560}
                          height={315}
                          sizes="(max-width: 980px) 100vw, 320px"
                          className="aegis-timeline-img"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SECTION: ENGINEERING CHALLENGES & SOLUTIONS */}
      <section
        className="aegis-band aegis-band-soft"
        id="challenges"
        aria-labelledby="aegis-challenges-heading"
      >
        <div className="container">
          <div className="aegis-section-head">
            <div>
              <span className="aegis-eyebrow">{t.challengesEyebrow}</span>
              <h2 id="aegis-challenges-heading" className="aegis-heading">
                {t.challengesTitle}
              </h2>
            </div>
            <p className="aegis-subcopy">{t.challengesSubtitle}</p>
          </div>

          <div className="aegis-challenges-layout">
            <div className="aegis-challenge-selector" role="tablist">
              {ENGINEERING_CHALLENGES.map((item, idx) => {
                const selected = item.id === activeChallenge.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setSelectedChallengeId(item.id)}
                    className={`aegis-challenge-tab${selected ? " is-active" : ""}`}
                  >
                    <span>
                      {String(idx + 1).padStart(2, "0")} · {item.domain[locale]}
                    </span>
                    <strong>{item.title[locale]}</strong>
                  </button>
                );
              })}
            </div>

            <article className="aegis-challenge-detail" role="tabpanel">
              <span className="aegis-eyebrow">{activeChallenge.domain[locale]}</span>
              <h3>{activeChallenge.title[locale]}</h3>

              <div className="aegis-pdir-grid">
                <div className="aegis-pdir-step">
                  <span>01 · {ar ? "المشكلة" : "Problem"}</span>
                  <p>{activeChallenge.problem[locale]}</p>
                </div>
                <div className="aegis-pdir-step">
                  <span>02 · {ar ? "القرار الهندسي" : "Engineering Decision"}</span>
                  <p>{activeChallenge.decision[locale]}</p>
                </div>
                <div className="aegis-pdir-step">
                  <span>03 · {ar ? "التنفيذ الفعلي" : "Implementation"}</span>
                  <p>{activeChallenge.implementation[locale]}</p>
                </div>
                <div className="aegis-pdir-step is-outcome">
                  <span>04 · {ar ? "النتيجة" : "Observed Outcome"}</span>
                  <p>{activeChallenge.result[locale]}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* SECTION: PRODUCT EVOLUTION & GROWTH + RECOGNITION BRIDGE */}
      <section
        className="aegis-band aegis-band-light"
        id="evolution"
        aria-labelledby="aegis-evolution-heading"
      >
        <div className="container">
          <div className="aegis-section-head">
            <div>
              <span className="aegis-eyebrow">{t.evolutionEyebrow}</span>
              <h2 id="aegis-evolution-heading" className="aegis-heading">
                {t.evolutionTitle}
              </h2>
            </div>
            <p className="aegis-subcopy">{t.evolutionSubtitle}</p>
          </div>

          <div className="aegis-evolution-grid">
            {PRODUCT_EVOLUTION_STAGES.map((item, idx) => (
              <article key={idx} className={`aegis-evolution-card is-${item.status}`}>
                <div className="aegis-evolution-top">
                  <span className="aegis-evolution-index">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className={`aegis-status-chip is-${item.status}`}>
                    {item.status === "completed" ? (
                      <Check size={12} aria-hidden="true" />
                    ) : item.status === "in-progress" ? (
                      <Clock3 size={12} aria-hidden="true" />
                    ) : (
                      <Compass size={12} aria-hidden="true" />
                    )}
                    <span>{t.statusBadges[item.status]}</span>
                  </span>
                </div>
                <h3>{item.stage[locale]}</h3>
                <p>{item.detail[locale]}</p>
              </article>
            ))}
          </div>

          {/* Recognition Preview Bridge (Links to full Awards gallery on /about#recognition) */}
          <div className="aegis-recognition-bridge">
            <div className="aegis-recognition-media">
              <Image
                src="/awards/stage-ceremony-2026.webp"
                alt={
                  ar
                    ? "تكريم مشروع AEGIS AI بالمركز الثاني في إسطنبول 2026"
                    : "AEGIS AI Second Place recognition ceremony in Istanbul (2026)"
                }
                width={1024}
                height={576}
                sizes="(max-width: 980px) 100vw, 420px"
                className="aegis-recognition-img"
              />
            </div>

            <div className="aegis-recognition-copy">
              <span className="aegis-eyebrow">
                <Award size={13} aria-hidden="true" /> {t.recognitionEyebrow}
              </span>
              <h3>{t.recognitionTitle}</h3>
              <p>{t.recognitionBody}</p>
              <Link href="/about#recognition" className="aegis-link-arrow">
                <span>{t.recognitionLink}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: DEPLOYMENT OPTIONS & PILOT INQUIRIES */}
      <section
        className="aegis-band aegis-band-dark aegis-deployment-band"
        id="deployment"
        aria-labelledby="aegis-deployment-heading"
      >
        <div className="container aegis-deployment-layout">
          <div>
            <span className="aegis-eyebrow aegis-eyebrow-light">
              {t.deploymentEyebrow}
            </span>
            <h2
              id="aegis-deployment-heading"
              className="aegis-heading aegis-heading-light"
            >
              {t.deploymentTitle}
            </h2>
            <p className="aegis-subcopy aegis-subcopy-light" style={{ marginTop: 18 }}>
              {t.deploymentSubtitle}
            </p>
          </div>

          <div className="aegis-deployment-actions">
            <Link
              href="/contact?category=AEGIS%20AI%20Commercial"
              className="aegis-cta-primary"
            >
              <span>{t.demoCta}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>

            <a
              href={companyMailto("business", "AEGIS AI Pilot Discussion")}
              className="aegis-cta-secondary-dark"
            >
              <Mail size={16} aria-hidden="true" />
              <span>{t.pilotCta}</span>
            </a>

            <div className="aegis-deployment-emails">
              <a
                href={companyMailto("business", "AEGIS AI Commercial Inquiry")}
                dir="ltr"
              >
                {t.businessCta}: {COMPANY_EMAILS.business}
              </a>
              <a
                href={companyMailto("support", "AEGIS AI Technical Inquiry")}
                dir="ltr"
              >
                {ar ? "الدعم الهندسي والتقني" : "Technical engineering inquiries"}:{" "}
                {COMPANY_EMAILS.support}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

