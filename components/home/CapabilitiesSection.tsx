import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { CapabilityCard } from "@/components/home/CapabilityCard";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";

type CapabilitiesSectionProps = {
  arabic?: boolean;
};

export function CapabilitiesSection({ arabic = false }: CapabilitiesSectionProps) {
  const cards = [
    {
      id: "ai-engineering",
      title: arabic ? "هندسة الذكاء الاصطناعي والوكلاء" : "AI Engineering & Intelligent Agents",
      subtitle: arabic
        ? "وكلاء أذكياء · أنظمة RAG المؤسسية · تكامل النماذج اللغوية"
        : "AI Agents · Enterprise RAG · LLM Integration",
      href: "/services#ai-engineering",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-1" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect x="9.5" y="9.5" width="13" height="13" rx="3.2" stroke="url(#dt-cap-grad-1)" strokeWidth="1.85" />
          <circle cx="16" cy="16" r="2.6" fill="url(#dt-cap-grad-1)" />
          <path d="M13 5V9.5M19 5V9.5M13 22.5V27M19 22.5V27M5 13H9.5M5 19H9.5M22.5 13H27M22.5 19H27" stroke="url(#dt-cap-grad-1)" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "custom-software",
      title: arabic ? "هندسة البرمجيات المخصصة" : "Custom Software Engineering",
      subtitle: arabic
        ? "تطبيقات المؤسسات · منصات SaaS · الأنظمة الخلفية والواجهات"
        : "Enterprise Web Apps · SaaS Platforms · Backend & APIs",
      href: "/services#custom-software",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-2" x1="4" y1="5" x2="28" y2="27" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect x="4" y="6" width="24" height="19" rx="3.8" stroke="url(#dt-cap-grad-2)" strokeWidth="1.85" />
          <path d="M4 11.2H28" stroke="url(#dt-cap-grad-2)" strokeWidth="1.5" strokeOpacity="0.65" />
          <rect x="8" y="14.5" width="8.5" height="6.5" rx="1.5" stroke="url(#dt-cap-grad-2)" strokeWidth="1.5" />
          <path d="M19.5 15.5H24M19.5 18.2H24M19.5 20.9H22.5" stroke="url(#dt-cap-grad-2)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "process-automation",
      title: arabic ? "أتمتة العمليات التجارية" : "Business Process Automation",
      subtitle: arabic
        ? "أتمتة سير العمل · أنظمة CRM · معالجة المستندات والتقارير"
        : "Workflow & CRM Automation · Document AI · API Pipelines",
      href: "/services#process-automation",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-3" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <circle cx="8" cy="10" r="3.2" stroke="url(#dt-cap-grad-3)" strokeWidth="1.75" />
          <circle cx="24" cy="10" r="3.2" stroke="url(#dt-cap-grad-3)" strokeWidth="1.75" />
          <circle cx="16" cy="23" r="3.4" stroke="url(#dt-cap-grad-3)" strokeWidth="1.85" />
          <path d="M11.2 10H20.8M9.5 12.8L14.2 20.2M22.5 12.8L17.8 20.2" stroke="url(#dt-cap-grad-3)" strokeWidth="1.65" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "cloud-architecture",
      title: arabic ? "معمارية الأنظمة والتكامل السحابي" : "Cloud & Systems Integration",
      subtitle: arabic
        ? "الأنظمة الموزعة · الهندسة السحابية · DevOps والتكامل"
        : "Distributed Systems · Cloud & DevOps · System Integrations",
      href: "/services#cloud-architecture",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-4" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect x="5" y="6" width="22" height="16" rx="4.5" stroke="url(#dt-cap-grad-4)" strokeWidth="1.85" />
          <circle cx="16" cy="14" r="4.2" stroke="url(#dt-cap-grad-4)" strokeWidth="1.75" />
          <circle cx="16" cy="14" r="1.6" fill="#0754FF" />
          <path d="M12 25.5H20M16 22V25.5" stroke="url(#dt-cap-grad-4)" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const useCases = arabic
    ? ([
        {
          id: "uc-automation",
          track: "process-automation",
          sector: "أتمتة العمليات وسير العمل",
          problem: "تستنزف الفرق ساعات يومية في نقل البيانات يدوياً بين البريد الإلكتروني، والمستندات، وأنظمة CRM وERP.",
          solution: "هندسة مسارات أتمتة معتمدة على APIs واستخراج ذكي للمستندات يربط أنظمة المؤسسة تلقائياً.",
          outcome: "تقليص زمن معالجة الطلبات والعمليات المتكررة ومنع أخطاء الإدخال البشري.",
        },
        {
          id: "uc-rag",
          track: "ai-engineering",
          sector: "المعرفة المؤسسية وخدمة العملاء",
          problem: "تبعثر السياسات والوثائق الفنية داخل آلاف الملفات مما يبطئ فرق الدعم والعمليات في الوصول للمعلومة.",
          solution: "بناء نظام استرجاع معرفة مؤسسي (Enterprise RAG) ووكلاء ذكاء اصطناعي مقيدين بصلاحيات ومصادر الشركة.",
          outcome: "إجابات فورية موثقة بالمصادر الداخلية ودعم قرار أسرع للفرق والعملاء.",
        },
        {
          id: "uc-software",
          track: "custom-software",
          sector: "المنصات الرقمية وتطبيقات الأعمال",
          problem: "اعتماد العمليات الأساسية على جداول بيانات متفرقة أو برمجيات جاهزة لا تناسب نموذج عمل الشركة.",
          solution: "تطوير منصة ويب أو SaaS مخصصة (Full-Stack) بواجهات حديثة وصلاحيات دقيقة ولوحات تحكم تشغيلية.",
          outcome: "منصة برمجية مملوكة بالكامل للشركة، قابلة للتوسع ومصممة حول تجربة عملائك.",
        },
        {
          id: "uc-cloud",
          track: "cloud-integration",
          sector: "تكامل الأنظمة والبنية السحابية",
          problem: "انقطاع المزامنة بين الأنظمة المالية واللوجستية أو بطء الأداء عند زيادة ضغط المستخدمين.",
          solution: "إعادة هندسة الواجهات الخلفية (FastAPI / Node.js) وقواعد البيانات وخطوط النشر السحابي (Docker & CI/CD).",
          outcome: "استقرار تشغيلي عالٍ، وتكامل لحظي آمن بين جميع الأنظمة الداخلية والخارجية.",
        },
      ] as const)
    : ([
        {
          id: "uc-automation",
          track: "process-automation",
          sector: "Operations & CRM Workflow Automation",
          problem: "Teams lose hours every day manually copying data across emails, PDFs, spreadsheets, and CRM/ERP tools.",
          solution: "We engineer event-driven API pipelines and intelligent document processors that synchronize your systems automatically.",
          outcome: "Eliminates repetitive manual data entry and accelerates operational turnaround.",
        },
        {
          id: "uc-rag",
          track: "ai-engineering",
          sector: "Enterprise Knowledge & AI Assistants",
          problem: "Critical company SOPs, contracts, and technical documentation are buried across siloed folders and databases.",
          solution: "We deploy permission-aware Enterprise RAG systems and multi-agent workflows grounded strictly in your verified data.",
          outcome: "Instant, source-cited answers for internal teams and automated tier-1 customer support.",
        },
        {
          id: "uc-software",
          track: "custom-software",
          sector: "Custom Web Platforms & SaaS Products",
          problem: "Core business operations outgrow rigid off-the-shelf tools or fragile spreadsheet workflows.",
          solution: "We architect and build custom full-stack web applications, client portals, and multi-tenant SaaS platforms.",
          outcome: "A proprietary, scalable software platform tailored to your exact business model.",
        },
        {
          id: "uc-cloud",
          track: "cloud-integration",
          sector: "Cloud Architecture & System Integration",
          problem: "Disconnected third-party services, slow database queries, and manual deployments create operational risk.",
          solution: "We unify legacy and modern tools behind resilient backend APIs, optimized PostgreSQL schemas, and Docker CI/CD.",
          outcome: "Reliable, observable cloud infrastructure ready for enterprise scale.",
        },
      ] as const);

  return (
    <section id="services" className="dt-capabilities-section" aria-labelledby="dt-capabilities-heading">
      <div className="container">
        <div className="dt-capabilities-header">
          <span className="dt-section-eyebrow">
            {arabic ? "الأقسام الهندسية الأربعة" : "CORE ENGINEERING DIVISIONS"}
          </span>
          <h2 id="dt-capabilities-heading" className="dt-section-title">
            {arabic
              ? "هندسة الذكاء الاصطناعي. البرمجيات المخصصة. الأتمتة. السحابة."
              : "AI Engineering. Custom Software. Automation. Cloud."}
          </h2>
        </div>

        <div className="dt-capabilities-grid">
          {cards.map((card) => (
            <CapabilityCard
              key={card.id}
              title={card.title}
              subtitle={card.subtitle}
              href={card.href}
              icon={card.icon}
            />
          ))}
        </div>

        {/* Business-Specific Use Cases & Outcomes Matrix */}
        <div id="use-cases" className="dt-b2b-usecases-wrapper">
          <div className="dt-b2b-usecases-head">
            <div>
              <span className="dt-section-eyebrow">
                {arabic
                  ? "حالات استخدام الأعمال · من المشكلة إلى النتيجة"
                  : "BUSINESS USE CASES · PROBLEM TO OUTCOME"}
              </span>
              <h3>
                {arabic
                  ? "تحديات الأعمال التي نحلها بهندسة البرمجيات والذكاء الاصطناعي."
                  : "Real operational challenges we solve for growing businesses."}
              </h3>
            </div>
            <Link href="#book-discovery" className="dt-btn dt-btn-primary">
              <span>{arabic ? "احجز جلسة اكتشاف" : "Book a Discovery Call"}</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="dt-b2b-usecases-grid">
            {useCases.map((uc) => (
              <article key={uc.id} className="dt-b2b-usecase-card">
                <div className="dt-b2b-usecase-sector">{uc.sector}</div>
                <div className="dt-b2b-usecase-row">
                  <span className="dt-b2b-usecase-label dt-b2b-label-problem">
                    {arabic ? "التحدي التشغيلي" : "Business Challenge"}
                  </span>
                  <p>{uc.problem}</p>
                </div>
                <div className="dt-b2b-usecase-row">
                  <span className="dt-b2b-usecase-label dt-b2b-label-solution">
                    {arabic ? "الحل الهندسي" : "Engineered Solution"}
                  </span>
                  <p>{uc.solution}</p>
                </div>
                <div className="dt-b2b-usecase-outcome">
                  <CheckCircle2 size={16} />
                  <span>{uc.outcome}</span>
                </div>
                <Link
                  href={`/book?track=${encodeURIComponent(uc.track)}`}
                  className="dt-b2b-usecase-cta"
                >
                  <span>
                    {arabic ? "ناقش هذا السيناريو في جلسة اكتشاف" : "Scope this use case"}
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div className="dept-email-strip">
          <div className="dept-email-strip-copy">
            <span>{arabic ? "الاستفسارات العامة والمؤسسية" : "GENERAL & ENTERPRISE INQUIRIES · HIRZEXA"}</span>
            <p>
              {arabic
                ? "للاستفسارات العامة والتواصل المؤسسي مع HIRZEXA."
                : "General and corporate inquiries for HIRZEXA."}
            </p>
          </div>
          <div className="dept-email-strip-actions">
            <a
              dir="ltr"
              href={companyMailto("general", "General inquiry — HIRZEXA")}
              className="dept-email-chip"
              aria-label={`${arabic ? "الاستفسارات العامة" : "General inquiries"}: ${COMPANY_EMAILS.general}`}
            >
              {COMPANY_EMAILS.general} <ArrowUpRight size={15} />
            </a>
            <Link href="/book?mode=proposal" className="dept-email-chip">
              {arabic ? "اطلب عرضاً فنياً ومالياً" : "Request a Proposal"} <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
