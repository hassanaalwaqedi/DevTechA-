import Image from "next/image";
import Link from "next/link";

type ProjectIndicatorProps = {
  arabic?: boolean;
};

const projectThumbnails = [
  {
    src: "/khair-discover.png",
    alt: "Computer Vision and event discovery project preview",
  },
  {
    src: "/khair-dashboard-ar.png",
    alt: "AI platform dashboard interface",
  },
  {
    src: "/khair-mobile-event.png",
    alt: "Mobile intelligent platform experience",
  },
];

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
        {projectThumbnails.map((thumb, index) => (
          <span
            key={thumb.src}
            className={`dt-project-avatar dt-project-avatar-${index + 1}`}
          >
            <Image
              src={thumb.src}
              alt={thumb.alt}
              width={42}
              height={42}
              className="dt-project-avatar-img"
            />
          </span>
        ))}
      </div>
      <div className="dt-project-indicator-text">
        <strong>
          {arabic ? "AEGIS AI وأنظمة الرؤية الذكية." : "AEGIS AI & Smart Vision Systems."}
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

