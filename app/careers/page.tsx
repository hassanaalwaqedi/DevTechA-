import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getProductsResult, getPublishedJobsResult } from "@/lib/db";
import { khairProduct } from "@/lib/data";
import { getLocale } from "@/lib/locale";
import { CareersDirectory } from "@/components/careers-directory";
import { HeroArtwork } from "@/components/home/HeroArtwork";
import { GlassSurface } from "@/components/ui/GlassSurface";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Explore open positions in AI engineering, software development, and intelligent systems at DevTech AI.",
};

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

  const principles = ar
    ? [
        [
          "01",
          "معايير هندسية واضحة",
          "نحدد المتطلبات ونقيّم النتائج ونتخذ القرارات بناءً على الأدلة.",
        ],
        [
          "02",
          "عمل عبر التخصصات",
          "نربط تطوير النماذج بهندسة البيانات والبرمجيات والبنية التحتية.",
        ],
        [
          "03",
          "تواصل مهني مباشر",
          "نؤمن بالتعاون المحترم وتوثيق القرارات ووضوح المسؤوليات.",
        ],
      ]
    : [
        [
          "01",
          "Engineering standards",
          "Define requirements, evaluate outcomes, and make technical decisions grounded in evidence.",
        ],
        [
          "02",
          "Connected disciplines",
          "Work across model development, data, software, and production infrastructure.",
        ],
        [
          "03",
          "Professional collaboration",
          "Clear communication, documented decisions, and respect for the people doing the work.",
        ],
      ];

  const ribbonItems = [
    {
      id: "projects",
      href: "/work",
      title: ar
        ? projectCount > 0
          ? `${projectCount} مشاريع ذكاء اصطناعي`
          : "مشاريع الذكاء الاصطناعي"
        : projectCount > 0
        ? `${projectCount} AI Projects`
        : "AI Projects",
      subtitle: ar
        ? "الرؤية الحاسوبية · النماذج · المنصات"
        : "Vision · Models · Live Platforms",
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
      href: "/solutions",
      title: ar ? "القدرات الهندسية" : "Engineering Capabilities",
      subtitle: ar
        ? "الرؤية · الأنظمة الذكية · البرمجيات · البنية التحتية"
        : "Vision · AI Systems · Software · Infra",
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
      href: "#working-principles",
      title: ar ? "توجه عالمي" : "Global Focus",
      subtitle: ar
        ? "فرق هندسية موزعة وتعاون عن بُعد"
        : "Remote-First & Distributed Teams",
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
              <span>{ar ? "DEVTECH AI / الوظائف" : "DEVTECH AI / CAREERS"}</span>
            </div>

            <h1 className="dt-careers-headline">
              {ar ? (
                <>
                  ساهم في هندسة أنظمة{" "}
                  <span className="dt-careers-headline-gradient">
                    الذكاء الاصطناعي.
                  </span>
                </>
              ) : (
                <>
                  Engineer the systems
                  <br />
                  behind{" "}
                  <span className="dt-careers-headline-gradient">AI.</span>
                </>
              )}
            </h1>

            <p className="dt-careers-description">
              {ar
                ? "استكشف فرص العمل في تطوير النماذج والبرمجيات والبنية التحتية. راجع المتطلبات ونمط العمل والتعويضات الخاصة بكل وظيفة."
                : "Explore opportunities in model development, software, and infrastructure. Review the requirements, working arrangements, and compensation for each role."}
            </p>

            <div className="dt-careers-actions">
              <a href="#open-roles" className="dt-careers-btn-primary">
                <span>{ar ? "عرض الوظائف المتاحة" : "View open positions"}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>

              <a href="#working-principles" className="dt-careers-btn-secondary">
                <span>
                  {ar ? "لماذا العمل في DevTech AI" : "Why work at DevTech AI"}
                </span>
              </a>
            </div>
          </div>

          {/* Right Column: Futuristic AI Visualization */}
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
                  ? "هل تبحث عن فرصة مختلفة؟"
                  : "Looking for a different opportunity?"}
              </h2>
              <p>
                {ar
                  ? "تواصل معنا للاستفسار عن فرص العمل المستقبلية."
                  : "Contact us about future opportunities relevant to your experience."}
              </p>
            </div>
            <a
              href="mailto:hello@devtech.ai?subject=Careers%20at%20DevTech%20AI"
              className="dt-careers-contact-btn"
            >
              <span>hello@devtech.ai</span>
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
