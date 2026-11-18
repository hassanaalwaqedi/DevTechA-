import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Code2,
  FileCheck2,
  FileText,
  Rocket,
} from "lucide-react";

const processStepsEn = [
  {
    step: "01",
    phase: "CONSULTATION",
    title: "Discovery Call (20–30 Min)",
    summary:
      "We review your operational bottleneck, business goals, existing systems, data constraints, and timeline with a senior systems engineer.",
    deliverable: "Deliverable: Bottleneck diagnosis & technical feasibility alignment",
    Icon: Calendar,
  },
  {
    step: "02",
    phase: "ARCHITECTURE & PROPOSAL",
    title: "Technical Blueprint & Commercial Proposal",
    summary:
      "We deliver a structured architecture brief defining system boundaries, tech stack, security model, milestone schedule, and transparent pricing.",
    deliverable: "Deliverable: Written system architecture & milestone proposal",
    Icon: FileText,
  },
  {
    step: "03",
    phase: "ONBOARDING & KICKOFF",
    title: "Contract, Security & Project Kickoff",
    summary:
      "We finalize the Statement of Work (SOW), NDA & IP ownership terms, access provisioning, repository setup, and weekly communication cadence.",
    deliverable: "Deliverable: Signed SOW, repository & staging environment setup",
    Icon: FileCheck2,
  },
  {
    step: "04",
    phase: "ITERATIVE DELIVERY",
    title: "Sprint Engineering & Staging Demos",
    summary:
      "Our engineers build your AI agents, automation pipelines, or custom platform in structured sprints with live staging demos and human-in-the-loop validation.",
    deliverable: "Deliverable: Tested production code & weekly staging reviews",
    Icon: Code2,
  },
  {
    step: "05",
    phase: "LAUNCH & SCALE",
    title: "Production Deployment, Handover & SLA",
    summary:
      "We deploy to your cloud or on-premise infrastructure with CI/CD pipelines, monitoring, full technical documentation, team training, and ongoing support.",
    deliverable: "Deliverable: Live system, documentation & operational handover",
    Icon: Rocket,
  },
] as const;

const processStepsAr = [
  {
    step: "01",
    phase: "الاستشارة الأولية",
    title: "جلسة الاكتشاف الهندسية (20–30 دقيقة)",
    summary:
      "نراجع معك التحدي التشغيلي، وأهداف العمل، والأنظمة الحالية، وقيود البيانات والوقت مباشرة مع مهندس أنظمة مختص.",
    deliverable: "المخرج: تشخيص التحدي التقني وتحديد الجدوى الهندسية",
    Icon: Calendar,
  },
  {
    step: "02",
    phase: "المعمارية والعرض الفني",
    title: "وثيقة المعمارية والعرض الفني والمالي",
    summary:
      "نعد وثيقة هندسية منظمة توضح معمارية النظام، والتقنيات المستخدمة، ونموذج الأمان، والجدول الزمني للمراحل، والتكلفة بشفافية.",
    deliverable: "المخرج: مخطط المعمارية وعرض فني ومالي مفصل بالمراحل",
    Icon: FileText,
  },
  {
    step: "03",
    phase: "التعاقد وانطلاق المشروع",
    title: "التعاقد، الأمان، وتهيئة بيئة العمل (Kickoff)",
    summary:
      "نعتمد نطاق العمل (SOW)، واتفاقية السرية وملكية الشيفرة المصدرية، وصلاحيات الوصول، ومستودعات الكود، وجدول الاجتماعات الأسبوعية.",
    deliverable: "المخرج: عقد واضح وبيئة تطوير واختبار جاهزة للعمل",
    Icon: FileCheck2,
  },
  {
    step: "04",
    phase: "التنفيذ الهندسي المرحلي",
    title: "التطوير البرمجي وعروض المراجعة الأسبوعية",
    summary:
      "نبني وكلاء الذكاء الاصطناعي أو مسارات الأتمتة أو المنصة البرمجية ضمن مراحل منتظمة مع عروض حية على بيئة الاختبار ومراجعة مستمرة.",
    deliverable: "المخرج: شيفرة برمجية مختبرة وعروض مراجعة مرحلية",
    Icon: Code2,
  },
  {
    step: "05",
    phase: "الإطلاق والدعم المستمر",
    title: "النشر في بيئة الإنتاج، التسليم، والدعم",
    summary:
      "نطلق النظام على بنيتك السحابية أو المحلية مع خطوط CI/CD، والتوثيق الفني الكامل، وتدريب فريقك، وخيارات الدعم والتطوير المستمر.",
    deliverable: "المخرج: نظام حي في الإنتاج وتوثيق كامل وتسليم تشغيلي",
    Icon: Rocket,
  },
] as const;

export function B2BProcessSection({ arabic = false }: { arabic?: boolean }) {
  const steps = arabic ? processStepsAr : processStepsEn;

  return (
    <section
      id="how-we-work"
      className="dt-b2b-process-section"
      aria-labelledby="dt-b2b-process-heading"
    >
      <div className="container">
        <div className="dt-b2b-section-head">
          <div>
            <span className="dt-section-eyebrow">
              {arabic
                ? "كيف نعمل · رحلة العميل من الاستشارة إلى الإطلاق"
                : "HOW WE WORK · TRANSPARENT CLIENT ONBOARDING"}
            </span>
            <h2 id="dt-b2b-process-heading" className="dt-section-title">
              {arabic
                ? "مسار هندسي واضح من الجلسة الأولى حتى تشغيل النظام."
                : "A predictable engineering process from first call to production."}
            </h2>
          </div>
          <p className="dt-b2b-section-subtitle">
            {arabic
              ? "لا وعود غامضة أو تعقيد غير مبرر: نلتزم بمنهجية تعاقد وتنفيذ شفافة تمنحك رؤية كاملة للمعمارية والمراحل والتسليم."
              : "No black-box delivery. Every engagement follows a structured five-stage lifecycle with written architecture specs, clear milestones, and full IP transparency."}
          </p>
        </div>

        <div className="dt-b2b-process-grid">
          {steps.map(({ step, phase, title, summary, deliverable, Icon }) => (
            <article key={step} className="dt-b2b-process-card">
              <div className="dt-b2b-process-top">
                <span className="dt-b2b-process-num">
                  {step} · {phase}
                </span>
                <span className="dt-b2b-process-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
              </div>
              <h3>{title}</h3>
              <p>{summary}</p>
              <div className="dt-b2b-process-deliverable">
                <CheckCircle2 size={15} />
                <span>{deliverable}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="dt-b2b-onboarding-bar">
          <div className="dt-b2b-onboarding-copy">
            <strong>
              {arabic
                ? "هل لديك متطلبات فنية جاهزة أو ترغب في مناقشة فكرتك أولاً؟"
                : "Ready to scope your system or already have a detailed requirements specification?"}
            </strong>
            <span>
              {arabic
                ? "اختر المسار الأنسب لمرحلة مشروعك الحالية."
                : "Choose the path that fits your current project stage."}
            </span>
          </div>
          <div className="dt-b2b-onboarding-actions">
            <Link href="#book-discovery" className="dt-btn dt-btn-primary">
              <span>{arabic ? "احجز جلسة اكتشاف" : "Book a Discovery Call"}</span>
              <ArrowUpRight size={17} />
            </Link>
            <Link href="/book?mode=proposal" className="dt-btn dt-btn-secondary">
              <span>{arabic ? "اطلب عرضاً فنياً ومالياً" : "Request a Proposal"}</span>
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
