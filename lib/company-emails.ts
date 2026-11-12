export const COMPANY_EMAILS = Object.freeze({
  general: "contact@hirzexa.com",
  business: "business@hirzexa.com",
  support: "support@hirzexa.com",
  investors: "investors@hirzexa.com",
  partnerships: "partnerships@hirzexa.com",
  finance: "finance@hirzexa.com",
  careers: "careers@hirzexa.com",
  orders: "orders@hirzexa.com",
  privacy: "privacy@hirzexa.com",
  legal: "legal@hirzexa.com",
} as const);

/**
 * Automated outbound notifications ONLY.
 * Must always be paired with an explicit departmental `replyTo` address and enabled
 * only after sender identity ("Send mail as" / SPF / DKIM / DMARC) is verified
 * on the primary Google Workspace mailbox.
 */
export const SYSTEM_NOTIFICATION_EMAIL = "noreply@hirzexa.com" as const;

export type CompanyEmailChannel = keyof typeof COMPANY_EMAILS;

export const DEPARTMENT_METADATA: Record<
  CompanyEmailChannel,
  { en: string; ar: string; roleEn: string; roleAr: string }
> = {
  general: {
    en: "General Contact",
    ar: "التواصل العام",
    roleEn: "General inquiries & corporate contact",
    roleAr: "الاستفسارات العامة والتواصل المؤسسي",
  },
  business: {
    en: "Business Development & Sales",
    ar: "تطوير الأعمال والمبيعات",
    roleEn: "Product inquiries, AEGIS AI demos & commercial proposals",
    roleAr: "استفسارات المنتجات، عروض AEGIS AI التجارية، وطلبات الأعمال",
  },
  support: {
    en: "Technical Support",
    ar: "الدعم الفني",
    roleEn: "Engineering support, AEGIS AI technical questions & Edge AI",
    roleAr: "الدعم الهندسي والأسئلة التقنية لنظام AEGIS AI وذكاء الحافة",
  },
  investors: {
    en: "Investors & Fundraising",
    ar: "المستثمرون والتمويل",
    roleEn: "Investor relations and corporate fundraising inquiries",
    roleAr: "علاقات المستثمرين واستفسارات التمويل",
  },
  partnerships: {
    en: "Partnerships",
    ar: "الشراكات",
    roleEn: "Engineering collaborations & strategic partnership proposals",
    roleAr: "التعاون الهندسي ومقترحات الشراكات الاستراتيجية",
  },
  finance: {
    en: "Finance & Billing",
    ar: "الشؤون المالية والفواتير",
    roleEn: "Invoices, billing administration & financial notices",
    roleAr: "الفواتير والشؤون المالية والتحصيل",
  },
  careers: {
    en: "Careers & Recruitment",
    ar: "الوظائف والتوظيف",
    roleEn: "Job applications & recruitment inquiries",
    roleAr: "طلبات التوظيف واستفسارات الكوادر الهندسية",
  },
  orders: {
    en: "Orders & Purchasing",
    ar: "الطلبات والمشتريات",
    roleEn: "Procurement, purchasing & authorized order inquiries",
    roleAr: "طلبات الشراء والمشتريات وتنسيق الطلبات المعتمدة",
  },
  privacy: {
    en: "Privacy & Data Protection",
    ar: "الخصوصية وحماية البيانات",
    roleEn: "Data protection, privacy requests & candidate data inquiries",
    roleAr: "حماية البيانات، طلبات الخصوصية، واستفسارات بيانات المتقدمين",
  },
  legal: {
    en: "Legal Matters",
    ar: "الشؤون القانونية",
    roleEn: "Legal notices, compliance & contractual inquiries",
    roleAr: "الإشعارات القانونية، الامتثال، والمسائل التعاقدية",
  },
};

export function companyMailto(channel: CompanyEmailChannel, subject?: string) {
  const cleanSubject = subject?.replace(/[\r\n]/g, " ").trim();
  return `mailto:${COMPANY_EMAILS[channel]}${cleanSubject ? `?subject=${encodeURIComponent(cleanSubject)}` : ""}`;
}

export const FOOTER_EMAIL_CHANNELS = [
  { channel: "general", labelEn: "General Inquiries", labelAr: "الاستفسارات العامة" },
  { channel: "business", labelEn: "Business & Sales", labelAr: "الأعمال والمبيعات" },
  { channel: "support", labelEn: "Technical Support", labelAr: "الدعم الفني" },
  { channel: "careers", labelEn: "Careers", labelAr: "الوظائف" },
] as const satisfies ReadonlyArray<{
  channel: CompanyEmailChannel;
  labelEn: string;
  labelAr: string;
}>;

export const CONTACT_DIRECTORY = [
  { id: "general", en: "General inquiries", ar: "الاستفسارات العامة", emails: ["general"] },
  { id: "business", en: "Business, sales & product demos", ar: "الأعمال والمبيعات وعروض المنتجات", emails: ["business"] },
  { id: "support", en: "Technical support", ar: "الدعم الفني والهندسي", emails: ["support"] },
  { id: "partnerships", en: "Partnerships & collaborations", ar: "الشراكات والتعاون التقني", emails: ["partnerships"] },
  { id: "investors", en: "Investors & fundraising", ar: "المستثمرون والتمويل", emails: ["investors"] },
  { id: "careers", en: "Careers & recruitment", ar: "الوظائف والتوظيف", emails: ["careers"] },
  { id: "orders", en: "Orders & purchasing", ar: "الطلبات والمشتريات", emails: ["orders"] },
  { id: "finance", en: "Finance & billing", ar: "الشؤون المالية والفواتير", emails: ["finance"] },
  { id: "privacy", en: "Privacy & data protection", ar: "الخصوصية وحماية البيانات", emails: ["privacy"] },
  { id: "legal", en: "Legal matters", ar: "الشؤون القانونية", emails: ["legal"] },
] as const satisfies ReadonlyArray<{ id: string; en: string; ar: string; emails: ReadonlyArray<CompanyEmailChannel> }>;

export const CONTACT_FORM_CATEGORIES = [
  { en: "Product Demos & Business", ar: "عروض المنتجات والأعمال", recipient: "business" },
  { en: "AEGIS AI Commercial", ar: "الاستفسارات التجارية لـ AEGIS AI", recipient: "business" },
  { en: "AEGIS AI Technical Support", ar: "الدعم التقني لنظام AEGIS AI", recipient: "support" },
  { en: "Computer Vision Systems", ar: "أنظمة الرؤية الحاسوبية", recipient: "support" },
  { en: "Edge AI & Model Optimization", ar: "ذكاء الحافة وتحسين النماذج", recipient: "support" },
  { en: "Vision Software & Dashboards", ar: "برمجيات الرؤية ولوحات المراقبة", recipient: "support" },
  { en: "Partnerships & Collaborations", ar: "الشراكات والتعاون التقني", recipient: "partnerships" },
  { en: "Orders & Purchasing", ar: "الطلبات والمشتريات", recipient: "orders" },
  { en: "Investors & Fundraising", ar: "المستثمرون والتمويل", recipient: "investors" },
  { en: "Finance & Billing", ar: "الشؤون المالية والفواتير", recipient: "finance" },
  { en: "Careers & Recruitment", ar: "الوظائف والتوظيف", recipient: "careers" },
  { en: "Privacy & Data Protection", ar: "الخصوصية وحماية البيانات", recipient: "privacy" },
  { en: "Legal Matters", ar: "الشؤون القانونية", recipient: "legal" },
  { en: "General Inquiries", ar: "استفسار عام", recipient: "general" },
] as const satisfies ReadonlyArray<{ en: string; ar: string; recipient: CompanyEmailChannel }>;

const LEGACY_CATEGORY_ALIASES: Record<string, CompanyEmailChannel> = {
  "AEGIS AI & Safety Vision": "support",
  "Intelligent Devices & Cameras": "orders",
  "Technology Partnership": "partnerships",
  "Other technical challenge": "support",
};

export function recipientForContactCategory(category: string): CompanyEmailChannel | null {
  return (
    CONTACT_FORM_CATEGORIES.find((item) => item.en === category)?.recipient ??
    LEGACY_CATEGORY_ALIASES[category] ??
    null
  );
}
