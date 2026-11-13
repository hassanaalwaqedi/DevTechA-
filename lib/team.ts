import type { Locale } from "@/lib/locale";

export interface TeamMember {
  id: string;
  isFounder: boolean;
  displayName: { en: string; ar: string };
  position: { en: string; ar: string };
  company: string;
  biography: { en: string; ar: string };
  specializations?: { en: readonly string[]; ar: readonly string[] };
  linkedinUrl?: string;
  photoSrc: string | null;
  photoAlt: { en: string; ar: string };
  initials: string;
}

export const TEAM_SECTION_COPY = Object.freeze({
  en: {
    kicker: "FOUNDER & TEAM",
    titleBefore: "The people building ",
    titleAccent: "HIRZEXA.",
    subtitle: "Leadership and team advancing computer vision and Edge AI at HIRZEXA.",
    founderBadge: "Founder",
    memberBadge: "Team Member",
    focusLabel: "Core Focus",
    linkedinLabel: "LinkedIn Profile",
    previewAction: "Meet Founder & Team",
    photoPendingNote: "Official founder portrait ready for upload",
    neutralAvatarNote: "Team member avatar",
  },
  ar: {
    kicker: "المؤسس والفريق",
    titleBefore: "الأشخاص الذين يبنون ",
    titleAccent: "HIRZEXA.",
    subtitle: "القيادة والفريق الهندسي لتقنيات الرؤية الحاسوبية وذكاء الحافة في HIRZEXA.",
    founderBadge: "المؤسس",
    memberBadge: "عضو الفريق",
    focusLabel: "التخصصات الأساسية",
    linkedinLabel: "حساب LinkedIn الرسمي",
    previewAction: "تعرّف على المؤسس والفريق",
    photoPendingNote: "مساحة مخصصة لصورة المؤسس الرسمية",
    neutralAvatarNote: "أيقونة تعبيرية محايدة",
  },
} as const);

export const TEAM_MEMBERS: readonly TeamMember[] = Object.freeze([
  {
    id: "hassan-waqedi",
    isFounder: true,
    displayName: {
      en: "Hassan Waqedi",
      ar: "حسان الواقدي",
    },
    position: {
      en: "Founder & AI Engineer",
      ar: "المؤسس ومهندس الذكاء الاصطناعي",
    },
    company: "HIRZEXA",
    biography: {
      en: "Hassan Waqedi is the founder of HIRZEXA, leading its technical direction and the development of computer vision and Edge AI solutions. His work focuses on intelligent video analytics, AI-powered monitoring systems, and practical applications of machine learning.",
      ar: "حسان الواقدي هو مؤسس HIRZEXA، ويقود التوجه التقني للشركة وتطوير حلول الرؤية الحاسوبية والذكاء الاصطناعي على الأجهزة الطرفية. يركز عمله على تحليل الفيديو الذكي وأنظمة المراقبة المدعومة بالذكاء الاصطناعي وتطبيقات التعلم الآلي.",
    },
    specializations: {
      en: [
        "Computer Vision",
        "Artificial Intelligence Engineering",
        "Machine Learning",
        "Edge AI",
        "Software Architecture",
      ],
      ar: [
        "الرؤية الحاسوبية",
        "هندسة الذكاء الاصطناعي",
        "التعلم الآلي",
        "ذكاء الحافة (Edge AI)",
        "معمارية البرمجيات",
      ],
    },
    linkedinUrl: "https://www.linkedin.com/in/hassan-waqedi-122572247/",
    photoSrc: "/team/hassan-waqedi.webp",
    photoAlt: {
      en: "Portrait of Hassan Waqedi, Founder and AI Engineer at HIRZEXA",
      ar: "صورة حسان الواقدي، مؤسس ومهندس الذكاء الاصطناعي في HIRZEXA",
    },
    initials: "HW",
  },
  {
    id: "aria",
    isFounder: false,
    displayName: {
      en: "Aria",
      ar: "آريا",
    },
    position: {
      en: "Market Research & Marketing",
      ar: "بحوث السوق والتسويق",
    },
    company: "HIRZEXA",
    biography: {
      en: "Aria works in market research and marketing at HIRZEXA, contributing to market research, audience insights, and ongoing marketing and development activities.",
      ar: "تعمل آريا في مجال بحوث السوق والتسويق ضمن فريق HIRZEXA، وتُسهم في أبحاث السوق والأنشطة التسويقية وتطوير أعمال الشركة.",
    },
    specializations: {
      en: ["Market Research", "Marketing"],
      ar: ["بحوث السوق", "التسويق"],
    },
    photoSrc: null,
    photoAlt: {
      en: "Neutral profile avatar for Aria, Team Member at HIRZEXA",
      ar: "أيقونة ملف تعريف محايدة لآريا، عضو فريق في HIRZEXA",
    },
    initials: "A",
  },
]);

export function getTeamCopy(locale: Locale) {
  return TEAM_SECTION_COPY[locale];
}

