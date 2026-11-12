import type { Metadata } from "next";
import { DepartmentalPageView } from "@/components/departmental-page";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy — Data Protection & Privacy Requests",
  description:
    "How HIRZEXA handles website contact inquiries, recruitment CVs, and privacy-conscious edge vision principles.",
  path: "/privacy",
  eyebrow: "HIRZEXA / PRIVACY & DATA PROTECTION",
  badge: "PRIVACY & EDGE DATA STEWARDSHIP",
  headline: "Privacy and data protection.",
  summary:
    "Clear handling of contact inquiries, candidate applications, and privacy-conscious Edge AI architecture.",
  chips: ["Minimal Data Collection", "Edge-First Privacy", "PRIVACY@HIRZEXA.COM"],
  scene: "technology",
  telemetry: "PRIVACY@HIRZEXA.COM",
});

export default async function PrivacyPage() {
  const locale = await getLocale();
  return (
    <DepartmentalPageView
      locale={locale}
      eyebrowEn="HIRZEXA / PRIVACY & DATA PROTECTION"
      eyebrowAr="HIRZEXA / الخصوصية وحماية البيانات"
      titleEn="Privacy-first engineering & data requests."
      titleAr="هندسة تراعي الخصوصية وطلبات حماية البيانات."
      descriptionEn="We process website inquiries only to route and respond to your message, protect recruitment CVs in private storage accessible solely to the hiring team, and design Edge AI pipelines for local processing."
      descriptionAr="نعالج استفسارات الموقع لتوجيه رسالتك والرد عليها فقط، ونحفظ السير الذاتية للمرشحين في تخزين مقيد لا يطلع عليه سوى فريق التوظيف، ونصمم أنظمة ذكاء الحافة للمعالجة المحلية."
      actionHref="/contact?category=Privacy%20%26%20Data%20Protection"
      actionLabelEn="Submit privacy request"
      actionLabelAr="إرسال طلب خصوصية"
      secondaryHref="/legal"
      secondaryLabelEn="View legal notices"
      secondaryLabelAr="الشؤون القانونية"
      detailsTitleEn="DATA PROTECTION PRINCIPLES"
      detailsTitleAr="مبادئ حماية البيانات"
      detailsEn={[
        "Contact submissions are routed by category and not sold to third parties",
        "Recruitment documents (PDF/DOCX) are accessed solely by hiring reviewers",
        "Privacy & deletion requests handled via privacy@hirzexa.com",
      ]}
      detailsAr={[
        "تُوجّه استفسارات التواصل حسب القسم ولا تُباع لأطراف خارجية",
        "تُحفظ ملفات التوظيف (PDF/DOCX) لمراجعة فريق التوظيف فقط",
        "تُعالج طلبات الخصوصية أو الحذف عبر privacy@hirzexa.com",
      ]}
      cards={[
        {
          id: "privacy-requests",
          titleEn: "Privacy & Data Protection Requests",
          titleAr: "طلبات الخصوصية وحماية البيانات",
          descriptionEn:
            "Request access, correction, or deletion of personal data submitted through job applications, the AI Architect brief form, or direct inquiries.",
          descriptionAr:
            "لطلبات الاطلاع على بياناتك الشخصية أو تعديلها أو حذفها سواء من طلبات التوظيف أو نموذج التواصل.",
          channel: "privacy",
          subject: "Privacy & Data Request — HIRZEXA",
          contactCategory: "Privacy & Data Protection",
        },
        {
          id: "legal-notices",
          titleEn: "Legal & Compliance Correspondence",
          titleAr: "المراسلات القانونية والامتثال",
          descriptionEn:
            "For contractual terms, intellectual property notices, or formal legal matters.",
          descriptionAr:
            "للشروط التعاقدية، وإشعارات الملكية الفكرية، أو المسائل القانونية الرسمية.",
          channel: "legal",
          subject: "Legal Matter — HIRZEXA",
          contactCategory: "Legal Matters",
        },
      ]}
    />
  );
}

