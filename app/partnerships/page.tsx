import type { Metadata } from "next";
import { DepartmentalPageView } from "@/components/departmental-page";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Partnerships — Technology & Engineering Collaborations",
  description:
    "Partner with HIRZEXA on AI engineering, intelligent automation, enterprise software integration, and applied R&D.",
  path: "/partnerships",
  eyebrow: "HIRZEXA / PARTNERSHIPS",
  badge: "STRATEGIC & TECHNICAL PARTNERSHIPS",
  headline: "Collaborate with HIRZEXA.",
  summary:
    "Engineering collaborations, system integrations, and strategic technology partnership proposals.",
  chips: ["AI & Software Partners", "System Integration", "Applied R&D"],
  scene: "technology",
  telemetry: "PARTNERSHIPS@HIRZEXA.COM",
});

export default async function PartnershipsPage() {
  const locale = await getLocale();
  return (
    <DepartmentalPageView
      locale={locale}
      eyebrowEn="HIRZEXA / PARTNERSHIPS"
      eyebrowAr="HIRZEXA / الشراكات"
      titleEn="Technology & strategic partnerships."
      titleAr="الشراكات التقنية والاستراتيجية."
      descriptionEn="We collaborate with technology providers, enterprise teams, and engineering partners on AI integration, workflow automation, custom software platforms, and applied product innovation."
      descriptionAr="نتعاون مع مزودي التقنية والفرق المؤسسية والشركاء الهندسيين في مجالات تكامل الذكاء الاصطناعي، وأتمتة العمليات، والمنصات البرمجية، والابتكار التطبيقي."
      actionHref="/contact?category=Partnerships%20%26%20Collaborations"
      actionLabelEn="Submit partnership proposal"
      actionLabelAr="إرسال مقترح شراكة"
      secondaryHref="/engineering"
      secondaryLabelEn="Explore engineering stack"
      secondaryLabelAr="استكشف المعمارية الهندسية"
      detailsTitleEn="PARTNERSHIP FOCUS"
      detailsTitleAr="مجالات الشراكة"
      detailsEn={[
        "Enterprise AI, LLM & automation integrations",
        "Custom software platforms & cloud ecosystem engineering",
        "Product collaborations across Khair and AEGIS",
      ]}
      detailsAr={[
        "تكامل أنظمة الذكاء الاصطناعي والأتمتة المؤسسية",
        "تطوير المنصات البرمجية المخصصة والمعمارية السحابية",
        "تعاون تقني وتجريبي حول منتجاتنا (منصة خير ومنتج AEGIS)",
      ]}
      cards={[
        {
          id: "proposals",
          titleEn: "Partnership Proposals",
          titleAr: "مقترحات الشراكات",
          descriptionEn:
            "Share technical or strategic partnership proposals covering AI platforms, cloud infrastructure, enterprise integrations, or joint R&D.",
          descriptionAr:
            "شاركنا مقترحات الشراكة التقنية أو الاستراتيجية في مجالات الذكاء الاصطناعي، والبنية السحابية، وتكامل الأنظمة، أو البحث والتطوير المشترك.",
          channel: "partnerships",
          subject: "Partnership Proposal — HIRZEXA",
          contactCategory: "Partnerships & Collaborations",
        },
        {
          id: "commercial",
          titleEn: "Commercial Projects & Product Demos",
          titleAr: "المشاريع التجارية وعروض المنتجات",
          descriptionEn:
            "For custom software & AI engineering projects, process automation inquiries, or AEGIS product evaluations.",
          descriptionAr:
            "لمشاريع هندسة البرمجيات والذكاء الاصطناعي، وحلول أتمتة العمليات، وطلب العروض التوضيحية للمنتجات.",
          channel: "business",
          subject: "Commercial & Engineering Inquiry — HIRZEXA",
          contactCategory: "Product Demos & Business",
        },
      ]}
    />
  );
}

