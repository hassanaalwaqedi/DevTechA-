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

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://devtecha.onrender.com"),
  title: { default: "DevTech AI — Computer Vision & Edge Intelligence", template: "%s | DevTech AI" },
  description: "Intelligence that sees the world. DevTech AI builds computer vision models, Edge AI inference systems, intelligent devices, and vision software platforms.",
  icons: { icon: [{ url: "/devtech-ai-logo.png", type: "image/png" }], apple: "/devtech-ai-logo.png" },
  openGraph: { title: "DevTech AI — Computer Vision & Edge Intelligence", description: "Intelligence that sees the world. Computer Vision, Edge AI, Intelligent Devices, and Vision Software.", type: "website", images: [{ url: "/devtech-ai-logo.png", width: 1254, height: 1254, alt: "DevTech AI" }] },
  alternates: { canonical: "/" },
  twitter: { card: "summary_large_image", title: "DevTech AI — Computer Vision & Edge Intelligence", description: "Intelligence that sees the world. Computer Vision, Edge AI, Intelligent Devices, and Vision Software.", images: ["/devtech-ai-logo.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F8F9FF" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const organization = {"@context": "https://schema.org", "@type": "Organization", name: "DevTech AI", url: process.env.NEXT_PUBLIC_SITE_URL || "https://devtecha.onrender.com", email: "hello@devtech.ai", description: "Computer Vision and Edge AI technology company developing intelligent visual systems, edge inference pipelines, smart devices, and vision software."};
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body className={`corporate-site ${sans.variable}`}><LanguageProvider locale={locale}><SiteHeader /><VisitorTracker />{children}<SiteFooter locale={locale} /></LanguageProvider><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(organization)}} /></body></html>;
}
