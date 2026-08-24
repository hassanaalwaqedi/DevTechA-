import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL("https://devtech.ai"),
  title: { default: "DevTech AI — AI engineered for real-world impact.", template: "%s | DevTech AI" },
  description: "DevTech AI builds intelligent software products and applied AI systems for the real world.",
  openGraph: { title: "DevTech AI", description: "AI engineered for real-world impact.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${display.variable}`}><SiteHeader />{children}<SiteFooter /></body></html>;
}
