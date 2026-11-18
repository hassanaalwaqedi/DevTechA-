import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const steps = [
  [
    "01",
    "System & Architecture Scoping",
    "We analyze operational workflows, data sources, integration requirements, security boundaries, and target business outcomes before selecting a technical architecture.",
    "DISCOVERY / SYSTEM DESIGN",
  ],
  [
    "02",
    "AI & Automation Engineering",
    "We design and evaluate AI agents, Enterprise RAG pipelines, LLM integrations, and automated business workflows tailored to your operational rules.",
    "AI AGENTS / RAG / AUTOMATION",
  ],
  [
    "03",
    "Full-Stack & Backend Development",
    "We engineer scalable web applications, SaaS platforms, database schemas, and high-performance APIs using TypeScript, Next.js, Python, and FastAPI.",
    "FULL-STACK / APIS / DATABASES",
  ],
  [
    "04",
    "Cloud Deployment & Observability",
    "We package and deploy systems via Docker, CI/CD pipelines, and cloud infrastructure with monitoring, reliability guards, and human-in-the-loop controls.",
    "CLOUD / DOCKER / CI-CD",
  ],
] as const;

const arabicSteps = [
  [
    "01",
    "تحليل المتطلبات وتصميم المعمارية",
    "ندرس مسارات العمل التشغيلية، ومصادر البيانات، ومتطلبات التكامل والأمان، والأهداف التجارية قبل تحديد المعمارية البرمجية.",
    "التحليل / تصميم المعمارية",
  ],
  [
    "02",
    "هندسة الذكاء الاصطناعي والأتمتة",
    "نصمم ونقيّم وكلاء الذكاء الاصطناعي، وأنظمة استرجاع المعرفة (RAG)، ومسارات أتمتة العمليات التجارية وفق قواعد العمل.",
    "الوكلاء / RAG / الأتمتة",
  ],
  [
    "03",
    "تطوير البرمجيات والأنظمة الخلفية",
    "نبني تطبيقات الويب المؤسسية، ومنصات SaaS، وقواعد البيانات، والواجهات البرمجية باستخدام TypeScript وNext.js وPython وFastAPI.",
    "Full-Stack / APIs / قواعد البيانات",
  ],
  [
    "04",
    "النشر السحابي والمراقبة المستمرة",
    "ننشر الأنظمة عبر حاويات Docker وخطوط CI/CD والبنية السحابية مع مراقبة الأداء وضوابط الاعتمادية والإشراف البشري.",
    "السحابة / Docker / CI-CD",
  ],
] as const;

export function HowWeWork({ arabic = false }: { arabic?: boolean }) {
  return (
    <section className="how-work" id="how-we-work">
      <div className="container">
        <div className="how-work-heading how-work-head">
          <div>
            <div className="art-label">
              {arabic ? "01 / منهجيتنا الهندسية" : "01 / ENGINEERING METHODOLOGY"}
            </div>
            <h2>
              {arabic ? (
                <>
                  من تحدي الأعمال
                  <br />
                  <em>إلى نظام برمجي ذكي وقابل للتوسع.</em>
                </>
              ) : (
                <>
                  From business challenge
                  <br />
                  <em>to scalable intelligent software.</em>
                </>
              )}
            </h2>
          </div>
          <p>
            {arabic
              ? "بناء نظام برمجي وذكاء اصطناعي موثوق يتطلب ربط تصميم المعمارية، وهندسة النماذج والأتمتة، والأنظمة الخلفية، والتشغيل السحابي في مسار هندسي واحد."
              : "Reliable AI and software delivery is an end-to-end engineering discipline—connecting system architecture, intelligent automation, backend APIs, and production deployment."}
          </p>
        </div>
        <div className="work-steps">
          {(arabic ? arabicSteps : steps).map(([number, title, text, tag]) => (
            <article key={number} className="work-step motion-reveal">
              <div className="step-marker work-step-top">
                <span>{number}</span>
                <small>{tag}</small>
              </div>
              <div className="step-copy">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <Link href="/services" className="art-inline-link">
          {arabic ? "استكشف أقسامنا الهندسية الأربعة" : "Explore our four engineering divisions"}{" "}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
