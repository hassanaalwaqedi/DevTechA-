import type { Metadata } from "next";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { ArrowUpRight, Camera, Cpu, Eye, MonitorPlay } from "lucide-react";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";
import "../expertise/expertise.css";

export const metadata: Metadata = createPageMetadata({
  title: "Services — AI Engineering, Process Automation, Custom Software & Cloud",
  description:
    "Explore HIRZEXA's four core engineering divisions: AI Engineering & Intelligent Agents, Business Process Automation, Custom Software Engineering, and System Architecture & Cloud Engineering.",
  path: "/technology",
  eyebrow: "HIRZEXA / CORE SERVICES & ENGINEERING",
  badge: "4 CORE ENGINEERING DIVISIONS",
  headline: "We Engineer Intelligent Software Systems.",
  summary:
    "AI agents, enterprise RAG, business process automation, full-stack software platforms, distributed backend systems, and cloud architecture.",
  chips: ["AI Agents & Enterprise RAG", "Process Automation", "Custom Software & Cloud"],
  scene: "technology",
  telemetry: "4 ENGINEERING DIVISIONS · AI & SOFTWARE",
});

export default async function TechnologyPage() {
  const ar = (await getLocale()) === "ar";

  const pillars = ar
    ? ([
        {
          id: "ai-engineering",
          number: "01",
          title: "هندسة الذكاء الاصطناعي والوكلاء الأذكياء (AI Engineering & Intelligent Agents)",
          description:
            "تصميم وبناء أنظمة ذكاء اصطناعي تطبيقية ووكلاء مستقلين يتكاملون مع بيانات المؤسسة ومسارات عملها الفعلية ضمن حدود تشغيل واضحة.",
          capabilities: [
            "وكلاء الذكاء الاصطناعي وسير العمل متعدد الوكلاء (AI Agents & Multi-Agent Workflows)",
            "تطبيقات الذكاء الاصطناعي التوليدي (Generative AI Applications)",
            "أنظمة الاسترجاع المعزز للمعرفة المؤسسية (Enterprise RAG & Knowledge Systems)",
            "تكامل وتشغيل النماذج اللغوية الكبيرة (LLM Integration & Deployment)",
            "تطبيقات الأعمال المدعومة بالذكاء الاصطناعي (AI-Powered Business Applications)",
            "حلول ذكاء اصطناعي مخصصة (Custom AI Solutions)",
          ],
          tags: ["AI Agents", "Enterprise RAG", "LLM Integration", "Python", "Applied AI"],
          note: "إفصاح الشفافية: تمثل هذه القائمة قدراتنا الهندسية والتقنية القابلة للتنفيذ؛ ونميّز بوضوح بين القدرات الهندسية والمنتجات المبرهنة وبين دراسات الحالة التجارية للعملاء.",
          Icon: Cpu,
        },
        {
          id: "process-automation",
          number: "02",
          title: "أتمتة العمليات التجارية (Business Process Automation)",
          description:
            "هندسة مسارات أتمتة موثوقة تقلل العمل اليدوي المتكرر، وتربط أنظمة المؤسسة، وتحول المستندات والبيانات التشغيلية إلى إجراءات وتقارير دقيقة.",
          capabilities: [
            "أتمتة سير العمل الداخلي للمؤسسات (Internal Business Workflow Automation)",
            "أتمتة أنظمة إدارة العملاء والعمليات التشغيلية (CRM & Operational Automation)",
            "التقارير الآلية ومعالجة المستندات الذكية (Automated Reporting & Document Processing)",
            "مسارات العمل المعتمدة على الواجهات البرمجية (API-Driven Workflows)",
            "التكامل بين الأنظمة والمنصات المتعددة (Cross-Platform Integration)",
            "أنظمة دعم وخدمة العملاء الذكية (Intelligent Customer Support Systems)",
          ],
          tags: ["Workflow Automation", "CRM Pipelines", "Document Processing", "Webhooks", "APIs"],
          note: null,
          Icon: MonitorPlay,
        },
        {
          id: "custom-software",
          number: "03",
          title: "هندسة البرمجيات المخصصة (Custom Software Engineering)",
          description:
            "تطوير منصات برمجية متكاملة وتطبيقات ويب مؤسسية وأنظمة خلفية عالية الاعتمادية مصممة خصيصاً لمتطلبات العمل وقابلة للتوسع المستمر.",
          capabilities: [
            "تطبيقات الويب المؤسسية (Enterprise Web Applications)",
            "تطوير منصات البرمجيات كخدمة (SaaS Platform Development)",
            "الأنظمة الخلفية والواجهات البرمجية (Backend Systems & APIs)",
            "منصات إدارة الأعمال المخصصة (Custom Business Management Platforms)",
            "تطوير التطبيقات المتكاملة (Full-Stack Application Development)",
            "بنية برمجية قابلة للتوسع (Scalable Software Infrastructure)",
          ],
          tags: ["TypeScript", "Next.js", "React", "FastAPI", "SaaS Platforms"],
          note: null,
          Icon: Eye,
        },
        {
          id: "cloud-architecture",
          number: "04",
          title: "معمارية الأنظمة والهندسة السحابية (System Architecture & Cloud Engineering)",
          description:
            "بناء الأساس المعماري والسحابي الذي يضمن استقرار الأنظمة وأمانها وقابليتها للتوسع والتكامل السلس مع الخدمات الخارجية.",
          capabilities: [
            "الأنظمة الموزعة والخدمات المصغرة (Distributed Systems & Microservices)",
            "المعمارية السحابية والنشر (Cloud Architecture & Deployment)",
            "أتمتة العمليات والتكامل والنشر المستمر (DevOps & CI/CD)",
            "معمارية قواعد البيانات (Database Architecture)",
            "تكامل الواجهات البرمجية والأنظمة الخارجية (API & Third-Party Integrations)",
            "أداء الأنظمة وقابليتها للتوسع (System Performance & Scalability)",
          ],
          tags: ["Cloud Architecture", "Microservices", "Docker & CI/CD", "PostgreSQL", "System Integration"],
          note: "تظل خبرتنا في الرؤية الحاسوبية وذكاء الحافة (كما في منتج AEGIS) جزءاً أصيلاً من رصيدنا الهندسي ضمن محفظة المنتجات والابتكار.",
          Icon: Camera,
        },
      ] as const)
    : ([
        {
          id: "ai-engineering",
          number: "01",
          title: "AI Engineering & Intelligent Agents",
          description:
            "Designing and engineering production-grade AI systems, multi-agent workflows, and retrieval architectures that connect cleanly to your business data and operational rules.",
          capabilities: [
            "AI Agents and multi-agent workflows",
            "Generative AI applications",
            "Enterprise RAG and knowledge systems",
            "LLM integration and deployment",
            "AI-powered business applications",
            "Custom AI solutions",
          ],
          tags: ["AI Agents", "Enterprise RAG", "LLM Integration", "Python", "Applied AI"],
          note: "Transparency Note: Listed services represent HIRZEXA's engineering capabilities; we explicitly distinguish demonstrated engineering capabilities and internal products from commercial client case studies.",
          Icon: Cpu,
        },
        {
          id: "process-automation",
          number: "02",
          title: "Business Process Automation",
          description:
            "Replacing manual bottlenecks with resilient, API-driven workflows that synchronize CRM systems, process documents, automate reporting, and streamline customer operations.",
          capabilities: [
            "Internal business workflow automation",
            "CRM and operational automation",
            "Automated reporting and document processing",
            "API-driven workflows",
            "Cross-platform integration",
            "Intelligent customer support systems",
          ],
          tags: ["Workflow Automation", "CRM Pipelines", "Document Processing", "Webhooks", "APIs"],
          note: null,
          Icon: MonitorPlay,
        },
        {
          id: "custom-software",
          number: "03",
          title: "Custom Software Engineering",
          description:
            "End-to-end software engineering for enterprise web applications, SaaS platforms, custom internal tools, and high-reliability backend services built to support business growth.",
          capabilities: [
            "Enterprise web applications",
            "SaaS platform development",
            "Backend systems and APIs",
            "Custom business management platforms",
            "Full-stack application development",
            "Scalable software infrastructure",
          ],
          tags: ["TypeScript", "Next.js", "React", "FastAPI", "SaaS Platforms"],
          note: null,
          Icon: Eye,
        },
        {
          id: "cloud-architecture",
          number: "04",
          title: "System Architecture & Cloud Engineering",
          description:
            "Architecting distributed backend systems, database schemas, CI/CD pipelines, and third-party API integrations engineered for security, observability, and long-term scale.",
          capabilities: [
            "Distributed systems and microservices",
            "Cloud architecture and deployment",
            "DevOps and CI/CD",
            "Database architecture",
            "API and third-party integrations",
            "System performance and scalability",
          ],
          tags: ["Cloud Architecture", "Microservices", "Docker & CI/CD", "PostgreSQL", "System Integration"],
          note: "Our applied Computer Vision and Edge AI experience remains an active part of our engineering heritage and is demonstrated in our AEGIS product.",
          Icon: Camera,
        },
      ] as const);

  return (
    <main className="expertise-new">
      <CompanyPageIntro
        eyebrow={ar ? "هيرزيكسا — هندسة الذكاء الاصطناعي والأنظمة البرمجية" : "HIRZEXA / CORE ENGINEERING SERVICES"}
        title={
          ar
            ? "نُهندس أنظمة برمجية ذكية تصنع الفارق."
            : "We Engineer Intelligent Software Systems."
        }
        description={
          ar
            ? "تتوزع قدراتنا الهندسية على أربعة أقسام رئيسية — هندسة الذكاء الاصطناعي والوكلاء، وأتمتة العمليات التجارية، وهندسة البرمجيات المخصصة، ومعمارية الأنظمة والسحابة — لمساعدة المؤسسات على بناء حلول تقنية موثوقة."
            : "Our engineering practice spans four core divisions—AI Engineering & Intelligent Agents, Business Process Automation, Custom Software Engineering, and System Architecture & Cloud Engineering—helping businesses design, build, and deploy reliable technology solutions."
        }
        actionLabel={ar ? "استكشف الأقسام الأربعة" : "Explore the 4 divisions"}
        actionHref="#pillars"
        secondaryLabel={ar ? "ناقش مشروعك" : "Discuss a project"}
        secondaryHref="/contact"
        detailsTitle={ar ? "الأقسام الهندسية الأربعة" : "FOUR ENGINEERING DIVISIONS"}
        details={
          ar
            ? [
                "هندسة الذكاء الاصطناعي والوكلاء وأنظمة المعرفة (RAG)",
                "أتمتة العمليات التجارية وتكامل الأنظمة",
                "هندسة البرمجيات المخصصة والمعمارية السحابية",
              ]
            : [
                "AI Engineering, Intelligent Agents & Enterprise RAG",
                "Business Process & Workflow Automation",
                "Custom Software, SaaS & Cloud System Architecture",
              ]
        }
        videoSrc="/videos/human-ai-technology.mp4"
        videoPoster="/human-ai-technology.jpg"
        videoBadge={ar ? "هندسة الذكاء الاصطناعي والبرمجيات" : "AI & SOFTWARE ENGINEERING"}
        videoTitle={
          ar
            ? "أنظمة ذكية ومعمارية برمجية متكاملة"
            : "Intelligent Systems & Scalable Software Architecture"
        }
        videoSubtitle={
          ar
            ? "وكلاء الذكاء الاصطناعي · الأتمتة · البرمجيات · السحابة"
            : "AI Agents · Process Automation · Custom Software · Cloud"
        }
        videoTelemetry="AI & SOFTWARE ENGINEERING"
      />

      <section className="expertise-capabilities-new" id="pillars">
        <div className="container">
          <div className="expertise-capabilities-head">
            <div>
              <span className="expertise-kicker">
                {ar ? "01 / الأقسام الهندسية الأساسية" : "01 / CORE ENGINEERING DIVISIONS"}
              </span>
              <h2>
                {ar ? (
                  <>
                    انضباط هندسي في كل <span>طبقة.</span>
                  </>
                ) : (
                  <>
                    Engineering discipline in every <span>layer.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نجمع بين هندسة الذكاء الاصطناعي، وأتمتة سير العمل، وتطوير البرمجيات المتكاملة، والبنية السحابية في منظومة هندسية واحدة."
                : "From intelligent agents and workflow automation to custom full-stack platforms and cloud infrastructure."}
            </p>
          </div>

          <div className="expertise-pillars-grid">
            {pillars.map(({ id, number, title, description, capabilities, tags, note, Icon }) => (
              <article
                id={id}
                key={id}
                className={`expertise-capability-card expertise-card-${number}`}
              >
                <div>
                  <div className="expertise-card-top">
                    <span>{number} / ENGINEERING DIVISION</span>
                    <span className="expertise-card-icon">
                      <Icon size={21} />
                    </span>
                  </div>
                  <div className="expertise-card-content">
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <ul className="expertise-pillar-list">
                      {capabilities.map((cap) => (
                        <li key={cap}>{cap}</li>
                      ))}
                    </ul>
                    {note ? <p className="expertise-stage-note">{note}</p> : null}
                  </div>
                </div>
                <div className="expertise-card-tags">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="expertise-card-art" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="expertise-vision-new">
        <div className="container expertise-vision-layout">
          <div>
            <span className="expertise-kicker">
              {ar ? "02 / من المعمارية إلى التشغيل" : "02 / FROM ARCHITECTURE TO PRODUCTION"}
            </span>
            <div className="expertise-vision-mark" aria-hidden="true">
              ✳
            </div>
          </div>
          <div>
            <h2>
              {ar ? (
                <>
                  النموذج هو البداية فقط.
                  <br />
                  <span>نحن نهندس النظام البرمجي الكامل.</span>
                </>
              ) : (
                <>
                  An AI model is only one component.
                  <br />
                  <span>We engineer the complete software system.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نربط نماذج الذكاء الاصطناعي والوكلاء الأذكياء بالواجهات البرمجية، وقواعد البيانات، ومسارات الأتمتة، وتطبيقات الويب المؤسسية لنساعد الشركات على تحسين الكفاءة التشغيلية ودعم النمو."
                : "We connect AI models and intelligent agents with resilient backend APIs, database architectures, automated workflows, and modern web applications—delivering software systems businesses can rely on."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <Link href="/engineering" className="expertise-text-link">
                {ar ? "استكشف منهجيتنا الهندسية" : "Explore our engineering methodology"}{" "}
                <ArrowUpRight size={16} />
              </Link>
              <Link href="/ai-architect" className="expertise-text-link">
                {ar ? "جرّب معماري الأنظمة الذكي" : "Try Interactive AI System Architect"}{" "}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="expertise-next-new">
        <div className="container">
          <div>
            <span className="expertise-kicker">
              {ar ? "مشاريع الذكاء الاصطناعي والبرمجيات" : "AI & SOFTWARE ENGINEERING PROJECTS"}
            </span>
            <h2>
              {ar ? (
                <>
                  هل تخطط لبناء نظام ذكي أو منصة برمجية؟
                  <br />
                  <span>لنتحدث عن معماريتك.</span>
                </>
              ) : (
                <>
                  Planning an AI, automation, or software project?
                  <br />
                  <span>Let&apos;s architect it together.</span>
                </>
              )}
            </h2>
          </div>
          <Link href="/contact" className="expertise-primary-link">
            {ar ? "تواصل مع فريقنا الهندسي" : "Discuss your project"}
            <span>
              <ArrowUpRight size={17} />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}

