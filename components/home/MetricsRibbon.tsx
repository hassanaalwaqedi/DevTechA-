import Link from "next/link";
import { GlassSurface } from "@/components/ui/GlassSurface";

type MetricsRibbonProps = {
  arabic?: boolean;
  projectCount?: number | null;
  openPositionsCount?: number | null;
};

export function MetricsRibbon({ arabic = false }: MetricsRibbonProps) {
  const items = [
    {
      id: "outcomes",
      href: "#use-cases",
      title: arabic ? "نتائج أعمال ملموسة" : "Business Outcomes First",
      subtitle: arabic
        ? "تقليل العمل اليدوي · رفع الكفاءة التشغيلية"
        : "Reduce Manual Overhead · Scale Operations",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-metric-grad-1" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <path
            d="M4.5 20.5L10.5 14.5L15 18L23.5 8.5"
            stroke="url(#dt-metric-grad-1)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 8.5H23.5V14"
            stroke="url(#dt-metric-grad-1)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "divisions",
      href: "#services",
      title: arabic ? "4 أقسام هندسية متكاملة" : "4 Core Engineering Divisions",
      subtitle: arabic
        ? "الذكاء الاصطناعي · البرمجيات · الأتمتة · السحابة"
        : "AI Engineering · Custom Software · Automation · Cloud",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-metric-grad-2" x1="3" y1="4" x2="25" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="8.5" height="8.5" rx="2.2" stroke="url(#dt-metric-grad-2)" strokeWidth="1.75" />
          <rect x="15.5" y="4" width="8.5" height="8.5" rx="2.2" stroke="url(#dt-metric-grad-2)" strokeWidth="1.75" />
          <rect x="4" y="15.5" width="8.5" height="8.5" rx="2.2" stroke="url(#dt-metric-grad-2)" strokeWidth="1.75" />
          <rect x="15.5" y="15.5" width="8.5" height="8.5" rx="2.2" stroke="url(#dt-metric-grad-2)" strokeWidth="1.75" />
        </svg>
      ),
    },
    {
      id: "onboarding",
      href: "#how-we-work",
      title: arabic ? "منهجية تعاقد وتسليم شفافة" : "Transparent Client Onboarding",
      subtitle: arabic
        ? "استشارة ← عرض فني ← تعاقد ← إطلاق"
        : "Discovery → Proposal → SOW → Production",
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
      id: "proof",
      href: "#verified-work",
      title: arabic ? "أعمال ومنتجات مبرهنة" : "Verified Technical Proof",
      subtitle: arabic
        ? "منصة خير الحية · مشروع AEGIS الفائز بالجوائز"
        : "Khair Live Platform · Award-Winning AEGIS",
      icon: (
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-metric-grad-4" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <circle cx="14" cy="14" r="10.2" stroke="url(#dt-metric-grad-4)" strokeWidth="1.75" />
          <ellipse cx="14" cy="14" rx="4.6" ry="10.2" stroke="url(#dt-metric-grad-4)" strokeWidth="1.55" />
          <path d="M4.2 14H23.8M5.6 9.5H22.4M5.6 18.5H22.4" stroke="url(#dt-metric-grad-4)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section
      className="dt-metrics-section"
      aria-label={arabic ? "ركائز القيمة الهندسية للأعمال" : "B2B engineering value pillars"}
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
