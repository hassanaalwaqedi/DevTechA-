"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Info, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { SESSION_TELEMETRY_VERIFIED, getAegisCopy } from "@/lib/aegis-data";

export function EngineeringMetrics({ locale }: { locale: Locale }) {
  const t = getAegisCopy(locale);
  const ar = locale === "ar";
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [displayValue, setDisplayValue] = useState(95.3);
  const [ringProgress, setRingProgress] = useState(95.3);
  const [activeTab, setActiveTab] = useState<"telemetry" | "benchmark">("telemetry");
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    const node = ringRef.current;
    if (!node) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setDisplayValue(95.3);
      setRingProgress(95.3);
      return;
    }

    let rafId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setDisplayValue(0);
        setRingProgress(0);
        const start = performance.now();
        const duration = 900;
        const target = 95.3;

        function tick(now: number) {
          const elapsed = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - elapsed, 3);
          const next = Number((target * eased).toFixed(1));
          setDisplayValue(next);
          setRingProgress(target * eased);
          if (elapsed < 1) {
            rafId = requestAnimationFrame(tick);
          } else {
            setDisplayValue(target);
            setRingProgress(target);
          }
        }
        rafId = requestAnimationFrame(tick);
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.max(0, Math.min(100, ringProgress)) / 100) * circumference;

  const benchmarkStructureSlots = [
    {
      id: "confusion-matrix",
      title: { en: "Confusion Matrix", ar: "مصفوفة الالتباس (Confusion Matrix)" },
      definition: {
        en: "True / False Positive & Negative matrix across labeled scene classes",
        ar: "توزيع التوقعات الصحيحة والخاطئة عبر فئات المشهد المصنّفة",
      },
    },
    {
      id: "precision-recall",
      title: { en: "Precision & Recall", ar: "الدقة والاستدعاء (Precision / Recall)" },
      definition: {
        en: "Class-weighted precision-recall tradeoff curve per model checkpoint",
        ar: "منحنى التوازن بين الدقة والاستدعاء لكل نسخة من النموذج",
      },
    },
    {
      id: "latency-fps",
      title: { en: "Inference Latency & FPS", ar: "زمن الاستدلال ومعدل الإطارات" },
      definition: {
        en: "Per-frame inference timing across target edge GPU / NPU hardware profiles",
        ar: "زمن معالجة الإطار ومعدل الإطارات لكل وحدة عتاد طرفية مستهدفة",
      },
    },
    {
      id: "env-split",
      title: { en: "Environment Breakdown", ar: "النتائج حسب بيئة التشغيل" },
      definition: {
        en: "Comparative split between medical and retail test suites",
        ar: "مقارنة النتائج بين بيئة الاختبار الطبية وبيئة التجزئة",
      },
    },
  ] as const;

  return (
    <section
      className="aegis-band aegis-band-light"
      id="evaluation-results"
      aria-labelledby="aegis-results-heading"
    >
      <div className="container">
        <div className="aegis-section-head">
          <div>
            <span className="aegis-eyebrow">{t.resultsEyebrow}</span>
            <h2 id="aegis-results-heading" className="aegis-heading">
              {t.resultsTitle}
            </h2>
          </div>
          <p className="aegis-subcopy">{t.resultsSubtitle}</p>
        </div>

        {/* Circular Metric Reveal + Transparent Methodology Scope */}
        <div className="aegis-eval-grid" ref={ringRef}>
          <div className="aegis-ring-panel">
            <div className="aegis-ring-wrap" dir="ltr">
              <svg
                className="aegis-ring-svg"
                viewBox="0 0 210 210"
                role="img"
                aria-label="95.3% reported evaluation result indicator"
              >
                <defs>
                  <linearGradient id="aegisRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1050FF" />
                    <stop offset="100%" stopColor="#873BFF" />
                  </linearGradient>
                </defs>
                <circle
                  cx="105"
                  cy="105"
                  r={radius}
                  fill="none"
                  stroke="rgba(15, 23, 42, 0.08)"
                  strokeWidth="12"
                />
                <circle
                  cx="105"
                  cy="105"
                  r={radius}
                  fill="none"
                  stroke="url(#aegisRingGrad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 105 105)"
                />
              </svg>
              <div className="aegis-ring-center">
                <strong>{displayValue.toFixed(1)}%</strong>
                <span>{ar ? "نتيجة مبلّغ عنها" : "REPORTED RESULT"}</span>
              </div>
            </div>

            <p className="aegis-ring-note">{t.resultsRingNote}</p>

            <button
              type="button"
              className="aegis-note-toggle"
              aria-expanded={showNotes}
              onClick={() => setShowNotes((prev) => !prev)}
            >
              <Info size={15} aria-hidden="true" />
              <span>
                {ar
                  ? "ملاحظات التحقق من المنهجية"
                  : "View methodology verification notes"}
              </span>
            </button>

            {showNotes ? (
              <div className="aegis-note-drawer">
                {ar
                  ? "تُمثل نسبة 95.3% نتيجة مُبلّغ عنها من دورات الاختبار السابقة للمؤسس. لم تُصنّف بعد كشهادة معتمدة خارجياً حتى نشر تعريف المقياس وحجم العينة وتاريخ الاختبار."
                  : "The 95.3% figure reflects a founder-reported prior test result. Until sample counts, metric formulas (accuracy/precision/recall/F1), model version, and test dates are finalized, it is not presented as an externally certified benchmark."}
              </div>
            ) : null}
          </div>

          <div className="aegis-methodology-panel">
            <h3>{t.methodologyTitle}</h3>
            <dl className="aegis-method-list">
              {t.methodologyColumns.map((row) => (
                <div key={row.label} className="aegis-method-row">
                  <div className="aegis-method-row-head">
                    <dt>{row.label}</dt>
                    <span className="aegis-method-state">{row.state}</span>
                  </div>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Performance & Evaluation Dashboard (Strictly Verified Session Telemetry vs Structural Benchmark Slots) */}
        <div className="aegis-perf-dashboard">
          <div className="aegis-perf-header">
            <div className="aegis-perf-title">
              <Activity size={18} aria-hidden="true" />
              <h3>
                {ar
                  ? "لوحة الأداء والقياسات الهندسية"
                  : "Performance & Evaluation Inspection Dashboard"}
              </h3>
            </div>

            <div className="aegis-tab-bar" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "telemetry"}
                className={`aegis-tab-btn${activeTab === "telemetry" ? " is-active" : ""}`}
                onClick={() => setActiveTab("telemetry")}
              >
                {t.dashboardTabTelemetry}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "benchmark"}
                className={`aegis-tab-btn${activeTab === "benchmark" ? " is-active" : ""}`}
                onClick={() => setActiveTab("benchmark")}
              >
                {t.dashboardTabBenchmark}
              </button>
            </div>
          </div>

          {activeTab === "telemetry" ? (
            <div className="aegis-telemetry-grid">
              {SESSION_TELEMETRY_VERIFIED.map((item) => (
                <article key={item.value} className="aegis-telemetry-card">
                  <span className="aegis-telemetry-source">
                    <ShieldCheck size={13} aria-hidden="true" />
                    <span>{item.source[locale]}</span>
                  </span>
                  <strong dir="ltr">{item.value}</strong>
                  <p>{item.metric[locale]}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="aegis-benchmark-grid">
              {benchmarkStructureSlots.map((slot) => (
                <article key={slot.id} className="aegis-benchmark-slot">
                  <div className="aegis-benchmark-slot-top">
                    <h4>{slot.title[locale]}</h4>
                    <span className="aegis-slot-badge">
                      {ar ? "بانتظار البيانات الخام" : "Awaiting dataset"}
                    </span>
                  </div>
                  <p>{slot.definition[locale]}</p>
                  <div className="aegis-slot-placeholder" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

