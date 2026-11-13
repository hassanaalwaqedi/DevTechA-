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
    eyebrow: "AEGIS AI · COMPUTER VISION",
    heroHeadline: "From Research to Real-World Impact.",
    heroSubtitle:
      "Real-time computer vision, video analytics, and Edge AI architecture engineered by HIRZEXA.",
    ctaPrimary: "Explore Case Studies",
    ctaSecondary: "View System Architecture",
    ctaWatch: "Watch AEGIS in Action",
    navQuick: [
      { id: "video-showcase", label: "Footage" },
      { id: "case-studies", label: "Case Studies" },
      { id: "evaluation-results", label: "95.3% Result" },
      { id: "architecture", label: "Architecture" },
      { id: "engineering-journey", label: "Journey" },
      { id: "challenges", label: "Challenges" },
      { id: "deployment", label: "Pilots" },
    ],
    videoSectionEyebrow: "SYSTEM FOOTAGE · ORIGINAL AUDIO",
    videoSectionTitle: "AEGIS AI in live operation.",
    videoSectionSubtitle:
      "Recorded walkthroughs with original system voice audio preserved.",
    play: "Play with audio",
    pause: "Pause",
    mute: "Mute audio",
    unmute: "Unmute audio",
    fullscreen: "Enter fullscreen",
    resultsEyebrow: "EVALUATION",
    resultsTitle: "95.3% — Reported Evaluation Result",
    resultsSubtitle:
      "Internal reported evaluation figure with transparent verification status.",
    resultsRingNote: "Internal reported result · Formal methodology verification pending",
    methodologyTitle: "Verification Scope",
    methodologyColumns: [
      { label: "Reported Result", value: "95.3%", state: "Reported (Internal)" },
      { label: "Metric Definition", value: "Accuracy / Precision / Recall breakdown", state: "Pending verification" },
      { label: "Dataset & Samples", value: "Raw sample size details", state: "Awaiting publication" },
      { label: "Latency & FPS", value: "Per-hardware benchmark CSV", state: "Awaiting publication" },
      { label: "Audit Status", value: "Internal evaluation figure (not third-party certified)", state: "Disclosed" },
    ],
    dashboardTabTelemetry: "Verified Session Telemetry",
    dashboardTabBenchmark: "Benchmark Structure",
    caseStudiesEyebrow: "CASE STUDIES",
    caseStudiesTitle: "Engineering Tested Beyond the Lab.",
    caseStudiesSubtitle: "How AEGIS AI performs across controlled monitoring environments.",
    architectureEyebrow: "SYSTEM ARCHITECTURE",
    architectureTitle: "Inside the AEGIS AI Architecture.",
    architectureSubtitle:
      "Six connected layers from camera ingestion and vision inference to operator review.",
    modeOverview: "Overview",
    modeDetailed: "Detailed",
    journeyEyebrow: "TIMELINE",
    journeyTitle: "The Engineering Journey.",
    journeySubtitle: "Key milestones from early prototype to 2026 competition recognition.",
    challengesEyebrow: "ENGINEERING DECISIONS",
    challengesTitle: "Built Through Engineering Challenges.",
    challengesSubtitle: "Core trade-offs solved across video ingestion and risk scoring.",
    evolutionEyebrow: "EVOLUTION",
    evolutionTitle: "From Prototype to Product.",
    evolutionSubtitle: "Current progress and upcoming pilot readiness milestones.",
    deploymentEyebrow: "PILOTS & DEMOS",
    deploymentTitle: "Evaluate AEGIS AI in your environment.",
    deploymentSubtitle:
      "Pricing plans are not yet published. Contact us to arrange a technical demo or pilot evaluation.",
    demoCta: "Request a Demo",
    pilotCta: "Discuss a Pilot",
    businessCta: "Contact Business Team",
    recognitionEyebrow: "RECOGNITION · 2026",
    recognitionTitle: "AEGIS AI — Second Place, Innovation and Invention Competition (2026)",
    recognitionBody: "Awarded in Istanbul for applied computer vision and safety intelligence.",
    recognitionLink: "View Award & Certificate Evidence",
    statusBadges: {
      implemented: "Implemented",
      evaluation: "In Evaluation",
      planned: "Planned",
      completed: "Completed",
      "in-progress": "In Progress",
    },
  },
  ar: {
    eyebrow: "AEGIS AI · الرؤية الحاسوبية",
    heroHeadline: "من البحث الهندسي إلى الأثر الواقعي.",
    heroSubtitle:
      "منظومة الرؤية الحاسوبية وتحليل الفيديو الذكي وذكاء الحافة من HIRZEXA.",
    ctaPrimary: "استكشف دراسات الحالة",
    ctaSecondary: "استعرض معمارية النظام",
    ctaWatch: "شاهد AEGIS AI أثناء العمل",
    navQuick: [
      { id: "video-showcase", label: "الفيديو" },
      { id: "case-studies", label: "دراسات الحالة" },
      { id: "evaluation-results", label: "نتيجة 95.3%" },
      { id: "architecture", label: "المعمارية" },
      { id: "engineering-journey", label: "التطور" },
      { id: "challenges", label: "التحديات" },
      { id: "deployment", label: "العروض" },
    ],
    videoSectionEyebrow: "لقطات النظام · الصوت الأصلي محفوظ",
    videoSectionTitle: "استعراض AEGIS AI الفعلي.",
    videoSectionSubtitle:
      "تسجيلات حية تحتفظ بالمسار الصوتي الأصلي دون تعديل.",
    play: "تشغيل بالصوت",
    pause: "إيقاف مؤقت",
    mute: "كتم الصوت",
    unmute: "تفعيل الصوت",
    fullscreen: "ملء الشاشة",
    resultsEyebrow: "التقييم",
    resultsTitle: "95.3% — نتيجة التقييم المبلّغ عنها",
    resultsSubtitle: "نتيجة تقييم داخلية تُعرض بشفافية دون أرقام مختلقة.",
    resultsRingNote: "نتيجة داخلية · توثيق المنهجية قيد الاستكمال",
    methodologyTitle: "نطاق التحقق",
    methodologyColumns: [
      { label: "النتيجة المبلّغ عنها", value: "95.3%", state: "داخلية" },
      { label: "تعريف المقياس", value: "تفصيل الدقة والاستدعاء", state: "بانتظار التأكيد" },
      { label: "حجم البيانات", value: "عدد العينات والاختبارات", state: "بانتظار النشر" },
      { label: "الاستجابة والسرعة", value: "قياسات العتاد التفصيلية", state: "بانتظار النشر" },
      { label: "الاعتماد الخارجي", value: "ليست شهادة تدقيق خارجية", state: "إفصاح شفاف" },
    ],
    dashboardTabTelemetry: "قياسات الجلسة الموثقة",
    dashboardTabBenchmark: "هيكل المعايير",
    caseStudiesEyebrow: "دراسات الحالة",
    caseStudiesTitle: "هندسة مختبرة خارج المختبر.",
    caseStudiesSubtitle: "أداء AEGIS AI في بيئات المراقبة العملية.",
    architectureEyebrow: "المعمارية",
    architectureTitle: "داخل معمارية AEGIS AI.",
    architectureSubtitle: "ست طبقات مترابطة من استقبال البث حتى قرار المشغل.",
    modeOverview: "نظرة عامة",
    modeDetailed: "تفصيلي",
    journeyEyebrow: "التسلسل الزمني",
    journeyTitle: "رحلة الهندسة والتطوير.",
    journeySubtitle: "محطات موثقة من النموذج الأولي حتى تكريم 2026.",
    challengesEyebrow: "حلول هندسية",
    challengesTitle: "بُني عبر التحديات الهندسية.",
    challengesSubtitle: "قرارات تقنية لمعالجة البث وتقليل الإنذارات الكاذبة.",
    evolutionEyebrow: "تطور المنتج",
    evolutionTitle: "من نموذج أولي إلى منتج متكامل.",
    evolutionSubtitle: "المراحل المكتملة والأعمال الجارية وخطط التشغيل التجريبي.",
    deploymentEyebrow: "التشغيل التجريبي",
    deploymentTitle: "قيّم AEGIS AI في بيئة عملك.",
    deploymentSubtitle:
      "خطط الأسعار غير منشورة حالياً. تواصل معنا لطلب عرض تقني أو مشروع تجريبي.",
    demoCta: "طلب عرض تقني (Demo)",
    pilotCta: "مناقشة مشروع تجريبي",
    businessCta: "تواصل مع فريق الأعمال",
    recognitionEyebrow: "التكريم · 2026",
    recognitionTitle: "AEGIS AI — المركز الثاني، مسابقة الإبداع والابتكار (2026)",
    recognitionBody: "تكريم في إسطنبول لتطبيقات الرؤية الحاسوبية وذكاء السلامة.",
    recognitionLink: "عرض صفحة التوثيق والشهادة",
    statusBadges: {
      implemented: "مُنفّذ",
      evaluation: "قيد التقييم",
      planned: "مخطط",
      completed: "مكتمل",
      "in-progress": "قيد العمل",
    },
  },
} as const);

export const AEGIS_VIDEOS: readonly AegisVideoItem[] = Object.freeze([
  {
    id: "os-walkthrough",
    src: "/aegis/aegis-os-walkthrough.mp4",
    badge: { en: "SYSTEM WALKTHROUGH", ar: "جولة النظام الحية" },
    title: {
      en: "AEGIS Security Operating System — Live Voice, Cameras & Semantic Search",
      ar: "نظام AEGIS الأمني — التفاعل الصوتي، الكاميرات، والبحث الدلالي",
    },
    caption: {
      en: "Voice command status check, 3-camera Camera Wall, and 878.1 ms semantic search across 2,776 tracks.",
      ar: "استعلام صوتي مباشر عن الحالة، جدار الكاميرات، والبحث الدلالي في 2,776 مساراً خلال 878.1 مللي ثانية.",
    },
    durationLabel: "0:41 · Original Audio",
    hasSpokenAudio: true,
    audioNote: {
      en: "Original English operator & assistant dialogue preserved.",
      ar: "الصوت الأصلي للحوار محفوظ بالكامل.",
    },
  },
  {
    id: "stage-presentation-2026",
    src: "/awards/aegis-ai-presentation-2026.mp4",
    poster: "/awards/stage-ceremony-2026.webp",
    badge: { en: "ISTANBUL · 2026", ar: "إسطنبول · 2026" },
    title: {
      en: "Innovation and Invention Conference — Stage Presentation",
      ar: "مؤتمر الإبداع والابتكار — التقديم على المنصة",
    },
    caption: {
      en: "Recorded podium session from the conference in Istanbul.",
      ar: "لقطة تقديم المشروع على منصة المؤتمر في إسطنبول.",
    },
    durationLabel: "0:06 · Stage Clip",
    hasSpokenAudio: false,
    audioNote: {
      en: "Stage podium clip (no separate audio stream).",
      ar: "لقطة منصة (بدون مسار صوتي منفصل).",
    },
  },
  {
    id: "human-ai-concept",
    src: "/videos/human-ai-aegis.mp4",
    poster: "/human-ai-aegis.jpg",
    badge: { en: "CONCEPT REEL", ar: "عرض بصري" },
    title: {
      en: "Human-in-the-Loop Visual Perception",
      ar: "الإدراك البصري بإشراف بشري",
    },
    caption: {
      en: "Motion reel illustrating operator-assisted camera intelligence.",
      ar: "مقطع بصري يوضح دعم المشغل البشري.",
    },
    durationLabel: "0:10 · Visual Reel",
    hasSpokenAudio: false,
    audioNote: { en: "Silent visual reel.", ar: "مقطع بصري صامت." },
  },
]);

export const SESSION_TELEMETRY_VERIFIED = Object.freeze([
  {
    metric: { en: "Semantic Query Time", ar: "زمن الاستعلام الدلالي" },
    value: "878.1 ms",
    source: { en: "/semantic query", ar: "استعلام مباشر" },
  },
  {
    metric: { en: "Tracks Evaluated", ar: "المسارات المقيّمة" },
    value: "2,776 tracks",
    source: { en: "50 verified matches", ar: "50 تطابقاً" },
  },
  {
    metric: { en: "Events Indexed", ar: "الأحداث المفهرسة" },
    value: "169 events",
    source: { en: "Live event graph", ar: "فهرس الأحداث" },
  },
  {
    metric: { en: "Confidence & Risk Tiers", ar: "نسبة الثقة والمخاطر" },
    value: "80% · HIGH / MED",
    source: { en: "0.80 / 0.50 tiers", ar: "مستويات موثقة" },
  },
]);

export const CASE_STUDIES: readonly CaseStudy[] = Object.freeze([
  {
    id: "medical",
    badge: { en: "CASE STUDY A · MEDICAL", ar: "دراسة أ · البيئات الطبية" },
    title: { en: "Medical Environment Evaluation", ar: "التقييم في البيئات الطبية" },
    classification: {
      en: "Controlled test · Anonymized · Not commercial",
      ar: "اختبار مضبوط · محمي الخصوصية",
    },
    summary: {
      en: "Testing real-time person tracking, zone awareness, and operator alerts under strict privacy constraints.",
      ar: "اختبار تتبع الأشخاص وتحليل المناطق والتنبيهات ضمن قيود الخصوصية الطبية.",
    },
    problemStatement: {
      en: "Corridors feature mobility equipment, doorway occlusion, and strict privacy rules against raw cloud streaming.",
      ar: "تحتوي الممرات على معدات وحجب بصري مع اشتراطات صارمة لمنع بث الفيديو الخام.",
    },
    engineeringApproach: {
      en: "Localized inference with persistent multi-object tracking, zone rules, and risk-tiered metadata alerts.",
      ar: "معالجة محلية مع تتبع متعدد الأجسام وتنبيهات مصنّفة عبر البيانات الوصفية.",
    },
    rows: [
      {
        label: { en: "Objective", ar: "الهدف" },
        value: { en: "Validate event responsiveness & alert triage", ar: "التحقق من سرعة الرصد وفرز التنبيهات" },
      },
      {
        label: { en: "Cameras", ar: "الكاميرات" },
        value: { en: "Fixed corridor/room feeds on local ingestion", ar: "كاميرات ممرات وغرف ثابتة على معالجة محلية" },
      },
      {
        label: { en: "CV Tasks", ar: "مهام الرؤية" },
        value: { en: "Detection, trajectory tracking, risk scoring", ar: "الكشف، التتبع، وتقييم المخاطر" },
      },
    ],
    observations: {
      en: [
        "Multi-frame tracking stabilized outputs over single-frame detection.",
        "Risk tiers separated routine movement from elevated-attention alerts.",
      ],
      ar: [
        "التتبع الزمني قلّل تذبذب الإطارات المنفردة.",
        "فصلت مستويات المخاطر الحركة الاعتيادية عن التنبيهات المهمة.",
      ],
    },
    limitations: {
      en: [
        "Controlled evaluation only — not a medical device or hospital deployment.",
        "Patient imagery withheld to protect privacy.",
      ],
      ar: [
        "تقييم تجريبي فقط وليس جهازاً طبياً أو نشراً تجارياً.",
        "تُحجب الصور حمايةً لخصوصية الأفراد.",
      ],
    },
    evidenceStatus: {
      hasMedia: false,
      note: {
        en: "Privacy notice: Redacted medical footage will be added once privacy clearance is complete.",
        ar: "ملاحظة خصوصية: ستُرفق اللقطات الطبية المنقحة بعد إتمام مراجعة الإخفاء البصري.",
      },
    },
  },
  {
    id: "retail",
    badge: { en: "CASE STUDY B · RETAIL", ar: "دراسة ب · بيئات التجزئة" },
    title: { en: "Retail Monitoring Evaluation", ar: "التقييم في بيئات التجزئة" },
    classification: {
      en: "Controlled test · Pilot readiness stage",
      ar: "اختبار مضبوط · جاهزية للتجارب",
    },
    summary: {
      en: "Evaluating multi-camera stream health, aisle occlusion handling, and zone-based false-positive filtering.",
      ar: "تقييم استقرار الكاميرات المتعددة ومعالجة التزاحم وتصفية التنبيهات الكاذبة.",
    },
    problemStatement: {
      en: "Heavy foot traffic, shelving occlusion, and storefront motion trigger noise in standard detectors.",
      ar: "يولّد الازدحام وحركة الواجهات تنبيهات كاذبة في الكاشفات البسيطة.",
    },
    engineeringApproach: {
      en: "Applied spatial ROI zones, persistent track IDs, and semantic event indexing for rapid review.",
      ar: "استخدام مناطق الاهتمام (ROI) ومسارات التتبع والفهرسة الدلالية للمراجعة السريعة.",
    },
    rows: [
      {
        label: { en: "Objective", ar: "الهدف" },
        value: { en: "Surface suspicious activity patterns & cut noise", ar: "رصد الأنماط غير الاعتيادية وتقليل الضجيج" },
      },
      {
        label: { en: "Integration", ar: "التكامل" },
        value: { en: "Multi-feed IP / RTSP camera wall diagnostics", ar: "ربط بث متعدد مع فحص حالة الاتصال" },
      },
      {
        label: { en: "Review", ar: "المراجعة" },
        value: { en: "HIGH / MEDIUM alert correlation & semantic lookup", ar: "ربط التنبيهات والبحث الدلالي" },
      },
    ],
    observations: {
      en: [
        "Stream diagnostics caught degraded feeds immediately on the camera wall.",
        "Zone rules blocked exterior storefront motion from triggering alerts.",
      ],
      ar: [
        "أظهر فحص البث الكاميرات المنقطعة فوراً.",
        "منعت حدود المناطق تنبيهات الحركة الخارجية.",
      ],
    },
    limitations: {
      en: [
        "Controlled test scope — not a multi-store commercial rollout.",
        "Retail clips queued for face anonymization before publication.",
      ],
      ar: [
        "نطاق اختبار مضبوط وليس نشراً تجارياً واسعاً.",
        "مقاطع التجزئة قيد إخفاء الوجوه قبل النشر.",
      ],
    },
    evidenceStatus: {
      hasMedia: false,
      note: {
        en: "Retail test footage is undergoing face anonymization prior to public upload.",
        ar: "مقاطع اختبار التجزئة قيد إخفاء الهويات قبل نشرها للعامة.",
      },
    },
  },
]);

export const ARCHITECTURE_LAYERS: readonly ArchitectureLayer[] = Object.freeze([
  {
    id: "video-sources",
    step: "01",
    title: { en: "Video Sources", ar: "مصادر الفيديو" },
    shortSummary: { en: "IP cameras, RTSP streams & uploaded footage.", ar: "كاميرات IP، بث RTSP، والملفات المرفوعة." },
    status: "implemented",
    inputs: { en: ["ONVIF / IP cameras", "RTSP streams & MP4 uploads"], ar: ["كاميرات IP و RTSP", "ملفات MP4 المرفوعة"] },
    processing: { en: ["Source mapping & connection health check"], ar: ["ربط المصادر وفحص الاتصال"] },
    outputs: { en: ["Normalized stream descriptors"], ar: ["واصفات بث موحدة"] },
    details: {
      en: "Monitored via /cameras with live, degraded, and offline feed diagnostics.",
      ar: "تُدار عبر شاشة الكاميرات مع رصد حالة الاتصال أو الانقطاع.",
    },
  },
  {
    id: "video-processing",
    step: "02",
    title: { en: "Video Processing", ar: "معالجة الفيديو" },
    shortSummary: { en: "Decoding, ROI cropping & stream recovery.", ar: "فك الترميز، مناطق الاهتمام، واستعادة البث." },
    status: "implemented",
    inputs: { en: ["Raw H.264 / RTSP streams"], ar: ["تدفقات الفيديو الخام"] },
    processing: { en: ["Frame sampling & ROI normalization", "Per-camera reconnect backoff"], ar: ["تنظيم الإطارات والمناطق", "إعادة الربط التلقائي"] },
    outputs: { en: ["Timestamped inference frames"], ar: ["إطارات مؤرخة للاستدلال"] },
    details: {
      en: "Isolates unstable streams so a single offline camera never blocks active feeds.",
      ar: "يعزل الأعطال الفردية لضمان استمرار تحليل بقية الكاميرات.",
    },
  },
  {
    id: "computer-vision",
    step: "03",
    title: { en: "Computer Vision", ar: "الرؤية الحاسوبية" },
    shortSummary: { en: "Object detection & persistent multi-frame tracking.", ar: "كشف الأجسام وتتبع المسارات عبر الزمن." },
    status: "implemented",
    inputs: { en: ["Preprocessed frames"], ar: ["الإطارات المهيأة"] },
    processing: { en: ["Object detection", "Multi-object track ID assignment"], ar: ["كشف الأجسام", "إسناد معرّفات التتبع المستمرة"] },
    outputs: { en: ["Structured track trajectories"], ar: ["مسارات حركة مهيكلة"] },
    details: {
      en: "Produces stable entity trajectories (2,776 tracks indexed in session demos).",
      ar: "ينتج مسارات مستقرة عبر الزمن بدلاً من مربعات كشف متفرقة.",
    },
  },
  {
    id: "event-intelligence",
    step: "04",
    title: { en: "Event Intelligence", ar: "ذكاء الأحداث" },
    shortSummary: { en: "Risk scoring, correlation & semantic indexing.", ar: "تقييم المخاطر، ربط الأحداث، والفهرسة الدلالية." },
    status: "implemented",
    inputs: { en: ["Track trajectories & zone rules"], ar: ["مسارات التتبع وقواعد المناطق"] },
    processing: { en: ["HIGH (0.80) / MEDIUM (0.50) risk scoring", "Semantic concept indexing"], ar: ["تصنيف المخاطر (0.80 / 0.50)", "فهرسة المفاهيم الدلالية"] },
    outputs: { en: ["Verified events & operator alerts"], ar: ["سجلات الأحداث والتنبيهات"] },
    details: {
      en: "Supports natural-language search across events in 878.1 ms.",
      ar: "يدعم الاستعلام اللغوي عن الأحداث بأقل من ثانية.",
    },
  },
  {
    id: "application-services",
    step: "05",
    title: { en: "Application Services", ar: "خدمات الخادم" },
    shortSummary: { en: "APIs, evidence storage & voice status synthesis.", ar: "واجهات API، حفظ الأدلة، والردود الصوتية." },
    status: "implemented",
    inputs: { en: ["Correlated events & operator queries"], ar: ["الأحداث المرتبطة واستعلامات المشغل"] },
    processing: { en: ["REST orchestration & evidence lookup", "Voice briefing generation"], ar: ["تنسيق البيانات والاسترجاع", "توليد الإحاطة الصوتية"] },
    outputs: { en: ["Authenticated realtime UI state"], ar: ["تحديثات الواجهة الفورية"] },
    details: {
      en: "Connects the intelligence backend directly to operator dashboards and voice controls.",
      ar: "يربط محرك التحليل الخلفي مباشرة بلوحات التحكم والأوامر الصوتية.",
    },
  },
  {
    id: "operator-interface",
    step: "06",
    title: { en: "Operator Interface", ar: "واجهة المشغل" },
    shortSummary: { en: "Command core, camera wall & evidence review.", ar: "نواة القيادة، جدار الكاميرات، ومراجعة الأدلة." },
    status: "implemented",
    inputs: { en: ["Alerts, stream health & semantic matches"], ar: ["التنبيهات وحالة البث والتطابقات"] },
    processing: { en: ["Human-in-the-loop review & incident log"], ar: ["المراجعة البشرية وسجل الحوادث"] },
    outputs: { en: ["Acknowledged decisions & audit log"], ar: ["قرارات المشغلين وسجل التدقيق"] },
    details: {
      en: "Evolved from v1 building analytics charts into the AEGIS Security Operating UI.",
      ar: "تطورت من لوحة التحليلات الأولى إلى نظام تشغيل متكامل.",
    },
    screenshot: {
      src: "/aegis/aegis-early-dashboard.webp",
      alt: {
        en: "AEGIS AI early operator dashboard showing camera feeds and alert breakdowns",
        ar: "لوحة تشغيل AEGIS AI المبكرة",
      },
      caption: {
        en: "Early Operator Analytics Dashboard (v1 prototype).",
        ar: "لوحة المراقبة التحليلية الأولى (النموذج 1).",
      },
    },
  },
]);

export const ENGINEERING_TIMELINE: readonly TimelineMilestone[] = Object.freeze([
  {
    id: "prototype-dashboard",
    phase: "STAGE 01",
    status: "completed",
    dateLabel: { en: "2023 Prototype", ar: "2023 · النموذج الأول" },
    title: { en: "Initial Analytics Dashboard", ar: "لوحة المراقبة الأولى" },
    version: "v1.0",
    summary: {
      en: "Built multi-camera feed tiles, building alert charts, and incident logs.",
      ar: "بناء لوحة تعرض بث الكاميرات وتوزيع التنبيهات حسب المباني.",
    },
    architectureNote: { en: "Separated Camera Directory & Categorized Alerts.", ar: "فصل دليل الكاميرات عن سجل التنبيهات." },
    image: {
      src: "/aegis/aegis-early-dashboard.webp",
      alt: { en: "Early AEGIS monitoring dashboard", ar: "لوحة AEGIS المبكرة" },
    },
  },
  {
    id: "vision-pipeline",
    phase: "STAGE 02",
    status: "completed",
    dateLabel: { en: "Core Pipeline", ar: "خط المعالجة" },
    title: { en: "Tracking & Risk Scoring", ar: "التتبع وتقييم المخاطر" },
    version: "Pipeline",
    summary: {
      en: "Added persistent frame-to-frame object tracking and HIGH / MEDIUM risk tiers.",
      ar: "دمج التتبع المستمر عبر الإطارات ومستويات الخطورة.",
    },
    architectureNote: { en: "Moved from isolated detections to tracked graphs.", ar: "الانتقال من الكشف المنفرد إلى مسارات التتبع." },
  },
  {
    id: "aegis-security-os",
    phase: "STAGE 03",
    status: "completed",
    dateLabel: { en: "System v2", ar: "الإصدار 2" },
    title: { en: "AEGIS Security OS & Semantic Search", ar: "واجهة AEGIS OS والبحث الدلالي" },
    version: "v2.0",
    summary: {
      en: "Launched voice command briefing, Camera Wall diagnostics, and 878.1 ms semantic search.",
      ar: "تطوير الإحاطة الصوتية، جدار الكاميرات، والبحث الدلالي السريع.",
    },
    architectureNote: { en: "Indexed 2,776 tracks and 169 recent events.", ar: "فهرسة 2,776 مساراً و169 حدثاً." },
  },
  {
    id: "controlled-testing",
    phase: "STAGE 04",
    status: "completed",
    dateLabel: { en: "Testing", ar: "الاختبار الميداني" },
    title: { en: "Medical & Retail Evaluation (95.3% Reported)", ar: "التقييم الطبي والتجاري (95.3%)" },
    version: "Evaluation",
    summary: {
      en: "Tested across controlled environments with 95.3% reported evaluation result.",
      ar: "اختبار النظام في بيئات مضبوطة بنتيجة تقييم مبلّغ عنها 95.3%.",
    },
    architectureNote: { en: "Methodology verification in progress.", ar: "توثيق المنهجية قيد الاستكمال." },
  },
  {
    id: "recognition-2026",
    phase: "STAGE 05",
    status: "completed",
    dateLabel: { en: "03 / 10 / 2026 · Istanbul", ar: "2026 · إسطنبول" },
    title: { en: "Second Place — Innovation Competition", ar: "المركز الثاني — مسابقة الابتكار" },
    version: "Award",
    summary: {
      en: "Awarded Second Place at the Innovation and Invention Conference in Istanbul.",
      ar: "الفوز بالمركز الثاني في مؤتمر الإبداع والابتكار بإسطنبول.",
    },
    architectureNote: { en: "Documented with official award evidence.", ar: "موثق بالشهادة والصور الرسمية." },
    image: {
      src: "/awards/stage-ceremony-2026.webp",
      alt: { en: "Istanbul award ceremony 2026", ar: "حفل التكريم في إسطنبول 2026" },
    },
  },
  {
    id: "pilot-productization",
    phase: "STAGE 06",
    status: "planned",
    dateLabel: { en: "Planned Next", ar: "المرحلة القادمة" },
    title: { en: "Benchmark Release & Pilot Readiness", ar: "توثيق المعايير وتجهيز التجارب" },
    version: "Planned",
    summary: {
      en: "Publishing formal benchmark breakdowns and hardening edge deployment for partner pilots.",
      ar: "نشر جداول القياس التفصيلية وتجهيز التجارب الميدانية.",
    },
    architectureNote: { en: "Planned milestone.", ar: "مرحلة مخططة مستقبلاً." },
  },
]);

export const ENGINEERING_CHALLENGES: readonly EngineeringChallenge[] = Object.freeze([
  {
    id: "false-positives",
    domain: { en: "RELIABILITY", ar: "الموثوقية" },
    title: { en: "Reducing Transient False Positives", ar: "تقليل التنبيهات الكاذبة" },
    problem: { en: "Single-frame detectors spike alerts on lighting flicker and brief shadows.", ar: "تتسبب التغيرات اللحظية في الإضاءة بإنذارات كاذبة." },
    decision: { en: "Require track persistence before promoting alerts.", ar: "اشتراط استمرارية المسار عبر الإطارات قبل التنبيه." },
    implementation: { en: "Scored multi-frame trajectories into MEDIUM (0.50) and HIGH (0.80) tiers.", ar: "تقييم المسارات المترابطة بدرجات خطورة متدرجة." },
    result: { en: "Operators review coherent tracked incidents with 80% match confidence.", ar: "مراجعة أحداث مترابطة بثقة أعلى وتقليل الضجيج." },
  },
  {
    id: "semantic-retrieval",
    domain: { en: "SPEED", ar: "السرعة" },
    title: { en: "Searching Thousands of Tracks Quickly", ar: "البحث السريع في آلاف المسارات" },
    problem: { en: "Manual timeline scrubbing fails when hundreds of events accumulate hourly.", ar: "المراجعة اليدوية للتسجيلات بطيئة أثناء الحوادث." },
    decision: { en: "Index tracks and matched scene concepts for semantic lookup.", ar: "فهرسة المسارات والمفاهيم للبحث باللغة الطبيعية." },
    implementation: { en: "Connected /semantic queries directly to backend event graphs.", ar: "ربط واجهة البحث الدلالي مباشرة بفهارس الخادم." },
    result: { en: "Evaluated 2,776 tracks and 169 events in 878.1 ms in live testing.", ar: "تقييم 2,776 مساراً و169 حدثاً في 878.1 مللي ثانية." },
  },
  {
    id: "stream-health",
    domain: { en: "STABILITY", ar: "الاستقرار" },
    title: { en: "Detecting Camera Dropouts Early", ar: "رصد انقطاع الكاميرات مبكراً" },
    problem: { en: "Silent stream dropouts can look indistinguishable from quiet scenes.", ar: "انقطاع البث قد يبدو كغياب للأحداث دون تنبيه." },
    decision: { en: "Track explicit per-camera live, degraded, and offline states.", ar: "مراقبة حالة الاتصال لكل كاميرا على حدة." },
    implementation: { en: "Synced Camera Wall heartbeat states with the voice status summary.", ar: "ربط فحص نبض الكاميرات بالتقرير الصوتي الفوري." },
    result: { en: "Degraded streams surface immediately before blind spots occur.", ar: "اكتشاف الكاميرات المتعطلة فوراً قبل تشكل فجوات المراقبة." },
  },
]);

export const PRODUCT_EVOLUTION_STAGES = Object.freeze([
  {
    stage: { en: "Research Prototype", ar: "النموذج الأولي" },
    status: "completed" as const,
    detail: { en: "Initial CV experiments & building analytics UI.", ar: "التجارب الأولى ولوحة التحليلات." },
  },
  {
    stage: { en: "Working System", ar: "النظام العامل" },
    status: "completed" as const,
    detail: { en: "Camera Wall, semantic search & AEGIS OS UI.", ar: "جدار الكاميرات والبحث الدلالي." },
  },
  {
    stage: { en: "Evaluation & Award", ar: "التقييم والتكريم" },
    status: "completed" as const,
    detail: { en: "Medical/retail tests, 95.3% figure, 2nd Place (2026).", ar: "الاختبارات الميدانية والمركز الثاني 2026." },
  },
  {
    stage: { en: "Benchmark Verification", ar: "توثيق المعايير" },
    status: "in-progress" as const,
    detail: { en: "Formalizing raw metrics & edge optimization.", ar: "توثيق المنهجية وتحسين الأداء." },
  },
  {
    stage: { en: "Pilot Readiness", ar: "جاهزية التجارب" },
    status: "planned" as const,
    detail: { en: "Structured partner pilots prior to commercial rollout.", ar: "التجارب المؤسسية قبل الإطلاق العام." },
  },
]);

export function getAegisCopy(locale: Locale) {
  return AEGIS_UI_COPY[locale];
}
