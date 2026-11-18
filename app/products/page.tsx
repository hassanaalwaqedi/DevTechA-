import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { HumanAiVideoReel } from "@/components/ui/HumanAiVideoReel";
import { ArrowUpRight, Camera, Cpu, Glasses, MonitorPlay } from "lucide-react";
import { getLocale } from "@/lib/locale";
import { getProductsResult } from "@/lib/db";
import { khairProduct, KHAIR_URL, type Product } from "@/lib/data";
import { createPageMetadata } from "@/lib/social-metadata";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";
import "../work/work.css";

export const metadata: Metadata = createPageMetadata({
  title: "Products & Innovation — AEGIS, Software Platforms & R&D",
  description:
    "Explore HIRZEXA's Products & Innovation portfolio: AEGIS (AI-Powered Visual Safety & Computer Vision), Khair (live software platform), and ongoing R&D.",
  path: "/products",
  eyebrow: "HIRZEXA / PRODUCTS & INNOVATION",
  badge: "PRODUCTS, PLATFORMS & APPLIED R&D",
  headline: "Products & Innovation by HIRZEXA.",
  summary:
    "AEGIS (AI-Powered Visual Safety & Computer Vision), Khair (live software platform), and internal R&D concepts.",
  chips: ["AEGIS · Visual Safety", "Khair · Live Platform", "Applied AI & Software R&D"],
  scene: "aegis",
  telemetry: "PRODUCTS & INNOVATION · HIRZEXA",
});

function PublishedPortfolio({ products, arabic }: { products: Product[]; arabic: boolean }) {
  const projects = products.filter((product) => product.slug !== khairProduct.slug);
  if (!projects.length) return null;

  return (
    <section className="work-portfolio-new" id="project-portfolio">
      <div className="container">
        <div className="work-portfolio-head">
          <div>
            <span className="work-kicker">
              {arabic ? "محفظة المنتجات / مباشرة" : "PRODUCT PORTFOLIO / LIVE"}
            </span>
            <h2>
              {arabic ? (
                <>
                  أنظمة إضافية.
                  <br />
                  <span>أثر حقيقي.</span>
                </>
              ) : (
                <>
                  Additional systems.
                  <br />
                  <span>Real momentum.</span>
                </>
              )}
            </h2>
          </div>
          <p>
            {arabic
              ? "كل منتج منشور من HIRZEXA يظهر هنا تلقائياً."
              : "Every published product from HIRZEXA appears here automatically."}
          </p>
        </div>
        <div className="work-project-grid">
          {projects.map((product, index) => (
            <article className="work-project-card" key={product.slug} id={product.slug}>
              <div className="work-project-media" style={{ background: product.color }}>
                <div className="work-project-meta">
                  <span>{String(index + 3).padStart(2, "0")}</span>
                  <span>{product.status}</span>
                </div>
                {product.image ? (
                  <img src={product.image} alt={`${product.name} product preview`} loading="lazy" />
                ) : (
                  <div className="work-project-placeholder" aria-hidden="true">
                    <span>✦</span>
                    <i />
                    <i />
                    <i />
                  </div>
                )}
              </div>
              <div className="work-project-copy">
                <div>
                  <span className="work-project-eyebrow">{product.eyebrow}</span>
                  <h3>{product.name}</h3>
                  <p dir="auto">{product.description}</p>
                </div>
                <div className="work-project-bottom">
                  <div className="work-tags">
                    {product.platform.map((platform) => (
                      <span key={platform}>{platform}</span>
                    ))}
                  </div>
                  <div className="work-project-actions">
                    {product.launchUrl ? (
                      <a
                        href={product.launchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="work-text-link"
                      >
                        {arabic ? "فتح المنصة" : "Open platform"} <ArrowUpRight size={15} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function ProductsPage() {
  const [locale, result] = await Promise.all([getLocale(), getProductsResult()]);
  const ar = locale === "ar";
  const products = result.available ? result.products : [khairProduct];

  const aegisCapabilities = ar
    ? [
        "تحليل الكاميرات في الوقت الفعلي",
        "كشف الأجسام وتتبعها",
        "تفسير الأحداث البصرية",
        "تقييم وتحليل المخاطر (Risk scoring)",
        "تنبيهات المشغلين الفورية",
        "واجهة مراقبة وتحكم متكاملة",
      ]
    : [
        "Real-time camera analysis",
        "Object detection and tracking",
        "Event interpretation",
        "Risk scoring",
        "Operator alerts",
        "Monitoring interface",
      ];

  const roadmapItems = ar
    ? ([
        {
          id: "smart-cameras",
          stage: "مفهوم ضمن خارطة الطريق · Concept",
          badgeType: "concept",
          title: "الكاميرات الذكية للمستهلكين والشركات",
          description:
            "تصور مستقبلي لكاميرات ذكية تستكشف كشف الحركة والأجسام على الجهاز مع خيارات معالجة محلية وتنبيهات قابلة للضبط.",
          Icon: Camera,
        },
        {
          id: "edge-devices",
          stage: "مفهوم ضمن خارطة الطريق · Concept",
          badgeType: "concept",
          title: "أجهزة المراقبة ومعالجة ذكاء الحافة (Edge AI Units)",
          description:
            "تصور مستقبلي لوحدات معالجة محلية تربط بث الكاميرات بنماذج الرؤية الحاسوبية على الحافة.",
          Icon: Cpu,
        },
        {
          id: "monitoring-apps",
          stage: "مفهوم ضمن خارطة الطريق · Concept",
          badgeType: "concept",
          title: "تطبيقات المراقبة الذكية (Smart Monitoring Apps)",
          description:
            "تصور برمجي لإدارة الأجهزة المتصلة، وعرض بث الكاميرات، ومراجعة الأحداث، وضبط التنبيهات.",
          Icon: MonitorPlay,
        },
        {
          id: "wearables",
          stage: "مفهوم مستقبلي · Concept",
          badgeType: "concept",
          title: "منتجات الرؤية القابلة للارتداء (Future Intelligent Wearables)",
          description:
            "استكشاف بحثي طويل المدى لأجهزة رؤية خفيفة قابلة للارتداء تساعد المستخدمين على إدراك المحيط والوصول إلى معلومات بصرية سياقية.",
          Icon: Glasses,
        },
      ] as const)
    : ([
        {
          id: "smart-cameras",
          stage: "Roadmap concept",
          badgeType: "concept",
          title: "Consumer Smart Cameras",
          description:
            "A future camera concept for homes and small businesses, exploring on-device detection, local processing, and configurable alerts.",
          Icon: Camera,
        },
        {
          id: "edge-devices",
          stage: "Roadmap concept",
          badgeType: "concept",
          title: "Edge AI Monitoring Devices",
          description:
            "A future local inference device concept for connecting camera feeds to computer vision models at the edge.",
          Icon: Cpu,
        },
        {
          id: "monitoring-apps",
          stage: "Roadmap concept",
          badgeType: "concept",
          title: "Smart Monitoring Applications",
          description:
            "A software concept for managing connected devices, viewing camera feeds, reviewing events, and configuring notifications.",
          Icon: MonitorPlay,
        },
        {
          id: "wearables",
          stage: "Concept",
          badgeType: "concept",
          title: "Future Intelligent Wearables",
          description:
            "Long-term concept exploration into lightweight wearable vision hardware combining optical sensors and edge perception for hands-free assistance.",
          Icon: Glasses,
        },
      ] as const);

  return (
    <main className="work-new">
      <CompanyPageIntro
        eyebrow={ar ? "HIRZEXA / المنتجات والابتكار" : "HIRZEXA / PRODUCTS & INNOVATION"}
        title={
          ar
            ? "المنتجات والابتكار والمنصات البرمجية."
            : "Products, platforms & applied innovation."
        }
        description={
          ar
            ? "إلى جانب خدماتنا في هندسة الذكاء الاصطناعي والأنظمة البرمجية، نطور منتجات ومنصات خاصة تبرهن قدراتنا الهندسية — ومنها AEGIS في مجال السلامة البصرية والرؤية الحاسوبية، ومنصة خير الحية."
            : "Alongside our AI and software engineering services, we build proprietary products and platforms—including AEGIS (AI-Powered Visual Safety & Computer Vision) and Khair (live software platform)."
        }
        actionLabel={ar ? "استكشف منتج AEGIS" : "Explore AEGIS"}
        actionHref="#aegis-ai"
        secondaryLabel={ar ? "ناقش مشروعك" : "Discuss a project"}
        secondaryHref="/contact"
        detailsTitle={ar ? "محفظة المنتجات والابتكار" : "PRODUCTS & INNOVATION"}
        details={
          ar
            ? [
                "AEGIS: السلامة البصرية المدعومة بالذكاء الاصطناعي والرؤية الحاسوبية",
                "خير (Khair): منصة برمجية حية للفعاليات والمجتمعات",
                "أبحاث وتصورات مستقبلية للأنظمة والأجهزة الذكية",
              ]
            : [
                "AEGIS: AI-Powered Visual Safety & Computer Vision",
                "Khair: Live web & mobile community platform",
                "Applied R&D & future product concepts",
              ]
        }
        videoSrc="/videos/human-ai-aegis.mp4"
        videoPoster="/human-ai-aegis.jpg"
        videoBadge={ar ? "المنتجات والابتكار · AEGIS" : "PRODUCTS & INNOVATION · AEGIS"}
        videoTitle={
          ar
            ? "AEGIS: السلامة البصرية والرؤية الحاسوبية"
            : "AEGIS — AI-Powered Visual Safety & Computer Vision"
        }
        videoSubtitle={
          ar
            ? "تحليل الفيديو الذكي، كشف الأجسام وتتبعها، ومراقبة الأحداث"
            : "Intelligent video analysis, object detection, tracking & event monitoring"
        }
        videoTelemetry="PRODUCTS & INNOVATION · AEGIS"
      />

      {/* SECTION 1: AEGIS AI + KHAIR */}
      <section className="work-feature-new" id="aegis-ai">
        <div className="container">
          <div className="work-feature-head">
            <div>
              <span className="work-kicker">
                {ar
                  ? "01 / المنتجات والابتكار · السلامة البصرية والرؤية الحاسوبية"
                  : "01 / PRODUCTS & INNOVATION · AI-POWERED VISUAL SAFETY & COMPUTER VISION"}
              </span>
              <h2>
                {ar ? (
                  <>
                    تحليل الفيديو الذكي ومراقبة الأحداث مع <span>AEGIS.</span>
                  </>
                ) : (
                  <>
                    Intelligent video analysis &amp; safety monitoring with <span>AEGIS.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "منتج هندسي يبرهن قدراتنا في تحليل الفيديو الذكي، وكشف الأجسام وتتبعها، ومراقبة الأحداث البصرية لدعم المشغلين."
                : "An engineering product demonstrating intelligent video analysis, object detection, tracking, and event monitoring."}
            </p>
          </div>

          {/* AEGIS AI Featured Card with Live 10-Second Human-AI Eye-Contact Video Reel */}
          <article className="work-aegis-card">
            <div className="work-aegis-stage">
              <div className="work-aegis-video-stack">
                <HumanAiVideoReel
                  videoSrc="/videos/human-ai-aegis.mp4"
                  posterSrc="/human-ai-aegis.jpg"
                  badge={
                    ar
                      ? "AEGIS AI · عرض مرئي 10 ثوانٍ"
                      : "AEGIS AI · 10S HUMAN-AI VISION FEED"
                  }
                  title={
                    ar
                      ? "مراقبة ذكية وتواصل بصري مباشر مع المشغل"
                      : "Human-in-the-Loop Visual Perception & Safety"
                  }
                  subtitle={
                    ar
                      ? "كشف الأجسام · تفسير الأحداث · تقييم المخاطر المساعد"
                      : "Real-time camera analysis · Event interpretation · Operator alerts"
                  }
                  telemetry="VISION PIPELINE · ILLUSTRATIVE PREVIEW"
                />

                <div className="work-aegis-telemetry-strip">
                  <div className="work-aegis-metric">
                    <span>{ar ? "تقييم المخاطر المساعد" : "ASSISTED RISK SCORE"}</span>
                    <strong className="work-aegis-metric-safe">Concept UI</strong>
                  </div>
                  <div className="work-aegis-metric">
                    <span>{ar ? "الاستدلال على الحافة" : "EDGE NPU INFERENCE"}</span>
                    <strong>On-device path</strong>
                  </div>
                  <div className="work-aegis-metric">
                    <span>{ar ? "تفسير المشهد" : "EVENT INTERPRETATION"}</span>
                    <strong>
                      {ar
                        ? "إشراف بشري مباشر · تنبيهات فورية"
                        : "Human-in-the-loop · Active"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="work-khair-copy">
              <div>
                <div className="work-khair-label">
                  <span>✳</span>{" "}
                  {ar
                    ? "المنتجات والابتكار · السلامة البصرية والرؤية الحاسوبية"
                    : "PRODUCTS & INNOVATION · AI-POWERED VISUAL SAFETY & COMPUTER VISION"}
                </div>
                <h3>AEGIS</h3>
                <p>
                  {ar
                    ? "منتج هندسي ضمن محفظة HIRZEXA يستعرض تحليل الفيديو الذكي، وكشف الأجسام وتتبعها، ومراقبة الأحداث وتقييم المخاطر بمساعدة المشغلين."
                    : "An engineering product in HIRZEXA's portfolio demonstrating intelligent video analysis, object detection, tracking, and event monitoring with human-in-the-loop operator alerts."}
                </p>

                <ul className="work-aegis-capabilities">
                  {aegisCapabilities.map((cap) => (
                    <li key={cap}>{cap}</li>
                  ))}
                </ul>
              </div>

              <div className="work-khair-bottom">
                <div className="work-tags">
                  <span>{ar ? "الرؤية الحاسوبية" : "COMPUTER VISION"}</span>
                  <span>{ar ? "ذكاء الحافة" : "EDGE AI"}</span>
                  <span>{ar ? "تحليل السلامة" : "SAFETY INTELLIGENCE"}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                  <Link
                    href="/products/aegis-ai"
                    className="work-primary-link"
                  >
                    {ar
                      ? "استكشف دراسة الحالة والمعمارية الكاملة"
                      : "Explore full AEGIS AI experience"}
                    <span>
                      <ArrowUpRight size={16} />
                    </span>
                  </Link>
                  <Link
                    href="/contact?category=AEGIS%20AI%20Commercial"
                    className="work-text-link"
                  >
                    {ar ? "طلب عرض أو تجربة" : "Request demo or pilot"}{" "}
                    <ArrowUpRight size={15} />
                  </Link>
                  <Link href="/engineering" className="work-text-link">
                    {ar ? "المعمارية الهندسية" : "View pipeline architecture"}{" "}
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
                <div className="product-email-links" style={{ marginTop: "14px" }}>
                  <a
                    href={companyMailto("business", "AEGIS AI commercial inquiry")}
                    aria-label={`${ar ? "الاستفسارات التجارية لـ AEGIS AI" : "AEGIS AI commercial inquiries"}: ${COMPANY_EMAILS.business}`}
                  >
                    {ar ? "الاستفسارات التجارية:" : "Commercial inquiries:"}{" "}
                    <span dir="ltr">{COMPANY_EMAILS.business}</span> <ArrowUpRight size={14} />
                  </a>
                  <a
                    href={companyMailto("support", "AEGIS AI technical question")}
                    aria-label={`${ar ? "الأسئلة التقنية لـ AEGIS AI" : "AEGIS AI technical questions"}: ${COMPANY_EMAILS.support}`}
                  >
                    {ar ? "الأسئلة التقنية:" : "Technical questions:"}{" "}
                    <span dir="ltr">{COMPANY_EMAILS.support}</span> <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </article>

          {/* Khair Platform Card (Preserved from existing database / portfolio) */}
          <article className="work-khair-card" id="featured-work">
            <div className="work-khair-image">
              <Image
                src="/khair-discover.png"
                alt={
                  ar
                    ? "واجهة اكتشاف الفعاليات في منصة خير"
                    : "Event discovery interface in the Khair platform"
                }
                fill
                sizes="(max-width: 850px) 100vw, 65vw"
              />
              <span>{ar ? "منصة برمجية مباشرة" : "LIVE SOFTWARE PLATFORM"}</span>
            </div>
            <div className="work-khair-copy">
              <div>
                <div className="work-khair-label">
                  <span>✳</span> {ar ? "هندسة المنصات" : "PLATFORM ENGINEERING"}
                </div>
                <h3>{ar ? "خير (Khair)" : "Khair"}</h3>
                <p>
                  {ar
                    ? "منصة رقمية متكاملة لاكتشاف الفعاليات والانضمام إلى المجتمعات ومساعدة المنظمين على إدارة التفاعل."
                    : "A live digital platform connecting event discovery, communities, and organizers in a unified web and mobile experience."}
                </p>
              </div>
              <div className="work-khair-bottom">
                <div className="work-tags">
                  <span>{ar ? "منصة رقمية" : "DIGITAL PLATFORM"}</span>
                  <span>{ar ? "الويب والجوال" : "WEB & MOBILE"}</span>
                </div>
                <a
                  href={KHAIR_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="work-text-link"
                >
                  {ar ? "زيارة منصة خير" : "Visit Khair"} <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* SECTION 2: FUTURE PRODUCT DEVELOPMENT ROADMAP */}
      <section className="work-ideas-new" id="product-roadmap">
        <div className="container">
          <div className="work-ideas-head">
            <div>
              <span className="work-kicker">
                {ar
                  ? "02 / تطوير المنتجات المستقبلية"
                  : "02 / FUTURE PRODUCT DEVELOPMENT"}
              </span>
              <h2>
                {ar ? (
                  <>
                    أجهزة وتطبيقات الرؤية
                    <br />
                    <span>ضمن خارطة الطريق.</span>
                  </>
                ) : (
                  <>
                    Intelligent hardware &amp; apps
                    <br />
                    <span>on our roadmap.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "هذه تصورات مستقبلية للأجهزة والتطبيقات، وليست منتجات متاحة للبيع حالياً."
                : "These hardware and software directions are future concepts and are not available for purchase."}
            </p>
          </div>

          <div className="work-ideas-grid">
            {roadmapItems.map(({ id, stage, title, description, Icon }) => (
              <article key={id} id={id} className="work-idea-card work-idea-vision">
                <div className="work-idea-top">
                  <span
                    className="work-stage-badge work-stage-badge-concept"
                  >
                    {stage}
                  </span>
                  <Icon size={21} />
                </div>
                <div className="work-idea-art work-idea-eye" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <span>✳</span>
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <a
                  href={companyMailto("partnerships", `Technology partnership: ${title}`)}
                  className="work-text-link"
                  aria-label={`${ar ? "راسل فريق الشراكات" : "Email partnerships"}: ${COMPANY_EMAILS.partnerships}`}
                >
                  {ar ? "استفسر عن الشراكة التقنية" : "Inquire about technical partnership"}{" "}
                  <ArrowUpRight size={15} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="work-vision-new">
        <div className="container work-vision-layout">
          <div>
            <span className="work-kicker">
              {ar ? "03 / فلسفتنا في بناء المنتجات" : "03 / PRODUCT ENGINEERING PHILOSOPHY"}
            </span>
            <span className="work-vision-mark" aria-hidden="true">
              ✳
            </span>
          </div>
          <div>
            <h2>
              {ar ? (
                <>
                  نجمع بين الذكاء الاصطناعي،
                  <br />
                  <span>ومعمارية البرمجيات، والتطبيق العملي.</span>
                </>
              ) : (
                <>
                  Uniting AI engineering,
                  <br />
                  <span>software architecture, and real utility.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "تمثل منتجاتنا الداخلية — من منصة خير الرقمية إلى نظام AEGIS للسلامة البصرية — برهاناً عملياً على التزامنا بهندسة أنظمة برمجية ذكية وموثوقة."
                : "Our internal products—from the live Khair platform to the award-winning AEGIS visual safety system—demonstrate our commitment to engineering reliable, production-grade software and AI."}
            </p>
            <Link href="/services" className="work-text-link">
              {ar ? "استكشف خدماتنا الهندسية للمؤسسات" : "Explore our AI & software engineering services"}{" "}
              <ArrowUpRight size={16} />
            </Link>
            <div className="product-email-links">
              <a href={companyMailto("business", "HIRZEXA product inquiry & demo")} aria-label={`${ar ? "استفسارات المنتجات والعروض" : "Product inquiries and demos"}: ${COMPANY_EMAILS.business}`}>
                {ar ? "استفسارات المنتجات والعروض" : "Product inquiries & demos"} ({COMPANY_EMAILS.business}) <ArrowUpRight size={15} />
              </a>
              <a href={companyMailto("orders", "HIRZEXA purchasing inquiry")} aria-label={`${ar ? "الطلبات والمشتريات" : "Purchases and orders"}: ${COMPANY_EMAILS.orders}`}>
                {ar ? "الطلبات والمشتريات" : "Purchases & orders"} ({COMPANY_EMAILS.orders}) <ArrowUpRight size={15} />
              </a>
              <a href={companyMailto("support", "HIRZEXA product support")} aria-label={`${ar ? "الدعم الفني" : "Technical support"}: ${COMPANY_EMAILS.support}`}>
                {ar ? "الدعم الفني" : "Technical support"} ({COMPANY_EMAILS.support}) <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="work-next-new">
        <div className="container">
          <div>
            <span className="work-kicker">
              {ar ? "ابنِ مع HIRZEXA" : "BUILD WITH HIRZEXA"}
            </span>
            <h2>
              {ar ? (
                <>
                  هل تخطط لتطوير منصة برمجية أو نظام ذكاء اصطناعي؟
                  <br />
                  <span>لنتحدث اليوم.</span>
                </>
              ) : (
                <>
                  Planning a custom software or AI system?
                  <br />
                  <span>Let&apos;s build it.</span>
                </>
              )}
            </h2>
          </div>
          <Link href="/contact?category=Product%20Demos%20%26%20Business" className="work-primary-link">
            {ar ? "تواصل معنا" : "Discuss your project"}
            <span>
              <ArrowUpRight size={17} />
            </span>
          </Link>
        </div>
      </section>

      <PublishedPortfolio products={products} arabic={ar} />
    </main>
  );
}
