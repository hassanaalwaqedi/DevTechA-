import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { DevTechLogoMark } from "@/components/navigation/SiteHeader";

export function SiteFooter({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <footer className="site-footer dt-footer">
      <div className="container">
        <div className="footer-grid dt-footer-grid">
          <div className="dt-footer-brand-col">
            <Link href="/" className="dt-brand" dir="ltr">
              <DevTechLogoMark />
              <span className="dt-brand-text">
                DevTech <em>AI</em>
              </span>
            </Link>
            <p>
              {ar
                ? "نصمم ونبني ونشغّل أنظمة الذكاء الاصطناعي المتقدمة — من النماذج المخصصة إلى التطبيقات القابلة للتوسع."
                : "We design, build, and deploy intelligent AI systems — from custom models to scalable applications."}
            </p>
          </div>

          <div className="footer-links dt-footer-links">
            <Link href="/solutions">{ar ? "الحلول" : "Solutions"}</Link>
            <Link href="/engineering">{ar ? "الهندسة" : "Engineering"}</Link>
            <Link href="/work">{ar ? "أعمالنا" : "Work"}</Link>
            <Link href="/about">{ar ? "الشركة" : "Company"}</Link>
            <Link href="/careers">{ar ? "الوظائف" : "Careers"}</Link>
            <Link href="/expertise">{ar ? "الخبرات" : "Capabilities"}</Link>
            <Link href="/ai-architect">{ar ? "معماري الذكاء" : "AI Architect"}</Link>
            <Link href="/contact">{ar ? "تواصل معنا" : "Discuss a project"}</Link>
          </div>

          <div className="footer-contact dt-footer-contact">
            <span>{ar ? "تواصل مباشر" : "Direct"}</span>
            <a dir="ltr" href="mailto:hello@devtech.ai">
              hello@devtech.ai
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
          <span dir="ltr">© {new Date().getFullYear()} DevTech AI</span>
          <span>
            {ar
              ? "هندسة الذكاء الاصطناعي للتشغيل الفعلي."
              : "AI engineering. Built for production."}
          </span>
        </div>
      </div>
    </footer>
  );
}
