import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VisitorTracker } from "@/components/visitor-tracker";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Inter({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://devtecha.onrender.com"),
  title: { default: "DevTech AI — AI engineered for real-world impact.", template: "%s | DevTech AI" },
  description: "DevTech AI builds intelligent software products and applied AI systems for the real world.",
  icons: {
    icon: [{ url: "/devtech-ai-logo.png", type: "image/png" }],
    apple: "/devtech-ai-logo.png",
  },
  openGraph: {
    title: "DevTech AI",
    description: "AI engineered for real-world impact.",
    type: "website",
    images: [{ url: "/devtech-ai-logo.png", width: 1254, height: 1254, alt: "DevTech AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DevTech AI",
    description: "AI engineered for real-world impact.",
    images: ["/devtech-ai-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${display.variable}`}><SiteHeader /><VisitorTracker />{children}<SiteFooter /></body></html>;
}
