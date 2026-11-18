import { z } from "zod";

export const DEMO_NODE_IDS = [
  "core",
  "api-gateway",
  "ai-agent",
  "rag-knowledge",
  "workflow-automation",
  "database-storage",
  "cloud-infra",
  "enterprise-integrations",
] as const;

export type DemoNodeId = (typeof DEMO_NODE_IDS)[number];

export const DEMO_SCENARIO_IDS = [
  "ai-agent",
  "business-automation",
  "enterprise-integration",
] as const;

export type DemoScenarioId = (typeof DEMO_SCENARIO_IDS)[number];

export const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(320),
  ar: z.string().trim().min(1).max(320),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const demoNodeSchema = z.object({
  id: z.enum(DEMO_NODE_IDS),
  enabled: z.boolean(),
  x: z.number().min(20).max(660),
  y: z.number().min(20).max(350),
  accent: z.enum(["blue", "violet", "cyan", "emerald"]),
  title: localizedTextSchema,
  shortLabel: localizedTextSchema,
  role: localizedTextSchema,
  description: localizedTextSchema,
  businessImpact: localizedTextSchema,
  techTags: z.array(z.string().trim().min(1).max(36)).max(6),
});

export type DemoNodeConfig = z.infer<typeof demoNodeSchema>;

export const demoConnectionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  from: z.enum(DEMO_NODE_IDS),
  to: z.enum(DEMO_NODE_IDS),
  enabled: z.boolean(),
  label: localizedTextSchema,
});

export type DemoConnectionConfig = z.infer<typeof demoConnectionSchema>;

export const demoStepSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: localizedTextSchema,
  detail: localizedTextSchema,
  fromNode: z.enum(DEMO_NODE_IDS),
  toNode: z.enum(DEMO_NODE_IDS),
  activeNodes: z.array(z.enum(DEMO_NODE_IDS)).min(1).max(8),
  simulatedDurationMs: z.number().int().min(10).max(5000),
});

export type DemoScenarioStep = z.infer<typeof demoStepSchema>;

export const demoScenarioSchema = z.object({
  id: z.enum(DEMO_SCENARIO_IDS),
  enabled: z.boolean(),
  title: localizedTextSchema,
  shortTab: localizedTextSchema,
  subtitle: localizedTextSchema,
  businessValue: localizedTextSchema,
  flowSummary: localizedTextSchema,
  steps: z.array(demoStepSchema).min(2).max(10),
});

export type DemoScenarioConfig = z.infer<typeof demoScenarioSchema>;

export const visualizationSettingsSchema = z.object({
  enabled: z.boolean(),
  defaultScenarioId: z.enum(DEMO_SCENARIO_IDS),
  animationSpeed: z.enum(["slow", "normal", "fast"]),
  backgroundEffectsEnabled: z.boolean(),
  showSimulationPanel: z.boolean(),
  showFloatingWidgets: z.boolean(),
  parallaxEnabled: z.boolean(),
  visualTheme: z.enum(["luminous-blue", "architectural-indigo", "vivid-violet"]),
  simulationBadge: localizedTextSchema,
});

export type VisualizationSettings = z.infer<typeof visualizationSettingsSchema>;

export const demoConfigSchema = z.object({
  version: z.literal(1),
  settings: visualizationSettingsSchema,
  nodes: z.array(demoNodeSchema).min(4).max(8),
  connections: z.array(demoConnectionSchema).min(4).max(24),
  scenarios: z.array(demoScenarioSchema).min(1).max(3),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
});

export type InteractiveDemoConfig = z.infer<typeof demoConfigSchema>;

export interface StoredDemoConfigEnvelope {
  draft: InteractiveDemoConfig;
  published: InteractiveDemoConfig;
  lastPublishedAt: string;
}

export function createDefaultDemoConfig(): InteractiveDemoConfig {
  return {
    version: 1,
    settings: {
      enabled: true,
      defaultScenarioId: "ai-agent",
      animationSpeed: "normal",
      backgroundEffectsEnabled: true,
      showSimulationPanel: true,
      showFloatingWidgets: true,
      parallaxEnabled: true,
      visualTheme: "luminous-blue",
      simulationBadge: {
        en: "Interactive Demo · Simulated Workflow",
        ar: "عرض تفاعلي · محاكاة هندسية",
      },
    },
    nodes: [
      {
        id: "core",
        enabled: true,
        x: 340,
        y: 185,
        accent: "blue",
        title: { en: "HIRZEXA Engineering Core", ar: "نواة HIRZEXA الهندسية" },
        shortLabel: { en: "HIRZEXA Core", ar: "نواة HIRZEXA" },
        role: { en: "Central Runtime & Routing Engine", ar: "محرك التوجيه والتنسيق المركزي" },
        description: {
          en: "Coordinates authentication, security policies, request routing, observability, and reliable message passing across every AI and software service.",
          ar: "تنسّق الصلاحيات وسياسات الأمان وتوجيه الطلبات والمراقبة بين جميع خدمات الذكاء الاصطناعي والأنظمة البرمجية بموثوقية عالية.",
        },
        businessImpact: {
          en: "Unifies fragmented systems into one auditable, scalable operational backbone.",
          ar: "توحّد الأنظمة المتفرقة في بنية تشغيلية واحدة قابلة للتدقيق والتوسع.",
        },
        techTags: ["TypeScript", "FastAPI", "Event Bus", "Zero-Trust Auth"],
      },
      {
        id: "api-gateway",
        enabled: true,
        x: 84,
        y: 185,
        accent: "cyan",
        title: { en: "API Gateway", ar: "بوابة الواجهات (API Gateway)" },
        shortLabel: { en: "API Gateway", ar: "بوابة API" },
        role: { en: "Secure Entry & Traffic Control", ar: "بوابة الدخول الآمنة والتحكم بالطلبات" },
        description: {
          en: "Validates client applications, web portals, webhooks, and partner requests with rate limiting, schema verification, and encrypted transport.",
          ar: "تتحقق من طلبات التطبيقات والمنصات والـ Webhooks مع حماية ضد الضغط الزائد وفحص دقة البيانات والتشفير الكامل.",
        },
        businessImpact: {
          en: "Protects internal systems while giving web, mobile, and B2B clients one fast entry point.",
          ar: "تحمي الأنظمة الداخلية وتوفر نقطة دخول موحدة وسريعة للويب والجوال وشركاء الأعمال.",
        },
        techTags: ["REST / GraphQL", "Rate Limiting", "OAuth2 / JWT"],
      },
      {
        id: "ai-agent",
        enabled: true,
        x: 205,
        y: 66,
        accent: "violet",
        title: { en: "AI Agent Orchestrator", ar: "منسّق وكلاء الذكاء الاصطناعي" },
        shortLabel: { en: "AI Agent", ar: "وكيل الذكاء" },
        role: { en: "Multi-Step Reasoning & Tool Calling", ar: "الاستدلال متعدد الخطوات واستدعاء الأدوات" },
        description: {
          en: "Plans multi-step tasks, selects verified enterprise tools, enforces output schemas, and escalates edge cases to human reviewers.",
          ar: "يخطط المهام متعددة الخطوات، ويستدعي الأدوات المؤسسية المعتمدة ضمن ضوابط صارمة مع تصعيد الحالات الحساسة للمراجعة البشرية.",
        },
        businessImpact: {
          en: "Automates complex cognitive workflows—from customer triage to technical research.",
          ar: "يؤتمت المهام المعرفية المعقدة من فرز طلبات العملاء إلى تحليل البيانات والوثائق.",
        },
        techTags: ["Multi-Agent", "LLM Tool Use", "Structured Output"],
      },
      {
        id: "rag-knowledge",
        enabled: true,
        x: 475,
        y: 66,
        accent: "violet",
        title: { en: "RAG / Knowledge Retrieval", ar: "استرجاع المعرفة (Enterprise RAG)" },
        shortLabel: { en: "RAG Knowledge", ar: "معرفة RAG" },
        role: { en: "Permission-Aware Enterprise Context", ar: "سياق مؤسسي مقيد بالصلاحيات" },
        description: {
          en: "Indexes SOPs, manuals, contracts, and product databases using hybrid vector + keyword retrieval with source citations.",
          ar: "يفهرس الوثائق والسياسات والعقود وقواعد المعرفة باستخدام البحث الهجين لتقديم إجابات دقيقة موثقة بالمصادر.",
        },
        businessImpact: {
          en: "Eliminates hallucinations by grounding every AI answer in your verified company data.",
          ar: "يمنع الإجابات غير الدقيقة عبر ربط الذكاء الاصطناعي بمصادر مؤسستك الموثقة فقط.",
        },
        techTags: ["Vector Search", "Hybrid RAG", "Source Citations"],
      },
      {
        id: "workflow-automation",
        enabled: true,
        x: 596,
        y: 185,
        accent: "emerald",
        title: { en: "Workflow Automation", ar: "محرك أتمتة العمليات" },
        shortLabel: { en: "Automation", ar: "الأتمتة" },
        role: { en: "Deterministic Business Pipelines", ar: "مسارات عمل وأتمتة موثوقة" },
        description: {
          en: "Executes scheduled and event-driven business workflows: document parsing, approvals, automated reporting, and retry-safe task queues.",
          ar: "ينفذ مسارات العمل الآلية المرتبطة بالأحداث: معالجة المستندات، الموافقات، التقارير الآلية، وقوائم المهام الموثوقة.",
        },
        businessImpact: {
          en: "Removes repetitive manual data entry across operations, finance, and customer teams.",
          ar: "يلغي العمل اليدوي المتكرر في فرق العمليات والمبيعات والمالية وخدمة العملاء.",
        },
        techTags: ["Event Queues", "Document AI", "Cron & Webhooks"],
      },
      {
        id: "database-storage",
        enabled: true,
        x: 205,
        y: 304,
        accent: "blue",
        title: { en: "Database & Storage", ar: "قواعد البيانات والتخزين" },
        shortLabel: { en: "Database", ar: "قواعد البيانات" },
        role: { en: "Transactional & Vector Persistence", ar: "التخزين العلائقي والبيانات الموثوقة" },
        description: {
          en: "Stores business state, relational records, audit logs, encrypted documents, and embeddings with strict row-level security.",
          ar: "يحفظ بيانات الأعمال والسجلات العلائقية وسجل التدقيق والمستندات المشفرة مع سياسات أمان صارمة على مستوى الصفوف.",
        },
        businessImpact: {
          en: "Guarantees data integrity, compliance auditability, and fast reporting at scale.",
          ar: "يضمن سلامة البيانات وقابلية التدقيق وسرعة استخراج التقارير مع نمو الأعمال.",
        },
        techTags: ["PostgreSQL", "Row-Level Security", "Encrypted Blobs"],
      },
      {
        id: "cloud-infra",
        enabled: true,
        x: 340,
        y: 320,
        accent: "cyan",
        title: { en: "Cloud Infrastructure", ar: "البنية التحتية السحابية" },
        shortLabel: { en: "Cloud & CI/CD", ar: "السحابة" },
        role: { en: "Scalable Containers & Deployment", ar: "الحاويات والنشر السحابي القابل للتوسع" },
        description: {
          en: "Runs containerized microservices with automated CI/CD pipelines, health checks, auto-scaling, and zero-downtime releases.",
          ar: "تشغّل الخدمات المصغرة داخل حاويات Docker مع خطوط CI/CD تلقائية ومراقبة مستمرة وتحديثات دون توقف للخدمة.",
        },
        businessImpact: {
          en: "Keeps mission-critical business software resilient, fast, and cost-efficient.",
          ar: "تضمن استمرارية برمجياتك الحيوية بأعلى أداء وموثوقية وكفاءة في التكلفة.",
        },
        techTags: ["Docker", "CI/CD Pipelines", "Cloud Native"],
      },
      {
        id: "enterprise-integrations",
        enabled: true,
        x: 475,
        y: 304,
        accent: "emerald",
        title: { en: "Enterprise Integrations", ar: "التكامل مع أنظمة المؤسسات" },
        shortLabel: { en: "Integrations", ar: "التكاملات" },
        role: { en: "CRM, ERP, Billing & Messaging Connectors", ar: "ربط أنظمة CRM وERP والفوترة والإشعارات" },
        description: {
          en: "Synchronizes data bi-directionally with CRMs, ERPs, payment gateways, email/WhatsApp services, and external SaaS APIs.",
          ar: "تزامن البيانات باتجاهين مع أنظمة CRM وERP وبوابات الدفع والبريد والمنصات الخارجية عبر موصلات برمجية آمنة.",
        },
        businessImpact: {
          en: "Connects the tools your team already relies on so data stays synchronized automatically.",
          ar: "تربط الأدوات التي يعتمد عليها فريقك بالفعل لضمان تزامن البيانات تلقائياً دون تدخل يدوي.",
        },
        techTags: ["CRM / ERP APIs", "Webhooks", "Calendar & Mail"],
      },
    ],
    connections: [
      { id: "c-gw-core", from: "api-gateway", to: "core", enabled: true, label: { en: "Ingress & Auth", ar: "دخول وتحقق" } },
      { id: "c-core-agent", from: "core", to: "ai-agent", enabled: true, label: { en: "Agent Dispatch", ar: "تشغيل الوكيل" } },
      { id: "c-agent-rag", from: "ai-agent", to: "rag-knowledge", enabled: true, label: { en: "Context Query", ar: "استعلام المعرفة" } },
      { id: "c-rag-core", from: "rag-knowledge", to: "core", enabled: true, label: { en: "Grounded Context", ar: "سياق موثق" } },
      { id: "c-agent-wf", from: "ai-agent", to: "workflow-automation", enabled: true, label: { en: "Tool Call", ar: "استدعاء أداة" } },
      { id: "c-core-wf", from: "core", to: "workflow-automation", enabled: true, label: { en: "Trigger Workflow", ar: "تشغيل الأتمتة" } },
      { id: "c-wf-db", from: "workflow-automation", to: "database-storage", enabled: true, label: { en: "Validate & Store", ar: "تحقق وحفظ" } },
      { id: "c-wf-int", from: "workflow-automation", to: "enterprise-integrations", enabled: true, label: { en: "CRM Sync", ar: "مزامنة CRM" } },
      { id: "c-core-db", from: "core", to: "database-storage", enabled: true, label: { en: "Transactional Query", ar: "استعلام البيانات" } },
      { id: "c-core-cloud", from: "core", to: "cloud-infra", enabled: true, label: { en: "Service Runtime", ar: "تشغيل سحابي" } },
      { id: "c-cloud-db", from: "cloud-infra", to: "database-storage", enabled: true, label: { en: "Managed Pool", ar: "اتصال قاعدة البيانات" } },
      { id: "c-core-int", from: "core", to: "enterprise-integrations", enabled: true, label: { en: "External Sync", ar: "تكامل خارجي" } },
      { id: "c-cloud-gw", from: "cloud-infra", to: "api-gateway", enabled: true, label: { en: "Response Edge", ar: "تسليم الاستجابة" } },
      { id: "c-int-gw", from: "enterprise-integrations", to: "api-gateway", enabled: true, label: { en: "Webhook Return", ar: "تأكيد الاستجابة" } },
    ],
    scenarios: [
      {
        id: "ai-agent",
        enabled: true,
        title: { en: "AI Agent Execution", ar: "تنفيذ وكيل الذكاء الاصطناعي" },
        shortTab: { en: "AI Agent Execution", ar: "وكيل الذكاء الاصطناعي" },
        subtitle: {
          en: "Watch how an enterprise AI agent receives a request, retrieves verified company knowledge, calls connected tools, and delivers a grounded response.",
          ar: "شاهد كيف يستقبل وكيل الذكاء الاصطناعي الطلب، ويسترجع المعرفة المؤسسية الموثقة، ويستدعي الأدوات المرتبطة، ثم يعيد استجابة دقيقة.",
        },
        businessValue: {
          en: "Turns internal documentation and operational tools into an instant, permission-aware AI assistant.",
          ar: "يحوّل وثائق المؤسسة وأدواتها التشغيلية إلى مساعد ذكي فوري مقيد بالصلاحيات.",
        },
        flowSummary: {
          en: "User Request → AI Agent → Knowledge Retrieval → Tool Execution → Response",
          ar: "طلب المستخدم ← وكيل الذكاء ← استرجاع المعرفة ← تنفيذ الأداة ← الاستجابة",
        },
        steps: [
          {
            id: "ai-1",
            label: { en: "Request Received", ar: "استلام الطلب" },
            detail: {
              en: "User request enters the API Gateway, passes auth & schema validation, and routes to the HIRZEXA Core.",
              ar: "يدخل طلب المستخدم عبر بوابة API، ويمر بالتحقق الأمني ثم يُوجّه إلى نواة HIRZEXA.",
            },
            fromNode: "api-gateway",
            toNode: "core",
            activeNodes: ["api-gateway", "core"],
            simulatedDurationMs: 120,
          },
          {
            id: "ai-2",
            label: { en: "Agent Orchestrated", ar: "تنسيق وكيل الذكاء" },
            detail: {
              en: "The AI Agent Orchestrator classifies intent and plans the required retrieval and tool steps.",
              ar: "يحلل منسّق الوكيل هدف الطلب ويحدد خطوات استرجاع المعرفة والأدوات المطلوبة.",
            },
            fromNode: "core",
            toNode: "ai-agent",
            activeNodes: ["core", "ai-agent"],
            simulatedDurationMs: 240,
          },
          {
            id: "ai-3",
            label: { en: "Knowledge Retrieved", ar: "استرجاع المعرفة (RAG)" },
            detail: {
              en: "Enterprise RAG fetches permission-filtered policy and technical passages with exact source citations.",
              ar: "يسترجع نظام RAG الفقرات المعتمدة من وثائق الشركة مع ربطها بالمصادر الرسمية.",
            },
            fromNode: "ai-agent",
            toNode: "rag-knowledge",
            activeNodes: ["ai-agent", "rag-knowledge"],
            simulatedDurationMs: 310,
          },
          {
            id: "ai-4",
            label: { en: "Tool Called", ar: "استدعاء الأداة والتنفيذ" },
            detail: {
              en: "The agent invokes an approved workflow tool to verify live records or trigger an action.",
              ar: "يستدعي الوكيل أداة معتمدة في محرك الأتمتة للتحقق من البيانات أو تنفيذ الإجراء.",
            },
            fromNode: "ai-agent",
            toNode: "workflow-automation",
            activeNodes: ["ai-agent", "workflow-automation", "enterprise-integrations"],
            simulatedDurationMs: 280,
          },
          {
            id: "ai-5",
            label: { en: "Response Generated", ar: "توليد الاستجابة الموثقة" },
            detail: {
              en: "Structured, source-grounded output returns through the Engineering Core and API Gateway.",
              ar: "تُصاغ استجابة منظمة وموثقة بالمصادر وتعود عبر النواة الهندسية وبوابة API.",
            },
            fromNode: "core",
            toNode: "api-gateway",
            activeNodes: ["core", "api-gateway"],
            simulatedDurationMs: 190,
          },
          {
            id: "ai-6",
            label: { en: "Execution Completed", ar: "اكتمال التنفيذ وتسجيل التدقيق" },
            detail: {
              en: "Execution trace and audit record are persisted cleanly in Database & Storage.",
              ar: "يُحفظ سجل التنفيذ والتدقيق بأمان في قواعد البيانات والتخزين.",
            },
            fromNode: "core",
            toNode: "database-storage",
            activeNodes: ["core", "database-storage"],
            simulatedDurationMs: 95,
          },
        ],
      },
      {
        id: "business-automation",
        enabled: true,
        title: { en: "Business Automation", ar: "أتمتة العمليات التجارية" },
        shortTab: { en: "Business Automation", ar: "أتمتة العمليات" },
        subtitle: {
          en: "See how a customer inquiry triggers automated validation, CRM synchronization, and stakeholder notifications with zero manual copy-pasting.",
          ar: "شاهد كيف يحوّل استفسار العميل إلى مسار أتمتة متكامل يشمل التحقق وتحديث CRM والإشعارات دون أي إدخال يدوي.",
        },
        businessValue: {
          en: "Eliminates repetitive manual operations and ensures every lead or order is processed consistently.",
          ar: "يلغي العمليات اليدوية المتكررة ويضمن معالجة كل طلب أو عميل بدقة وسرعة ثابتة.",
        },
        flowSummary: {
          en: "Customer Inquiry → Workflow Trigger → Validation → CRM Update → Notification → Completed",
          ar: "استفسار العميل ← تشغيل الأتمتة ← التحقق ← تحديث CRM ← الإشعار ← مكتمل",
        },
        steps: [
          {
            id: "auto-1",
            label: { en: "Customer Inquiry", ar: "استقبال استفسار العميل" },
            detail: {
              en: "An inbound inquiry or form submission arrives through the API Gateway with anti-spam verification.",
              ar: "يصل استفسار العميل أو طلبه عبر بوابة API مع فحص الحماية من الرسائل المزعجة.",
            },
            fromNode: "api-gateway",
            toNode: "core",
            activeNodes: ["api-gateway", "core"],
            simulatedDurationMs: 110,
          },
          {
            id: "auto-2",
            label: { en: "Workflow Trigger", ar: "تشغيل مسار الأتمتة" },
            detail: {
              en: "HIRZEXA Core dispatches the structured event to the Workflow Automation engine.",
              ar: "تُرسل نواة HIRZEXA الحدث المنظم فوراً إلى محرك أتمتة العمليات.",
            },
            fromNode: "core",
            toNode: "workflow-automation",
            activeNodes: ["core", "workflow-automation"],
            simulatedDurationMs: 160,
          },
          {
            id: "auto-3",
            label: { en: "Validation", ar: "التحقق وهيكلة البيانات" },
            detail: {
              en: "Rules engine checks required fields, deduplicates records, and stores a verified lead snapshot.",
              ar: "يتحقق المحرك من الحقول المطلوبة ويمنع التكرار ويحفظ السجل الموثق في قاعدة البيانات.",
            },
            fromNode: "workflow-automation",
            toNode: "database-storage",
            activeNodes: ["workflow-automation", "database-storage"],
            simulatedDurationMs: 210,
          },
          {
            id: "auto-4",
            label: { en: "CRM Update", ar: "تحديث نظام CRM" },
            detail: {
              en: "Connected enterprise integration creates or updates the CRM pipeline stage and owner assignment.",
              ar: "يقوم موصل التكامل المؤسسي بإنشاء وتحديث مرحلة العميل وتعيين المسؤول تلقائياً في CRM.",
            },
            fromNode: "workflow-automation",
            toNode: "enterprise-integrations",
            activeNodes: ["workflow-automation", "enterprise-integrations"],
            simulatedDurationMs: 260,
          },
          {
            id: "auto-5",
            label: { en: "Notification", ar: "إرسال الإشعارات والتأكيد" },
            detail: {
              en: "Cloud workers dispatch confirmation emails, calendar invites, and internal team alerts.",
              ar: "ترسل الخدمات السحابية رسائل التأكيد ودعوات التقويم وتنبيهات الفريق الداخلي تلقائياً.",
            },
            fromNode: "core",
            toNode: "cloud-infra",
            activeNodes: ["core", "cloud-infra", "enterprise-integrations"],
            simulatedDurationMs: 185,
          },
          {
            id: "auto-6",
            label: { en: "Completed", ar: "اكتمال المسار بنجاح" },
            detail: {
              en: "Confirmation reference returns cleanly to the customer interface with full audit status.",
              ar: "تُعاد رسالة التأكيد والرقم المرجعي لواجهة العميل مع حفظ حالة الإنجاز كاملة.",
            },
            fromNode: "cloud-infra",
            toNode: "api-gateway",
            activeNodes: ["cloud-infra", "api-gateway"],
            simulatedDurationMs: 90,
          },
        ],
      },
      {
        id: "enterprise-integration",
        enabled: true,
        title: { en: "Enterprise Software Integration", ar: "تكامل الأنظمة البرمجية للمؤسسات" },
        shortTab: { en: "Enterprise Integration", ar: "تكامل الأنظمة" },
        subtitle: {
          en: "Explore how custom applications, backend microservices, relational databases, and third-party enterprise APIs exchange data reliably.",
          ar: "اكتشف كيف تتواصل تطبيقات المؤسسة والخدمات الخلفية وقواعد البيانات والأنظمة الخارجية بتكامل آمن وسريع.",
        },
        businessValue: {
          en: "Connects custom SaaS platforms with legacy ERPs, billing, and partner systems without brittle glue code.",
          ar: "يربط منصاتك البرمجية المخصصة بأنظمة ERP والفوترة والشركاء دون حلول مؤقتة هشة.",
        },
        flowSummary: {
          en: "Application → API Gateway → Backend Services → Database → External Integration → Response",
          ar: "التطبيق ← بوابة API ← الخدمات الخلفية ← قاعدة البيانات ← التكامل الخارجي ← الاستجابة",
        },
        steps: [
          {
            id: "ent-1",
            label: { en: "Application Request", ar: "طلب من التطبيق المؤسسي" },
            detail: {
              en: "A custom web or SaaS portal sends an authenticated business transaction to the API Gateway.",
              ar: "يرسل تطبيق الويب أو منصة SaaS معاملة عمل موثقة إلى بوابة الواجهات البرمجية.",
            },
            fromNode: "api-gateway",
            toNode: "core",
            activeNodes: ["api-gateway", "core"],
            simulatedDurationMs: 105,
          },
          {
            id: "ent-2",
            label: { en: "Backend Services", ar: "معالجة الخدمات الخلفية" },
            detail: {
              en: "Containerized backend microservices in Cloud Infrastructure apply domain logic and access rules.",
              ar: "تطبق الخدمات المصغرة على السحابة منطق الأعمال وقواعد الصلاحيات والأمان.",
            },
            fromNode: "core",
            toNode: "cloud-infra",
            activeNodes: ["core", "cloud-infra"],
            simulatedDurationMs: 175,
          },
          {
            id: "ent-3",
            label: { en: "Database Sync", ar: "الاستعلام والتخزين العلائقي" },
            detail: {
              en: "Transactional PostgreSQL queries commit validated records with row-level isolation.",
              ar: "تنفذ قواعد بيانات PostgreSQL المعاملة وتؤكد حفظ السجلات بعزل أمني كامل.",
            },
            fromNode: "cloud-infra",
            toNode: "database-storage",
            activeNodes: ["cloud-infra", "database-storage"],
            simulatedDurationMs: 150,
          },
          {
            id: "ent-4",
            label: { en: "External Integration", ar: "التكامل مع الأنظمة الخارجية" },
            detail: {
              en: "Idempotent API connectors synchronize invoices, inventory, or telemetry with third-party platforms.",
              ar: "تزامن الموصلات البرمجية الفواتير أو المخزون أو البيانات مع الأنظمة الخارجية دون تكرار.",
            },
            fromNode: "core",
            toNode: "enterprise-integrations",
            activeNodes: ["core", "enterprise-integrations"],
            simulatedDurationMs: 290,
          },
          {
            id: "ent-5",
            label: { en: "Response Returned", ar: "تسليم الاستجابة الموحدة" },
            detail: {
              en: "Unified JSON payload returns through the API Gateway to update the client application in real time.",
              ar: "تعود استجابة موحدة عبر بوابة API لتحديث واجهة التطبيق للمستخدم في الوقت الفعلي.",
            },
            fromNode: "enterprise-integrations",
            toNode: "api-gateway",
            activeNodes: ["enterprise-integrations", "core", "api-gateway"],
            simulatedDurationMs: 115,
          },
        ],
      },
    ],
    updatedAt: "2026-11-19T00:00:00.000Z",
    updatedBy: "System Default",
  };
}
