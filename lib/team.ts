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
    subtitle: "Leadership and team engineering intelligent software systems and AI solutions at HIRZEXA.",
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
    subtitle: "القيادة والفريق الهندسي لتطوير الأنظمة البرمجية الذكية وحلول الذكاء الاصطناعي في HIRZEXA.",
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
      en: "Hassan Waqedi is the founder of HIRZEXA, leading its AI and software engineering direction, intelligent automation systems, and applied computer vision products such as AEGIS.",
      ar: "حسان الواقدي هو مؤسس HIRZEXA، ويقود التوجه الهندسي للشركة في تطوير أنظمة الذكاء الاصطناعي والمنصات البرمجية والأتمتة الذكية، إلى جانب منتجات الرؤية الحاسوبية مثل AEGIS.",
    },
    specializations: {
      en: [
        "Artificial Intelligence Engineering",
        "Software Architecture",
        "Machine Learning",
        "Computer Vision",
        "Edge AI",
      ],
      ar: [
        "هندسة الذكاء الاصطناعي",
        "معمارية البرمجيات",
        "التعلم الآلي",
        "الرؤية الحاسوبية",
        "ذكاء الحافة (Edge AI)",
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

