import type { Metadata } from "next";
import { DepartmentalPageView } from "@/components/departmental-page";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Partnerships — Technology & Research Collaborations",
  description:
    "Partner with HIRZEXA on computer vision research, Edge AI hardware integration, and intelligent vision software deployments.",
  path: "/partnerships",
  eyebrow: "HIRZEXA / PARTNERSHIPS",
  badge: "STRATEGIC & TECHNICAL PARTNERSHIPS",
  headline: "Collaborate with HIRZEXA.",
  summary:
    "Engineering collaborations, hardware-software integration, and technology partnership proposals.",
  chips: ["Edge Hardware Partners", "Research Collaboration", "Vision Integration"],
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
      descriptionEn="We collaborate with engineering teams, hardware integrators, and applied research groups advancing real-world computer vision and Edge AI."
      descriptionAr="نتعاون مع الفرق الهندسية ومطوري العتاد والمجموعات البحثية لتطوير تطبيقات الرؤية الحاسوبية وذكاء الحافة."
      actionHref="/contact?category=Partnerships%20%26%20Collaborations"
      actionLabelEn="Submit partnership proposal"
      actionLabelAr="إرسال مقترح شراكة"
      secondaryHref="/engineering"
      secondaryLabelEn="Explore engineering stack"
      secondaryLabelAr="استكشف المعمارية الهندسية"
      detailsTitleEn="PARTNERSHIP FOCUS"
      detailsTitleAr="مجالات الشراكة"
      detailsEn={[
        "Optical sensor & Edge NPU integration",
        "AEGIS AI technical & pilot collaborations",
        "Vision software & device ecosystem engineering",
      ]}
      detailsAr={[
        "تكامل الحساسات البصرية ومعالجات الحافة (Edge AI)",
        "تعاون تقني وتجريبي حول معمارية AEGIS AI",
        "تطوير منظومات برمجيات الرؤية والأجهزة الذكية",
      ]}
      cards={[
        {
          id: "proposals",
          titleEn: "Partnership Proposals",
          titleAr: "مقترحات الشراكات",
          descriptionEn:
            "Share technical or strategic partnership proposals covering camera hardware, Edge AI silicon, deployment channels, or joint R&D.",
          descriptionAr:
            "شاركنا مقترحات الشراكة التقنية أو الاستراتيجية في مجالات الكاميرات، ومعالجات الحافة، أو البحث والتطوير المشترك.",
          channel: "partnerships",
          subject: "Partnership Proposal — HIRZEXA",
          contactCategory: "Partnerships & Collaborations",
        },
        {
          id: "commercial",
          titleEn: "Commercial Deployments & Demos",
          titleAr: "المشاريع التجارية والعروض التوضيحية",
          descriptionEn:
            "For commercial licensing, enterprise product evaluations, or business development inquiries across our vision platforms.",
          descriptionAr:
            "للاستفسارات التجارية وتقييم المنتجات وطلب العروض التوضيحية لمنصات الرؤية.",
          channel: "business",
          subject: "Commercial & Product Demo Inquiry — HIRZEXA",
          contactCategory: "Product Demos & Business",
        },
      ]}
    />
  );
}

