import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { ArrowUpRight, Camera, Cpu, Glasses, MonitorPlay } from "lucide-react";
import { getLocale } from "@/lib/locale";
import { getProductsResult } from "@/lib/db";
import { khairProduct, KHAIR_URL, type Product } from "@/lib/data";
import "../work/work.css";

export const metadata: Metadata = {
  title: "Products — AEGIS AI, Vision Platforms & Future Intelligent Devices",
  description:
    "Explore DevTech AI's products: AEGIS AI smart vision and safety intelligence system, live digital platforms, and our future intelligent device roadmap.",
};

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
              ? "كل منتج منشور من DevTech AI يظهر هنا تلقائياً."
              : "Every published product from DevTech AI appears here automatically."}
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
          stage: "قيد التطوير · In Development",
          badgeType: "dev",
          title: "الكاميرات الذكية للمستهلكين والشركات",
          description:
            "كاميرات بصرية مدمجة تدعم الاستدلال المحلي (On-Device AI) لكشف الحركة والأجسام مع تحكم كامل في الخصوصية وتنبيهات ذكية.",
          Icon: Camera,
        },
        {
          id: "edge-devices",
          stage: "نموذج أولي / قيد التطوير · In Development",
          badgeType: "dev",
          title: "أجهزة المراقبة ومعالجة ذكاء الحافة (Edge AI Units)",
          description:
            "وحدات معالجة حافة محلية ترتبط بالكاميرات الحالية لتحويل البث المرئي إلى تحليلات فورية دون الحاجة لنقل الفيديو الخام إلى السحابة.",
          Icon: Cpu,
        },
        {
          id: "monitoring-apps",
          stage: "قيد التطوير · In Development",
          badgeType: "dev",
          title: "تطبيقات المراقبة الذكية (Smart Monitoring Apps)",
          description:
            "تطبيقات ويب وهواتف ذكية لإدارة الكاميرات، استعراض البث الحي، تخصيص قواعد التنبيه، ومراجعة سجل الأحداث البصرية.",
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
          stage: "In Development",
          badgeType: "dev",
          title: "Consumer Smart Cameras",
          description:
            "Intelligent optical cameras designed for homes and small businesses with on-device object detection, privacy-conscious local processing, and configurable alerts.",
          Icon: Camera,
        },
        {
          id: "edge-devices",
          stage: "In Development · Prototype",
          badgeType: "dev",
          title: "Edge AI Monitoring Devices",
          description:
            "Compact local inference appliances that connect to standard IP cameras to run computer vision models at the edge with millisecond latency.",
          Icon: Cpu,
        },
        {
          id: "monitoring-apps",
          stage: "In Development",
          badgeType: "dev",
          title: "Smart Monitoring Applications",
          description:
            "Web and mobile vision software for managing connected devices, viewing live camera feeds, reviewing structured events, and configuring notifications.",
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
        eyebrow={ar ? "DEVTECH AI / المنتجات والأنظمة" : "DEVTECH AI / PRODUCTS & SYSTEMS"}
        title={
          ar
            ? "منتجات الرؤية الذكية والمنصات."
            : "Intelligent vision products & platforms."
        }
        description={
          ar
            ? "نطور أنظمة الرؤية الحاسوبية وذكاء السلامة البصرية، إلى جانب منصاتنا البرمجية وخارطة طريق الأجهزة الذكية."
            : "Explore AEGIS AI—our smart vision and safety intelligence project—alongside our deployed platforms and future intelligent device roadmap."
        }
        actionLabel={ar ? "استكشف نظام AEGIS AI" : "Explore AEGIS AI"}
        actionHref="#aegis-ai"
        secondaryLabel={ar ? "خارطة طريق المنتجات" : "Future product roadmap"}
        secondaryHref="#product-roadmap"
        detailsTitle={ar ? "محاور المنتجات" : "PRODUCT FOCUS"}
        details={
          ar
            ? [
                "AEGIS AI: نظام الرؤية الذكية وتحليل السلامة",
                "الأجهزة الذكية ووحدات ذكاء الحافة (قيد التطوير)",
                "منصات وتطبيقات إدارة الرؤية والمجتمعات",
              ]
            : [
                "AEGIS AI: Smart vision & safety intelligence",
                "Smart cameras & Edge AI devices (In Development)",
                "Vision software dashboards & live platforms",
              ]
        }
      />

      {/* SECTION 1: AEGIS AI + KHAIR */}
      <section className="work-feature-new" id="aegis-ai">
        <div className="container">
          <div className="work-feature-head">
            <div>
              <span className="work-kicker">
                {ar
                  ? "01 / مشروع الرؤية الذكية والسلامة"
                  : "01 / SMART VISION & SAFETY INTELLIGENCE"}
              </span>
              <h2>
                {ar ? (
                  <>
                    إدراك بصري فوري مع <span>AEGIS AI.</span>
                  </>
                ) : (
                  <>
                    Visual situational awareness with <span>AEGIS AI.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نظام رؤية حاسوبية وذكاء سلامة يحلل بث الكاميرات في الوقت الفعلي لكشف الأجسام وتتبعها وتفسير الأحداث وتقييم المخاطر لدعم المشغلين."
                : "Our smart vision and safety intelligence project combining real-time camera analysis, object tracking, event interpretation, and assisted risk scoring."}
            </p>
          </div>

          {/* AEGIS AI Featured Card */}
          <article className="work-aegis-card">
            <div className="work-aegis-stage">
              <span className="work-aegis-badge-overlay">
                <i />
                {ar
                  ? "AEGIS AI · واجهة المراقبة والتحليل البصري"
                  : "AEGIS AI · VISION & SAFETY INTERFACE"}
              </span>

              <svg
                viewBox="0 0 620 380"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="AEGIS AI Monitoring Interface showing real-time camera analysis, object detection and tracking, event interpretation, risk scoring, and operator alerts"
              >
                <defs>
                  <linearGradient id="aegis-bg" x1="0" y1="0" x2="620" y2="380" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#081642" />
                    <stop offset="55%" stopColor="#0E2568" />
                    <stop offset="100%" stopColor="#1D1858" />
                  </linearGradient>
                  <linearGradient id="aegis-feed" x1="20" y1="54" x2="390" y2="270" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0B2058" />
                    <stop offset="100%" stopColor="#153588" />
                  </linearGradient>
                </defs>

                <rect width="620" height="380" rx="16" fill="url(#aegis-bg)" stroke="rgba(92, 225, 255, 0.35)" strokeWidth="1.5" />

                {/* Top Dashboard Header */}
                <rect x="0" y="0" width="620" height="42" rx="16" fill="rgba(14, 42, 118, 0.55)" />
                <circle cx="22" cy="21" r="4.5" fill="#35F2A6" />
                <text x="34" y="25" fill="#FFFFFF" fontSize="11" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.06em">
                  AEGIS AI · SMART VISION MONITOR
                </text>
                <text x="456" y="25" fill="#7CE7FF" fontSize="10" fontWeight="700" fontFamily="sans-serif">
                  EDGE NPU · 11.8 ms · 60 FPS
                </text>

                {/* Left Primary Camera Feed */}
                <rect x="18" y="56" width="376" height="222" rx="12" fill="url(#aegis-feed)" stroke="rgba(92, 225, 255, 0.38)" strokeWidth="1.2" />
                {/* Perspective floor grid */}
                <path d="M18 210H394M18 246H394M114 166L44 278M206 166L182 278M298 166L348 278" stroke="rgba(120, 195, 255, 0.16)" strokeWidth="1" />

                {/* Camera Tag */}
                <rect x="30" y="68" width="132" height="20" rx="5" fill="rgba(7, 20, 58, 0.8)" />
                <circle cx="41" cy="78" r="3" fill="#35F2A6" />
                <text x="49" y="81.5" fill="#E8F6FF" fontSize="8.8" fontWeight="700" fontFamily="sans-serif">
                  CAM-01 · NORTH BAY
                </text>

                {/* Tracked Person #1 */}
                <rect x="58" y="108" width="76" height="128" rx="5" fill="rgba(53, 190, 255, 0.14)" stroke="#35BEFF" strokeWidth="1.6" />
                <rect x="58" y="90" width="84" height="16" rx="4" fill="#0754FF" />
                <text x="63" y="101" fill="#FFFFFF" fontSize="8" fontWeight="700" fontFamily="sans-serif">
                  PERSON #01 · 98.7%
                </text>
                <circle cx="96" cy="130" r="7" stroke="#5CE1FF" strokeWidth="1.6" />
                <path d="M96 137V180M78 152L96 144L114 152M96 180L82 222M96 180L110 222" stroke="#5CE1FF" strokeWidth="2" strokeLinecap="round" />

                {/* Tracked Vehicle / Forklift in Zone */}
                <rect x="196" y="122" width="162" height="106" rx="6" fill="rgba(135, 59, 255, 0.16)" stroke="#B57CFF" strokeWidth="1.6" />
                <rect x="196" y="104" width="114" height="16" rx="4" fill="#873BFF" />
                <text x="202" y="115" fill="#FFFFFF" fontSize="8" fontWeight="700" fontFamily="sans-serif">
                  VEHICLE · TRACKED 96.4%
                </text>
                <path d="M218 192L234 156H316L334 192H218Z" fill="rgba(181, 124, 255, 0.3)" stroke="#D6B8FF" strokeWidth="1.5" />
                <circle cx="242" cy="204" r="8" fill="#081844" stroke="#5CE1FF" strokeWidth="2" />
                <circle cx="310" cy="204" r="8" fill="#081844" stroke="#5CE1FF" strokeWidth="2" />

                {/* Right Sidebar: Risk Score & Operator Alerts */}
                <rect x="408" y="56" width="194" height="104" rx="12" fill="rgba(10, 28, 82, 0.85)" stroke="rgba(92, 225, 255, 0.32)" strokeWidth="1.2" />
                <text x="424" y="78" fill="#9CC8FF" fontSize="9" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">
                  ASSISTED RISK SCORING
                </text>
                <text x="424" y="108" fill="#35F2A6" fontSize="24" fontWeight="800" fontFamily="sans-serif">
                  0.14 · LOW
                </text>
                <rect x="424" y="122" width="162" height="8" rx="4" fill="rgba(255, 255, 255, 0.12)" />
                <rect x="424" y="122" width="44" height="8" rx="4" fill="#35F2A6" />
                <text x="424" y="146" fill="#B8D8FF" fontSize="8.5" fontWeight="600" fontFamily="sans-serif">
                  Perimeter clear · 2 active tracks
                </text>

                {/* Operator Alerts Panel */}
                <rect x="408" y="172" width="194" height="190" rx="12" fill="rgba(10, 28, 82, 0.85)" stroke="rgba(92, 225, 255, 0.32)" strokeWidth="1.2" />
                <text x="424" y="194" fill="#9CC8FF" fontSize="9" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">
                  EVENT &amp; ALERT STREAM
                </text>

                <rect x="420" y="206" width="170" height="42" rx="7" fill="rgba(16, 80, 255, 0.25)" stroke="rgba(92, 225, 255, 0.35)" />
                <text x="430" y="222" fill="#FFFFFF" fontSize="8.8" fontWeight="700" fontFamily="sans-serif">
                  14:32:08 · Motion in Zone B
                </text>
                <text x="430" y="236" fill="#8CEBFF" fontSize="8" fontFamily="sans-serif">
                  Vehicle trajectory verified
                </text>

                <rect x="420" y="256" width="170" height="42" rx="7" fill="rgba(135, 59, 255, 0.22)" stroke="rgba(181, 124, 255, 0.35)" />
                <text x="430" y="272" fill="#FFFFFF" fontSize="8.8" fontWeight="700" fontFamily="sans-serif">
                  14:31:45 · Operator Check
                </text>
                <text x="430" y="286" fill="#D6B8FF" fontSize="8" fontFamily="sans-serif">
                  Zone A access acknowledged
                </text>

                <rect x="420" y="306" width="170" height="42" rx="7" fill="rgba(53, 242, 166, 0.14)" stroke="rgba(53, 242, 166, 0.35)" />
                <text x="430" y="322" fill="#FFFFFF" fontSize="8.8" fontWeight="700" fontFamily="sans-serif">
                  14:30:12 · Edge Node Sync
                </text>
                <text x="430" y="336" fill="#35F2A6" fontSize="8" fontFamily="sans-serif">
                  ONNX model active · 60 FPS
                </text>

                {/* Bottom Event Interpretation Bar */}
                <rect x="18" y="290" width="376" height="72" rx="12" fill="rgba(10, 28, 82, 0.85)" stroke="rgba(92, 225, 255, 0.32)" strokeWidth="1.2" />
                <text x="34" y="312" fill="#9CC8FF" fontSize="9" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">
                  EVENT INTERPRETATION ENGINE
                </text>
                <text x="34" y="332" fill="#FFFFFF" fontSize="10.5" fontWeight="700" fontFamily="sans-serif">
                  Authorized personnel &amp; vehicle movement within designated corridor.
                </text>
                <text x="34" y="348" fill="#7CE7FF" fontSize="8.8" fontFamily="sans-serif">
                  Human-in-the-loop review enabled · Configurable alert thresholds
                </text>
              </svg>
            </div>

            <div className="work-khair-copy">
              <div>
                <div className="work-khair-label">
                  <span>✳</span>{" "}
                  {ar
                    ? "مشروع الرؤية الذكية والسلامة"
                    : "SMART VISION & SAFETY PROJECT"}
                </div>
                <h3>AEGIS AI</h3>
                <p>
                  {ar
                    ? "نظام ذكاء بصري يحول بث الكاميرات إلى فهم لحظي للمشهد — يجمع بين كشف الأجسام وتتبعها وتفسير الأحداث وتقييم المخاطر وتنبيهات المشغلين."
                    : "An intelligent computer vision and safety analysis system that turns live camera feeds into structured scene perception, risk scoring, and operator alerts."}
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <Link
                    href="/contact?category=AEGIS%20AI%20%26%20Safety%20Vision"
                    className="work-primary-link"
                  >
                    {ar ? "اطلب عرضاً توضيحياً لـ AEGIS AI" : "Request AEGIS AI Demo"}
                    <span>
                      <ArrowUpRight size={16} />
                    </span>
                  </Link>
                  <Link href="/engineering" className="work-text-link">
                    {ar ? "المعمارية الهندسية" : "View pipeline architecture"}{" "}
                    <ArrowUpRight size={15} />
                  </Link>
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
                    <span>قيد التطوير والمفهوم.</span>
                  </>
                ) : (
                  <>
                    Intelligent hardware &amp; apps
                    <br />
                    <span>in development.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نشارك بشفافية خارطة طريق منتجاتنا القادمة. جميع الأجهزة والتطبيقات أدناه محددة بوضوح بمرحلة «قيد التطوير» أو «مفهوم» وليست معروضة للبيع التجاري حالياً."
                : "We clearly distinguish products in active development and future concepts. The hardware and software directions below are not yet commercially released."}
            </p>
          </div>

          <div className="work-ideas-grid">
            {roadmapItems.map(({ id, stage, badgeType, title, description, Icon }) => (
              <article key={id} id={id} className="work-idea-card work-idea-vision">
                <div className="work-idea-top">
                  <span
                    className={`work-stage-badge ${
                      badgeType === "dev" ? "work-stage-badge-dev" : "work-stage-badge-concept"
                    }`}
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
                <Link
                  href={`/contact?category=${encodeURIComponent(title)}`}
                  className="work-text-link"
                >
                  {ar ? "استفسر عن الشراكة التقنية" : "Inquire about technical partnership"}{" "}
                  <ArrowUpRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="work-vision-new">
        <div className="container work-vision-layout">
          <div>
            <span className="work-kicker">
              {ar ? "03 / رؤيتنا للمنتجات" : "03 / PRODUCT VISION"}
            </span>
            <span className="work-vision-mark" aria-hidden="true">
              ✳
            </span>
          </div>
          <div>
            <h2>
              {ar ? (
                <>
                  نجمع بين الكاميرا،
                  <br />
                  <span>وذكاء الحافة، والبرمجيات.</span>
                </>
              ) : (
                <>
                  Uniting optical hardware,
                  <br />
                  <span>Edge AI, and software.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "هدفنا طويل المدى هو بناء شركة تقنية قادرة على هندسة أجهزتها الذكية ومنصاتها البرمجية الخاصة — لتقديم تقنيات رؤية ذكية يسهل الوصول إليها للمنازل والشركات والصناعة."
                : "Our long-term vision is to engineer integrated intelligent devices and vision software platforms—delivering accessible, practical visual intelligence for homes, businesses, and industry."}
            </p>
            <Link href="/applications" className="work-text-link">
              {ar ? "استكشف حالات الاستخدام والتطبيقات" : "Explore real-world applications"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="work-next-new">
        <div className="container">
          <div>
            <span className="work-kicker">
              {ar ? "لنبني المستقبل البصري" : "BUILD WITH DEVTECH AI"}
            </span>
            <h2>
              {ar ? (
                <>
                  هل تبحث عن نظام رؤية مخصص؟
                  <br />
                  <span>لنتحدث اليوم.</span>
                </>
              ) : (
                <>
                  Exploring a computer vision product?
                  <br />
                  <span>Let&apos;s build it.</span>
                </>
              )}
            </h2>
          </div>
          <Link href="/contact" className="work-primary-link">
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
