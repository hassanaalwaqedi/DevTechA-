import type { Metadata } from "next";
import { DepartmentalPageView } from "@/components/departmental-page";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Legal — Corporate Notices & Compliance",
  description:
    "Official legal contact channel and corporate information disclosures for HIRZEXA (https://hirzexa.com).",
  path: "/legal",
  eyebrow: "HIRZEXA / LEGAL",
  badge: "LEGAL MATTERS & COMPLIANCE",
  headline: "Legal notices & terms.",
  summary:
    "Official contact channel for legal matters, intellectual property, and compliance inquiries at HIRZEXA.",
  chips: ["LEGAL@HIRZEXA.COM", "Concept Disclaimers", "Corporate Notices"],
  scene: "about",
  telemetry: "LEGAL@HIRZEXA.COM",
});

export default async function LegalPage() {
  const locale = await getLocale();
  return (
    <DepartmentalPageView
      locale={locale}
      eyebrowEn="HIRZEXA / LEGAL"
      eyebrowAr="HIRZEXA / الشؤون القانونية"
      titleEn="Legal matters & corporate notices."
      titleAr="الشؤون القانونية والإشعارات الرسمية."
      descriptionEn="Hardware concepts, future roadmaps, and illustrative AEGIS AI visualizations presented on this website are informational only and do not constitute binding commercial offers, regulatory certifications, or autonomous safety guarantees."
      descriptionAr="التصورات المستقبلية للأجهزة وخرائط الطريق والواجهات التوضيحية لنظام AEGIS AI على هذا الموقع هي لأغراض تعريفية ولا تُعد عروضاً تجارية ملزمة أو اعتمادات تنظيمية أو ضمانات أمنية مستقلة."
      actionHref="/contact?category=Legal%20Matters"
      actionLabelEn="Contact legal team"
      actionLabelAr="تواصل مع الشؤون القانونية"
      secondaryHref="/privacy"
      secondaryLabelEn="Privacy & data protection"
      secondaryLabelAr="الخصوصية وحماية البيانات"
      detailsTitleEn="LEGAL & DISCLOSURES"
      detailsTitleAr="الإفصاحات القانونية"
      detailsEn={[
        "Dedicated legal correspondence via legal@hirzexa.com",
        "Clear separation between current software and roadmap hardware concepts",
        "Assisted vision alerts require human-in-the-loop operator review",
      ]}
      detailsAr={[
        "المراسلات القانونية الرسمية عبر legal@hirzexa.com",
        "فصل واضح بين الأنظمة البرمجية الحالية وتصورات العتاد المستقبلية",
        "تتطلب تنبيهات الرؤية المساعدة مراجعة وإشراف المشغل البشري",
      ]}
      cards={[
        {
          id: "legal-matters",
          titleEn: "Legal Matters & Formal Notices",
          titleAr: "المسائل القانونية والإشعارات الرسمية",
          descriptionEn:
            "Send contractual inquiries, trademark or intellectual property notices, and formal legal correspondence.",
          descriptionAr:
            "للمراسلات التعاقدية، وإشعارات العلامات التجارية والملكية الفكرية، والإشعارات القانونية الرسمية.",
          channel: "legal",
          subject: "Legal Inquiry — HIRZEXA",
          contactCategory: "Legal Matters",
        },
        {
          id: "privacy-coordination",
          titleEn: "Privacy & Data Protection",
          titleAr: "الخصوصية وحماية البيانات",
          descriptionEn:
            "For data subject access, deletion requests, or privacy compliance documentation.",
          descriptionAr:
            "لطلبات أصحاب البيانات والخصوصية والامتثال لمعايير حماية البيانات.",
          channel: "privacy",
          subject: "Privacy Inquiry — HIRZEXA",
          contactCategory: "Privacy & Data Protection",
        },
      ]}
    />
  );
}

