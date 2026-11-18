import type { Metadata } from "next";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { ArrowUpRight, Camera, Cpu, Eye, MonitorPlay, MoveUpRight } from "lucide-react";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";
import { RecognitionSection } from "@/components/recognition/RecognitionSection";
import { FounderAndTeamSection } from "@/components/team/FounderAndTeamSection";
import "./about.css";

export const metadata: Metadata = createPageMetadata({
  title: "About — AI & Software Engineering Company",
  description:
    "HIRZEXA is an AI and software engineering company specializing in intelligent automation, AI-powered applications, scalable software platforms, and complex system integrations.",
  path: "/about",
  eyebrow: "HIRZEXA / ABOUT THE COMPANY",
  badge: "WE ENGINEER INTELLIGENT SOFTWARE SYSTEMS",
  headline: "We Engineer Intelligent Software Systems.",
  summary:
    "HIRZEXA helps businesses design, build, and deploy intelligent automation, AI-powered applications, scalable software platforms, and complex system integrations.",
  chips: ["AI & Software Engineering", "Intelligent Automation", "Custom Platforms & Cloud"],
  scene: "about",
  telemetry: "AI & SOFTWARE ENGINEERING COMPANY",
});

export default async function AboutPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const pillars = ar
    ? ([
        [
          "01",
          "هندسة الذكاء الاصطناعي والوكلاء والأتمتة",
          "نصمم ونبني وكلاء الذكاء الاصطناعي، وأنظمة المعرفة المؤسسية (RAG)، ومسارات أتمتة العمليات التجارية التي ترفع الكفاءة التشغيلية.",
          "/services#ai-engineering",
          Cpu,
        ],
        [
          "02",
          "هندسة البرمجيات المخصصة والمعمارية السحابية",
          "نطوّر تطبيقات الويب المؤسسية، ومنصات SaaS، والأنظمة الخلفية الموزعة، وتكاملات الواجهات البرمجية القابلة للتوسع.",
          "/services#custom-software",
          MonitorPlay,
        ],
        [
          "03",
          "المنتجات والابتكار التطبيقي (خير وAEGIS)",
          "نبرهن قدراتنا الهندسية عبر منصات برمجية حية مثل (خير) ومنتجات الذكاء الاصطناعي والرؤية الحاسوبية مثل (AEGIS).",
          "/products",
          Eye,
        ],
      ] as const)
    : ([
        [
          "01",
          "AI Engineering, Intelligent Agents & Automation",
          "We design and deploy AI agents, Enterprise RAG knowledge systems, LLM integrations, and workflow automation that streamline real operations.",
          "/services#ai-engineering",
          Cpu,
        ],
        [
          "02",
          "Custom Software & Cloud System Architecture",
          "We engineer enterprise web applications, SaaS platforms, resilient backend APIs, and distributed cloud infrastructure built for scale.",
          "/services#custom-software",
          MonitorPlay,
        ],
        [
          "03",
          "Products & Applied Innovation (Khair & AEGIS)",
          "We demonstrate our engineering depth through live platforms like Khair and applied AI products like AEGIS (Visual Safety & Computer Vision).",
          "/products",
          Eye,
        ],
      ] as const);

  const roadmapStages = ar
    ? ([
        [
          "الركيزة 01 · خدماتنا الهندسية",
          "أنظمة الذكاء الاصطناعي وأتمتة العمليات والبرمجيات المخصصة",
          "تصميم وبناء وتكامل تطبيقات الذكاء الاصطناعي، ومسارات الأتمتة، والمنصات البرمجية القابلة للتوسع للمؤسسات.",
          "/services",
          Cpu,
        ],
        [
          "الركيزة 02 · المنتجات والمنصات",
          "منصة خير (Khair) ومنتج السلامة البصرية (AEGIS)",
          "تطوير وتشغيل منصاتنا البرمجية الحية ومنتجات الابتكار في الرؤية الحاسوبية وتحليل الفيديو الذكي.",
          "/products",
          MonitorPlay,
        ],
        [
          "الركيزة 03 · البحث والتطوير المستقبلي",
          "الأنظمة الذكية المتقدمة وتكامل البرمجيات والعتاد",
          "مواصلة البحث الهندسي في الوكلاء المستقلين، والأنظمة الموزعة، وتكامل البرمجيات مع الأجهزة الطرفية الذكية.",
          "/engineering",
          Camera,
        ],
      ] as const)
    : ([
        [
          "FOCUS 01 · CORE ENGINEERING SERVICES",
          "AI Engineering, Process Automation & Custom Software",
          "Helping businesses design, build, and deploy AI agents, workflow automation, custom SaaS platforms, and cloud integrations.",
          "/services",
          Cpu,
        ],
        [
          "FOCUS 02 · PRODUCTS & INNOVATION",
          "Live Platforms (Khair) & Applied Vision Products (AEGIS)",
          "Advancing our proprietary software portfolio including the live Khair community platform and the award-winning AEGIS visual safety system.",
          "/products",
          MonitorPlay,
        ],
        [
          "FOCUS 03 · ONGOING R&D DIRECTION",
          "Autonomous Systems & Edge-Cloud Architectures",
          "Continuing applied research across multi-agent orchestration, high-reliability distributed software, and intelligent edge-cloud systems.",
          "/engineering",
          Camera,
        ],
      ] as const);

  return (
    <main className="about-new">
      <CompanyPageIntro
        eyebrow={
          ar
            ? "هيرزيكسا — هندسة الذكاء الاصطناعي والأنظمة البرمجية"
            : "HIRZEXA / AI & SOFTWARE ENGINEERING"
        }
        title={
          ar ? "نُهندس أنظمة برمجية ذكية تصنع الفارق." : "We Engineer Intelligent Software Systems."
        }
        description={
          ar
            ? "هيرزيكسا (HIRZEXA) هي شركة متخصصة في هندسة الذكاء الاصطناعي والأنظمة البرمجية، نركز على الأتمتة الذكية، والتطبيقات المدعومة بالذكاء الاصطناعي، والمنصات البرمجية القابلة للتوسع، وتكامل الأنظمة المعقدة. نساعد المؤسسات على تصميم وبناء وتشغيل حلول تقنية موثوقة تعزز الكفاءة التشغيلية وتدعم نمو الأعمال."
            : "HIRZEXA is an AI and software engineering company specializing in intelligent automation, AI-powered applications, scalable software platforms, and complex system integrations. We help businesses design, build, and deploy reliable technology solutions that improve operational efficiency and support business growth."
        }
        actionLabel={ar ? "استكشف خدماتنا الهندسية" : "Explore our services"}
        actionHref="/services"
        secondaryLabel={ar ? "المنتجات والابتكار" : "Products & Innovation"}
        secondaryHref="/products"
        detailsTitle={ar ? "هويتنا الهندسية" : "COMPANY POSITIONING"}
        details={
          ar
            ? [
                "هندسة الذكاء الاصطناعي والوكلاء وأتمتة العمليات",
                "تطوير البرمجيات المخصصة والمنصات والمعمارية السحابية",
                "محفظة منتجات وابتكارات تطبيقية (منصة خير ومنتج AEGIS)",
              ]
            : [
                "AI & Software Engineering Company",
                "Intelligent Automation, Enterprise AI & Custom Software",
                "Scalable Cloud Architecture & Products (Khair & AEGIS)",
              ]
        }
        videoSrc="/videos/human-ai-about.mp4"
        videoPoster="/human-ai-about.jpg"
        videoBadge={ar ? "هندسة الذكاء الاصطناعي والبرمجيات" : "AI & SOFTWARE ENGINEERING"}
        videoTitle={
          ar
            ? "نُهندس أنظمة برمجية ذكية تصنع الفارق"
            : "We Engineer Intelligent Software Systems"
        }
        videoSubtitle={
          ar
            ? "وكلاء الذكاء الاصطناعي، الأتمتة، والمنصات البرمجية القابلة للتوسع"
            : "Intelligent automation, AI applications & scalable software platforms"
        }
        videoTelemetry="HIRZEXA · ENGINEERING"
      />

      {/* Section 01: Company Story & Long-Term Vision */}
      <section className="about-vision-new" id="our-vision">
        <div className="container about-vision-grid">
          <div className="about-vision-label">
            <span className="about-kicker">
              {ar ? "01 / مهمتنا وهويتنا الهندسية" : "01 / MISSION & ENGINEERING IDENTITY"}
            </span>
            <span className="about-vision-star" aria-hidden="true">
              ✳
            </span>
          </div>
          <div>
            <h2>
              {ar ? (
                <>
                  نبني أنظمة برمجية ذكية تجمع بين <span>الذكاء الاصطناعي</span> والمعمارية الرصينة.
                </>
              ) : (
                <>
                  Engineering reliable <span>AI systems</span> and scalable software platforms.
                </>
              )}
            </h2>
            <p>
              {ar
                ? "في HIRZEXA، ننطلق من انضباط هندسي واضح: القيمة الحقيقية للذكاء الاصطناعي تتحقق عندما يُبنى داخل معمارية برمجية متينة وقابلة للتوسع. نساعد الشركات على أتمتة عملياتها، وتطوير تطبيقاتها ومنصاتها المخصصة، وربط أنظمتها المعقدة — مع الاستمرار في تطوير منتجاتنا الخاصة مثل منصة (خير) ونظام (AEGIS)."
                : "At HIRZEXA, our work is grounded in software architecture competence and practical engineering. We combine applied AI—including intelligent agents, RAG systems, and computer vision—with full-stack software engineering, process automation, and cloud infrastructure to solve real operational challenges."}
            </p>
            <Link href="/engineering" className="about-text-link">
              {ar ? "استكشف منهجيتنا ومعماريتنا الهندسية" : "Explore our software & AI engineering practice"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 02: Core Focus Pillars */}
      <section className="about-capabilities-new">
        <div className="container">
          <div className="about-capabilities-head">
            <div>
              <span className="about-kicker">
                {ar ? "02 / مرتكزاتنا الهندسية" : "02 / WHAT DRIVES OUR WORK"}
              </span>
              <h2>
                {ar ? (
                  <>
                    هندسة الذكاء الاصطناعي. الأتمتة.
                    <br />
                    <span>الأنظمة البرمجية المتكاملة.</span>
                  </>
                ) : (
                  <>
                    AI Engineering. Automation.
                    <br />
                    <span>Scalable Software Systems.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نربط الذكاء الاصطناعي التطبيقي بأتمتة العمليات ومعمارية البرمجيات الحديثة لبناء حلول يعتمد عليها."
                : "Every system we design prioritizes operational efficiency, architectural clarity, and production reliability."}
            </p>
          </div>

          <div className="about-capability-grid">
            {pillars.map(([number, title, description, href, Icon]) => (
              <Link key={number} href={href} className="about-capability">
                <div className="about-capability-top">
                  <span>{number} / HIRZEXA</span>
                  <Icon size={20} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span className="about-capability-arrow">
                  <MoveUpRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 03: Forward-Looking Planned Roadmap */}
      <section className="about-capabilities-new" id="roadmap" style={{ paddingTop: "10px" }}>
        <div className="container">
          <div className="about-capabilities-head">
            <div>
              <span className="about-kicker">
                {ar
                  ? "03 / نطاق أعمالنا ومحفظتنا التقنية"
                  : "03 / SERVICES, PRODUCTS & R&D PORTFOLIO"}
              </span>
              <h2>
                {ar ? (
                  <>
                    من حلول المؤسسات إلى
                    <br />
                    <span>المنتجات والابتكار التطبيقي.</span>
                  </>
                ) : (
                  <>
                    From enterprise software systems
                    <br />
                    <span>to applied product innovation.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نميّز بشفافية بين خدماتنا الهندسية للمؤسسات وبين منتجاتنا المبرهنة واتجاهات البحث المستقبلية."
                : "We clearly distinguish our engineering divisions from our internal product portfolio and ongoing R&D."}
            </p>
          </div>

          <div className="about-capability-grid">
            {roadmapStages.map(([phase, title, description, href, Icon]) => (
              <Link key={phase} href={href} className="about-capability">
                <div className="about-capability-top">
                  <span>{phase}</span>
                  <Icon size={20} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span className="about-capability-arrow">
                  <MoveUpRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <RecognitionSection locale={locale} variant="full" />

      <FounderAndTeamSection locale={locale} />

      {/* Section 04: Belief / CTA */}
      <section className="about-belief-new">
        <div className="container">
          <div>
            <span className="about-kicker">
              {ar ? "04 / التزامنا الهندسي" : "04 / OUR COMMITMENT"}
            </span>
            <h2>
              {ar ? (
                <>
                  أنظمة برمجية وذكاء اصطناعي.
                  <br />
                  <span>مصممة لتحديات الأعمال الحقيقية.</span>
                </>
              ) : (
                <>
                  Intelligent software systems.
                  <br />
                  <span>Engineered for real business growth.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نجمع بين هندسة الذكاء الاصطناعي، وأتمتة العمليات، ومعمارية البرمجيات القابلة للتوسع لبناء حلول ومنتجات تقنية تعتمد عليها المؤسسات."
                : "We combine AI engineering, intelligent automation, and scalable software architecture to build reliable technology systems that businesses trust."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px", marginTop: "18px", alignItems: "center" }}>
              <a
                dir="ltr"
                href={companyMailto("general", "Corporate inquiry — HIRZEXA")}
                className="about-text-link"
                style={{ marginTop: 0 }}
                aria-label={`${ar ? "الاستفسارات المؤسسية" : "Corporate inquiries"}: ${COMPANY_EMAILS.general}`}
              >
                {COMPANY_EMAILS.general} <ArrowUpRight size={15} />
              </a>
              <Link href="/partnerships" className="about-text-link" style={{ marginTop: 0 }}>
                {ar ? "الشراكات" : "Partnerships"} <ArrowUpRight size={15} />
              </Link>
              <Link href="/investors" className="about-text-link" style={{ marginTop: 0 }}>
                {ar ? "المستثمرون" : "Investors"} <ArrowUpRight size={15} />
              </Link>
              <Link href="/billing" className="about-text-link" style={{ marginTop: 0 }}>
                {ar ? "الفوترة والطلبات" : "Billing & Orders"} <ArrowUpRight size={15} />
              </Link>
              <Link href="/privacy" className="about-text-link" style={{ marginTop: 0 }}>
                {ar ? "الخصوصية" : "Privacy"} <ArrowUpRight size={15} />
              </Link>
              <Link href="/legal" className="about-text-link" style={{ marginTop: 0 }}>
                {ar ? "الشؤون القانونية" : "Legal"} <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <Link href="/contact?category=General%20Inquiries" className="about-primary-link">
            {ar ? "تواصل مع فريقنا" : "Start a conversation"}
            <span>
              <ArrowUpRight size={17} />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
