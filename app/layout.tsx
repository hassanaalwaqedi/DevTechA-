import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${display.variable}`}><SiteHeader />{children}<SiteFooter /></body></html>;
}
