import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VisitorTracker } from "@/components/visitor-tracker";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://devtecha.onrender.com"),
  title: { default: "DevTech AI — AI Engineering & Intelligent Systems", template: "%s | DevTech AI" },
  description: "DevTech AI architects, develops, and deploys AI systems—from custom models and computer vision to production inference infrastructure.",
  icons: { icon: [{ url: "/devtech-ai-logo.png", type: "image/png" }], apple: "/devtech-ai-logo.png" },
  openGraph: { title: "DevTech AI", description: "AI engineering and intelligent systems for real-world complexity.", type: "website", images: [{ url: "/devtech-ai-logo.png", width: 1254, height: 1254, alt: "DevTech AI" }] },
  alternates: { canonical: "/" },
  twitter: { card: "summary_large_image", title: "DevTech AI", description: "AI engineering and intelligent systems for real-world complexity.", images: ["/devtech-ai-logo.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#070b14" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = {"@context": "https://schema.org", "@type": "Organization", name: "DevTech AI", url: process.env.NEXT_PUBLIC_SITE_URL || "https://devtecha.onrender.com", email: "hello@devtech.ai", description: "AI engineering and intelligent systems development company."};
  return <html lang="en"><body className={`${sans.variable} ${display.variable}`}><SiteHeader /><VisitorTracker />{children}<SiteFooter /><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(organization)}} /></body></html>;
}
