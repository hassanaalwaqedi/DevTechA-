import type { Metadata } from "next";
import { DepartmentalPageView } from "@/components/departmental-page";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Investors — Corporate & Fundraising Inquiries",
  description:
    "Official investor relations and fundraising contact channel for HIRZEXA's AI and software engineering growth and product portfolio.",
  path: "/investors",
  eyebrow: "HIRZEXA / INVESTOR RELATIONS",
  badge: "INVESTORS & FUNDRAISING",
  headline: "Investor inquiries.",
  summary:
    "Direct corporate channel for institutional investors, strategic backers, and fundraising inquiries at HIRZEXA.",
  chips: ["AI & Software Engineering", "Product Portfolio", "Direct Investor Channel"],
  scene: "about",
  telemetry: "INVESTORS@HIRZEXA.COM",
});

export default async function InvestorsPage() {
  const locale = await getLocale();
  return (
    <DepartmentalPageView
      locale={locale}
      eyebrowEn="HIRZEXA / INVESTOR RELATIONS"
      eyebrowAr="HIRZEXA / علاقات المستثمرين"
      titleEn="Engineering intelligent software systems."
      titleAr="هندسة الأنظمة البرمجية الذكية والابتكار التطبيقي."
      descriptionEn="HIRZEXA is an AI and software engineering company building intelligent automation, AI-powered applications, scalable software platforms, and proprietary products including Khair and AEGIS."
      descriptionAr="تركز HIRZEXA على هندسة الذكاء الاصطناعي والأنظمة البرمجية، والأتمتة الذكية، والمنصات القابلة للتوسع، إلى جانب محفظة منتجاتها مثل منصة خير ومنتج AEGIS."
      actionHref="/contact?category=Investors%20%26%20Fundraising"
      actionLabelEn="Contact investor relations"
      actionLabelAr="التواصل مع علاقات المستثمرين"
      secondaryHref="/about"
      secondaryLabelEn="Read company story"
      secondaryLabelAr="تعرّف على الشركة"
      detailsTitleEn="INVESTOR CHANNEL"
      detailsTitleAr="قناة المستثمرين"
      detailsEn={[
        "Direct channel for qualified investor inquiries",
        "AI & software engineering capabilities and product portfolio (Khair & AEGIS)",
        "Long-term platform and applied AI growth roadmap",
      ]}
      detailsAr={[
        "قناة مباشرة لاستفسارات المستثمرين والتمويل",
        "استعراض قدرات هندسة الذكاء الاصطناعي والبرمجيات ومحفظة المنتجات (خير وAEGIS)",
        "استراتيجية النمو طويلة المدى في الأنظمة الذكية والمنصات البرمجية",
      ]}
      cards={[
        {
          id: "investor-inquiries",
          titleEn: "Investors & Fundraising",
          titleAr: "المستثمرون والتمويل",
          descriptionEn:
            "For investment discussions, fundraising updates, and corporate briefings regarding HIRZEXA's vision technology and product development.",
          descriptionAr:
            "لمناقشات الاستثمار، ومستجدات التمويل، والإحاطات المؤسسية المتعلقة بتقنيات ومنتجات HIRZEXA.",
          channel: "investors",
          subject: "Investor Inquiry — HIRZEXA",
          contactCategory: "Investors & Fundraising",
        },
        {
          id: "corporate-contact",
          titleEn: "General Corporate Inquiries",
          titleAr: "الاستفسارات المؤسسية العامة",
          descriptionEn:
            "For press, general company correspondence, or multi-department introductions.",
          descriptionAr:
            "للمراسلات المؤسسية العامة، أو الطلبات الإعلامية، أو التنسيق بين الأقسام.",
          channel: "general",
          subject: "Corporate Inquiry — HIRZEXA",
          contactCategory: "General Inquiries",
        },
      ]}
    />
  );
}

