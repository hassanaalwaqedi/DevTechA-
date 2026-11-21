import type { RecruitmentMessageType } from "@/lib/recruitment/types";

export interface RecruitmentTemplateDraft {
  subject: string;
  body: string;
  eyebrow: string;
}

/**
 * Reusable, editable HIRZEXA Recruitment email templates (EN LTR & AR RTL).
 * Client-safe catalog so the composer can populate editable drafts cleanly
 * without ever injecting fabricated scheduling links or unmade hiring decisions.
 */
export function getRecruitmentTemplateDraft(
  type: RecruitmentMessageType,
  locale: "en" | "ar",
  context?: {
    candidateName?: string;
    positionTitle?: string;
  }
): RecruitmentTemplateDraft {
  const isAr = locale === "ar";
  const name = context?.candidateName?.trim() || (isAr ? "المرشح الكريم" : "[Candidate Name]");
  const position = context?.positionTitle?.trim() || (isAr ? "الدور الوظيفي" : "[Position]");

  switch (type) {
    case "application_thank_you":
      return isAr
        ? {
            eyebrow: "تأكيد استلام الطلب",
            subject: `HIRZEXA | شكرًا لتقدمك لوظيفة ${position}`,
            body: `مرحبًا ${name}،\n\nنشكرك جزيل الشكر على اهتمامك بالانضمام إلى **HIRZEXA** وعلى الوقت الذي خصصته للتقدم لدور **${position}**.\n\nنود تأكيد استلام ملفك بنجاح. سيقوم فريق استقطاب الكفاءات وفريق التوظيف المختص بمراجعة خبراتك ومؤهلاتك بعناية خلال المرحلة القادمة.\n\n**الخطوات التالية:**\n\n- مراجعة شاملة لخبراتك وملاءمتها لمتطلبات الدور الوظيفي.\n- في حال توافق ملفك مع احتياجات المرحلة الحالية، سنتواصل معك مباشرة لتحديد موعد المقابلة الأولى.\n\nنقدّر اهتمامك ببناء تقنيات الذكاء الاصطناعي والبرمجيات معنا، ونتمنى لك كل التوفيق.\n\nمع خالص التقدير،\nفريق استقطاب الكفاءات — HIRZEXA`,
          }
        : {
            eyebrow: "APPLICATION RECEIVED",
            subject: `HIRZEXA | Thank You for Applying — ${position}`,
            body: `Dear ${name},\n\nThank you for your interest in **HIRZEXA** and for taking the time to apply for the **${position}** role.\n\nWe have received your profile and appreciate the opportunity to learn more about your background. Our Talent Acquisition and hiring teams review every application thoughtfully against the requirements of the role.\n\n**What happens next:**\n\n- Our hiring team will carefully review your experience and qualifications.\n- If your background aligns with what we are looking for at this stage, we will reach out to you directly with next steps and interview scheduling details.\n\nThank you again for considering HIRZEXA as the next step in your career.\n\nWarm regards,\nHIRZEXA Talent Acquisition Team`,
          };

    case "request_info":
      return isAr
        ? {
            eyebrow: "استقطاب الكفاءات",
            subject: "HIRZEXA | طلب معلومات إضافية حول طلب التوظيف",
            body: `مرحبًا ${name}،\n\nشكرًا لاهتمامك بالانضمام إلى HIRZEXA.\n\nنقوم حاليًا بمراجعة ملفك المهني، ونود الحصول على بعض المعلومات الإضافية حول خبراتك ومدى توفرك للبدء.\n\nنتطلع إلى ردك.\n\nمع خالص التحية،\nفريق استقطاب الكفاءات — HIRZEXA`,
          }
        : {
            eyebrow: "TALENT ACQUISITION",
            subject: "HIRZEXA | Additional Information Regarding Your Application",
            body: `Dear ${name},\n\nThank you for your interest in HIRZEXA.\n\nWe are currently reviewing your profile and would appreciate some additional information regarding your experience and availability.\n\nWe look forward to hearing from you.\n\nBest regards,\nHIRZEXA Talent Acquisition Team`,
          };

    case "application_update":
      return isAr
        ? {
            eyebrow: "تحديث طلب التوظيف",
            subject: "HIRZEXA | تحديث بخصوص طلب التوظيف الخاص بك",
            body: `مرحبًا ${name}،\n\nنشكرك على وقتك واهتمامك بفرصة ${position} في HIRZEXA.\n\nنود إعلامك بأن طلبك لا يزال قيد المراجعة من قبل فريق التوظيف لدينا، وسنوافيك بأي مستجدات فور اكتمال تقييم المرحلة الحالية.\n\nمع خالص التحية،\nفريق استقطاب الكفاءات — HIRZEXA`,
          }
        : {
            eyebrow: "APPLICATION UPDATE",
            subject: "HIRZEXA | Update Regarding Your Application",
            body: `Dear ${name},\n\nThank you for your time and interest in the ${position} opportunity at HIRZEXA.\n\nWe wanted to share a brief update that your application remains under active review by our hiring team. We will follow up with you directly once the current review stage is complete.\n\nBest regards,\nHIRZEXA Talent Acquisition Team`,
          };

    case "interview_follow_up":
      return isAr
        ? {
            eyebrow: "متابعة المقابلة",
            subject: "HIRZEXA | شكرًا لمشاركتك في المقابلة",
            body: `مرحبًا ${name}،\n\nشكرًا جزيلًا على وقتك ومشاركتك في مقابلة وظيفة ${position} مع فريق HIRZEXA.\n\nاستمتعنا بالتعرف على خبراتك ومناقشة خلفيتك المهنية. يقوم فريق التقييم حاليًا بمراجعة الملاحظات وسنتواصل معك بالخطوات التالية قريبًا.\n\nمع خالص التحية،\nفريق استقطاب الكفاءات — HIRZEXA`,
          }
        : {
            eyebrow: "INTERVIEW FOLLOW-UP",
            subject: "HIRZEXA | Following Up on Your Interview",
            body: `Dear ${name},\n\nThank you for taking the time to speak with our team regarding the ${position} role at HIRZEXA.\n\nWe appreciated learning more about your background and experience. Our team is completing its review and will reach out with next steps shortly.\n\nBest regards,\nHIRZEXA Talent Acquisition Team`,
          };

    case "general_recruitment":
      return isAr
        ? {
            eyebrow: "استقطاب الكفاءات",
            subject: "HIRZEXA | بخصوص طلب التوظيف الخاص بك",
            body: `مرحبًا ${name}،\n\nشكرًا لاهتمامك بالفرص الوظيفية في HIRZEXA.\n\nنتواصل معك بخصوص ترشحك لدور ${position}.\n\n[اكتب رسالتك هنا]\n\nمع خالص التحية،\nفريق استقطاب الكفاءات — HIRZEXA`,
          }
        : {
            eyebrow: "TALENT ACQUISITION",
            subject: "HIRZEXA | Regarding Your Application",
            body: `Dear ${name},\n\nThank you for your interest in opportunities at HIRZEXA.\n\nWe are reaching out regarding your application for the ${position} role.\n\n[Write your message here]\n\nBest regards,\nHIRZEXA Talent Acquisition Team`,
          };

    case "custom":
    case "interview_invitation":
    default:
      return {
        eyebrow: isAr ? "استقطاب الكفاءات" : "TALENT ACQUISITION",
        subject: "",
        body: "",
      };
  }
}
