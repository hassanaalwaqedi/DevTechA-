import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./art-direction.css";
import "./motion.css";
import "./startup.css";
import "./rtl.css";
import "./corporate.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VisitorTracker } from "@/components/visitor-tracker";
import { LanguageProvider } from "@/components/language-provider";
import { getLocale } from "@/lib/locale";
import { buildPageSocialImageUrl } from "@/lib/social-metadata";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

const defaultSocialImage = buildPageSocialImageUrl({
  path: "/",
  title: "HIRZEXA | Computer Vision & Edge AI Technologies",
  eyebrow: "HIRZEXA / COMPUTER VISION & EDGE INTELLIGENCE",
  badge: "INTELLIGENCE THAT SEES THE WORLD",
  headline: "Intelligence that sees the world.",
  summary: "Computer vision and Edge AI technologies for intelligent cameras and devices.",
  chips: ["Computer Vision", "Edge AI", "Intelligent Devices"],
  scene: "technology",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "HIRZEXA | Computer Vision & Edge AI Technologies", template: "%s | HIRZEXA" },
  description: "HIRZEXA develops computer vision and Edge AI technologies for intelligent cameras, devices, and real-world visual intelligence applications.",
  applicationName: "HIRZEXA",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "HIRZEXA | Computer Vision & Edge AI Technologies",
    description: "HIRZEXA develops computer vision and Edge AI technologies for intelligent cameras, devices, and real-world visual intelligence applications.",
    type: "website",
    siteName: "HIRZEXA",
    images: [{ url: defaultSocialImage, width: 1200, height: 630, type: "image/jpeg", alt: "HIRZEXA — Intelligence that sees the world" }],
  },
  alternates: { canonical: "/" },
  twitter: {
    card: "summary_large_image",
    title: "HIRZEXA | Computer Vision & Edge AI Technologies",
    description: "HIRZEXA develops computer vision and Edge AI technologies for intelligent cameras and devices.",
    images: [defaultSocialImage],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F8F9FF" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const organization = {"@context": "https://schema.org", "@type": "Organization", name: "HIRZEXA", url: SITE_URL, logo: `${SITE_URL}/brand/hirzexa-mark.png`, email: CONTACT_EMAIL, description: "HIRZEXA engineers computer vision, Edge AI, intelligent devices, and vision software."};
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body className={`corporate-site ${sans.variable}`}><LanguageProvider locale={locale}><SiteHeader /><VisitorTracker />{children}<SiteFooter locale={locale} /></LanguageProvider><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(organization)}} /></body></html>;
}
