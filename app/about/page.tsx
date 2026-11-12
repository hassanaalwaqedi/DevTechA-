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
  title: "About — Computer Vision & Edge Intelligence Company",
  description:
    "HIRZEXA is a Computer Vision and Edge AI technology company developing accessible visual intelligence, edge inference systems, smart devices, and vision software platforms.",
  path: "/about",
  eyebrow: "HIRZEXA / ABOUT THE COMPANY",
  badge: "INTELLIGENCE THAT SEES THE WORLD",
  headline: "Intelligence that sees the world.",
  summary:
    "Developing accessible, intelligent visual technologies that combine computer vision models, Edge AI, smart hardware, and software.",
  chips: ["Computer Vision Company", "Edge AI & Smart Hardware", "Vision Software Platforms"],
  scene: "about",
  telemetry: "PRODUCT-ORIENTED VISION COMPANY",
});

export default async function AboutPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const pillars = ar
    ? ([
        [
          "01",
          "الابتكار بقيادة الهندسة والخبرة في الرؤية الحاسوبية",
          "نطوّر نماذج كشف الأجسام وتتبعها وتحليلات الفيديو الفورية المبنية للعمل في البيئات الواقعية.",
          "/technology#computer-vision",
          Eye,
        ],
        [
          "02",
          "الالتزام طويل المدى بذكاء الحافة (Edge AI)",
          "نحسّن نماذج الرؤية لتعمل محلياً على أجهزة الحافة بزمن استجابة منخفض وبنية تراعي الخصوصية.",
          "/technology#edge-ai",
          Cpu,
        ],
        [
          "03",
          "تكامل الأجهزة الذكية والبرمجيات",
          "نجمع بين الكاميرات ووحدات المعالجة المحلية ولوحات المراقبة وتطبيقات الهواتف في منظومة متكاملة.",
          "/products",
          Camera,
        ],
      ] as const)
    : ([
        [
          "01",
          "Computer Vision Expertise & Engineering-Led Innovation",
          "We engineer object detection, multi-object tracking, and real-time video analytics models built for real operating environments.",
          "/technology#computer-vision",
          Eye,
        ],
        [
          "02",
          "Long-Term Commitment to Edge AI",
          "We optimize neural perception to run locally at the camera and edge node—delivering low latency, bandwidth efficiency, and privacy-conscious operation.",
          "/technology#edge-ai",
          Cpu,
        ],
        [
          "03",
          "Hardware + Software Product Integration",
          "We unite optical sensors, edge processing units, monitoring dashboards, and mobile applications into cohesive products.",
          "/products",
          Camera,
        ],
      ] as const);

  const roadmapStages = ar
    ? ([
        [
          "المرحلة 01 · حالي",
          "أنظمة الرؤية الحاسوبية وذكاء السلامة (AEGIS AI)",
          "تطوير نماذج الإدراك البصري الفوري، وتتبع الأجسام، وتقييم المخاطر المساعد، ولوحات المراقبة البرمجية.",
          "/products#aegis-ai",
          MonitorPlay,
        ],
        [
          "المرحلة 02 · اتجاه مخطط (مفهوم مستقبلي)",
          "وحدات معالجة ذكاء الحافة والكاميرات الذكية",
          "استكشاف تصورات لأجهزة معالجة الحافة والكاميرات الذكية للمنازل والشركات مع تطبيقات إدارة متكاملة.",
          "/products#product-roadmap",
          Cpu,
        ],
        [
          "المرحلة 03 · رؤية طويلة المدى (مفهوم مستقبلي)",
          "الأجهزة البصرية المتقدمة والتقنيات القابلة للارتداء",
          "بناء جيل جديد من الأجهزة الذكية المملوكة للشركة ومنتجات الرؤية القابلة للارتداء وتطبيقات الفحص الصناعي.",
          "/applications#industrial-vision",
          Camera,
        ],
      ] as const)
    : ([
        [
          "PHASE 01 · CURRENT FOCUS",
          "Computer Vision & Safety Intelligence Software (AEGIS AI)",
          "Advancing real-time camera analysis, object tracking, event interpretation, assisted risk scoring, and operator monitoring dashboards.",
          "/products#aegis-ai",
          MonitorPlay,
        ],
        [
          "PHASE 02 · PLANNED DIRECTION (CONCEPT)",
          "Edge AI Devices & Smart Camera Concepts",
          "Exploring local Edge AI units, privacy-conscious smart cameras, and mobile/web device management concepts.",
          "/products#product-roadmap",
          Cpu,
        ],
        [
          "PHASE 03 · LONG-TERM VISION (CONCEPT)",
          "Proprietary Intelligent Devices & Wearable Vision",
          "Building a product-oriented technology company capable of engineering its own intelligent cameras, industrial vision systems, and future wearable vision hardware.",
          "/applications#industrial-vision",
          Camera,
        ],
      ] as const);

  return (
    <main className="about-new">
      <CompanyPageIntro
        eyebrow={
          ar
            ? "HIRZEXA / شركة الرؤية الحاسوبية وذكاء الحافة"
            : "HIRZEXA / COMPUTER VISION & EDGE INTELLIGENCE"
        }
        title={
          ar ? "الذكاء الذي يرى العالم." : "Intelligence that sees the world."
        }
        description={
          ar
            ? "مهمتنا هي تطوير تقنيات رؤية ذكية يسهل الوصول إليها، تجمع بين نماذج الرؤية الحاسوبية، والحوسبة على الحافة (Edge AI)، والأجهزة الذكية، والبرمجيات في منتجات عملية للمنازل والشركات والصناعة."
            : "Our mission is to develop accessible, intelligent visual technologies that combine computer vision models, edge computing, smart hardware, and software into practical products for homes, businesses, and industry."
        }
        actionLabel={ar ? "استكشف ركائزنا التقنية" : "Explore our technology"}
        actionHref="/technology"
        secondaryLabel={ar ? "اكتشف منتجاتنا" : "Discover our products"}
        secondaryHref="/products"
        detailsTitle={ar ? "هويتنا التقنية" : "COMPANY POSITIONING"}
        details={
          ar
            ? [
                "شركة تقنية متخصصة في الرؤية الحاسوبية وذكاء الحافة",
                "تكامل العتاد الذكي والبرمجيات البصرية",
                "رؤية طويلة المدى لهندسة أجهزة ومنصات ذكية خاصة",
              ]
            : [
                "Computer Vision & Edge Intelligence Company",
                "Hardware + software product engineering",
                "Accessible visual intelligence for homes, business & industry",
              ]
        }
        videoSrc="/videos/human-ai-about.mp4"
        videoPoster="/human-ai-about.jpg"
        videoBadge={ar ? "10 ثوانٍ · الذكاء الذي يرى العالم" : "10S REEL · HUMAN-AI VISION"}
        videoTitle={
          ar
            ? "ذكاء بصري يجمع الإنسان والآلة"
            : "Intelligence That Sees the World"
        }
        videoSubtitle={
          ar
            ? "رؤية حاسوبية، ذكاء حافة، وأجهزة ذكية مصممة للإنسان"
            : "Human-centric computer vision, Edge AI & smart hardware"
        }
        videoTelemetry="HIRZEXA · REAL TIME"
      />

      {/* Section 01: Company Story & Long-Term Vision */}
      <section className="about-vision-new" id="our-vision">
        <div className="container about-vision-grid">
          <div className="about-vision-label">
            <span className="about-kicker">
              {ar ? "01 / مهمتنا ورؤيتنا" : "01 / MISSION & LONG-TERM VISION"}
            </span>
            <span className="about-vision-star" aria-hidden="true">
              ✳
            </span>
          </div>
          <div>
            <h2>
              {ar ? (
                <>
                  نبني شركة تقنية تهندس <span>أجهزتها الذكية</span> ومنصاتها البصرية.
                </>
              ) : (
                <>
                  Engineering our own <span>intelligent devices</span> and vision platforms.
                </>
              )}
            </h2>
            <p>
              {ar
                ? "في HIRZEXA، ننطلق من قناعة هندسية واضحة: القيمة الحقيقية للرؤية الحاسوبية تتحقق عندما تتكامل النماذج الذكية مع معالجة الحافة والأجهزة المدمجة والبرمجيات السلسة. رؤيتنا طويلة المدى هي بناء شركة منتجات تقنية قادرة على تصميم وهندسة أجهزتها الذكية ومنصاتها البرمجية الخاصة لخدمة المنازل والشركات والقطاعات الصناعية."
                : "At HIRZEXA, our story is driven by engineering-led innovation and product development. Rather than acting as a general software agency, we focus on where visual perception meets the physical world—combining computer vision models, low-latency Edge AI, smart hardware, and operator software into accessible, practical products."}
            </p>
            <Link href="/engineering" className="about-text-link">
              {ar ? "استكشف خط أنابيب الرؤية الهندسي" : "Explore our vision engineering pipeline"}{" "}
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
                    تخصص عميق في
                    <br />
                    <span>الرؤية والحافة والمنتجات.</span>
                  </>
                ) : (
                  <>
                    Computer Vision. Edge AI.
                    <br />
                    <span>Intelligent Products.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نربط البحث التطبيقي في الرؤية الحاسوبية بتحسين النماذج للحافة وتطوير المنتجات المتكاملة."
                : "Every layer we build is designed to make visual intelligence faster, more accessible, and ready for real-world deployment."}
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
                  ? "03 / خارطة الطريق المستقبلية (اتجاه مخطط)"
                  : "03 / FORWARD-LOOKING ROADMAP (PLANNED DIRECTION)"}
              </span>
              <h2>
                {ar ? (
                  <>
                    مسارنا نحو
                    <br />
                    <span>الجيل القادم من أجهزة الرؤية.</span>
                  </>
                ) : (
                  <>
                    Planned direction from
                    <br />
                    <span>vision software to smart hardware.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نوضح بشفافية مراحل تطورنا من تقنيات الرؤية البرمجية إلى تصورات الأجهزة المستقبلية."
                : "Our roadmap distinguishes current vision software work from future intelligent device concepts."}
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
              {ar ? "04 / التزامنا التقني" : "04 / OUR COMMITMENT"}
            </span>
            <h2>
              {ar ? (
                <>
                  تقنيات رؤية ذكية وعملية.
                  <br />
                  <span>مصممة للعالم الحقيقي.</span>
                </>
              ) : (
                <>
                  Accessible intelligent vision.
                  <br />
                  <span>Engineered for the real world.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نواصل الاستثمار في الرؤية الحاسوبية وذكاء الحافة وتكامل العتاد والبرمجيات لبناء منتجات يعتمد عليها الناس والمؤسسات."
                : "We combine computer vision models, Edge AI optimization, and thoughtful product design to build visual systems people can trust."}
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
