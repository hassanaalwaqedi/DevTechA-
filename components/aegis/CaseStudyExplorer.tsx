"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Lock, Stethoscope, Store } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { CASE_STUDIES, getAegisCopy } from "@/lib/aegis-data";

export function CaseStudyExplorer({ locale }: { locale: Locale }) {
  const t = getAegisCopy(locale);
  const ar = locale === "ar";
  const [selectedId, setSelectedId] = useState<"medical" | "retail">("medical");

  const active =
    CASE_STUDIES.find((study) => study.id === selectedId) ?? CASE_STUDIES[0];

  return (
    <section
      className="aegis-band aegis-band-soft"
      id="case-studies"
      aria-labelledby="aegis-case-studies-heading"
    >
      <div className="container">
        <div className="aegis-section-head">
          <div>
            <span className="aegis-eyebrow">{t.caseStudiesEyebrow}</span>
            <h2 id="aegis-case-studies-heading" className="aegis-heading">
              {t.caseStudiesTitle}
            </h2>
          </div>
          <p className="aegis-subcopy">{t.caseStudiesSubtitle}</p>
        </div>

        <div
          className="aegis-case-switcher"
          role="tablist"
          aria-label={ar ? "بيئات دراسة الحالة" : "Case study environments"}
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedId === "medical"}
            className={`aegis-case-tab${selectedId === "medical" ? " is-active" : ""}`}
            onClick={() => setSelectedId("medical")}
          >
            <Stethoscope size={16} aria-hidden="true" />
            <span>
              {ar ? "دراسة أ · البيئات الطبية" : "Case Study A · Medical Environments"}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedId === "retail"}
            className={`aegis-case-tab${selectedId === "retail" ? " is-active" : ""}`}
            onClick={() => setSelectedId("retail")}
          >
            <Store size={16} aria-hidden="true" />
            <span>
              {ar ? "دراسة ب · بيئات التجزئة" : "Case Study B · Retail Environments"}
            </span>
          </button>
        </div>

        <article
          key={active.id}
          role="tabpanel"
          className="aegis-case-panel"
        >
          <header className="aegis-case-header">
            <div>
              <span className="aegis-case-badge">{active.badge[locale]}</span>
              <h3>{active.title[locale]}</h3>
              <p className="aegis-case-summary">{active.summary[locale]}</p>
            </div>
            <div className="aegis-case-classification">
              <span>{active.classification[locale]}</span>
            </div>
          </header>

          <div className="aegis-case-narrative">
            <div className="aegis-narrative-block">
              <h4>{ar ? "بيان المشكلة الهندسية" : "Problem Statement"}</h4>
              <p>{active.problemStatement[locale]}</p>
            </div>
            <div className="aegis-narrative-block">
              <h4>{ar ? "المنهج الهندسي" : "Engineering Approach"}</h4>
              <p>{active.engineeringApproach[locale]}</p>
            </div>
          </div>

          <dl className="aegis-case-matrix">
            {active.rows.map((row) => (
              <div key={row.label.en} className="aegis-case-row">
                <dt>{row.label[locale]}</dt>
                <dd>{row.value[locale]}</dd>
              </div>
            ))}
          </dl>

          <div className="aegis-case-bottom">
            <div className="aegis-case-list-card">
              <h5>
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>{ar ? "الملاحظات الهندسية" : "Key Observations"}</span>
              </h5>
              <ul>
                {active.observations[locale].map((obs) => (
                  <li key={obs}>{obs}</li>
                ))}
              </ul>
            </div>

            <div className="aegis-case-list-card is-caution">
              <h5>
                <AlertCircle size={15} aria-hidden="true" />
                <span>
                  {ar ? "القيود ونطاق التقييم" : "Limitations & Scope Clarity"}
                </span>
              </h5>
              <ul>
                {active.limitations[locale].map((lim) => (
                  <li key={lim}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="aegis-evidence-notice">
            <Lock size={15} aria-hidden="true" />
            <p>{active.evidenceStatus.note[locale]}</p>
          </div>
        </article>
      </div>
    </section>
  );
}

