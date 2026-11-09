import { ArrowUpRight, Play } from "lucide-react";
import { GradientButton } from "@/components/ui/GradientButton";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { ProjectIndicator } from "@/components/home/ProjectIndicator";
import { HeroArtwork } from "@/components/home/HeroArtwork";

type HeroSectionProps = {
  arabic?: boolean;
};

export function HeroSection({ arabic = false }: HeroSectionProps) {
  return (
    <section className="dt-hero" aria-labelledby="dt-hero-heading">
      {/* Subtle flowing atmospheric background shapes */}
      <div className="dt-hero-atmosphere" aria-hidden="true">
        <div className="dt-hero-glow-top" />
        <div className="dt-hero-glow-right" />
        <div className="dt-hero-glow-left" />
        <svg
          className="dt-hero-waves"
          viewBox="0 0 1648 320"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="dt-wave-grad-1" x1="0" y1="80" x2="1648" y2="240" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E9EEFF" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#EDE8FF" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="dt-wave-stroke" x1="120" y1="120" x2="1520" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1050FF" stopOpacity="0.06" />
              <stop offset="50%" stopColor="#35BEFF" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#873BFF" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M0 190C310 250 560 95 920 148C1210 190 1430 110 1648 68V320H0V190Z"
            fill="url(#dt-wave-grad-1)"
          />
          <path
            d="M0 190C310 250 560 95 920 148C1210 190 1430 110 1648 68"
            stroke="url(#dt-wave-stroke)"
            strokeWidth="1.5"
          />
          <path
            d="M0 242C390 182 720 272 1110 202C1360 156 1510 184 1648 158"
            stroke="url(#dt-wave-stroke)"
            strokeWidth="1"
            opacity="0.7"
          />
        </svg>
      </div>

      <div className="container dt-hero-container">
        <div className="dt-hero-grid">
          {/* Left Column */}
          <div className="dt-hero-copy">
            <GlassSurface variant="pill" className="dt-hero-pill">
              <span className="dt-hero-pill-dot" aria-hidden="true" />
              <span>
                {arabic
                  ? "الرؤية الحاسوبية · ذكاء الحافة"
                  : "COMPUTER VISION · EDGE INTELLIGENCE"}
              </span>
            </GlassSurface>

            <h1 id="dt-hero-heading" className="dt-hero-title">
              {arabic ? (
                <>
                  <span className="dt-hero-title-dark">الذكاء الذي</span>
                  <span className="dt-hero-title-gradient">يرى العالم.</span>
                </>
              ) : (
                <>
                  <span className="dt-hero-title-dark">Intelligence that</span>
                  <span className="dt-hero-title-gradient">sees the world.</span>
                </>
              )}
            </h1>

            <p className="dt-hero-description">
              {arabic
                ? "نطور تقنيات الرؤية الحاسوبية وذكاء الحافة (Edge AI) التي تحوّل الكاميرات والأجهزة إلى أنظمة ذكية — من الإدراك البصري الفوري إلى الرؤى القابلة للتنفيذ."
                : "We build computer vision and Edge AI technologies that turn cameras and devices into intelligent systems — from real-time perception to actionable insights."}
            </p>

            <div className="dt-hero-actions">
              <GradientButton href="/technology" variant="primary" className="dt-hero-btn-primary">
                <span>{arabic ? "استكشف تقنياتنا" : "Explore Our Technology"}</span>
                <ArrowUpRight size={18} className="dt-btn-arrow" aria-hidden="true" />
              </GradientButton>

              <GradientButton href="/products" variant="secondary" className="dt-hero-btn-secondary">
                <span className="dt-play-badge" aria-hidden="true">
                  <Play size={11} fill="currentColor" strokeWidth={1.5} />
                </span>
                <span>{arabic ? "اكتشف منتجات الرؤية" : "Discover Our Vision Products"}</span>
              </GradientButton>
            </div>

            <ProjectIndicator arabic={arabic} />
          </div>

          {/* Right Column */}
          <div className="dt-hero-visual-col">
            <HeroArtwork arabic={arabic} />
          </div>
        </div>
      </div>
    </section>
  );
}

