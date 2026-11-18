import type { Metadata } from "next";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import {
  ArrowUpRight,
  Building2,
  Factory,
  Home,
  ShieldAlert,
  Store,
} from "lucide-react";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";
import "../solutions/solutions.css";

export const metadata: Metadata = createPageMetadata({
  title: "Solutions — Enterprise AI, Process Automation, Custom Platforms & Cloud",
  description:
    "Explore HIRZEXA's engineering solutions across Intelligent Agents & Enterprise RAG, Business Process Automation, Custom Web & SaaS Platforms, System Integration, and AEGIS Visual Safety.",
  path: "/applications",
  eyebrow: "HIRZEXA / SOLUTIONS & APPLICATIONS",
  badge: "INTELLIGENT SOFTWARE SOLUTIONS",
  headline: "Intelligent software solutions for real business operations.",
  summary:
    "AI agents, enterprise RAG, automated operational workflows, custom SaaS platforms, cloud integrations, and AEGIS visual safety.",
  chips: ["Enterprise AI & Agents", "Workflow Automation", "Custom SaaS & Cloud"],
  scene: "aegis",
  telemetry: "SOLUTIONS · AI & SOFTWARE ENGINEERING",
});

export default async function ApplicationsPage() {
  const ar = (await getLocale()) === "ar";

  const applications = ar
    ? ([
        {
          id: "ai-assistants-rag",
          number: "01",
          domain: "الوكلاء الأذكياء وإدارة المعرفة · AI Agents & Enterprise RAG",
          status: "قدرة هندسية وتطبيقية · Engineering Capability",
          statusType: "active",
          title: "وكلاء ذكاء اصطناعي وأنظمة استرجاع معرفة مؤسسية (Enterprise RAG).",
          description:
            "تصميم تطبيقات ذكاء اصطناعي توليدي ووكلاء متعددي المهام يرتبطون بمستندات المؤسسة وقواعد بياناتها للإجابة الدقيقة، وأتمتة البحث الداخلي، ودعم اتخاذ القرار.",
          scenario:
            "نطاق الحل: بناء مسار استرجاع معزز (RAG) ووكلاء أذكياء مقيدين بصلاحيات المؤسسة ومصادرها الرسمية مع مراجعة بشرية واضحة.",
          tags: ["وكلاء الذكاء الاصطناعي", "Enterprise RAG", "تكامل LLMs", "تطبيقات الأعمال"],
          category: "Product Demos & Business",
          Icon: Home,
        },
        {
          id: "workflow-automation",
          number: "02",
          domain: "أتمتة العمليات وسير العمل · Business Process Automation",
          status: "قدرة هندسية وتطبيقية · Engineering Capability",
          statusType: "active",
          title: "أتمتة سير العمل الداخلي، أنظمة CRM، ومعالجة المستندات.",
          description:
            "استبدال العمليات اليدوية المتكررة بمسارات عمل آلية تربط أنظمة إدارة العملاء (CRM)، وتستخرج البيانات من المستندات، وتنشئ التقارير التشغيلية، وتدعم خدمة العملاء الذكية.",
          scenario:
            "نطاق الحل: ربط نماذج الإدخال وأنظمة CRM وواجهات البرمجة (APIs) في مسار أتمتة موحد يقلل زمن المعالجة والأخطاء التشغيلية.",
          tags: ["أتمتة سير العمل", "تكامل CRM", "معالجة المستندات", "واجهات APIs"],
          category: "Product Demos & Business",
          Icon: Store,
        },
        {
          id: "custom-saas-platforms",
          number: "03",
          domain: "المنصات البرمجية وتطبيقات المؤسسات · Custom Software & SaaS",
          status: "منصات برمجية حية وقدرة هندسية · Live Platform & Capability",
          statusType: "active",
          title: "تطوير تطبيقات الويب المؤسسية ومنصات SaaS وأنظمة الإدارة.",
          description:
            "هندسة منصات برمجية متكاملة (Full-Stack) وتطبيقات ويب مخصصة بواجهات حديثة وأنظمة خلفية متينة لإدارة العمليات والمجتمعات والخدمات الرقمية.",
          scenario:
            "مثال حي (منصة خير — Khair): منصة رقمية حية لاكتشاف الفعاليات وإدارة المجتمعات والمنظمين، تبرهن قدراتنا في هندسة المنصات المتكاملة.",
          tags: ["منصات SaaS", "تطبيقات المؤسسات", "Full-Stack", "واجهات خلفية APIs"],
          category: "Product Demos & Business",
          Icon: Building2,
        },
        {
          id: "cloud-system-integration",
          number: "04",
          domain: "معمارية الأنظمة والتكامل السحابي · System & Cloud Integration",
          status: "قدرة هندسية وتطبيقية · Engineering Capability",
          statusType: "active",
          title: "أنظمة موزعة، بنية سحابية، وتكامل مع الأنظمة الخارجية.",
          description:
            "تصميم وتنفيذ الأنظمة الخلفية، والخدمات المصغرة (Microservices)، ومعمارية قواعد البيانات، وخطوط النشر المستمر (CI/CD) لضمان الأداء العالي وقابلية التوسع.",
          scenario:
            "نطاق الحل: توحيد البيانات والخدمات المتفرقة عبر طبقة API آمنة وقابلة للتوسع مع مراقبة مستمرة للأداء.",
          tags: ["الأنظمة الموزعة", "المعمارية السحابية", "DevOps & CI/CD", "قواعد البيانات"],
          category: "Product Demos & Business",
          Icon: Factory,
        },
        {
          id: "safety-security",
          number: "05",
          domain: "المنتجات والابتكار · AEGIS — السلامة البصرية والرؤية الحاسوبية",
          status: "منتج هندسي مبرهن · Demonstrated Engineering Product",
          statusType: "active",
          title: "تحليل الفيديو الذكي، كشف الأجسام وتتبعها، ومراقبة الأحداث (AEGIS).",
          description:
            "يستعرض منتج AEGIS خبرتنا التقنية في الرؤية الحاسوبية وذكاء الحافة من خلال تحليل بث الكاميرات وكشف الأجسام وتتبعها وتقييم المخاطر المساعد للمشغلين.",
          scenario:
            "منتج AEGIS: حاصل على المركز الثاني في مسابقة الإبداع والابتكار (إسطنبول 2026) مع نتيجة تقييم داخلية 95.3% في اختبارات المراقبة المنضبطة.",
          tags: ["AEGIS", "السلامة البصرية", "الرؤية الحاسوبية", "مراقبة الأحداث"],
          category: "AEGIS AI Commercial",
          Icon: ShieldAlert,
        },
      ] as const)
    : ([
        {
          id: "ai-assistants-rag",
          number: "01",
          domain: "AI Agents & Enterprise Knowledge",
          status: "Demonstrated Engineering Capability",
          statusType: "active",
          title: "Multi-agent workflows and Enterprise RAG knowledge systems.",
          description:
            "Engineering generative AI applications and intelligent agents grounded in your organization's internal documents, databases, and APIs for accurate retrieval and decision support.",
          scenario:
            "Solution Scope: Permission-aware RAG pipelines and tool-using AI agents with structured output validation and human-in-the-loop review.",
          tags: ["AI Agents", "Enterprise RAG", "LLM Integration", "Knowledge Systems"],
          category: "Product Demos & Business",
          Icon: Home,
        },
        {
          id: "workflow-automation",
          number: "02",
          domain: "Business Process Automation",
          status: "Demonstrated Engineering Capability",
          statusType: "active",
          title: "Internal workflow, CRM, and document automation.",
          description:
            "Eliminating repetitive operational tasks with API-driven pipelines that synchronize CRM platforms, process documents, generate automated reports, and power intelligent customer support.",
          scenario:
            "Solution Scope: End-to-end event and webhook orchestration connecting intake forms, document extraction, CRM updates, and team notifications.",
          tags: ["Workflow Automation", "CRM Integration", "Document Processing", "API Pipelines"],
          category: "Product Demos & Business",
          Icon: Store,
        },
        {
          id: "custom-saas-platforms",
          number: "03",
          domain: "Custom Software & SaaS Platforms",
          status: "Live Platform & Engineering Capability",
          statusType: "active",
          title: "Enterprise web applications, SaaS platforms, and backend APIs.",
          description:
            "Full-stack software engineering for custom business management systems, multi-tenant SaaS products, and high-reliability backend services tailored to operational requirements.",
          scenario:
            "Demonstrated Platform (Khair): Our live web and mobile-ready community and events platform demonstrating full-stack product architecture and deployment.",
          tags: ["Enterprise Web Apps", "SaaS Platforms", "Full-Stack", "Backend & APIs"],
          category: "Product Demos & Business",
          Icon: Building2,
        },
        {
          id: "cloud-system-integration",
          number: "04",
          domain: "System Architecture & Cloud Integration",
          status: "Demonstrated Engineering Capability",
          statusType: "active",
          title: "Distributed systems, cloud deployment, and third-party integrations.",
          description:
            "Designing scalable software infrastructure, database schemas, containerized microservices, and CI/CD pipelines that keep complex systems fast, observable, and maintainable.",
          scenario:
            "Solution Scope: Unifying legacy and third-party services behind resilient API gateways, structured data layers, and automated cloud deployments.",
          tags: ["Distributed Systems", "Cloud & DevOps", "Database Architecture", "API Integration"],
          category: "Product Demos & Business",
          Icon: Factory,
        },
        {
          id: "safety-security",
          number: "05",
          domain: "Products & Innovation · AEGIS",
          status: "Demonstrated Engineering Product",
          statusType: "active",
          title: "AI-Powered Visual Safety & Computer Vision (AEGIS).",
          description:
            "AEGIS is an engineering product in HIRZEXA's portfolio demonstrating intelligent video analysis, object detection, multi-object tracking, and human-in-the-loop event monitoring.",
          scenario:
            "Product Achievement (AEGIS): Recognized with 2nd Place in Istanbul (2026) and a 95.3% reported internal evaluation result across controlled testing scenarios.",
          tags: ["AEGIS Product", "Visual Safety", "Computer Vision", "Event Monitoring"],
          category: "AEGIS AI Commercial",
          Icon: ShieldAlert,
        },
      ] as const);

  return (
    <main className="solutions-new">
      <CompanyPageIntro
        eyebrow={ar ? "هيرزيكسا — الحلول والتطبيقات الهندسية" : "HIRZEXA / SOLUTIONS & APPLICATIONS"}
        title={
          ar
            ? "حلول برمجية وذكاء اصطناعي لتحديات الأعمال."
            : "Intelligent software solutions for real business challenges."
        }
        description={
          ar
            ? "نساعد المؤسسات على تصميم وبناء وتشغيل أنظمة الأتمتة الذكية، وتطبيقات الذكاء الاصطناعي، والمنصات البرمجية المخصصة، وتكامل الأنظمة — إلى جانب منتجاتنا الابتكارية مثل AEGIS وخير."
            : "We help businesses design, build, and deploy intelligent automation, AI-powered applications, scalable software platforms, and system integrations—alongside our proprietary products like Khair and AEGIS."
        }
        actionLabel={ar ? "استكشف مجالات الحلول" : "Explore solutions"}
        actionHref="#applications"
        secondaryLabel={ar ? "ناقش مشروعك" : "Discuss a project"}
        secondaryHref="/contact"
        detailsTitle={ar ? "مجالات الحلول والمنتجات" : "SOLUTIONS & PRODUCT DOMAINS"}
        details={
          ar
            ? [
                "وكلاء الذكاء الاصطناعي وأنظمة المعرفة المؤسسية (RAG)",
                "أتمتة العمليات التجارية وتطوير المنصات البرمجية المخصصة",
                "معمارية السحابة وتكامل الأنظمة ومنتجات الابتكار (AEGIS وخير)",
              ]
            : [
                "AI Agents, Enterprise RAG & Intelligent Automation",
                "Custom Web Applications, SaaS Platforms & Backend APIs",
                "Cloud Architecture, Integrations & Products (Khair & AEGIS)",
              ]
        }
        videoSrc="/videos/human-ai-about.mp4"
        videoPoster="/human-ai-about.jpg"
        videoBadge={ar ? "حلول الذكاء الاصطناعي والبرمجيات" : "AI & SOFTWARE SOLUTIONS"}
        videoTitle={
          ar
            ? "برمجيات ذكية مصممة للكفاءة التشغيلية والنمو"
            : "Software Systems Engineered for Operational Efficiency"
        }
        videoSubtitle={
          ar
            ? "الوكلاء الأذكياء · الأتمتة · المنصات · التكامل السحابي"
            : "AI Agents · Automation · Custom Platforms · Cloud"
        }
        videoTelemetry="ENTERPRISE AI & SOFTWARE"
      />

      <section className="solutions-areas-new" id="applications">
        <div className="container">
          <div className="solutions-areas-head">
            <div>
              <span className="solutions-kicker">
                {ar ? "01 / الحلول الهندسية وتطبيقات الأعمال" : "01 / ENGINEERING SOLUTIONS & APPLICATIONS"}
              </span>
              <h2>
                {ar ? (
                  <>
                    حيث تلتقي هندسة البرمجيات <span>باحتياجات المؤسسات.</span>
                  </>
                ) : (
                  <>
                    Where software engineering meets <span>operational impact.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نميّز بشفافية بين قدراتنا الهندسية القابلة للتنفيذ للمؤسسات وبين منصاتنا ومنتجاتنا المبرهنة (مثل منصة خير ومنتج AEGIS)."
                : "We clearly distinguish our core engineering capabilities for client systems from our demonstrated internal products and live platforms (Khair and AEGIS)."}
            </p>
          </div>

          <div className="solutions-area-grid">
            {applications.map(
              ({
                id,
                number,
                domain,
                status,
                statusType,
                title,
                description,
                scenario,
                tags,
                category,
                Icon,
              }) => (
                <article
                  id={id}
                  key={id}
                  className={`solutions-area-card solutions-area-${number}`}
                >
                  <div style={{ width: "100%" }}>
                    <div className="solutions-area-top">
                      <span>
                        {number} / {domain}
                      </span>
                      <span className="solutions-area-icon">
                        <Icon size={21} />
                      </span>
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <span
                        className={`solutions-status-badge ${
                          statusType === "active"
                            ? "solutions-status-active"
                            : "solutions-status-planned"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="solutions-area-content">
                      <h3>{title}</h3>
                      <p>{description}</p>
                      <div className="solutions-scenario-box">{scenario}</div>
                      <div className="solutions-area-tags">
                        {tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/contact?category=${encodeURIComponent(category)}`}
                    className="solutions-area-link"
                  >
                    {ar ? "ناقش هذا الحل" : "Discuss this solution"}{" "}
                    <ArrowUpRight size={15} />
                  </Link>
                  <div className="solutions-area-art" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      <section className="solutions-vision-new">
        <div className="container solutions-vision-layout">
          <div>
            <span className="solutions-kicker">
              {ar ? "02 / معاييرنا الهندسية" : "02 / ENGINEERING STANDARDS"}
            </span>
            <div className="solutions-vision-mark" aria-hidden="true">
              ✳
            </div>
          </div>
          <div>
            <h2>
              {ar ? (
                <>
                  أنظمة ذكية موثوقة
                  <br />
                  <span>ومصممة للنمو والتوسع.</span>
                </>
              ) : (
                <>
                  Reliable software systems
                  <br />
                  <span>engineered for scale and clarity.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نلتزم بمعايير هندسة البرمجيات الرصينة: معمارية واضحة، وتكامل آمن للواجهات البرمجية، وإشراف بشري منظم على مخرجات الذكاء الاصطناعي والأتمتة."
                : "Every solution we architect prioritizes clean system boundaries, secure API integrations, observable performance, and human-in-the-loop governance for AI workflows."}
            </p>
            <Link href="/engineering" className="solutions-text-link">
              {ar ? "تعرّف على منهجيتنا الهندسية" : "Explore our software & AI engineering practice"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="solutions-next-new">
        <div className="container">
          <div>
            <span className="solutions-kicker">
              {ar ? "حلول مخصصة للأعمال" : "CUSTOM ENGINEERING SOLUTIONS"}
            </span>
            <h2>
              {ar ? (
                <>
                  هل لديك تحدٍ تقني أو تشغيلي؟
                  <br />
                  <span>لنتحدث عن المتطلبات.</span>
                </>
              ) : (
                <>
                  Have a software or automation challenge?
                  <br />
                  <span>Let&apos;s scope the system.</span>
                </>
              )}
            </h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <a
              href={companyMailto("business", "HIRZEXA Solutions & Engineering Inquiry")}
              className="solutions-primary-link"
              aria-label={`${ar ? "استفسارات الأعمال والحلول" : "Business inquiries"}: ${COMPANY_EMAILS.business}`}
            >
              <span dir="ltr" style={{ width: "auto", height: "auto", background: "transparent", borderRadius: 0, color: "inherit", paddingInline: "6px" }}>
                {COMPANY_EMAILS.business}
              </span>
              <span>
                <ArrowUpRight size={17} />
              </span>
            </a>
            <Link href="/contact?category=Product%20Demos%20%26%20Business" className="solutions-primary-link">
              {ar ? "ناقش متطلبات عملك" : "Discuss your project"}
              <span>
                <ArrowUpRight size={17} />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

