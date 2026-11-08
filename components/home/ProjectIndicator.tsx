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
      href="/work"
      className="dt-project-indicator"
      aria-label={
        arabic
          ? "مشاريع حقيقية. أثر ملموس. استكشف أعمالنا"
          : "Real projects. Real impact. Explore our work"
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
          {arabic ? "مشاريع حقيقية. أثر ملموس." : "Real projects. Real impact."}
        </strong>
        <span>
          {arabic
            ? "الرؤية الحاسوبية · أنظمة الذكاء الاصطناعي · المنصات"
            : "Computer Vision · AI Systems · Platforms"}
        </span>
      </div>
    </Link>
  );
}

