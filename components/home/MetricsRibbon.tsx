import Link from "next/link";
import { GlassSurface } from "@/components/ui/GlassSurface";

type MetricsRibbonProps = {
  arabic?: boolean;
  projectCount?: number | null;
  openPositionsCount?: number | null;
};

export function MetricsRibbon({
  arabic = false,
  projectCount = null,
  openPositionsCount = null,
}: MetricsRibbonProps) {
  const items = [
    {
      id: "projects",
      href: "/products",
      title: arabic
        ? projectCount && projectCount > 0
          ? `AEGIS AI + ${projectCount} مشاريع`
          : "مشاريع الرؤية والذكاء"
        : projectCount && projectCount > 0
        ? `AEGIS AI + ${projectCount} Systems`
        : "Vision & AI Systems",
      subtitle: arabic
        ? "الرؤية الحاسوبية · ذكاء الحافة · المنصات"
        : "Smart Vision · Edge AI · Live Platforms",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-metric-grad-1" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <path
            d="M14 3.5L23.5 8.75V19.25L14 24.5L4.5 19.25V8.75L14 3.5Z"
            stroke="url(#dt-metric-grad-1)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 8.75L14 14L23.5 8.75M14 14V24.5"
            stroke="url(#dt-metric-grad-1)"
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
      href: "/careers",
      title: arabic
        ? typeof openPositionsCount === "number" && openPositionsCount > 0
          ? `${openPositionsCount} وظائف متاحة`
          : "الوظائف المتاحة"
        : typeof openPositionsCount === "number" && openPositionsCount > 0
        ? `${openPositionsCount} Open Positions`
        : "Open Positions",
      subtitle: arabic
        ? "انضم إلى فريق الهندسة والتطوير"
        : "Active Roles · Join Our Team",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-metric-grad-2" x1="3" y1="4" x2="25" y2="24" gradientUnits="userSpaceOnUse">
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
            stroke="url(#dt-metric-grad-2)"
            strokeWidth="1.75"
          />
          <path
            d="M9.5 7.5V5.8C9.5 4.53 10.53 3.5 11.8 3.5H16.2C17.47 3.5 18.5 4.53 18.5 5.8V7.5"
            stroke="url(#dt-metric-grad-2)"
            strokeWidth="1.75"
          />
          <path
            d="M3.5 13.5H24.5"
            stroke="url(#dt-metric-grad-2)"
            strokeWidth="1.5"
            strokeOpacity="0.65"
          />
          <circle cx="14" cy="13.5" r="2" fill="#873BFF" />
        </svg>
      ),
    },
    {
      id: "production",
      href: "/technology",
      title: arabic ? "4 ركائز تقنية" : "4 Core Pillars",
      subtitle: arabic
        ? "الرؤية · ذكاء الحافة · الأجهزة · البرمجيات"
        : "Vision · Edge AI · Devices · Software",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-metric-grad-3" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <path
            d="M14 3.5L22.5 6.8V13.6C22.5 18.95 18.88 23.42 14 24.8C9.12 23.42 5.5 18.95 5.5 13.6V6.8L14 3.5Z"
            stroke="url(#dt-metric-grad-3)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M10.3 14.2L12.9 16.8L18 11.4"
            stroke="url(#dt-metric-grad-3)"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "global",
      href: "/applications",
      title: arabic ? "5 قطاعات تطبيقية" : "5 Application Domains",
      subtitle: arabic
        ? "المنازل · التجزئة · بيئات العمل · السلامة · الصناعة"
        : "Homes · Retail · Workplace · Safety · Industry",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-metric-grad-4" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <circle
            cx="14"
            cy="14"
            r="10.2"
            stroke="url(#dt-metric-grad-4)"
            strokeWidth="1.75"
          />
          <ellipse
            cx="14"
            cy="14"
            rx="4.6"
            ry="10.2"
            stroke="url(#dt-metric-grad-4)"
            strokeWidth="1.55"
          />
          <path
            d="M4.2 14H23.8M5.6 9.5H22.4M5.6 18.5H22.4"
            stroke="url(#dt-metric-grad-4)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section
      className="dt-metrics-section"
      aria-label={arabic ? "مؤشرات الشركة" : "Company information and metrics"}
    >
      <div className="container">
        <GlassSurface variant="ribbon" className="dt-metrics-ribbon">
          {items.map((item) => (
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
  );
}

