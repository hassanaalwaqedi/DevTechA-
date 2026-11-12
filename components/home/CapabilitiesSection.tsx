import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CapabilityCard } from "@/components/home/CapabilityCard";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";

type CapabilitiesSectionProps = {
  arabic?: boolean;
};

export function CapabilitiesSection({ arabic = false }: CapabilitiesSectionProps) {
  const cards = [
    {
      id: "computer-vision",
      title: arabic ? "الرؤية الحاسوبية" : "Computer Vision",
      subtitle: arabic
        ? "كشف الأجسام · التتبع · تحليلات الفيديو الفورية"
        : "Object Detection · Tracking · Video Analytics",
      href: "/technology#computer-vision",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-1" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <path
            d="M3.5 16C6.2 10.6 10.7 7.5 16 7.5C21.3 7.5 25.8 10.6 28.5 16C25.8 21.4 21.3 24.5 16 24.5C10.7 24.5 6.2 21.4 3.5 16Z"
            stroke="url(#dt-cap-grad-1)"
            strokeWidth="1.85"
            strokeLinejoin="round"
          />
          <circle
            cx="16"
            cy="16"
            r="4.2"
            stroke="url(#dt-cap-grad-1)"
            strokeWidth="1.85"
          />
          <circle cx="16" cy="16" r="1.6" fill="#1050FF" />
          <path
            d="M6 7.5H3.5V10M26 7.5H28.5V10M6 24.5H3.5V22M26 24.5H28.5V22"
            stroke="url(#dt-cap-grad-1)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        </svg>
      ),
    },
    {
      id: "edge-ai",
      title: arabic ? "ذكاء الحافة (Edge AI)" : "Edge AI",
      subtitle: arabic
        ? "استدلال على الجهاز · تحسين النماذج · زمن استجابة منخفض"
        : "On-Device Inference · Model Optimization · Low Latency",
      href: "/technology#edge-ai",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-2" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect
            x="9.5"
            y="9.5"
            width="13"
            height="13"
            rx="3.2"
            stroke="url(#dt-cap-grad-2)"
            strokeWidth="1.85"
          />
          <circle cx="16" cy="16" r="2.6" fill="url(#dt-cap-grad-2)" />
          <path
            d="M13 5V9.5M19 5V9.5M13 22.5V27M19 22.5V27M5 13H9.5M5 19H9.5M22.5 13H27M22.5 19H27"
            stroke="url(#dt-cap-grad-2)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "intelligent-devices",
      title: arabic ? "الأجهزة الذكية" : "Intelligent Devices",
      subtitle: arabic
        ? "الكاميرات الذكية · وحدات معالجة الحافة · إنترنت الأشياء البصري"
        : "Smart Cameras · Edge AI Units · Vision IoT",
      href: "/technology#intelligent-devices",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-3" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect
            x="5"
            y="6"
            width="22"
            height="16"
            rx="4.5"
            stroke="url(#dt-cap-grad-3)"
            strokeWidth="1.85"
          />
          <circle
            cx="16"
            cy="14"
            r="4.2"
            stroke="url(#dt-cap-grad-3)"
            strokeWidth="1.75"
          />
          <circle cx="16" cy="14" r="1.6" fill="#0754FF" />
          <circle cx="22.5" cy="9.5" r="1.2" fill="#873BFF" />
          <path
            d="M12 25.5H20M16 22V25.5"
            stroke="url(#dt-cap-grad-3)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "vision-software",
      title: arabic ? "برمجيات الرؤية" : "Vision Software",
      subtitle: arabic
        ? "لوحات المراقبة · البث الحي · إدارة الأحداث والتنبيهات"
        : "Monitoring Dashboards · Live Video · Event Alerts",
      href: "/technology#vision-software",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-4" x1="4" y1="5" x2="28" y2="27" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="6"
            width="24"
            height="19"
            rx="3.8"
            stroke="url(#dt-cap-grad-4)"
            strokeWidth="1.85"
          />
          <path
            d="M4 11.2H28"
            stroke="url(#dt-cap-grad-4)"
            strokeWidth="1.5"
            strokeOpacity="0.65"
          />
          <rect
            x="8"
            y="14.5"
            width="8.5"
            height="6.5"
            rx="1.5"
            stroke="url(#dt-cap-grad-4)"
            strokeWidth="1.5"
          />
          <path
            d="M19.5 15.5H24M19.5 18.2H24M19.5 20.9H22.5"
            stroke="url(#dt-cap-grad-4)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="dt-capabilities-section" aria-labelledby="dt-capabilities-heading">
      <div className="container">
        <div className="dt-capabilities-header">
          <span className="dt-section-eyebrow">
            {arabic ? "الركائز التقنية الأربع" : "CORE TECHNOLOGY PILLARS"}
          </span>
          <h2 id="dt-capabilities-heading" className="dt-section-title">
            {arabic
              ? "الرؤية الحاسوبية. ذكاء الحافة. منتجات ذكية."
              : "Computer Vision. Edge AI. Intelligent Products."}
          </h2>
        </div>

        <div className="dt-capabilities-grid">
          {cards.map((card) => (
            <CapabilityCard
              key={card.id}
              title={card.title}
              subtitle={card.subtitle}
              href={card.href}
              icon={card.icon}
            />
          ))}
        </div>

        <div className="dept-email-strip">
          <div className="dept-email-strip-copy">
            <span>{arabic ? "الاستفسارات العامة" : "GENERAL INQUIRIES · HIRZEXA"}</span>
            <p>
              {arabic
                ? "للاستفسارات العامة حول تقنيات الرؤية الحاسوبية وذكاء الحافة أو التواصل المؤسسي."
                : "General inquiries regarding our Computer Vision, Edge AI technologies, or company operations."}
            </p>
          </div>
          <div className="dept-email-strip-actions">
            <a
              dir="ltr"
              href={companyMailto("general", "General inquiry — HIRZEXA")}
              className="dept-email-chip"
              aria-label={`${arabic ? "الاستفسارات العامة" : "General inquiries"}: ${COMPANY_EMAILS.general}`}
            >
              {COMPANY_EMAILS.general} <ArrowUpRight size={15} />
            </a>
            <Link href="/contact?category=General%20Inquiries" className="dept-email-chip">
              {arabic ? "فتح نموذج التواصل" : "Open inquiry form"} <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

