import type { Locale } from "@/lib/locale";

export type AegisVideoItem = {
  id: string;
  src: string;
  poster?: string;
  badge: { en: string; ar: string };
  title: { en: string; ar: string };
  caption: { en: string; ar: string };
  durationLabel: string;
  hasSpokenAudio: boolean;
  audioNote: { en: string; ar: string };
  transcript?: {
    en: readonly { speaker: string; line: string }[];
    ar: readonly { speaker: string; line: string }[];
  };
};

export type ArchitectureLayer = {
  id: string;
  step: string;
  title: { en: string; ar: string };
  shortSummary: { en: string; ar: string };
  status: "implemented" | "evaluation" | "planned";
  inputs: { en: readonly string[]; ar: readonly string[] };
  processing: { en: readonly string[]; ar: readonly string[] };
  outputs: { en: readonly string[]; ar: readonly string[] };
  details: { en: string; ar: string };
  screenshot?: {
    src: string;
    alt: { en: string; ar: string };
    caption: { en: string; ar: string };
  };
};

export type CaseStudy = {
  id: "medical" | "retail";
  badge: { en: string; ar: string };
  title: { en: string; ar: string };
  classification: { en: string; ar: string };
  summary: { en: string; ar: string };
  problemStatement: { en: string; ar: string };
  engineeringApproach: { en: string; ar: string };
  rows: readonly {
    label: { en: string; ar: string };
    value: { en: string; ar: string };
  }[];
  observations: { en: readonly string[]; ar: readonly string[] };
  limitations: { en: readonly string[]; ar: readonly string[] };
  evidenceStatus: {
    hasMedia: boolean;
    note: { en: string; ar: string };
  };
};

export type TimelineMilestone = {
  id: string;
  phase: string;
  status: "completed" | "in-progress" | "planned";
  dateLabel: { en: string; ar: string };
  title: { en: string; ar: string };
  version: string;
  summary: { en: string; ar: string };
  architectureNote: { en: string; ar: string };
  image?: {
    src: string;
    alt: { en: string; ar: string };
  };
};

export type EngineeringChallenge = {
  id: string;
  domain: { en: string; ar: string };
  title: { en: string; ar: string };
  problem: { en: string; ar: string };
  decision: { en: string; ar: string };
  implementation: { en: string; ar: string };
  result: { en: string; ar: string };
};

export const AEGIS_UI_COPY = Object.freeze({
  en: {
    eyebrow: "AEGIS AI · COMPUTER VISION & SAFETY INTELLIGENCE",
    heroHeadline: "From Research to Real-World Impact.",
    heroSubtitle:
      "Explore the engineering, development, and real-world evaluation of AEGIS AI — HIRZEXA's intelligent computer vision and video analytics system.",
    ctaPrimary: "Explore Case Studies",
    ctaSecondary: "View System Architecture",
    ctaWatch: "Watch AEGIS in Action",
    heroAudioHint: "Original spoken system walkthrough audio preserved · Click play to listen",
    statusChip: "Engineering Case Study & Live System Walkthrough",
    navQuick: [
      { id: "video-showcase", label: "System Footage" },
      { id: "case-studies", label: "Case Studies" },
      { id: "evaluation-results", label: "95.3% Evaluation" },
      { id: "architecture", label: "Architecture" },
      { id: "engineering-journey", label: "Journey" },
      { id: "challenges", label: "Challenges" },
      { id: "deployment", label: "Pilots & Demo" },
    ],
    videoSectionEyebrow: "AUTHENTIC SYSTEM FOOTAGE · AUDIO PRESERVED",
    videoSectionTitle: "Inspect AEGIS AI in operation with original system audio.",
    videoSectionSubtitle:
      "Recorded sessions retain their unaltered voice interrogation, system responses, and stage documentation.",
    play: "Play with audio",
    pause: "Pause",
    mute: "Mute audio",
    unmute: "Unmute audio",
    fullscreen: "Enter fullscreen",
    showTranscript: "Show verified audio transcript",
    hideTranscript: "Hide transcript",
    resultsEyebrow: "REPORTED ENGINEERING EVALUATION",
    resultsTitle: "95.3% — Reported Evaluation Result",
    resultsSubtitle:
      "Observed across internal testing cycles prior to formal external methodology verification. Presented with transparent methodology status and zero fabricated metrics.",
    resultsRingNote: "Internal reported figure · Methodology publication pending",
    methodologyTitle: "Methodology & Verification Scope",
    methodologyColumns: [
      {
        label: "Reported Result",
        value: "95.3%",
        state: "Reported (Internal)",
      },
      {
        label: "Metric Definition (Accuracy / Precision / Recall / F1)",
        value: "Confirmation in progress prior to formal publication",
        state: "Pending verification",
      },
      {
        label: "Dataset Size & Evaluated Samples",
        value: "Not yet published in raw benchmark release",
        state: "Awaiting publication",
      },
      {
        label: "Model Version, Latency (ms) & FPS",
        value: "Environment-dependent; benchmark CSV awaiting publication",
        state: "Awaiting publication",
      },
      {
        label: "External Audit Status",
        value: "Not independently certified or third-party verified",
        state: "Transparent disclosure",
      },
    ],
    dashboardTabTelemetry: "Verified Session Telemetry",
    dashboardTabBenchmark: "Benchmark Suite (Structure)",
    caseStudiesEyebrow: "REAL-WORLD CASE STUDIES",
    caseStudiesTitle: "Engineering Tested Beyond the Lab.",
    caseStudiesSubtitle:
      "Exploring how AEGIS AI performs in practical monitoring environments.",
    architectureEyebrow: "INTERACTIVE SYSTEM ARCHITECTURE",
    architectureTitle: "Inside the AEGIS AI Architecture.",
    architectureSubtitle:
      "Inspect how optical streams progress from video ingestion and neural inference to semantic evidence retrieval and human-in-the-loop operator workflows.",
    modeOverview: "Overview mode",
    modeDetailed: "Detailed mode",
    journeyEyebrow: "DEVELOPMENT HISTORY",
    journeyTitle: "The Engineering Journey.",
    journeySubtitle:
      "Chronological progression built strictly from documented prototypes, recorded system builds, testing stages, and competition recognition.",
    challengesEyebrow: "TECHNICAL PROBLEM SOLVING",
    challengesTitle: "Built Through Engineering Challenges.",
    challengesSubtitle:
      "Concrete architectural trade-offs across stream ingestion, false-positive suppression, semantic indexing, and latency control.",
    evolutionEyebrow: "PROGRESSION & MATURITY",
    evolutionTitle: "From Prototype to Product.",
    evolutionSubtitle:
      "Clear separation between completed engineering work, active refinements, and planned pilot integration milestones.",
    deploymentEyebrow: "DEPLOYMENT OPTIONS & PILOT INQUIRIES",
    deploymentTitle: "Evaluate AEGIS AI for your operating environment.",
    deploymentSubtitle:
      "AEGIS AI is an engineering product in active refinement and pilot evaluation. Commercial pricing tiers are not yet finalized; organizations can request a structured demonstration or technical pilot discussion.",
    demoCta: "Request a Demo",
    pilotCta: "Discuss a Pilot",
    businessCta: "Contact Business Team",
    recognitionEyebrow: "COMPETITION RECOGNITION · 2026",
    recognitionTitle: "AEGIS AI — Second Place, Innovation and Invention Competition (2026)",
    recognitionBody:
      "Recognized at the Innovation and Invention Conference in Istanbul for applied computer vision and safety intelligence engineering.",
    recognitionLink: "View Full Recognition & Certificate Evidence",
    statusBadges: {
      implemented: "Implemented",
      evaluation: "In Evaluation",
      planned: "Planned",
      completed: "Completed",
      "in-progress": "In Progress",
    },
  },
  ar: {
    eyebrow: "AEGIS AI · الرؤية الحاسوبية وذكاء السلامة",
    heroHeadline: "من البحث الهندسي إلى الأثر الواقعي.",
    heroSubtitle:
      "استكشف مراحل الهندسة والتطوير والتقييم الميداني لنظام AEGIS AI — منصة الرؤية الحاسوبية وتحليل الفيديو الذكي من HIRZEXA.",
    ctaPrimary: "استكشف دراسات الحالة",
    ctaSecondary: "استعرض معمارية النظام",
    ctaWatch: "شاهد AEGIS AI أثناء العمل",
    heroAudioHint: "المسار الصوتي الأصلي للعرض محفوظ بالكامل · اضغط للتشغيل بالصوت",
    statusChip: "دراسة هندسية وعرض فعلي للنظام المباشر",
    navQuick: [
      { id: "video-showcase", label: "فيديو النظام" },
      { id: "case-studies", label: "دراسات الحالة" },
      { id: "evaluation-results", label: "نتيجة 95.3%" },
      { id: "architecture", label: "المعمارية" },
      { id: "engineering-journey", label: "مسيرة التطوير" },
      { id: "challenges", label: "التحديات الهندسية" },
      { id: "deployment", label: "التجارب والعروض" },
    ],
    videoSectionEyebrow: "لقطات النظام الأصلية · الصوت محفوظ بالكامل",
    videoSectionTitle: "شاهد استعراض AEGIS AI الفعلي مع مساره الصوتي الأصلي.",
    videoSectionSubtitle:
      "تحتفظ جميع المقاطع المسجلة بالحوار الصوتي الأصلي والاستجابات الفعلية للنظام وتوثيق العرض دون تعديل.",
    play: "تشغيل بالصوت",
    pause: "إيقاف مؤقت",
    mute: "كتم الصوت",
    unmute: "تفعيل الصوت",
    fullscreen: "ملء الشاشة",
    showTranscript: "عرض النص الصوتي الموثق",
    hideTranscript: "إخفاء النص",
    resultsEyebrow: "نتائج التقييم الهندسي",
    resultsTitle: "95.3% — نتيجة التقييم المبلّغ عنها",
    resultsSubtitle:
      "نتيجة مرصودة خلال دورات الاختبار السابقة بانتظار توثيق ونشر المنهجية الكاملة. تُعرض بشفافية دون أي أرقام أو مقاييس مختلقة.",
    resultsRingNote: "نتيجة داخلية مبلّغ عنها · توثيق المنهجية قيد الاستكمال",
    methodologyTitle: "حالة التحقق ونطاق المنهجية",
    methodologyColumns: [
      {
        label: "النتيجة المبلّغ عنها",
        value: "95.3%",
        state: "مرصودة داخلياً",
      },
      {
        label: "تعريف المقياس (Accuracy / Precision / Recall / F1)",
        value: "قيد التحديد والتوثيق الدقيق قبل النشر الرسمي",
        state: "بانتظار التأكيد",
      },
      {
        label: "حجم مجموعة البيانات والعينات المختبرة",
        value: "غير منشور في حزمة معايير عامة حتى الآن",
        state: "بانتظار النشر",
      },
      {
        label: "إصدار النموذج، زمن الاستجابة (ms) ومعدل الإطارات",
        value: "تختلف حسب بيئة الكاميرا والعتاد؛ جدول المقارنة بانتظار التوثيق",
        state: "بانتظار النشر",
      },
      {
        label: "الاعتماد أو التدقيق الخارجي",
        value: "ليست شهادة معتمدة من جهة خارجية مستقلة",
        state: "إفصاح شفاف",
      },
    ],
    dashboardTabTelemetry: "قياسات جلسة النظام الموثقة",
    dashboardTabBenchmark: "هيكل لوحة المعايير (بانتظار البيانات)",
    caseStudiesEyebrow: "دراسات الحالة الواقعية",
    caseStudiesTitle: "هندسة مختبرة خارج المختبر.",
    caseStudiesSubtitle:
      "استعراض سلوك نظام AEGIS AI في بيئات المراقبة العملية.",
    architectureEyebrow: "المعمارية التفاعلية للنظام",
    architectureTitle: "داخل معمارية AEGIS AI.",
    architectureSubtitle:
      "تتبّع مسار تدفق الفيديو عبر الطبقات الست: من مصادر الكاميرات والاستدلال البصري إلى البحث الدلالي عن الأدلة وواجهة المشغلين.",
    modeOverview: "وضع النظرة العامة",
    modeDetailed: "الوضع الهندسي التفصيلي",
    journeyEyebrow: "التطور الزمني",
    journeyTitle: "رحلة الهندسة والتطوير.",
    journeySubtitle:
      "تسلسل موثّق يستند حصراً إلى النماذج المسجّلة، والتحديثات الفعلية للواجهة والنظام، ومراحل الاختبار، والتكريم الرسمي.",
    challengesEyebrow: "حل المشكلات التقنية",
    challengesTitle: "بُني عبر التحديات الهندسية.",
    challengesSubtitle:
      "تفصيل واضح للمشكلات الفعلية وقرارات الهندسة والتنفيذ والنتائج في أنظمة الفيديو الذكية.",
    evolutionEyebrow: "تطور المنتج",
    evolutionTitle: "من نموذج أولي إلى منتج متكامل.",
    evolutionSubtitle:
      "تمييز صريح بين المراحل المكتملة، وأعمال التحسين الجارية، وخطط التوسع والتشغيل التجريبي المستقبلية.",
    deploymentEyebrow: "خيارات التشغيل والتجارب التجريبية",
    deploymentTitle: "قيّم AEGIS AI في بيئة التشغيل الخاصة بك.",
    deploymentSubtitle:
      "النظام حالياً في مرحلة التحسين الهندسي والتجهيز للتجارب التجريبية (Pilots). لم تُعتمد خطط التسعير التجارية بعد؛ يمكن للمؤسسات طلب عرض تقني أو مناقشة مشروع تجريبي.",
    demoCta: "طلب عرض تقني (Demo)",
    pilotCta: "مناقشة مشروع تجريبي",
    businessCta: "تواصل مع فريق الأعمال",
    recognitionEyebrow: "التقدير والجوائز · 2026",
    recognitionTitle: "AEGIS AI — المركز الثاني، مسابقة الإبداع والابتكار (2026)",
    recognitionBody:
      "تم تكريم المشروع في مؤتمر الإبداع والابتكار بإسطنبول تقديراً للهندسة التطبيقية في الرؤية الحاسوبية وذكاء السلامة.",
    recognitionLink: "عرض صفحة التوثيق والشهادة الكاملة",
    statusBadges: {
      implemented: "مُنفّذ",
      evaluation: "قيد التقييم",
      planned: "مخطط مستقبلاً",
      completed: "مكتمل",
      "in-progress": "قيد العمل",
    },
  },
} as const);

export const AEGIS_VIDEOS: readonly AegisVideoItem[] = Object.freeze([
  {
    id: "os-walkthrough",
    src: "/aegis/aegis-os-walkthrough.mp4",
    badge: {
      en: "SYSTEM WALKTHROUGH · LIVE VOICE INTERACTION",
      ar: "جولة النظام الحية · تفاعل صوتي أصلي",
    },
    title: {
      en: "AEGIS Security Operating System — Voice Command, Camera Wall & Semantic Evidence",
      ar: "نظام تشغيل AEGIS الأمني — الأوامر الصوتية، جدار الكاميرات، والبحث الدلالي",
    },
    caption: {
      en: "Unedited screen recording showing live voice interrogation on /intelligence, 3-camera monitoring on /cameras, and 878.1 ms semantic search across 2,776 tracks and 169 events on /semantic.",
      ar: "تسجيل شاشة فعلي يُظهر التفاعل الصوتي عبر واجهة الذكاء، ومراقبة جدار الكاميرات، والبحث الدلالي عن الأدلة عبر 2,776 مساراً و169 حدثاً في 878.1 مللي ثانية.",
    },
    durationLabel: "0:41 · Original Audio",
    hasSpokenAudio: true,
    audioNote: {
      en: "Original English operator & AEGIS voice assistant dialogue preserved.",
      ar: "المسار الصوتي الأصلي للحوار بين المشغل ومساعد AEGIS محفوظ دون تعديل.",
    },
    transcript: {
      en: [
        {
          speaker: "Operator",
          line: "Aegis, confirm the current operational status. Are there any active alerts right now? How many cameras are online? And are we tracking any critical events or subjects?",
        },
        {
          speaker: "AEGIS AI",
          line: "System status is degraded. There is one active high-risk alert observed 18 seconds ago. Two cameras are currently online. We are tracking multiple subjects with a highlighted medium-risk event linked to possible assault patterns. I am displaying the latest generated events.",
        },
        {
          speaker: "Operator",
          line: "Keep an eye on that high-risk alert and the medium-risk events. If further details on the subjects or events become available...",
        },
      ],
      ar: [
        {
          speaker: "المشغل",
          line: "أيجيس، أكّد الحالة التشغيلية الحالية. هل توجد تنبيهات نشطة الآن؟ وكم عدد الكاميرات المتصلة؟ وهل نتتبع أي أحداث حرجة؟",
        },
        {
          speaker: "AEGIS AI",
          line: "حالة النظام متراجعة جزئياً. يوجد تنبيه نشط عالي الخطورة رُصد قبل 18 ثانية، وكاميرتان متصلتان حالياً. نرصد عدة أشخاص مع حدث متوسط الخطورة مرتبط بأنماط اعتداء محتملة، وأعرض الآن أحدث الأحداث المولدة.",
        },
        {
          speaker: "المشغل",
          line: "راقب هذا التنبيه عالي الخطورة والأحداث متوسطة الخطورة، وأبلغني فور توفر تفاصيل إضافية.",
        },
      ],
    },
  },
  {
    id: "stage-presentation-2026",
    src: "/awards/aegis-ai-presentation-2026.mp4",
    poster: "/awards/stage-ceremony-2026.webp",
    badge: {
      en: "CONFERENCE FOOTAGE · ISTANBUL 2026",
      ar: "عرض المؤتمر · إسطنبول 2026",
    },
    title: {
      en: "Conference Podium Presentation — Innovation and Invention Conference",
      ar: "تقديم المشروع على منصة مؤتمر الإبداع والابتكار في إسطنبول",
    },
    caption: {
      en: "Stage presentation footage captured at the Innovation and Invention Conference in Istanbul, where AEGIS AI was awarded Second Place.",
      ar: "لقطات من تقديم مشروع AEGIS AI على المنصة في مؤتمر الإبداع والابتكار بإسطنبول حيث نال المركز الثاني.",
    },
    durationLabel: "0:06 · Stage Clip",
    hasSpokenAudio: false,
    audioNote: {
      en: "Stage podium clip preserved in its uploaded MP4 container (no separate audio stream).",
      ar: "لقطة تقديم على المنصة محفوظة بصيغة MP4 كما وردت (دون مسار صوتي منفصل في الملف).",
    },
  },
  {
    id: "human-ai-concept",
    src: "/videos/human-ai-aegis.mp4",
    poster: "/human-ai-aegis.jpg",
    badge: {
      en: "CONCEPT VISUAL · OPERATOR ATTENTION",
      ar: "عرض بصري · تكامل الإنسان والآلة",
    },
    title: {
      en: "Human-in-the-Loop Visual Perception Reel",
      ar: "تصور الإدراك البصري بإشراف بشري",
    },
    caption: {
      en: "Conceptual motion reel illustrating HIRZEXA's operator-assisted computer vision direction.",
      ar: "مقطع بصري توضيحي يعكس توجه HIRZEXA في دعم المشغل البشري بأنظمة الرؤية.",
    },
    durationLabel: "0:10 · Visual Reel",
    hasSpokenAudio: false,
    audioNote: {
      en: "Silent concept motion reel.",
      ar: "مقطع حركة بصري صامت.",
    },
  },
]);

export const SESSION_TELEMETRY_VERIFIED = Object.freeze([
  {
    metric: { en: "Semantic Evidence Query Latency", ar: "زمن استعلام الأدلة الدلالي" },
    value: "878.1 ms",
    source: {
      en: "Observed in /semantic backend query",
      ar: "مرصود في استعلام البحث الدلالي",
    },
  },
  {
    metric: { en: "Indexed Tracks Evaluated", ar: "المسارات المفهرسة التي تم تقييمها" },
    value: "2,776 tracks",
    source: {
      en: "Live query response (50 matches returned)",
      ar: "استجابة الاستعلام المباشر (50 تطابقاً)",
    },
  },
  {
    metric: { en: "Recent Events Indexed", ar: "الأحداث الحديثة المفهرسة" },
    value: "169 events",
    source: {
      en: "Evaluated alongside track graph",
      ar: "تم تقييمها ضمن نفس الاستعلام",
    },
  },
  {
    metric: { en: "Observed Match Confidence / Risk Tiers", ar: "مستويات الثقة والمخاطر المرصودة" },
    value: "80% · HIGH (0.80) / MED (0.50)",
    source: {
      en: "Verified match output row format",
      ar: "تنسيق مخرجات التطابق الموثقة",
    },
  },
]);

export const CASE_STUDIES: readonly CaseStudy[] = Object.freeze([
  {
    id: "medical",
    badge: { en: "CASE STUDY A · MEDICAL ENVIRONMENTS", ar: "دراسة حالة أ · البيئات الطبية" },
    title: { en: "Controlled Medical Environment Evaluation", ar: "التقييم في بيئات العمل الطبية" },
    classification: {
      en: "Controlled evaluation · Anonymized setting · Not a commercial hospital deployment",
      ar: "تقييم في بيئة مضبوطة · دون نشر بيانات المرضى · ليس نشراً تجارياً",
    },
    summary: {
      en: "Evaluating computer vision event detection, human presence awareness, and operator alerts under strict privacy constraints and dynamic lighting.",
      ar: "تقييم قدرات الرؤية الحاسوبية في رصد الأحداث والتنبيه الفوري ضمن قيود صارمة لخصوصية المرضى وتباين الإضاءة.",
    },
    problemStatement: {
      en: "Clinical and care corridors involve irregular foot traffic, mobility equipment, occlusion around doorways, and strict privacy requirements that prevent raw cloud video exposure.",
      ar: "تتميز الممرات والمرافق الطبية بحركة غير منتظمة وتداخل بصري مع المعدات الطبية، إلى جانب اشتراطات خصوصية عالية تمنع رفع البث الخام إلى السحابة العامة.",
    },
    engineeringApproach: {
      en: "Configured localized inference processing with multi-object tracking, zone awareness, risk-tiered alert escalation, and privacy-conscious metadata retention rather than unrestricted raw footage streaming.",
      ar: "اعتماد معالجة محلية قريبة من الحافة مع تتبع متعدد الأجسام، وتحليل المناطق الحساسة، وتصنيف درجات الخطورة مع حفظ البيانات الوصفية الموثقة بدلاً من بث الفيديو الخام.",
    },
    rows: [
      {
        label: { en: "Testing Objectives", ar: "أهداف الاختبار" },
        value: {
          en: "Validate event recognition responsiveness and operator alert triage without intrusive workflow disruption",
          ar: "اختبار دقة واستجابة رصد الأحداث وتوجيه تنبيهات المشغلين دون إرباك سير العمل",
        },
      },
      {
        label: { en: "Operational Context", ar: "البيئة التشغيلية" },
        value: {
          en: "Anonymized medical-related environment (facility name withheld for confidentiality)",
          ar: "بيئة اختبار طبية غير مُسمّاة حفاظاً على السرية والخصوصية",
        },
      },
      {
        label: { en: "Camera & Stream Profile", ar: "إعداد الكاميرات والبث" },
        value: {
          en: "Fixed corridor / room vantage camera feeds processed through localized ingestion nodes",
          ar: "بث كاميرات ثابتة الزاوية تتم معالجته عبر وحدات استقبال محلية",
        },
      },
      {
        label: { en: "Computer Vision Tasks", ar: "مهام الرؤية الحاسوبية" },
        value: {
          en: "Person detection, multi-frame trajectory tracking, zone entry interpretation, assisted risk scoring",
          ar: "كشف الأشخاص، التتبع عبر الإطارات، تفسير دخول المناطق، وتقييم المخاطر المساعد",
        },
      },
      {
        label: { en: "Engineering Conclusion", ar: "الخلاصة الهندسية" },
        value: {
          en: "Demonstrated viable localized event interpretation while highlighting the need for occlusion tuning and formal clinical benchmark documentation",
          ar: "أظهر النظام جدوى التفسير المحلي للأحداث مع إبراز الحاجة لضبط حالات الحجب البصري وتوثيق معايير القياس الرسمية",
        },
      },
    ],
    observations: {
      en: [
        "Multi-object tracking reduced single-frame jitter compared to stateless per-frame detections.",
        "Risk-tier separation helped distinguish routine passage from elevated-attention patterns.",
        "Privacy constraints reinforced the importance of metadata-driven semantic lookup.",
      ],
      ar: [
        "ساهم التتبع الزمني عبر الإطارات في تقليل التذبذب اللحظي مقارنة بالكشف المنفرد لكل إطار.",
        "ساعد تقسيم مستويات المخاطر في فصل الحركة الاعتيادية عن الحالات التي تتطلب انتباهاً.",
        "أكدت متطلبات الخصوصية أهمية البحث عبر البيانات الوصفية الموثقة بدلاً من كشف الهويات.",
      ],
    },
    limitations: {
      en: [
        "Controlled evaluation scope only — not a certified medical device or commercial hospital deployment.",
        "Raw patient imagery is intentionally excluded to protect privacy.",
      ],
      ar: [
        "نطاق تقييم تجريبي مضبوط فقط — وليس جهازاً طبياً معتمداً أو تشغيلاً تجارياً في مستشفى.",
        "تُستبعد اللقطات الخام التي قد تُظهر أشخاصاً أو مرضى حمايةً للخصوصية.",
      ],
    },
    evidenceStatus: {
      hasMedia: false,
      note: {
        en: "Privacy & Authorization Notice: Unredacted medical testing footage is withheld to protect participant privacy. Redacted clinical testing clips will be published here once cleared.",
        ar: "ملاحظة الخصوصية: لا تُنشر لقطات الاختبار الطبية غير المنقحة حمايةً لخصوصية الأفراد، وسيتم إرفاق المقاطع المصادق عليها بعد مراجعة الإخفاء البصري.",
      },
    },
  },
  {
    id: "retail",
    badge: { en: "CASE STUDY B · RETAIL ENVIRONMENTS", ar: "دراسة حالة ب · بيئات التجزئة" },
    title: { en: "Retail Monitoring & Zone Analysis Testing", ar: "اختبارات المراقبة وتحليل المناطق في التجزئة" },
    classification: {
      en: "Controlled evaluation · Retail testing · Pilot readiness stage",
      ar: "تقييم ميداني تجريبي · بيئة تجزئة · مرحلة التجهيز للتشغيل التجريبي",
    },
    summary: {
      en: "Evaluating multi-camera stream stability, customer aisle occlusion, zone-level behavior rules, and false-positive mitigation in busy commercial spaces.",
      ar: "اختبار استقرار بث الكاميرات المتعددة، والتعامل مع التزاحم والحجب البصري، وتحليل المناطق، وتقليل التنبيهات الكاذبة.",
    },
    problemStatement: {
      en: "Retail environments produce continuous background motion, shelving reflections, rapid shopper crossings, and varying overhead camera angles that trigger excessive false alerts in naive detectors.",
      ar: "تنتج بيئات التجزئة حركة خلفية مستمرة وانعكاسات زجاجية وتقاطعاً سريعاً للمتسوقين مما يرفع نسبة التنبيهات الكاذبة في الكاشفات البسيطة.",
    },
    engineeringApproach: {
      en: "Combined spatial ROI zones, track persistence filtering, temporal risk scoring, and operator semantic search so reviewers inspect only correlated high/medium events.",
      ar: "الجمع بين تحديد مناطق الاهتمام المكانية (ROI)، وتصفية استمرارية المسارات، وتقييم المخاطر الزمني، والبحث الدلالي لمراجعة الأحداث ذات الأولوية فقط.",
    },
    rows: [
      {
        label: { en: "Monitoring Objectives", ar: "أهداف المراقبة" },
        value: {
          en: "Evaluate suspicious activity pattern surfacing, aisle coverage, and operator alert clarity",
          ar: "تقييم رصد الأنماط غير الاعتيادية، تغطية الممرات، ووضوح تنبيهات المشغلين",
        },
      },
      {
        label: { en: "Camera Integration", ar: "تكامل الكاميرات" },
        value: {
          en: "Multi-feed RTSP / IP & local camera wall monitoring with stream health diagnostics",
          ar: "ربط بث متعدد المصادر مع مراقبة حالة اتصال الكاميرات وجودة البث",
        },
      },
      {
        label: { en: "Detection & Tracking Behavior", ar: "سلوك الكشف والتتبع" },
        value: {
          en: "Persistent track IDs across crossings paired with zone-based dwell and motion heuristics",
          ar: "معرّفات تتبع مستمرة عبر التقاطعات مع قواعد المكوث والحركة داخل المناطق",
        },
      },
      {
        label: { en: "Event Processing & Review", ar: "معالجة الأحداث والمراجعة" },
        value: {
          en: "Correlated track events scored into HIGH / MEDIUM tiers and indexed for rapid query retrieval",
          ar: "ربط الأحداث وتصنيفها إلى مستويات خطورة عالية ومتوسطة وفهرستها للاسترجاع السريع",
        },
      },
      {
        label: { en: "Observed Limitations", ar: "القيود المرصودة" },
        value: {
          en: "Heavy aisle occlusion and camera dropouts require fallback reconnection and threshold tuning per site",
          ar: "تتطلب حالات الازدحام الشديد أو انقطاع الكاميرا إعادة ربط تلقائية وضبط العتبات لكل موقع",
        },
      },
    ],
    observations: {
      en: [
        "Camera wall health states (live, needs attention, offline) surfaced degraded streams immediately before alert blind spots formed.",
        "Zone filtering eliminated ambient exterior storefront noise from triggering interior alerts.",
        "Natural-language semantic queries shortened incident lookup across accumulated track histories.",
      ],
      ar: [
        "أظهرت لوحة حالة الكاميرات الأعطال والانقطاعات فورياً قبل تحولها إلى نقاط عمياء في المراقبة.",
        "قلّلت مناطق التحليل المحددة من تأثير الحركة الخارجية في الواجهات على التنبيهات الداخلية.",
        "سرّع البحث الدلالي الوصول إلى الأحداث المرتبطة بالمسارات المتراكمة.",
      ],
    },
    limitations: {
      en: [
        "Controlled test environment; not yet a multi-store commercial rollout.",
        "Approved retail testing video samples are queued for redaction before public web publication.",
      ],
      ar: [
        "تجربة تقييم مضبوطة وليست نشراً تجارياً واسع النطاق في متاجر متعددة.",
        "تخضع مقاطع اختبار التجزئة للمراجعة وإخفاء الوجوه قبل نشرها للعامة.",
      ],
    },
    evidenceStatus: {
      hasMedia: false,
      note: {
        en: "Retail Test Media Status: Controlled retail footage is undergoing anonymization and face/identifier redaction prior to upload.",
        ar: "حالة التوثيق المرئي للتجزئة: تخضع مقاطع التقييم الميداني للمراجعة وإخفاء الهويات قبل إتاحتها على الموقع.",
      },
    },
  },
]);

export const ARCHITECTURE_LAYERS: readonly ArchitectureLayer[] = Object.freeze([
  {
    id: "video-sources",
    step: "01",
    title: { en: "Video Sources", ar: "مصادر الفيديو" },
    shortSummary: {
      en: "IP cameras, RTSP streams, local devices, and recorded audit uploads.",
      ar: "كاميرات الشبكة (IP)، بث RTSP، الأجهزة المحلية، ومقاطع المراجعة المرفوعة.",
    },
    status: "implemented",
    inputs: {
      en: ["ONVIF / IP security feeds", "RTSP network streams", "Local device cameras & recorded MP4"],
      ar: ["بث كاميرات IP و ONVIF", "تدفقات RTSP الشبكية", "كاميرات محلية ومقاطع MP4 مسجّلة"],
    },
    processing: {
      en: ["Source registration & camera identity mapping", "Live heartbeat & connectivity status checks"],
      ar: ["تسجيل المصادر وربط معرّفات الكاميرات", "فحص نبض الاتصال وتحديد الكاميرات غير المتصلة"],
    },
    outputs: {
      en: ["Normalized stream descriptors routed to ingestion workers"],
      ar: ["واصفات بث موحدة تُمرّر إلى طبقة الاستقبال والمعالجة"],
    },
    details: {
      en: "Observed in the live /cameras module monitoring simultaneous devices (including local capture feeds, remote IP streams, and diagnostic degraded/offline states).",
      ar: "موثقة في شاشة الكاميرات الحية التي تراقب مصادر متعددة وتُظهر فوراً حالة الاتصال أو التراجع أو الانقطاع.",
    },
  },
  {
    id: "video-processing",
    step: "02",
    title: { en: "Video Processing", ar: "معالجة تدفق الفيديو" },
    shortSummary: {
      en: "Frame decoding, preprocessing, resolution normalization, and stream resilience.",
      ar: "فك ترميز الإطارات، التهيئة الأولية، وإدارة استمرارية البث.",
    },
    status: "implemented",
    inputs: {
      en: ["Raw H.264 / RTSP packet streams & uploaded clips"],
      ar: ["حزم الفيديو الخام والمقاطع المرفوعة"],
    },
    processing: {
      en: ["Frame decoding & sampling cadence", "Color-space normalization & ROI cropping", "Reconnection backoff on stream drop"],
      ar: ["فك الإطارات وضبط معدل التحليل", "تهيئة الأبعاد ومناطق الاهتمام (ROI)", "إعادة الاتصال التلقائي عند انقطاع البث"],
    },
    outputs: {
      en: ["Timestamped frames ready for vision inference"],
      ar: ["إطارات مؤرخة مهيأة لنماذج الرؤية الحاسوبية"],
    },
    details: {
      en: "Balances frame throughput against edge compute budgets while isolating per-camera stream stalls so a single offline camera cannot block other active feeds.",
      ar: "توازن بين معدل معالجة الإطارات وقدرة العتاد مع عزل أعطال أي كاميرا عن بقية التدفقات.",
    },
  },
  {
    id: "computer-vision",
    step: "03",
    title: { en: "Computer Vision", ar: "الرؤية الحاسوبية" },
    shortSummary: {
      en: "Object detection, multi-frame tracking, model inference, and optional verification.",
      ar: "كشف الأجسام، تتبع المسارات، استدلال النماذج، والتحقق المعزز.",
    },
    status: "implemented",
    inputs: {
      en: ["Preprocessed timestamped frames"],
      ar: ["إطارات الفيديو المهيأة والمؤرخة"],
    },
    processing: {
      en: ["Object detection per sampled frame", "Persistent multi-object track ID assignment", "Model-based scene verification pass (secondary verification in refinement)"],
      ar: ["كشف الأجسام داخل الإطار", "إسناد معرّفات تتبع مستمرة عبر الزمن", "طبقة تحقق إضافية لنماذج المشهد (قيد التطوير والتحسين)"],
    },
    outputs: {
      en: ["Structured track trajectories, confidence scores & class metadata"],
      ar: ["مسارات حركة مهيكلة مع درجات الثقة وتصنيفات الكائنات"],
    },
    details: {
      en: "Generates stable entity tracks over time (e.g., 2,776 indexed tracks queried in live backend demos) rather than disconnected single-frame bounding boxes.",
      ar: "تنتج مسارات كائنات مترابطة عبر الزمن (مثل 2,776 مساراً مفهرساً في الجلسة المسجلة) بدلاً من مجرد مربعات لحظية منفصلة.",
    },
  },
  {
    id: "event-intelligence",
    step: "04",
    title: { en: "Event Intelligence", ar: "ذكاء الأحداث والمخاطر" },
    shortSummary: {
      en: "Event interpretation, risk scoring, temporal correlation, and alert generation.",
      ar: "تفسير الأحداث، تقييم المخاطر، الربط الزمني، وتوليد التنبيهات.",
    },
    status: "implemented",
    inputs: {
      en: ["Tracked entity trajectories, zone definitions & concept classifiers"],
      ar: ["مسارات التتبع، حدود المناطق، ومصنفات الأنماط"],
    },
    processing: {
      en: ["Pattern & risk classification (HIGH 0.80 / MEDIUM 0.50 tiers)", "Multi-track temporal event correlation", "Semantic indexing for natural-language evidence queries"],
      ar: ["تصنيف الأنماط وتقدير المخاطر (عالي 0.80 / متوسط 0.50)", "ربط الأحداث زمنياً عبر المسارات", "فهرسة دلالية تدعم الاستعلام اللغوي الطبيعي"],
    },
    outputs: {
      en: ["Verified event records, risk scores & operator alerts"],
      ar: ["سجلات أحداث موثّقة، درجات خطورة، وتنبيهات فورية"],
    },
    details: {
      en: "Correlates raw vision tracks into human-readable safety events—surfacing matched concepts, confidence scores (80%), and latency-bounded queries (878.1 ms).",
      ar: "تحول بيانات التتبع الخام إلى أحداث سلامة مفهومة مع ربط المفاهيم ونسب الثقة واستعلامات البحث الدلالي.",
    },
  },
  {
    id: "application-services",
    step: "05",
    title: { en: "Application Services", ar: "خدمات التطبيق والواجهة الخلفية" },
    shortSummary: {
      en: "Backend APIs, evidence storage, semantic retrieval, and voice/realtime routing.",
      ar: "واجهات البرمجة الخلفية، حفظ الأدلة، الاسترجاع الدلالي، والتواصل الفوري.",
    },
    status: "implemented",
    inputs: {
      en: ["Correlated events, track indexes & operator requests"],
      ar: ["الأحداث المرتبطة، فهارس المسارات، واستعلامات المشغلين"],
    },
    processing: {
      en: ["Backend REST / streaming orchestration", "Evidence snapshot indexing & retention controls", "Voice-interrogable status synthesis & retrieval"],
      ar: ["تنسيق واجهات الخادم والبث الحي", "فهرسة وتخزين الأدلة بضوابط الاحتفاظ", "توليد الردود والتلخيص التشغيلي عبر الصوت"],
    },
    outputs: {
      en: ["Authenticated API responses & realtime UI updates"],
      ar: ["استجابات برمجية موثوقة وتحديثات فورية لواجهة المشغل"],
    },
    details: {
      en: "Powers the connected backend observed on /semantic ('Connected to Aegis AI backend') and orchestrates multi-node telemetry for the intelligence core.",
      ar: "تشغّل الخادم المتصل الظاهر في واجهة البحث الدلالي وتنسّق القياسات بين المكونات والواجهة الأمامية.",
    },
  },
  {
    id: "operator-interface",
    step: "06",
    title: { en: "Operator Interface", ar: "واجهة المشغلين" },
    shortSummary: {
      en: "Unified monitoring dashboard, voice command core, camera wall & evidence review.",
      ar: "لوحة المراقبة، نواة الأوامر الصوتية، جدار الكاميرات، ومراجعة الأدلة.",
    },
    status: "implemented",
    inputs: {
      en: ["Realtime event streams, camera health alerts & semantic match sets"],
      ar: ["تدفقات الأحداث الحية، تنبيهات الكاميرات، ونتائج التطابق الدلالي"],
    },
    processing: {
      en: ["Human-in-the-loop alert triage & incident review", "Natural-language semantic search & voice interrogation", "Site/building trend reporting & incident logs"],
      ar: ["فرز ومراجعة التنبيهات بإشراف بشري", "البحث الدلالي والأوامر الصوتية التفاعلية", "لوحات اتجاهات المواقع وسجل التنبيهات"],
    },
    outputs: {
      en: ["Verified human decisions, acknowledged alerts & audit trails"],
      ar: ["قرارات المشغلين الموثّقة وإغلاق التنبيهات وسجلات التدقيق"],
    },
    details: {
      en: "Evolved from the initial React analytics dashboard (building alerts, multi-camera tiles, trend charts) into the AEGIS Security Operating System interface.",
      ar: "تطورت من لوحة التحليلات الأولى إلى نظام تشغيل متكامل يجمع النواة الصوتية وجدار الكاميرات والبحث الدلالي.",
    },
    screenshot: {
      src: "/aegis/aegis-early-dashboard.webp",
      alt: {
        en: "AEGIS AI early operator dashboard showing camera feeds, alert trend graphs, and building incident breakdowns",
        ar: "لقطة للوحة تشغيل AEGIS AI المبكرة وتظهر الكاميرات والرسوم البيانية والتنبيهات المصنفة حسب المباني",
      },
      caption: {
        en: "Early Operator Analytics Dashboard (v1): multi-camera feed bar, categorized alert trends, and incident list.",
        ar: "لوحة المراقبة الأولى (الإصدار 1): بث الكاميرات، اتجاهات التنبيهات المصنفة، وسجل الحوادث.",
      },
    },
  },
]);

export const ENGINEERING_TIMELINE: readonly TimelineMilestone[] = Object.freeze([
  {
    id: "prototype-dashboard",
    phase: "STAGE 01",
    status: "completed",
    dateLabel: { en: "2023 Prototype Build", ar: "النموذج الأولي · 2023" },
    title: {
      en: "Initial Computer Vision Dashboard & Alert Architecture",
      ar: "بناء لوحة المراقبة الأولى وهيكلة تنبيهات الكاميرات",
    },
    version: "v1.0 Prototype",
    summary: {
      en: "Built an early multi-camera operator dashboard displaying live camera feeds, building-level event breakdowns, alert frequency trends, and timestamped alert logs.",
      ar: "تطوير أول واجهة تحكم تعرض شريط الكاميرات، وتوزيع التنبيهات حسب المباني، والرسوم الزمنية، وسجل التنبيهات المؤرخة.",
    },
    architectureNote: {
      en: "Established the data model separating Camera Directory, Building Alerts, and Categorized Incident Classes.",
      ar: "أسس هذا الإصدار نموذج البيانات الذي يفصل بين دليل الكاميرات والتنبيهات المصنفة.",
    },
    image: {
      src: "/aegis/aegis-early-dashboard.webp",
      alt: {
        en: "Early AEGIS React monitoring dashboard screenshot showing Alerts Generated, Users, Alerts by buildings, and Recent Alerts (2023-02 to 2023-03)",
        ar: "لقطة شاشة للوحة AEGIS الأولى تُظهر التنبيهات المولدة والتوزيع حسب المباني",
      },
    },
  },
  {
    id: "vision-pipeline",
    phase: "STAGE 02",
    status: "completed",
    dateLabel: { en: "Pipeline Consolidation", ar: "توحيد خط المعالجة" },
    title: {
      en: "Real-Time Detection, Multi-Object Tracking & Risk Scoring",
      ar: "تكامل كشف الأجسام والتتبع الزمني وتقييم المخاطر",
    },
    version: "Core Pipeline",
    summary: {
      en: "Integrated frame-to-frame object tracking with zone logic and continuous HIGH / MEDIUM risk score thresholds to reduce isolated frame noise.",
      ar: "ربط الكشف اللحظي بتتبع المسارات عبر الإطارات وتحليل المناطق مع مستويات خطورة مرقّمة لتقليل التنبيهات الوهمية.",
    },
    architectureNote: {
      en: "Shifted from isolated frame snapshots to persistent track graphs linked with semantic concepts.",
      ar: "الانتقال من تحليل الإطار المنفرد إلى مسارات تتبع مستمرة مرتبطة بمفاهيم دلالية.",
    },
  },
  {
    id: "aegis-security-os",
    phase: "STAGE 03",
    status: "completed",
    dateLabel: { en: "System v2 Architecture", ar: "نظام التشغيل v2" },
    title: {
      en: "AEGIS Security Operating System & Semantic Evidence Search",
      ar: "واجهة تشغيل AEGIS الأمنية والبحث الدلالي عن الأدلة",
    },
    version: "v2.0 Operating UI",
    summary: {
      en: "Engineered the unified /intelligence core, 3-feed Camera Wall diagnostics (/cameras), natural-language Semantic Evidence Search (/semantic), and interactive voice operational briefings.",
      ar: "تطوير النواة التفاعلية للذكاء، وجدار مراقبة صحة الكاميرات، والبحث الدلالي باللغة الطبيعية، والإحاطة الصوتية المباشرة للمشغلين.",
    },
    architectureNote: {
      en: "Demonstrated live backend evaluation across 2,776 tracks and 169 events in 878.1 ms.",
      ar: "تم التحقق من استعلام الخادم الخلفي عبر 2,776 مساراً و169 حدثاً في 878.1 مللي ثانية.",
    },
  },
  {
    id: "controlled-testing",
    phase: "STAGE 04",
    status: "completed",
    dateLabel: { en: "Applied Testing", ar: "الاختبارات العملية" },
    title: {
      en: "Controlled Medical & Retail Environment Testing (95.3% Reported)",
      ar: "تقييم البيئات الطبية وبيئات التجزئة (نتيجة 95.3% المبلّغ عنها)",
    },
    version: "Evaluation Cycle",
    summary: {
      en: "Evaluated AEGIS AI across medical-related and retail test settings, recording a reported 95.3% evaluation result while identifying occlusion and stream-dropout edge cases.",
      ar: "اختبار النظام في بيئات طبية وتجارية مضبوطة مع تسجيل نتيجة تقييم مبلّغ عنها قدرها 95.3% ورصد التحديات العملية.",
    },
    architectureNote: {
      en: "Benchmark methodology publication and dataset breakdown remain queued for formal documentation.",
      ar: "توثيق المنهجية الكاملة وتفاصيل البيانات قيد الإعداد للنشر الرسمي.",
    },
  },
  {
    id: "recognition-2026",
    phase: "STAGE 05",
    status: "completed",
    dateLabel: { en: "03 / 10 / 2026 · Istanbul", ar: "03 / 10 / 2026 · إسطنبول" },
    title: {
      en: "Second Place — Innovation and Invention Competition",
      ar: "المركز الثاني — مسابقة الإبداع والابتكار (إسطنبول)",
    },
    version: "Milestone Recognition",
    summary: {
      en: "AEGIS AI was awarded Second Place in the Innovation and Invention Competition during the Innovation and Invention Conference in Istanbul.",
      ar: "فوز مشروع AEGIS AI بالمركز الثاني في مسابقة الإبداع والابتكار ضمن فعاليات مؤتمر الإبداع والابتكار في إسطنبول.",
    },
    architectureNote: {
      en: "Documented with official award presentation photography, certificate record, and stage presentation clip.",
      ar: "موثّق بالصور الرسمية للحفل والشهادة ومقطع التقديم على المنصة.",
    },
    image: {
      src: "/awards/stage-ceremony-2026.webp",
      alt: {
        en: "Innovation and Invention Conference stage ceremony in Istanbul recognizing AEGIS AI in Second Place",
        ar: "حفل مؤتمر الإبداع والابتكار في إسطنبول وتكريم مشروع AEGIS AI بالمركز الثاني",
      },
    },
  },
  {
    id: "pilot-productization",
    phase: "STAGE 06",
    status: "planned",
    dateLabel: { en: "Planned Next Phase", ar: "المرحلة المخططة القادمة" },
    title: {
      en: "Methodology Verification, Pilot Hardening & Partner Trials",
      ar: "توثيق المعايير الكاملة وتجهيز التجارب الميدانية للشركاء",
    },
    version: "Roadmap (Planned)",
    summary: {
      en: "Formalizing external benchmark methodology documentation, edge-node packaging, and structured pilot readiness for early institutional partners.",
      ar: "نشر منهجية القياس التفصيلية، وتحزيم وحدات التشغيل على الحافة، وتجهيز تجارب تشغيلية مع الشركاء المهتمين.",
    },
    architectureNote: {
      en: "Planned roadmap milestone — not yet a general commercial deployment.",
      ar: "مرحلة مستقبلية مخططة ضمن خارطة الطريق وليست نشراً تجارياً مكتملًا بعد.",
    },
  },
]);

export const ENGINEERING_CHALLENGES: readonly EngineeringChallenge[] = Object.freeze([
  {
    id: "false-positives",
    domain: { en: "SIGNAL RELIABILITY", ar: "موثوقية التنبيهات" },
    title: { en: "Suppressing Transient False Positives", ar: "تقليل التنبيهات الكاذبة اللحظية" },
    problem: {
      en: "Single-frame object detectors frequently spike false alerts on lighting flicker, brief shadows, and partial occlusion in active scenes.",
      ar: "تولّد كاشفات الإطار الواحد تنبيهات كاذبة عند تغير الإضاءة أو الظلال العابرة أو الحجب البصري الجزئي.",
    },
    decision: {
      en: "Separate raw detection from event promotion using temporal track persistence and scored risk thresholds.",
      ar: "فصل الكشف اللحظي عن إطلاق التنبيه عبر ربط استمرارية المسار الزمني وعتبات المخاطر.",
    },
    implementation: {
      en: "Tracked bounding identities over sequential frames, aggregating matched concepts before assigning MEDIUM (0.50) or HIGH (0.80) event scores.",
      ar: "تتبع الكائنات عبر الإطارات المتعاقبة ودمج المفاهيم المرصودة قبل منح درجة خطورة متوسطة (0.50) أو عالية (0.80).",
    },
    result: {
      en: "Operators review coherent multi-frame event records with confidence percentages (e.g., 80% match confidence) instead of frame-level jitter.",
      ar: "مراجعة سجلات أحداث مترابطة ومؤرخة بدلاً من سيل تنبيهات عشوائية غير مستقرة.",
    },
  },
  {
    id: "semantic-retrieval",
    domain: { en: "OPERATOR SPEED", ar: "سرعة المراجعة" },
    title: { en: "Querying Thousands of Tracks Without Manual Scrubbing", ar: "استرجاع الأدلة دون البحث اليدوي الطويل" },
    problem: {
      en: "Continuous camera feeds accumulate thousands of motion tracks and hundreds of events per hour, making manual timeline scrubbing impractical during an active alert.",
      ar: "تنتج الكاميرات آلاف مسارات الحركة ومئات الأحداث يومياً مما يجعل مراجعة التسجيلات يدوياً بطيئة وغير فعالة أثناء الطوارئ.",
    },
    decision: {
      en: "Index tracks, risk scores, and matched scene concepts for sub-second natural-language semantic search.",
      ar: "فهرسة المسارات ودرجات الخطورة والمفاهيم الدلالية لدعم البحث الفوري باللغة الطبيعية.",
    },
    implementation: {
      en: "Connected the /semantic interface and voice briefing assistant directly to backend event and track correlation indices.",
      ar: "ربط واجهة البحث الدلالي ومساعد الإحاطة الصوتية مباشرة بفهارس الأحداث والمسارات في الخادم الخلفي.",
    },
    result: {
      en: "Observed evaluating 2,776 tracks and 169 recent events in 878.1 ms during live system testing.",
      ar: "رُصد تقييم 2,776 مساراً و169 حدثاً حديثاً خلال 878.1 مللي ثانية في جلسة الاختبار المسجلة.",
    },
  },
  {
    id: "stream-health",
    domain: { en: "MULTI-CAMERA OPS", ar: "إدارة الكاميرات المتعددة" },
    title: { en: "Detecting Camera Dropouts Before Blind Spots Form", ar: "كشف أعطال البث قبل حدوث فجوات المراقبة" },
    problem: {
      en: "Silent camera disconnections or degraded bitrates look identical to 'no alerts' unless stream health is tracked explicitly.",
      ar: "انقطاع إحدى الكاميرات بصمت قد يبدو للمشغل وكأنه غياب للتنبيهات إذا لم تُراقَب صحة البث بشكل منفصل.",
    },
    decision: {
      en: "Surface explicit stream health classification (Live, Needs Attention, Offline) inside both the Camera Wall and system status voice report.",
      ar: "إظهار تصنيف واضح لحالة كل كاميرا (متصلة، تحتاج انتباهاً، غير متصلة) في جدار الكاميرات والتقرير الصوتي.",
    },
    implementation: {
      en: "Built real-time per-camera connection diagnostics that bubble degraded status directly up to the /intelligence command bar.",
      ar: "بناء فحص اتصال لحظي لكل مصدر بث ينعكس مباشرة في شريط حالة النظام العام.",
    },
    result: {
      en: "Verified in the live walkthrough where the assistant immediately reported degraded overall status, 1 offline feed, and 2 online feeds.",
      ar: "تم التحقق من ذلك في الفيديو الحي حيث أبلغ النظام فوراً بتراجع الحالة وتحديد الكاميرات المتصلة والمنقطعة.",
    },
  },
]);

export const PRODUCT_EVOLUTION_STAGES = Object.freeze([
  {
    stage: { en: "Research Prototype", ar: "النموذج البحثي الأول" },
    status: "completed" as const,
    detail: {
      en: "Initial computer vision experiments & building analytics UI (v1).",
      ar: "التجارب الأولية للرؤية الحاسوبية وبناء لوحة التحليلات الأولى (v1).",
    },
  },
  {
    stage: { en: "Working Engineering System", ar: "نظام هندسي عامل" },
    status: "completed" as const,
    detail: {
      en: "Multi-camera ingestion, semantic search & interactive AEGIS OS UI.",
      ar: "استقبال الكاميرات المتعددة، البحث الدلالي، وواجهة نظام التشغيل التفاعلي.",
    },
  },
  {
    stage: { en: "Controlled Evaluation & Recognition", ar: "التقييم الميداني والتكريم" },
    status: "completed" as const,
    detail: {
      en: "Medical & retail testing, 95.3% reported result, 2nd Place (Istanbul 2026).",
      ar: "اختبارات البيئات الطبية والتجزئة، نتيجة 95.3% المبلّغ عنها، والمركز الثاني 2026.",
    },
  },
  {
    stage: { en: "Technical & Benchmark Refinement", ar: "التدقيق وتوثيق المعايير" },
    status: "in-progress" as const,
    detail: {
      en: "Formalizing raw benchmark methodology, latency tables & edge optimization.",
      ar: "استكمال توثيق منهجية الاختبارات، جداول زمن الاستجابة، وتحسين الأداء على الحافة.",
    },
  },
  {
    stage: { en: "Customer Pilot Readiness", ar: "جاهزية التجارب المؤسسية (Pilots)" },
    status: "planned" as const,
    detail: {
      en: "Structured partner pilots prior to general commercial availability.",
      ar: "تجهيز تجارب تشغيلية منظمة مع الشركاء قبل الإطلاق التجاري العام.",
    },
  },
]);

export function getAegisCopy(locale: Locale) {
  return AEGIS_UI_COPY[locale];
}
