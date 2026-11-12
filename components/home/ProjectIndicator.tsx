import Link from "next/link";
import { ArrowUpRight, Camera, Cpu, ShieldCheck } from "lucide-react";

type ProjectIndicatorProps = {
  arabic?: boolean;
};

const visionStages = [ShieldCheck, Camera, Cpu];

export function ProjectIndicator({ arabic = false }: ProjectIndicatorProps) {
  return (
    <Link
      href="/products/aegis-ai"
      className="dt-project-indicator"
      aria-label={
        arabic
          ? "AEGIS AI — دراسة الحالة والمعمارية ونظام الرؤية. افتح صفحة AEGIS AI"
          : "AEGIS AI — Explore case studies, system architecture, and live walkthrough"
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
        <strong style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span>
            {arabic
              ? "AEGIS AI · استكشف النظام والمعمارية"
              : "AEGIS AI · Case Studies & Architecture"}
          </span>
          <ArrowUpRight size={14} strokeWidth={2.2} aria-hidden="true" />
        </strong>
        <span>
          {arabic
            ? "الرؤية الحاسوبية · نتيجة 95.3% المبلّغ عنها · شاهد العرض"
            : "Computer Vision · 95.3% Evaluation · Interactive Walkthrough"}
        </span>
      </div>
    </Link>
  );
}

