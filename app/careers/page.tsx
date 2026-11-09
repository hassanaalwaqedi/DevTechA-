import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getProductsResult, getPublishedJobsResult } from "@/lib/db";
import { khairProduct } from "@/lib/data";
import { getLocale } from "@/lib/locale";
import { CareersDirectory } from "@/components/careers-directory";
import { HeroArtwork } from "@/components/home/HeroArtwork";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Careers — Build the Future of Intelligent Vision",
  description:
    "Join HIRZEXA in developing computer vision technologies, intelligent edge systems, and the software behind next-generation devices.",
  path: "/careers",
  eyebrow: "HIRZEXA / CAREERS",
  badge: "CAREERS · VISION ENGINEERING",
  headline: "Build the future of intelligent vision.",
  summary:
    "Explore opportunities in Computer Vision, Machine Learning, Edge AI Optimization, Embedded Systems, Backend, Mobile, and Hardware.",
  chips: ["Computer Vision & ML", "Edge AI & Embedded", "Platform & Mobile"],
  scene: "engineering",
  telemetry: "JOIN OUR ENGINEERING TEAM",
});

export default async function CareersPage() {
  const [locale, listing, productsResult] = await Promise.all([
    getLocale(),
    getPublishedJobsResult(),
    getProductsResult(),
  ]);

  const ar = locale === "ar";
  const openJobs = listing.jobs.filter((job) => job.status === "open");
  const openRolesCount = listing.available ? openJobs.length : null;

  const products =
    productsResult.available && productsResult.products.length > 0
      ? productsResult.products
      : [khairProduct];
  const projectCount = products.length;

  const disciplines = ar
    ? [
        [
          "01",
          "هندسة الرؤية الحاسوبية (Computer Vision Engineering)",
          "كشف الأجسام، التتبع متعدد الأجسام، فهم المشاهد، وتحليلات الفيديو الفورية.",
        ],
        [
          "02",
          "هندسة التعلم الآلي (Machine Learning Engineering)",
          "تدريب وتخصيص نماذج الإدراك البصري ونماذج الرؤية واللغة (VLMs) باستخدام PyTorch وYOLO.",
        ],
        [
          "03",
          "تحسين ذكاء الحافة (Edge AI Optimization)",
          "ضغط النماذج، التكميم (Quantization)، والنشر عالي الكفاءة عبر ONNX Runtime وTensorRT.",
        ],
        [
          "04",
          "الأنظمة المدمجة (Embedded Systems)",
          "برمجيات الحافة والأنظمة المدمجة لربط الكاميرات والحساسات بوحدات المعالجة المحلية.",
        ],
        [
          "05",
          "هندسة المنصات والأنظمة الخلفية (Backend / Platform Engineering)",
          "خدمات FastAPI، أنظمة إدارة الأحداث، وبروتوكولات اتصال الأجهزة بالسحابة.",
        ],
        [
          "06",
          "تطوير تطبيقات الجوال والويب (Mobile Application Development)",
          "تطبيقات المراقبة الحية، لوحات التحكم، وأنظمة التنبيهات الفورية للمستخدمين والمشغلين.",
        ],
        [
          "07",
          "هندسة الأجهزة الذكية (Hardware Engineering)",
          "تصميم وتكامل الكاميرات الذكية ووحدات معالجة ذكاء الحافة وأجهزة الرؤية المستقبلية.",
        ],
      ]
    : [
        [
          "01",
          "Computer Vision Engineering",
          "Object detection, multi-object tracking, activity recognition, and real-time video analytics.",
        ],
        [
          "02",
          "Machine Learning Engineering",
          "Training, fine-tuning, and benchmarking visual perception and vision-language models with PyTorch and YOLO.",
        ],
        [
          "03",
          "Edge AI Optimization",
          "Model quantization, graph optimization, and low-latency deployment via ONNX Runtime and TensorRT.",
        ],
        [
          "04",
          "Embedded Systems",
          "Camera stream ingestion, sensor integration, and resilient runtime software for edge compute units.",
        ],
        [
          "05",
          "Backend / Platform Engineering",
          "FastAPI microservices, device-to-cloud communication APIs, event pipelines, and cloud inference.",
        ],
        [
          "06",
          "Mobile Application Development",
          "Smart camera management apps, live video monitoring interfaces, and configurable alert workflows.",
        ],
        [
          "07",
          "Hardware Engineering",
          "Prototyping and engineering smart cameras, Edge AI monitoring appliances, and future vision devices.",
        ],
      ];

  const principles = ar
    ? [
        [
          "01",
          "دقة هندسية على مشاهد واقعية",
          "نبني ونقيّم أنظمة الرؤية الحاسوبية وذكاء الحافة بناءً على الأداء الفعلي وزمن الاستجابة.",
        ],
        [
          "02",
          "تكامل العتاد والبرمجيات",
          "نعمل عبر طبقات الكاميرات، ونماذج الذكاء الاصطناعي، وأنظمة الحافة، وتطبيقات المستخدمين.",
        ],
        [
          "03",
          "تعاون مهني مباشر",
          "نؤمن بالتواصل الواضح، وتوثيق القرارات المعمارية، والتركيز على بناء منتجات ذات أثر ملموس.",
        ],
      ]
    : [
        [
          "01",
          "Real-world vision benchmarks",
          "Define requirements, measure latency and precision on real scenes, and ground technical decisions in evidence.",
        ],
        [
          "02",
          "Hardware + software integration",
          "Collaborate across computer vision models, edge runtimes, intelligent device architectures, and operator apps.",
        ],
        [
          "03",
          "Direct engineering culture",
          "Clear communication, documented system boundaries, and high ownership across every product stage.",
        ],
      ];

  const ribbonItems = [
    {
      id: "projects",
      href: "/products",
      title: ar
        ? projectCount > 0
          ? `AEGIS AI + ${projectCount} مشاريع`
          : "مشاريع الرؤية الذكية"
        : projectCount > 0
        ? `AEGIS AI + ${projectCount} Systems`
        : "Vision & AI Systems",
      subtitle: ar
        ? "الرؤية الحاسوبية · ذكاء الحافة · المنصات"
        : "Smart Vision · Edge AI · Live Platforms",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-c-grad-1" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <path
            d="M14 3.5L23.5 8.75V19.25L14 24.5L4.5 19.25V8.75L14 3.5Z"
            stroke="url(#dt-c-grad-1)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 8.75L14 14L23.5 8.75M14 14V24.5"
            stroke="url(#dt-c-grad-1)"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="14" r="2.2" fill="#1050FF" />
        </svg>
      ),
    },
    {
      id: "positions",
      href: "#open-roles",
      title: ar
        ? typeof openRolesCount === "number" && openRolesCount > 0
          ? `${openRolesCount} وظائف متاحة`
          : "الوظائف المتاحة"
        : typeof openRolesCount === "number" && openRolesCount > 0
        ? `${openRolesCount} Open Positions`
        : "Open Positions",
      subtitle: ar
        ? "أدوار هندسية وتقنية نشطة"
        : "Active Roles · Join Our Team",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-c-grad-2" x1="3" y1="4" x2="25" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect
            x="3.5"
            y="7.5"
            width="21"
            height="15.5"
            rx="3.5"
            stroke="url(#dt-c-grad-2)"
            strokeWidth="1.75"
          />
          <path
            d="M9.5 7.5V5.8C9.5 4.53 10.53 3.5 11.8 3.5H16.2C17.47 3.5 18.5 4.53 18.5 5.8V7.5"
            stroke="url(#dt-c-grad-2)"
            strokeWidth="1.75"
          />
          <path
            d="M3.5 13.5H24.5"
            stroke="url(#dt-c-grad-2)"
            strokeWidth="1.5"
            strokeOpacity="0.65"
          />
          <circle cx="14" cy="13.5" r="2" fill="#873BFF" />
        </svg>
      ),
    },
    {
      id: "capabilities",
      href: "/technology",
      title: ar ? "4 ركائز تقنية" : "4 Core Pillars",
      subtitle: ar
        ? "الرؤية · ذكاء الحافة · الأجهزة · البرمجيات"
        : "Vision · Edge AI · Devices · Software",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-c-grad-3" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect
            x="4.5"
            y="4.5"
            width="8"
            height="8"
            rx="2.2"
            stroke="url(#dt-c-grad-3)"
            strokeWidth="1.75"
          />
          <rect
            x="15.5"
            y="4.5"
            width="8"
            height="8"
            rx="2.2"
            stroke="url(#dt-c-grad-3)"
            strokeWidth="1.75"
          />
          <rect
            x="4.5"
            y="15.5"
            width="8"
            height="8"
            rx="2.2"
            stroke="url(#dt-c-grad-3)"
            strokeWidth="1.75"
          />
          <rect
            x="15.5"
            y="15.5"
            width="8"
            height="8"
            rx="2.2"
            stroke="url(#dt-c-grad-3)"
            strokeWidth="1.75"
          />
          <circle cx="19.5" cy="8.5" r="1.5" fill="#1050FF" />
          <circle cx="8.5" cy="19.5" r="1.5" fill="#873BFF" />
        </svg>
      ),
    },
    {
      id: "global",
      href: "#disciplines",
      title: ar ? "7 تخصصات هندسية" : "7 Vision Disciplines",
      subtitle: ar
        ? "الرؤية · الحافة · الأنظمة المدمجة · المنصات"
        : "CV · Edge AI · Embedded · Platforms",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-c-grad-4" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <circle
            cx="14"
            cy="14"
            r="10.2"
            stroke="url(#dt-c-grad-4)"
            strokeWidth="1.75"
          />
          <ellipse
            cx="14"
            cy="14"
            rx="4.6"
            ry="10.2"
            stroke="url(#dt-c-grad-4)"
            strokeWidth="1.55"
          />
          <path
            d="M4.2 14H23.8M5.6 9.5H22.4M5.6 18.5H22.4"
            stroke="url(#dt-c-grad-4)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <main className="company-careers dt-careers-page">
      {/* 1. Two-Column Careers Hero */}
      <section className="dt-careers-hero">
        <div
          className="dt-careers-ambient dt-careers-ambient-top"
          aria-hidden="true"
        />
        <div
          className="dt-careers-ambient dt-careers-ambient-right"
          aria-hidden="true"
        />

        <div className="container dt-careers-hero-grid">
          {/* Left Column */}
          <div className="dt-careers-hero-copy">
            <div className="dt-careers-pill">
              <span className="dt-careers-pill-dot" aria-hidden="true" />
              <span>{ar ? "HIRZEXA / الوظائف" : "HIRZEXA / CAREERS"}</span>
            </div>

            <h1 className="dt-careers-headline">
              {ar ? (
                <>
                  ابنِ الجيل القادم من{" "}
                  <span className="dt-careers-headline-gradient">
                    الرؤية الذكية.
                  </span>
                </>
              ) : (
                <>
                  Build the future of{" "}
                  <span className="dt-careers-headline-gradient">
                    intelligent vision.
                  </span>
                </>
              )}
            </h1>

            <p className="dt-careers-description">
              {ar
                ? "انضم إلينا في تطوير نماذج الرؤية الحاسوبية، وأنظمة ذكاء الحافة (Edge AI)، والبرمجيات المشغّلة للأجهزة الذكية."
                : "Join HIRZEXA in developing computer vision technologies, intelligent edge systems, and the software behind next-generation devices."}
            </p>

            <div className="dt-careers-actions">
              <a href="#open-roles" className="dt-careers-btn-primary">
                <span>{ar ? "عرض الوظائف المتاحة" : "View open positions"}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>

              <a href="#disciplines" className="dt-careers-btn-secondary">
                <span>
                  {ar ? "التخصصات الهندسية" : "Engineering disciplines"}
                </span>
              </a>
            </div>
          </div>

          {/* Right Column: Computer Vision & Edge AI Visualization */}
          <div className="dt-careers-hero-visual">
            <HeroArtwork arabic={ar} />
          </div>
        </div>
      </section>

      {/* 2. Information Ribbon */}
      <section
        className="dt-careers-ribbon-section"
        aria-label={ar ? "مؤشرات التوظيف والهندسة" : "Careers and engineering overview"}
      >
        <div className="container">
          <GlassSurface variant="ribbon" className="dt-metrics-ribbon dt-careers-ribbon">
            {ribbonItems.map((item) => (
              <Link key={item.id} href={item.href} className="dt-metric-item">
                <span className="dt-metric-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="dt-metric-copy">
                  <strong className="dt-metric-title">{item.title}</strong>
                  <span className="dt-metric-subtitle">{item.subtitle}</span>
                </span>
              </Link>
            ))}
          </GlassSurface>
        </div>
      </section>

      {/* 3. Open Positions Section */}
      <section
        className="dt-careers-openings"
        id="open-roles"
        aria-labelledby="open-roles-title"
      >
        <div className="container">
          <div className="dt-careers-section-head">
            <div>
              <span className="dt-careers-section-kicker">
                {ar ? "فرص العمل الحالية" : "CURRENT OPPORTUNITIES"}
              </span>
              <h2 id="open-roles-title" className="dt-careers-section-title">
                {ar ? "الوظائف المتاحة" : "Open positions"}
              </h2>
            </div>

            {listing.available ? (
              <div className="dt-careers-count-pill">
                <span className="dt-careers-count-dot" aria-hidden="true" />
                <span>
                  {openJobs.length}{" "}
                  {ar
                    ? "وظائف متاحة"
                    : openJobs.length === 1
                    ? "position available"
                    : "positions available"}
                </span>
              </div>
            ) : null}
          </div>

          <CareersDirectory
            initialJobs={listing.jobs}
            available={listing.available}
            arabic={ar}
          />
        </div>
      </section>

      {/* 3B. Target Engineering Disciplines */}
      <section
        className="dt-careers-principles"
        id="disciplines"
        aria-labelledby="disciplines-title"
      >
        <div className="container">
          <div className="dt-careers-section-head">
            <div>
              <span className="dt-careers-section-kicker">
                {ar ? "التخصصات المستهدفة" : "CORE RECRUITMENT DISCIPLINES"}
              </span>
              <h2 id="disciplines-title" className="dt-careers-section-title">
                {ar
                  ? "مجالات الهندسة التي نبحث عنها"
                  : "Disciplines powering our vision systems"}
              </h2>
            </div>

            <Link href="/technology" className="dt-careers-text-link">
              <span>{ar ? "استكشف ركائزنا التقنية" : "Explore our technology pillars"}</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="dt-careers-principles-grid">
            {disciplines.map(([number, title, description]) => (
              <article key={number} className="dt-careers-principle-card">
                <span className="dt-careers-principle-num">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Working Principles Section */}
      <section
        className="dt-careers-principles"
        id="working-principles"
        aria-labelledby="working-principles-title"
      >
        <div className="container">
          <div className="dt-careers-section-head">
            <div>
              <span className="dt-careers-section-kicker">
                {ar ? "بيئة العمل" : "OUR WORKING PRINCIPLES"}
              </span>
              <h2 id="working-principles-title" className="dt-careers-section-title">
                {ar ? "طريقة عملنا" : "How we work"}
              </h2>
            </div>

            <Link href="/engineering" className="dt-careers-text-link">
              <span>{ar ? "منهجنا الهندسي" : "Our engineering practice"}</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="dt-careers-principles-grid">
            {principles.map(([number, title, description]) => (
              <article key={number} className="dt-careers-principle-card">
                <span className="dt-careers-principle-num">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. General Recruitment Contact Banner */}
      <section className="dt-careers-contact">
        <div className="container">
          <div className="dt-careers-contact-card">
            <div className="dt-careers-contact-copy">
              <span className="dt-careers-section-kicker">
                {ar ? "تواصل مباشر" : "FUTURE OPPORTUNITIES"}
              </span>
              <h2>
                {ar
                  ? "هل تتخصص في الرؤية الحاسوبية أو ذكاء الحافة؟"
                  : "Specialize in Computer Vision, Edge AI, or Smart Hardware?"}
              </h2>
              <p>
                {ar
                  ? "تواصل معنا لمشاركة خبراتك والاستفسار عن الأدوار الهندسية القادمة."
                  : "Reach out to share your background and explore upcoming engineering roles."}
              </p>
            </div>
            <a
              href="mailto:hello@hirzexa.com?subject=Careers%20at%20HIRZEXA"
              className="dt-careers-contact-btn"
            >
              <span>hello@hirzexa.com</span>
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
