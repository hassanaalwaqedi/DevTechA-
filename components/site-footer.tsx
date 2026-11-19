import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { HirzexaLogoMark } from "@/components/navigation/SiteHeader";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import {
  COMPANY_EMAILS,
  FOOTER_EMAIL_CHANNELS,
  companyMailto,
} from "@/lib/company-emails";

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
                ? "نُهندس أنظمة برمجية ذكية تصنع الفارق. شركة متخصصة في هندسة الذكاء الاصطناعي والأنظمة البرمجية، والأتمتة الذكية، والمنصات القابلة للتوسع، وتكامل الأنظمة."
                : "We Engineer Intelligent Software Systems. HIRZEXA is an AI and software engineering company specializing in intelligent automation, AI-powered applications, scalable software platforms, and system integrations."}
            </p>
          </div>

          <div className="footer-links dt-footer-links">
            <Link href="/services">{ar ? "الخدمات" : "Services"}</Link>
            <Link href="/solutions">{ar ? "الحلول" : "Solutions"}</Link>
            <Link href="/products">{ar ? "المنتجات والابتكار" : "Products & Innovation"}</Link>
            <Link href="/engineering">{ar ? "الهندسة" : "Engineering"}</Link>
            <Link href="/about">{ar ? "الشركة" : "About"}</Link>
            <Link href="/careers">{ar ? "الوظائف" : "Careers"}</Link>
            <Link href="/contact">{ar ? "تواصل معنا" : "Contact"}</Link>
            <Link href="/ai-architect">{ar ? "معماري الأنظمة" : "AI Architect"}</Link>
          </div>

          <div className="footer-contact dt-footer-contact">
            <span>{ar ? "قنوات التواصل الرسمية" : "Official Channels"}</span>
            {FOOTER_EMAIL_CHANNELS.map(({ channel, labelEn, labelAr }) => (
              <div className="dt-footer-email-row" key={channel}>
                <small>{ar ? labelAr : labelEn}</small>
                <a
                  dir="ltr"
                  href={companyMailto(channel)}
                  aria-label={`${ar ? labelAr : labelEn}: ${COMPANY_EMAILS[channel]}`}
                >
                  {COMPANY_EMAILS[channel]}
                </a>
              </div>
            ))}
            <a
              href="https://www.linkedin.com/company/144674058"
              target="_blank"
              rel="noreferrer"
              className="dt-footer-social"
            >
              LinkedIn <ArrowUpRight size={13} />
            </a>
          </div>
        </div>

        <div className="footer-bottom dt-footer-bottom">
          <span dir="ltr">© {new Date().getFullYear()} HIRZEXA</span>
          <div className="dt-footer-legal-links">
            <Link href="/privacy">{ar ? "الخصوصية" : "Privacy"}</Link>
            <CookieSettingsButton arabic={ar} />
            <Link href="/legal">{ar ? "الشؤون القانونية" : "Legal"}</Link>
            <Link href="/partnerships">{ar ? "الشراكات" : "Partnerships"}</Link>
            <Link href="/investors">{ar ? "المستثمرون" : "Investors"}</Link>
            <Link href="/billing">{ar ? "الفوترة والطلبات" : "Billing & Orders"}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
