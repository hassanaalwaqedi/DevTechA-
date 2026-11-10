import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { HirzexaLogoMark } from "@/components/navigation/SiteHeader";

export function SiteFooter({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <footer className="site-footer dt-footer">
      <div className="container">
        <div className="footer-grid dt-footer-grid">
          <div className="dt-footer-brand-col">
            <Link href="/" className="dt-brand" dir="ltr">
              <HirzexaLogoMark />
              <span className="dt-brand-text">HIRZEXA</span>
            </Link>
            <p>
              {ar
                ? "الذكاء الذي يرى العالم. نطور تقنيات الرؤية الحاسوبية وذكاء الحافة (Edge AI) والأجهزة الذكية ومنصات البرمجيات البصرية."
                : "Intelligence that sees the world. We build computer vision models, Edge AI systems, intelligent devices, and vision software platforms."}
            </p>
          </div>

          <div className="footer-links dt-footer-links">
            <Link href="/technology">{ar ? "التقنية" : "Technology"}</Link>
            <Link href="/products">{ar ? "المنتجات" : "Products"}</Link>
            <Link href="/applications">{ar ? "التطبيقات" : "Applications"}</Link>
            <Link href="/engineering">{ar ? "الهندسة" : "Engineering"}</Link>
            <Link href="/about">{ar ? "الشركة" : "About"}</Link>
            <Link href="/careers">{ar ? "الوظائف" : "Careers"}</Link>
            <Link href="/contact">{ar ? "تواصل معنا" : "Contact"}</Link>
            <Link href="/ai-architect">{ar ? "معماري الأنظمة" : "AI Architect"}</Link>
          </div>

          <div className="footer-contact dt-footer-contact">
            <span>{ar ? "تواصل مباشر" : "Direct"}</span>
            <a dir="ltr" href="mailto:contact@hirzexa.com">
              contact@hirzexa.com
            </a>
            <a dir="ltr" href="mailto:support@hirzexa.com">
              support@hirzexa.com
            </a>
            <a
              href="https://www.linkedin.com/company/144674058"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn <ArrowUpRight size={13} />
            </a>
          </div>
        </div>

        <div className="footer-bottom dt-footer-bottom">
          <span dir="ltr">© {new Date().getFullYear()} HIRZEXA</span>
          <span>
            {ar
              ? "الرؤية الحاسوبية. ذكاء الحافة. منتجات ذكية."
              : "Computer Vision. Edge AI. Intelligent Products."}
          </span>
        </div>
      </div>
    </footer>
  );
}
