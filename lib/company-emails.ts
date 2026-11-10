export const COMPANY_EMAILS = Object.freeze({
  general: "contact@hirzexa.com",
  support: "support@hirzexa.com",
  investors: "investors@hirzexa.com",
  partnerships: "partnerships@hirzexa.com",
  finance: "finance@hirzexa.com",
  careers: "careers@hirzexa.com",
  orders: "orders@hirzexa.com",
  privacy: "privacy@hirzexa.com",
  legal: "legal@hirzexa.com",
} as const);

export type CompanyEmailChannel = keyof typeof COMPANY_EMAILS;

export function companyMailto(channel: CompanyEmailChannel, subject?: string) {
  const cleanSubject = subject?.replace(/[\r\n]/g, " ").trim();
  return `mailto:${COMPANY_EMAILS[channel]}${cleanSubject ? `?subject=${encodeURIComponent(cleanSubject)}` : ""}`;
}

export const CONTACT_DIRECTORY = [
  { id: "general", en: "General enquiries", ar: "الاستفسارات العامة", emails: ["general"] },
  { id: "support", en: "Technical support", ar: "الدعم الفني", emails: ["support"] },
  { id: "investors", en: "Investors & funding", ar: "المستثمرون والتمويل", emails: ["investors"] },
  { id: "partnerships", en: "Strategic partnerships", ar: "الشراكات الاستراتيجية", emails: ["partnerships"] },
  { id: "careers", en: "Careers", ar: "الوظائف والتوظيف", emails: ["careers"] },
  { id: "orders", en: "Orders & devices", ar: "الطلبات والأجهزة", emails: ["orders"] },
  { id: "finance", en: "Finance & billing", ar: "الشؤون المالية والفواتير", emails: ["finance"] },
  { id: "privacy-legal", en: "Privacy & legal", ar: "الخصوصية والشؤون القانونية", emails: ["privacy", "legal"] },
] as const satisfies ReadonlyArray<{ id: string; en: string; ar: string; emails: ReadonlyArray<CompanyEmailChannel> }>;

export const CONTACT_FORM_CATEGORIES = [
  { en: "Computer Vision Systems", ar: "أنظمة الرؤية الحاسوبية", recipient: "support" },
  { en: "Edge AI & Model Optimization", ar: "ذكاء الحافة وتحسين النماذج", recipient: "support" },
  { en: "AEGIS AI & Safety Vision", ar: "نظام AEGIS AI ورؤية السلامة", recipient: "support" },
  { en: "Intelligent Devices & Cameras", ar: "الأجهزة والكاميرات الذكية", recipient: "orders" },
  { en: "Vision Software & Dashboards", ar: "برمجيات الرؤية ولوحات المراقبة", recipient: "support" },
  { en: "Technology Partnership", ar: "شراكة تقنية", recipient: "partnerships" },
  { en: "Other technical challenge", ar: "تحدٍ تقني آخر", recipient: "support" },
] as const satisfies ReadonlyArray<{ en: string; ar: string; recipient: CompanyEmailChannel }>;

export function recipientForContactCategory(category: string): CompanyEmailChannel | null {
  return CONTACT_FORM_CATEGORIES.find((item) => item.en === category)?.recipient ?? null;
}
