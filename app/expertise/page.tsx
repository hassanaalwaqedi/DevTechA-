import type { Metadata } from "next";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { ArrowUpRight, BrainCircuit, Eye, FlaskConical, Network, ServerCog, Sparkles } from "lucide-react";
import { getLocale } from "@/lib/locale";
import "./expertise.css";

export const metadata: Metadata = {title: "Expertise", description: "Explore DevTech AI's model engineering, computer vision, language systems, AI infrastructure, and intelligent backend expertise."};


export default async function ExpertisePage() {
  const ar = await getLocale() === "ar";
  const capabilities = ar ? [
    ["model", "01", "هندسة نماذج الذكاء الاصطناعي", "نصمم النماذج ونكيّفها وندربها ونقيّمها وفق المهمة والبيانات وقيود التشغيل.", ["تطوير النماذج", "التدريب والتكييف", "التقييم"], BrainCircuit],
    ["vision", "02", "الرؤية الحاسوبية", "نحوّل الصور والفيديو إلى إشارات مفيدة من خلال كشف الأجسام وتتبعها وتحليل المشاهد.", ["الكشف", "التتبع", "تحليل الفيديو"], Eye],
    ["language", "03", "الأنظمة اللغوية والتوليدية", "نبني أنظمة تجمع الاسترجاع والنماذج اللغوية والوكلاء مع تقييم وحدود واضحة للاستخدام.", ["الاسترجاع المعزز", "النماذج اللغوية", "الوكلاء"], Sparkles],
    ["infrastructure", "04", "البنية التحتية للذكاء الاصطناعي", "نربط تشغيل النماذج وخدمات البيانات والمراقبة والنشر في بنية قابلة للإدارة والتطوير.", ["تشغيل النماذج", "المراقبة", "عمليات التعلم الآلي"], ServerCog],
    ["systems", "05", "معمارية الأنظمة الخلفية", "نصمم واجهات برمجية وتدفقات بيانات وأنظمة موزعة تربط الذكاء بالمنتج وسير العمل.", ["واجهات برمجية", "البيانات", "أنظمة موزعة"], Network],
    ["research", "06", "البحث والنماذج الأولية", "نختبر الجدوى ونقارن المناهج ونبني نماذج أولية توضح المسار من الفكرة إلى التطبيق.", ["الجدوى", "التجارب", "النماذج الأولية"], FlaskConical],
  ] as const : [
    ["model", "01", "AI model engineering", "We design, adapt, train, and evaluate models around the task, data, and operational constraints.", ["Model development", "Training & adaptation", "Evaluation"], BrainCircuit],
    ["vision", "02", "Computer vision", "We turn images and video into useful signals through object detection, tracking, and scene analysis.", ["Detection", "Tracking", "Video analytics"], Eye],
    ["language", "03", "Language & generative systems", "We bring retrieval, language models, and agents together with evaluation and clear boundaries for use.", ["Retrieval", "Language models", "Agents"], Sparkles],
    ["infrastructure", "04", "AI infrastructure", "We connect model serving, data services, monitoring, and deployment in systems built to evolve.", ["Model serving", "Observability", "MLOps"], ServerCog],
    ["systems", "05", "Backend architecture", "We design APIs, data flows, and distributed services that connect intelligence to products and workflows.", ["APIs", "Data pipelines", "Distributed systems"], Network],
    ["research", "06", "Research & prototyping", "We test feasibility, compare approaches, and build prototypes that clarify the path from idea to application.", ["Feasibility", "Experimentation", "Prototyping"], FlaskConical],
  ] as const;

  return <main className="expertise-new">
    <CompanyPageIntro
      eyebrow={ar ? "DEVTECH AI / الخبرات التقنية" : "DEVTECH AI / TECHNICAL EXPERTISE"}
      title={ar ? "خبرات هندسة الذكاء الاصطناعي." : "AI engineering capabilities."}
      description={ar ? "نطوّر النماذج وأنظمة الرؤية الحاسوبية والأنظمة اللغوية، ونربطها بالبيانات والبرمجيات والبنية التحتية." : "Model development, computer vision, and language systems, connected to the data, software, and infrastructure they need to operate."}
      actionLabel={ar ? "استكشف الخبرات" : "Explore capabilities"}
      actionHref="#capabilities"
      secondaryLabel={ar ? "منهجنا الهندسي" : "Our engineering practice"}
      secondaryHref="/engineering"
      detailsTitle={ar ? "التخصصات الأساسية" : "CORE DISCIPLINES"}
      details={ar ? ["هندسة النماذج والتقييم","الرؤية الحاسوبية والأنظمة اللغوية","البيانات والاستدلال والأنظمة الخلفية"] : ["Model engineering & evaluation","Computer vision & language systems","Data, inference & backend infrastructure"]}
    />
    <section className="expertise-capabilities-new" id="capabilities"><div className="container"><div className="expertise-capabilities-head"><div><span className="expertise-kicker">{ar ? "01 / ما نبنيه" : "01 / WHAT WE BUILD"}</span><h2>{ar ? <>الذكاء في كل <span>طبقة.</span></> : <>Intelligence in every <span>layer.</span></>}</h2></div><p>{ar ? "خبرات مترابطة لتحويل التحديات المعقدة إلى أنظمة ذكية مدروسة." : "Connected disciplines for turning complex challenges into thoughtful intelligent systems."}</p></div><div className="expertise-capability-grid">{capabilities.map(([id, number, title, description, tags, Icon]) => <article id={id} key={id} className={`expertise-capability-card expertise-card-${number}`}><div className="expertise-card-top"><span>{number} / DEVTECH AI</span><span className="expertise-card-icon"><Icon size={21}/></span></div><div className="expertise-card-content"><h3>{title}</h3><p>{description}</p><div className="expertise-card-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><div className="expertise-card-art" aria-hidden="true"><i/><i/><i/></div></article>)}</div></div></section>
    <section className="expertise-vision-new"><div className="container expertise-vision-layout"><div><span className="expertise-kicker">{ar ? "02 / رؤيتنا الهندسية" : "02 / OUR ENGINEERING VISION"}</span><div className="expertise-vision-mark" aria-hidden="true">✳</div></div><div><h2>{ar ? <>لا نكتفي ببناء نموذج.<br/><span>نبني ما يجعله مفيداً.</span></> : <>A model is only the start.<br/><span>We build what makes it useful.</span></>}</h2><p>{ar ? "رؤيتنا هي أن يعمل الذكاء الاصطناعي بانسجام مع البيانات والناس والأنظمة، ليصبح جزءاً موثوقاً من المنتج والعالم الحقيقي." : "Our vision is for AI to work in harmony with data, people, and systems—becoming a dependable part of the product and the real world."}</p><Link href="/engineering" className="expertise-text-link">{ar ? "اكتشف كيف نعمل" : "Discover how we work"} <ArrowUpRight size={16}/></Link></div></div></section>
    <section className="expertise-next-new"><div className="container"><div><span className="expertise-kicker">{ar ? "لنصنع شيئاً مهماً" : "LET'S MAKE SOMETHING MATTER"}</span><h2>{ar ? <>لديك فكرة كبيرة؟<br/><span>لنبدأ من هنا.</span></> : <>Have a big idea?<br/><span>Let's start here.</span></>}</h2></div><Link href="/contact" className="expertise-primary-link">{ar ? "ناقش مشروعك" : "Discuss your project"}<span><ArrowUpRight size={17}/></span></Link></div></section>
  </main>;
}
