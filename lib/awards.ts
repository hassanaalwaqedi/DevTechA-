import type { Locale } from "@/lib/locale";

export interface AwardFact {
  id: string;
  value: { en: string; ar: string };
  label: { en: string; ar: string };
}

export interface RecognitionEvidenceItem {
  id: string;
  kind: "image" | "certificate" | "video";
  src: string;
  poster?: string;
  width: number;
  height: number;
  label: { en: string; ar: string };
  title: { en: string; ar: string };
  caption: { en: string; ar: string };
  alt: { en: string; ar: string };
  objectPosition?: string;
  certificateMeta?: readonly {
    label: { en: string; ar: string };
    value: { en: string; ar: string };
  }[];
}

export const RECOGNITION_COPY = Object.freeze({
  en: {
    eyebrow: "RECOGNITION / 2026",
    headline: "Recognized for Innovation.",
    secondaryHeading: "2nd Place — AEGIS AI",
    description:
      "Awarded Second Place at the Innovation and Invention Conference in Istanbul for applied computer vision and real-time safety intelligence.",
    competitionLabel: "Competition",
    competitionDetail:
      "Innovation and Invention Competition · Istanbul",
    exploreAchievement: "Explore the Achievement",
    exploreFullEvidence: "View documentary evidence",
    heroCaption:
      "Innovation and Invention Conference stage ceremony, Istanbul (2026).",
    galleryEyebrow: "DOCUMENTARY EVIDENCE",
    galleryTitle: "Presentation, certificate & stage footage.",
    gallerySubtitle:
      "Authentic ceremony photography and podium video from Istanbul.",
    inspectAction: "Inspect",
    expandCertificateAction: "Expand certificate view",
    collapseCertificateAction: "Collapse details",
    playVideoAction: "Play presentation clip",
    pauseVideoAction: "Pause clip",
    openFullscreenVideo: "Open video viewer",
    lightboxClose: "Close viewer",
    lightboxPrevious: "Previous item",
    lightboxNext: "Next item",
    zoomIn: "Zoom in",
    zoomReset: "Reset zoom",
  },
  ar: {
    eyebrow: "التقدير والجوائز / 2026",
    headline: "تقدير للابتكار الهندسي.",
    secondaryHeading: "المركز الثاني — مشروع AEGIS AI",
    description:
      "المركز الثاني في مسابقة الإبداع والابتكار بإسطنبول تقديراً لتطبيقات الرؤية الحاسوبية وذكاء السلامة الفوري.",
    competitionLabel: "المسابقة",
    competitionDetail: "مسابقة الإبداع والابتكار · إسطنبول",
    exploreAchievement: "استكشف تفاصيل الإنجاز",
    exploreFullEvidence: "عرض التوثيق البصري",
    heroCaption:
      "حفل التكريم في مؤتمر الإبداع والابتكار، إسطنبول (2026).",
    galleryEyebrow: "الأدلة والتوثيق",
    galleryTitle: "صور التكريم والشهادة ومقطع العرض.",
    gallerySubtitle:
      "توثيق فوتوغرافي ومرئي حقيقي من حفل التكريم في إسطنبول.",
    inspectAction: "معاينة",
    expandCertificateAction: "تكبير وعرض الشهادة",
    collapseCertificateAction: "إخفاء التفاصيل",
    playVideoAction: "تشغيل المقطع",
    pauseVideoAction: "إيقاف مؤقت",
    openFullscreenVideo: "فتح في العارض",
    lightboxClose: "إغلاق العارض",
    lightboxPrevious: "العنصر السابق",
    lightboxNext: "العنصر التالي",
    zoomIn: "تكبير الصورة",
    zoomReset: "الحجم الأصلي",
  },
} as const);

export const RECOGNITION_FACTS: readonly AwardFact[] = Object.freeze([
  {
    id: "year",
    value: { en: "2026", ar: "2026" },
    label: { en: "Year", ar: "السنة" },
  },
  {
    id: "recognition",
    value: { en: "2nd Place", ar: "المركز الثاني" },
    label: { en: "Recognition", ar: "التصنيف" },
  },
  {
    id: "project",
    value: { en: "AEGIS AI", ar: "AEGIS AI" },
    label: { en: "Awarded Project", ar: "المشروع الفائز" },
  },
  {
    id: "location",
    value: { en: "Istanbul", ar: "إسطنبول" },
    label: { en: "Location", ar: "الموقع" },
  },
]);

export const RECOGNITION_HERO_IMAGE = Object.freeze({
  src: "/awards/stage-ceremony-2026.webp",
  width: 1024,
  height: 576,
  alt: {
    en: "Hassan Waqedi on stage at the Innovation and Invention Conference in Istanbul holding the Second Place trophy, certificate, and award check for AEGIS AI.",
    ar: "حسان الواقدي على منصة مؤتمر الإبداع والابتكار في إسطنبول حاملاً درع المركز الثاني والشهادة وشيك الجائزة عن مشروع AEGIS AI.",
  },
});

export const RECOGNITION_EVIDENCE: readonly RecognitionEvidenceItem[] =
  Object.freeze([
    {
      id: "stage-ceremony",
      kind: "image",
      src: "/awards/stage-ceremony-2026.webp",
      width: 1024,
      height: 576,
      label: { en: "01 · Ceremony Stage", ar: "01 · منصة التكريم" },
      title: {
        en: "Official Award Ceremony in Istanbul",
        ar: "حفل التكريم الرسمي في إسطنبول",
      },
      caption: {
        en: "Award announcement on the main stage beside the project display for AEGIS AI at the Innovation and Invention Conference.",
        ar: "الإعلان عن الجائزة على المسرح الرئيسي بجانب شاشة عرض مشروع AEGIS AI ضمن مؤتمر الإبداع والابتكار.",
      },
      alt: {
        en: "Stage ceremony photograph showing award winners and officials at the Innovation and Invention Conference in Istanbul with AEGIS AI displayed on the backdrop.",
        ar: "صورة من منصة التكريم في مؤتمر الإبداع والابتكار بإسطنبول ويظهر خلفها عرض مشروع AEGIS AI واسم حسان الواقدي.",
      },
      objectPosition: "50% 25%",
    },
    {
      id: "award-presentation",
      kind: "image",
      src: "/awards/award-presentation-2026.webp",
      width: 628,
      height: 1024,
      label: { en: "02 · Presentation", ar: "02 · تسليم الجائزة" },
      title: {
        en: "Second Place Recognition & Trophy",
        ar: "درع المركز الثاني وشيك التكريم",
      },
      caption: {
        en: "Presentation of the Second Place crystal trophy, printed certificate, and Innovation and Invention Award on stage.",
        ar: "تسليم درع المركز الثاني والشهادة المطبوعة وشيك جائزة الإبداع والابتكار على المنصة.",
      },
      alt: {
        en: "Hassan Waqedi holding the Second Place trophy, certificate, and English Innovation and Invention Award board.",
        ar: "حسان الواقدي يحمل درع المركز الثاني والشهادة ولوحة جائزة الإبداع والابتكار.",
      },
      objectPosition: "50% 14%",
    },
    {
      id: "certificate-detail",
      kind: "certificate",
      src: "/awards/award-certificate-detail-2026.webp",
      width: 450,
      height: 345,
      label: {
        en: "03 · Certificate & Award",
        ar: "03 · الشهادة ووثيقة الجائزة",
      },
      title: {
        en: "Certificate, Trophy (02) & Award Verification",
        ar: "تفاصيل الشهادة ودرع المركز الثاني (02)",
      },
      caption: {
        en: "Close-up documentary view of the printed certificate, 2nd Place trophy, and dated award record (03/10/2026).",
        ar: "لقطة مقربة موثّقة للشهادة المطبوعة ودرع المركز الثاني وسجل الجائزة المؤرخ في 03/10/2026.",
      },
      alt: {
        en: "Close-up of the Second Place Winner award card dated 03/10/2026, crystal trophy engraved 02, and official certificate.",
        ar: "لقطة مقربة لوثيقة جائزة المركز الثاني المؤرخة في 03/10/2026 ودرع 02 والشهادة الرسمية.",
      },
      certificateMeta: [
        {
          label: { en: "Conference", ar: "المؤتمر" },
          value: {
            en: "Innovation and Invention Conference",
            ar: "مؤتمر الإبداع والابتكار",
          },
        },
        {
          label: { en: "Award Placement", ar: "التصنيف" },
          value: { en: "Second Place Winner", ar: "الفائز بالمركز الثاني" },
        },
        {
          label: { en: "Awarded Project", ar: "المشروع الفائز" },
          value: { en: "AEGIS AI", ar: "AEGIS AI" },
        },
        {
          label: { en: "Date Shown on Award", ar: "التاريخ المثبت" },
          value: { en: "03/10/2026 · Istanbul", ar: "03/10/2026 · إسطنبول" },
        },
      ],
    },
    {
      id: "stage-presentation-video",
      kind: "video",
      src: "/awards/aegis-ai-presentation-2026.mp4",
      poster: "/awards/stage-ceremony-2026.webp",
      width: 576,
      height: 1024,
      label: { en: "04 · Stage Footage", ar: "04 · لقطات العرض" },
      title: {
        en: "Conference Podium Presentation",
        ar: "تقديم المشروع على منصة المؤتمر",
      },
      caption: {
        en: "Recorded podium footage from the Innovation and Invention Conference presentation session in Istanbul.",
        ar: "لقطات مسجّلة من تقديم المشروع على منصة مؤتمر الإبداع والابتكار في إسطنبول.",
      },
      alt: {
        en: "Video clip of Hassan Waqedi presenting at the Innovation and Invention Conference podium in Istanbul.",
        ar: "مقطع فيديو لحسان الواقدي أثناء تقديم المشروع على منصة مؤتمر الإبداع والابتكار في إسطنبول.",
      },
    },
  ]);

export function getRecognitionCopy(locale: Locale) {
  return RECOGNITION_COPY[locale];
}

