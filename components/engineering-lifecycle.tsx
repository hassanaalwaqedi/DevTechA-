"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

const stages = [
  [
    "01",
    "Data, APIs & Signal Ingestion",
    "Connect enterprise databases, third-party APIs, documents, webhooks, or live sensor streams with resilient validation and access controls.",
    "REST / Webhooks / Document & Stream Connectors",
  ],
  [
    "02",
    "Data Processing & Knowledge Indexing",
    "Normalize, structure, and index business data, documents, and operational events for fast retrieval, analytics, and downstream workflows.",
    "Data Pipelines · Vector & Relational Indexing",
  ],
  [
    "03",
    "AI Models & Intelligent Agents",
    "Execute LLM workflows, Enterprise RAG retrieval, multi-agent reasoning, or specialized computer vision models (such as AEGIS) within strict guardrails.",
    "AI Agents · Enterprise RAG · Applied ML & Vision",
  ],
  [
    "04",
    "Workflow & Process Automation",
    "Orchestrate automated business logic, CRM updates, document generation, and cross-platform triggers with deterministic fallback handling.",
    "Workflow Orchestration · CRM & API Automation",
  ],
  [
    "05",
    "Backend Services & System Integration",
    "Expose structured business logic, role-based permissions, and audit trails through high-performance backend services and distributed APIs.",
    "FastAPI · Node.js · PostgreSQL · Microservices",
  ],
  [
    "06",
    "Enterprise Applications & Cloud Runtime",
    "Deliver responsive web applications, SaaS platforms, operator dashboards, and containerized cloud deployments with continuous observability.",
    "Next.js · TypeScript · Docker · Cloud CI/CD",
  ],
] as const;

const arabicStages = [
  [
    "01",
    "استقبال البيانات والواجهات البرمجية",
    "ربط قواعد بيانات المؤسسة، والواجهات البرمجية الخارجية (APIs)، والمستندات، وتدفقات البيانات مع التحقق الآمن وإدارة الصلاحيات.",
    "REST / Webhooks / موصلات البيانات والمستندات",
  ],
  [
    "02",
    "هيكلة البيانات وفهرسة المعرفة",
    "تنظيف وتنظيم وفهرسة بيانات الأعمال والمستندات والأحداث التشغيلية لتمكين البحث السريع والتحليل ومسارات العمل.",
    "مسارات البيانات · الفهرسة العلائقية والمتجهة",
  ],
  [
    "03",
    "نماذج الذكاء الاصطناعي والوكلاء الأذكياء",
    "تشغيل الوكلاء الأذكياء، وأنظمة استرجاع المعرفة (Enterprise RAG)، والنماذج اللغوية، أو نماذج الرؤية التطبيقية (مثل AEGIS) ضمن ضوابط دقيقة.",
    "وكلاء الذكاء الاصطناعي · Enterprise RAG · النماذج التطبيقية",
  ],
  [
    "04",
    "أتمتة العمليات وسير العمل",
    "تنسيق منطق الأعمال الآلي، وتحديثات CRM، ومعالجة المستندات، والتكامل بين المنصات مع معالجة موثوقة للأخطاء.",
    "محركات سير العمل · أتمتة CRM والواجهات",
  ],
  [
    "05",
    "الأنظمة الخلفية وتكامل الأنظمة",
    "تقديم خدمات خلفية عالية الأداء، وإدارة الصلاحيات، وسجلات التدقيق عبر واجهات برمجية (APIs) وأنظمة موزعة.",
    "FastAPI · Node.js · PostgreSQL · الخدمات المصغرة",
  ],
  [
    "06",
    "تطبيقات المؤسسات والتشغيل السحابي",
    "توصيل تطبيقات الويب المؤسسية، ومنصات SaaS، ولوحات التحكم، والنشر السحابي عبر Docker وخطوط CI/CD مع مراقبة مستمرة.",
    "Next.js · TypeScript · Docker · السحابة",
  ],
] as const;

export function EngineeringLifecycle() {
  const [active, setActive] = useState(0);
  const ar = useLanguage() === "ar";
  const currentStages = ar ? arabicStages : stages;
  const stage = currentStages[active];

  return (
    <section className="lifecycle section" aria-labelledby="lifecycle-title">
      <div className="container">
        <div className="section-kicker">
          {ar ? "مسار هندسة الأنظمة التفاعلي" : "Interactive System Architecture"}
        </div>
        <div className="section-title-row lifecycle-intro">
          <h2 id="lifecycle-title">
            {ar ? (
              <>
                من مصادر البيانات إلى <span>المنصة البرمجية المتكاملة.</span>
              </>
            ) : (
              <>
                From data and APIs to <span>intelligent software platforms.</span>
              </>
            )}
          </h2>
          <p>
            {ar
              ? "استكشف المراحل الست التي تجمع بين الذكاء الاصطناعي والأتمتة ومعمارية البرمجيات السحابية."
              : "Inspect each stage of our six-layer AI and software engineering architecture."}
          </p>
        </div>

        <div className="lifecycle-shell">
          <div
            className="lifecycle-rail"
            aria-label={ar ? "مراحل المعمارية الهندسية" : "System architecture stages"}
          >
            {currentStages.map(([number, title], index) => (
              <button
                key={title}
                type="button"
                aria-pressed={active === index}
                className={active === index ? "active" : ""}
                onClick={() => setActive(index)}
              >
                <span>{number}</span>
                <strong>{title}</strong>
                <i aria-hidden="true">→</i>
              </button>
            ))}
          </div>

          <div className="lifecycle-detail" aria-live="polite">
            <div>
              <div className="detail-index detail-top">
                <span>
                  {stage[0]} / {ar ? "طبقة المعمارية" : "ARCHITECTURE LAYER"}
                </span>
                <span>HIRZEXA ENGINEERING</span>
              </div>
              <h3>{stage[1]}</h3>
              <p>{stage[2]}</p>
            </div>

            <div className="detail-output">
              <span>{ar ? "التقنيات والمخرجات" : "KEY TECHNOLOGIES & OUTPUT"}</span>
              <strong>{stage[3]}</strong>
              <div className="detail-meter">
                {currentStages.map((_, idx) => (
                  <i key={idx} className={idx <= active ? "lit" : ""} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
