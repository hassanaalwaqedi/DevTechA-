import { CapabilityCard } from "@/components/home/CapabilityCard";

type CapabilitiesSectionProps = {
  arabic?: boolean;
};

export function CapabilitiesSection({ arabic = false }: CapabilitiesSectionProps) {
  const cards = [
    {
      id: "computer-vision",
      title: arabic ? "الرؤية الحاسوبية" : "Computer Vision",
      subtitle: arabic ? "الكشف · التتبع · التحليلات" : "Detection · Tracking · Analytics",
      href: "/expertise#vision",
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
      id: "ai-systems",
      title: arabic ? "أنظمة ونماذج الذكاء الاصطناعي" : "AI Systems & Models",
      subtitle: arabic ? "التدريب · التحسين · النشر" : "Training · Optimization · Deployment",
      href: "/expertise#model",
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
      id: "software-engineering",
      title: arabic ? "هندسة البرمجيات" : "Software Engineering",
      subtitle: arabic
        ? "الويب · الجوال · الأنظمة الخلفية · الواجهات"
        : "Web · Mobile · Backend · APIs",
      href: "/expertise#systems",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-3" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="6"
            width="24"
            height="20"
            rx="4"
            stroke="url(#dt-cap-grad-3)"
            strokeWidth="1.85"
          />
          <path
            d="M4 11.5H28"
            stroke="url(#dt-cap-grad-3)"
            strokeWidth="1.5"
            strokeOpacity="0.65"
          />
          <path
            d="M12.5 16L9.5 18.8L12.5 21.6M19.5 16L22.5 18.8L19.5 21.6M17 15.2L15 22.4"
            stroke="url(#dt-cap-grad-3)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "ai-infrastructure",
      title: arabic ? "البنية التحتية للذكاء الاصطناعي" : "AI Infrastructure",
      subtitle: arabic ? "قابلية التوسع · الموثوقية · الأمان" : "Scalable · Reliable · Secure",
      href: "/expertise#infrastructure",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dt-cap-grad-4" x1="4" y1="5" x2="28" y2="27" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
          </defs>
          <rect
            x="5"
            y="6.5"
            width="22"
            height="7.5"
            rx="2.6"
            stroke="url(#dt-cap-grad-4)"
            strokeWidth="1.85"
          />
          <rect
            x="5"
            y="18"
            width="22"
            height="7.5"
            rx="2.6"
            stroke="url(#dt-cap-grad-4)"
            strokeWidth="1.85"
          />
          <circle cx="9.5" cy="10.25" r="1.4" fill="#1050FF" />
          <circle cx="9.5" cy="21.75" r="1.4" fill="#873BFF" />
          <path
            d="M14 10.25H22.5M14 21.75H22.5M11 14V18M21 14V18"
            stroke="url(#dt-cap-grad-4)"
            strokeWidth="1.65"
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
            {arabic ? "قدراتنا الهندسية" : "OUR CAPABILITIES"}
          </span>
          <h2 id="dt-capabilities-heading" className="dt-section-title">
            {arabic ? "هندسة ذكاء اصطناعي متكاملة." : "End-to-end AI engineering."}
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
      </div>
    </section>
  );
}

