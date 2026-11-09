import Link from "next/link";
import { Camera, ScanEye, Cpu } from "lucide-react";

type ProjectIndicatorProps = {
  arabic?: boolean;
};

const visionStages = [Camera, ScanEye, Cpu];

export function ProjectIndicator({ arabic = false }: ProjectIndicatorProps) {
  return (
    <Link
      href="/products"
      className="dt-project-indicator"
      aria-label={
        arabic
          ? "أنظمة رؤية ذكية ومنتجات حقيقية. استكشف منتجاتنا"
          : "Intelligent vision systems and products. Explore our products"
      }
    >
      <div className="dt-project-avatars" aria-hidden="true">
        {visionStages.map((Icon, index) => (
          <span
            key={index}
            className={`dt-project-avatar dt-project-avatar-${index + 1}`}
          >
            <Icon size={18} strokeWidth={1.9} />
          </span>
        ))}
      </div>
      <div className="dt-project-indicator-text">
        <strong>
          {arabic ? "AEGIS AI · دراسة هندسية للرؤية الذكية" : "AEGIS AI · Vision engineering study"}
        </strong>
        <span>
          {arabic
            ? "الرؤية الحاسوبية · ذكاء الحافة · الأجهزة الذكية"
            : "Computer Vision · Edge AI · Intelligent Devices"}
        </span>
      </div>
    </Link>
  );
}

