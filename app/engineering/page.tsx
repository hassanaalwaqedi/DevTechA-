import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getLocale } from "@/lib/locale";
import { EngineeringLifecycle } from "@/components/engineering-lifecycle";
import { ArchitectureDiagram } from "@/components/technical-visuals";
import { HowWeWork } from "@/components/how-we-work";
import { HumanAiVideoReel } from "@/components/ui/HumanAiVideoReel";
import { createPageMetadata } from "@/lib/social-metadata";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";

export const metadata: Metadata = createPageMetadata({
  title: "Engineering — AI Architecture, Automation, Full-Stack & Cloud",
  description:
    "How HIRZEXA engineers intelligent software systems—from AI agents, Enterprise RAG, and workflow automation to scalable full-stack platforms, cloud infrastructure, and applied computer vision.",
  path: "/engineering",
  eyebrow: "HIRZEXA / AI & SOFTWARE ENGINEERING",
  badge: "END-TO-END SYSTEM ARCHITECTURE",
  headline: "Engineered for reliability. Built to scale.",
  summary:
    "End-to-end AI and software engineering: intelligent agents, LLM & RAG workflows, process automation, TypeScript/Next.js, Python/FastAPI, and Dockerized cloud deployment.",
  chips: ["AI Agents & RAG", "TypeScript · Python · FastAPI", "Cloud · Docker · CI/CD"],
  scene: "engineering",
  telemetry: "6-STAGE ARCHITECTURE · AI & SOFTWARE",
});

export default async function EngineeringPage() {
  const ar = (await getLocale()) === "ar";

  const stackItems = ar
    ? [
        [
          "AI & INTELLIGENT AGENTS",
          "LLMs · Enterprise RAG · Multi-Agent Workflows",
          "تصميم وتشغيل وكلاء الذكاء الاصطناعي، وأنظمة الاسترجاع المعزز للمعرفة (RAG)، وتكامل النماذج اللغوية في تطبيقات الأعمال.",
        ],
        [
          "PROCESS AUTOMATION",
          "Workflow Engines · Document AI · CRM Pipelines",
          "أتمتة العمليات التشغيلية وربط الأنظمة عبر الواجهات البرمجية ومعالجة المستندات وإصدار التقارير الآلية.",
        ],
        [
          "CUSTOM SOFTWARE & SAAS",
          "TypeScript · Next.js · React · Modern Web",
          "تطوير تطبيقات الويب المؤسسية ومنصات البرمجيات كخدمة (SaaS) ولوحات إدارة الأعمال المتكاملة.",
        ],
        [
          "BACKEND & DATA SYSTEMS",
          "Python · FastAPI · Node.js · PostgreSQL",
          "بناء الأنظمة الخلفية عالية الأداء، وواجهات البرمجة (APIs)، ومعمارية قواعد البيانات الموثوقة.",
        ],
        [
          "CLOUD & DEVOPS",
          "Docker · Microservices · CI/CD · Cloud Runtime",
          "هندسة الأنظمة الموزعة، والحاويات، وخطوط النشر المستمر، والتكامل الآمن مع الخدمات الخارجية.",
        ],
        [
          "APPLIED VISION & EDGE R&D",
          "PyTorch · YOLO · OpenCV · ONNX (AEGIS)",
          "خبرة تطبيقية في الرؤية الحاسوبية وتحليل الفيديو الذكي كما تتجسد في منتجنا الحائز على الجوائز AEGIS.",
        ],
      ]
    : [
        [
          "AI & INTELLIGENT AGENTS",
          "LLMs · Enterprise RAG · Multi-Agent Workflows",
          "Designing and deploying intelligent agents, retrieval-augmented knowledge systems, and generative AI business workflows.",
        ],
        [
          "PROCESS AUTOMATION",
          "Workflow Engines · Document AI · CRM Pipelines",
          "Automating internal business processes, CRM synchronization, document extraction, and API-driven cross-platform pipelines.",
        ],
        [
          "CUSTOM SOFTWARE & SAAS",
          "TypeScript · Next.js · React · Full-Stack",
          "Engineering enterprise web applications, multi-tenant SaaS platforms, and custom business management interfaces.",
        ],
        [
          "BACKEND & DATA ARCHITECTURE",
          "Python · FastAPI · Node.js · PostgreSQL",
          "Building resilient backend services, REST/webhook APIs, structured database schemas, and third-party system integrations.",
        ],
        [
          "CLOUD & DEVOPS",
          "Docker · Microservices · CI/CD · Cloud Runtime",
          "Architecting distributed services, containerized deployments, automated CI/CD pipelines, and performance observability.",
        ],
        [
          "APPLIED VISION & EDGE R&D",
          "PyTorch · YOLO · OpenCV · ONNX (AEGIS)",
          "Applied computer vision, object tracking, and intelligent video analysis demonstrated in our AEGIS product.",
        ],
      ];

  return (
    <main className="editorial-page engineering-page">
      <section className="engineering-hero">
        <div className="container">
          <div className="engineering-hero-top-grid">
            <div>
              <div className="art-label">
                {ar
                  ? "الهندسة / معمارية الذكاء الاصطناعي والأنظمة البرمجية"
                  : "ENGINEERING / AI & SOFTWARE SYSTEM ARCHITECTURE"}
              </div>
              <h1>
                {ar ? (
                  <>
                    مصممة للموثوقية.
                    <br />
                    <em>ومبنية للتوسع والأداء.</em>
                  </>
                ) : (
                  <>
                    Engineered for reliability.
                    <br />
                    <em>Built for enterprise scale.</em>
                  </>
                )}
              </h1>
              <div className="engineering-hero-bottom">
                <p>
                  {ar
                    ? "نصمم الأنظمة البرمجية الذكية كمنظومة هندسية متكاملة — من وكلاء الذكاء الاصطناعي ومسارات الأتمتة إلى الأنظمة الخلفية والبنية السحابية وتطبيقات المؤسسات."
                    : "We architect intelligent software systems end to end—making data boundaries, API contracts, AI reliability, security, and scalability explicit at every stage."}
                </p>
                <span>
                  HIRZEXA
                  <br />
                  {ar ? "معمارية الأنظمة / 01" : "SYSTEM ARCHITECTURE / 01"}
                </span>
              </div>
            </div>

            <div className="engineering-hero-video-col">
              <HumanAiVideoReel
                videoSrc="/videos/human-ai-engineering.mp4"
                posterSrc="/human-ai-engineering.jpg"
                badge={
                  ar
                    ? "هندسة الذكاء الاصطناعي والأنظمة البرمجية"
                    : "AI & SOFTWARE ENGINEERING ARCHITECTURE"
                }
                title={
                  ar
                    ? "تكامل الذكاء الاصطناعي والأتمتة والأنظمة السحابية"
                    : "AI Agents, Workflow Automation & Scalable Software"
                }
                subtitle={
                  ar
                    ? "LLMs & RAG · FastAPI · TypeScript · Docker · Cloud"
                    : "Data & APIs → AI & Automation → Scalable Platforms"
                }
                telemetry="PRODUCTION ARCHITECTURE"
              />
            </div>
          </div>

          <ArchitectureDiagram arabic={ar} />
        </div>
      </section>

      <HowWeWork arabic={ar} />

      <EngineeringLifecycle />

      {/* Engineering Stack Section */}
      <section className="engineering-stack-section" id="stack">
        <div className="container">
          <div className="art-label">
            {ar ? "التقنيات والأدوات الهندسية" : "AI & SOFTWARE ENGINEERING STACK"}
          </div>
          <div className="how-work-head" style={{ marginTop: "14px", marginBottom: "24px" }}>
            <h2>
              {ar ? (
                <>
                  حزمة تقنية مبنية <span>للموثوقية والتوسع.</span>
                </>
              ) : (
                <>
                  Production stack for <span>intelligent software.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نعتمد على تقنيات حديثة ومجربة في هندسة الذكاء الاصطناعي، وأتمتة العمليات، وتطوير المنصات البرمجية، والبنية السحابية."
                : "We combine modern AI orchestration, full-stack frameworks, resilient backend APIs, and cloud-native infrastructure."}
            </p>
          </div>

          <div className="engineering-stack-grid">
            {stackItems.map(([badge, title, desc]) => (
              <article key={title} className="engineering-stack-card">
                <span>{badge}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>

          <div style={{ marginTop: "28px" }}>
            <Link href="/ai-architect" className="art-inline-link">
              {ar
                ? "جرّب معماري الأنظمة التفاعلي (AI System Architect)"
                : "Launch Interactive AI System Architect"}{" "}
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="dept-email-strip">
            <div className="dept-email-strip-copy">
              <span>{ar ? "قنوات الهندسة والتعاون" : "ENGINEERING & COLLABORATION CHANNELS"}</span>
              <p>
                {ar
                  ? "للدعم التقني وأسئلة المعمارية راسل فريق الدعم، وللتعاون الهندسي والبحثي راسل فريق الشراكات."
                  : "Reach technical support for engineering questions or partnerships for technical collaborations."}
              </p>
            </div>
            <div className="dept-email-strip-actions">
              <a
                href={companyMailto("support", "Engineering & Technical Support")}
                className="dept-email-chip"
                aria-label={`${ar ? "الدعم الفني" : "Technical support"}: ${COMPANY_EMAILS.support}`}
              >
                {ar ? "الدعم الفني:" : "Technical support:"}{" "}
                <span dir="ltr">{COMPANY_EMAILS.support}</span> <ArrowUpRight size={15} />
              </a>
              <a
                href={companyMailto("partnerships", "Engineering Collaboration Proposal")}
                className="dept-email-chip"
                aria-label={`${ar ? "التعاون الهندسي" : "Collaborations"}: ${COMPANY_EMAILS.partnerships}`}
              >
                {ar ? "التعاون الهندسي:" : "Collaborations:"}{" "}
                <span dir="ltr">{COMPANY_EMAILS.partnerships}</span> <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="engineering-principles">
        <div className="container">
          <div className="art-label">
            {ar
              ? "مبادئنا الهندسية / ما نلتزم به"
              : "ARCHITECTURAL PRINCIPLES / WHAT WE HOLD CONSTANT"}
          </div>
          <div className="principle-grid">
            <article>
              <span>01</span>
              <h3>
                {ar
                  ? "معمارية برمجية واضحة وقابلة للتوسع."
                  : "Architecture before implementation."}
              </h3>
              <p>
                {ar
                  ? "نحدد عقود البيانات، وحدود الخدمات، ومتطلبات الأداء والأمان بوضوح قبل بناء النماذج أو واجهات التطبيقات."
                  : "We define data contracts, service boundaries, performance budgets, and security constraints before writing production code."}
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>
                {ar
                  ? "الموثوقية وأمن البيانات من التصميم."
                  : "Reliability & data security by design."}
              </h3>
              <p>
                {ar
                  ? "نصمم مسارات الذكاء الاصطناعي والأتمتة والواجهات البرمجية لتعمل بموثوقية عالية مع حماية بيانات المؤسسة."
                  : "Every AI workflow, API integration, and cloud service is built with structured validation, error recovery, and strict data governance."}
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>
                {ar
                  ? "ذكاء اصطناعي خاضع للإشراف البشري."
                  : "Human-in-the-loop governance."}
              </h3>
              <p>
                {ar
                  ? "نصمم الوكلاء الأذكياء وأنظمة الأتمتة ومنتجات الرؤية لتعزيز إنتاجية الفرق البشرية ودعم قراراتها بشفافية."
                  : "Our intelligent agents, automation pipelines, and vision systems surface structured context and keep human operators in control."}
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
