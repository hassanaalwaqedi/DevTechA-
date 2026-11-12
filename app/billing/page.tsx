import type { Metadata } from "next";
import { DepartmentalPageView } from "@/components/departmental-page";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Billing & Orders — Finance and Purchasing Channels",
  description:
    "Official HIRZEXA channels for invoices, billing administration, and authorized purchasing or order coordination.",
  path: "/billing",
  eyebrow: "HIRZEXA / BILLING & ORDERS",
  badge: "FINANCE & PURCHASING",
  headline: "Billing, invoices, and orders.",
  summary:
    "Dedicated channels for finance and billing administration alongside authorized purchasing and order coordination.",
  chips: ["Finance & Billing", "Orders & Purchasing", "HIRZEXA Administration"],
  scene: "engineering",
  telemetry: "FINANCE & ORDERS · HIRZEXA",
});

export default async function BillingPage() {
  const locale = await getLocale();
  return (
    <DepartmentalPageView
      locale={locale}
      eyebrowEn="HIRZEXA / BILLING & ORDERS"
      eyebrowAr="HIRZEXA / الفوترة والطلبات"
      titleEn="Billing, invoices, and purchasing."
      titleAr="الشؤون المالية والفوترة والطلبات."
      descriptionEn="Use the dedicated addresses below for billing administration, invoices, and authorized order or procurement inquiries. Future consumer hardware concepts on our Products page are not yet commercially available."
      descriptionAr="استخدم القنوات المخصصة أدناه للفواتير والشؤون المالية أو استفسارات الطلبات والمشتريات المعتمدة. التصورات المستقبلية للأجهزة على صفحة المنتجات غير مطروحة للبيع التجاري بعد."
      actionHref="/contact?category=Finance%20%26%20Billing"
      actionLabelEn="Submit billing inquiry"
      actionLabelAr="إرسال استفسار مالي"
      secondaryHref="/products"
      secondaryLabelEn="Review product status"
      secondaryLabelAr="مراجعة حالة المنتجات"
      detailsTitleEn="ADMINISTRATION CHANNELS"
      detailsTitleAr="قنوات الإدارة المالية والطلبات"
      detailsEn={[
        "Invoices & billing reconciliation via finance@hirzexa.com",
        "Purchasing & order tracking via orders@hirzexa.com",
        "Server-verified inquiry routing with reference tracking",
      ]}
      detailsAr={[
        "الفواتير والتسويات المالية عبر finance@hirzexa.com",
        "المشتريات ومتابعة الطلبات عبر orders@hirzexa.com",
        "توجيه مؤمن من الخادم مع رقم مرجعي للمتابعة",
      ]}
      cards={[
        {
          id: "finance",
          titleEn: "Invoices & Billing",
          titleAr: "الفواتير والشؤون المالية",
          descriptionEn:
            "Contact our finance team regarding invoices, vendor onboarding, billing records, and remittance notices.",
          descriptionAr:
            "تواصل مع الفريق المالي بخصوص الفواتير، تسجيل الموردين، وسجلات الدفع والتحصيل.",
          channel: "finance",
          subject: "Billing & Invoice Inquiry — HIRZEXA",
          contactCategory: "Finance & Billing",
        },
        {
          id: "orders",
          titleEn: "Purchases & Orders",
          titleAr: "المشتريات والطلبات",
          descriptionEn:
            "Coordinate authorized purchasing inquiries, hardware evaluation requisitions, or commercial order statuses.",
          descriptionAr:
            "لتنسيق طلبات الشراء المعتمدة، أو طلبات التقييم التجريبية، أو متابعة حالة الطلبات.",
          channel: "orders",
          subject: "Purchasing & Order Inquiry — HIRZEXA",
          contactCategory: "Orders & Purchasing",
        },
      ]}
    />
  );
}

