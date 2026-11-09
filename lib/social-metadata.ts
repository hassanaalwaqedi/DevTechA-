import type { Metadata } from "next";

export type PageSocialCardConfig = {
  title: string;
  description: string;
  path: string;
  eyebrow: string;
  badge: string;
  headline: string;
  summary: string;
  chips: [string, string, string];
  scene: "technology" | "aegis" | "engineering" | "about" | "contact";
  telemetry?: string;
};

const pathToStaticOgFile: Record<string, string> = {
  "/": "/og/home.jpg?v=4",
  "/technology": "/og/technology.jpg?v=4",
  "/products": "/og/products.jpg?v=4",
  "/applications": "/og/applications.jpg?v=4",
  "/engineering": "/og/engineering.jpg?v=4",
  "/about": "/og/about.jpg?v=4",
  "/careers": "/og/careers.jpg?v=4",
  "/contact": "/og/contact.jpg?v=4",
  "/ai-architect": "/og/ai-architect.jpg?v=4",
};

export function buildPageSocialImageUrl(
  config: Omit<PageSocialCardConfig, "description" | "path"> & { path?: string }
): string {
  if (config.path && pathToStaticOgFile[config.path]) {
    return pathToStaticOgFile[config.path];
  }
  const params = new URLSearchParams({
    v: "2027-v4",
    mode: "page",
    title: config.headline,
    department: config.eyebrow,
    badge: config.badge,
    summary: config.summary,
    location: config.chips[0],
    employment: config.chips[1],
    skill: config.chips[2],
    scene: config.scene,
    telemetry: config.telemetry || "HUMAN-AI VISION · 60 FPS",
  });
  return `/api/social-card?${params.toString()}`;
}

export function createPageMetadata(config: PageSocialCardConfig): Metadata {
  const imageUrl = pathToStaticOgFile[config.path] || buildPageSocialImageUrl(config);
  const fullTitle = config.path === "/" ? config.title : `${config.title} | DevTech AI`;

  return {
    title: config.title,
    description: config.description,
    alternates: {
      canonical: config.path,
    },
    openGraph: {
      title: fullTitle,
      description: config.description,
      url: config.path,
      siteName: "DevTech AI — Computer Vision & Edge Intelligence",
      type: "website",
      locale: "en_US",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          type: "image/jpeg",
          alt: `${config.headline} — DevTech AI`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: config.description,
      images: [imageUrl],
    },
  };
}
