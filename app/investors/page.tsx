import type { Metadata } from "next";
import { DepartmentalPageView } from "@/components/departmental-page";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Investors — Corporate & Fundraising Inquiries",
  description:
    "Official investor relations and fundraising contact channel for HIRZEXA's computer vision and Edge AI product roadmap.",
  path: "/investors",
  eyebrow: "HIRZEXA / INVESTOR RELATIONS",
  badge: "INVESTORS & FUNDRAISING",
  headline: "Investor inquiries.",
  summary:
    "Direct corporate channel for institutional investors, strategic backers, and fundraising inquiries at HIRZEXA.",
  chips: ["Computer Vision Roadmap", "Edge AI Architecture", "Direct Investor Channel"],
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
      titleEn="Building intelligent vision infrastructure."
      titleAr="بناء البنية التقنية للرؤية الذكية."
      descriptionEn="HIRZEXA is focused on engineering practical computer vision models, low-latency Edge AI software, and future intelligent hardware platforms."
      descriptionAr="تركز HIRZEXA على هندسة نماذج الرؤية الحاسوبية، وبرمجيات ذكاء الحافة منخفضة الكمون، وتطوير منظومة أجهزة ذكية مستقبلية."
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
        "Product roadmap & AEGIS AI technical progress",
        "Long-term Edge AI & intelligent device vision",
      ]}
      detailsAr={[
        "قناة مباشرة لاستفسارات المستثمرين والتمويل",
        "استعراض خارطة المنتجات والتقدم الهندسي في AEGIS AI",
        "الرؤية طويلة المدى في ذكاء الحافة والأجهزة الذكية",
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

