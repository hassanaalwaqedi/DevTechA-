import type { Metadata } from "next";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { ArrowUpRight, BrainCircuit, Eye, Network, Sparkles } from "lucide-react";
import { getLocale } from "@/lib/locale";
import "./solutions.css";

export const metadata: Metadata = {title: "Solutions", description: "Explore DevTech AI solutions for visual intelligence, knowledge systems, AI-powered products, and inference infrastructure."};


export default async function SolutionsPage() {
  const ar = await getLocale() === "ar";
  const solutions = ar ? [
    ["01", "الإدراك الذكي", "أنظمة ترى وتفهم.", "نصمم حلول الرؤية الحاسوبية التي تحوّل الصور والفيديو إلى إشارات مفيدة، من الكشف والتتبع إلى تحليل الأحداث.", ["الرؤية الحاسوبية", "التتبع", "تحليل الفيديو"], "Computer vision", Eye],
    ["02", "ذكاء المعرفة", "المعرفة في السياق المناسب.", "نربط معلومات المؤسسة بأنظمة الاسترجاع والنماذج اللغوية لمساعدة الفرق على الوصول إلى المعرفة وفهمها.", ["الاسترجاع المعزز", "النماذج اللغوية", "التقييم"], "LLM / RAG systems", BrainCircuit],
    ["03", "منتجات مدعومة بالذكاء", "منتجات تفكر مع المستخدم.", "نجمع الذكاء الاصطناعي والبرمجيات وسير العمل البشري في تجارب مصممة لتناسب احتياجات واقعية.", ["الوكلاء", "هندسة المنتجات", "التكامل"], "Other technical challenge", Sparkles],
    ["04", "التشغيل والبنية التحتية", "من النموذج إلى العمل.", "نبني مساراً لتشغيل النماذج وربطها بالخدمات ومراقبة أدائها، مع مراعاة الموثوقية والقدرة على التطور.", ["تشغيل النماذج", "المراقبة", "البنية التحتية"], "AI infrastructure & MLOps", Network],
  ] as const : [
    ["01", "Intelligent perception", "Systems that see and understand.", "We design computer vision solutions that turn images and video into useful signals, from detection and tracking to event analysis.", ["Computer vision", "Tracking", "Video analytics"], "Computer vision", Eye],
    ["02", "Knowledge intelligence", "The right knowledge, in context.", "We connect organizational information with retrieval and language systems to help teams find and understand what matters.", ["Retrieval", "Language models", "Evaluation"], "LLM / RAG systems", BrainCircuit],
    ["03", "AI-powered products", "Products that think with people.", "We bring AI, software, and human workflows together in experiences designed around real needs.", ["Agents", "Product engineering", "Integration"], "Other technical challenge", Sparkles],
    ["04", "Inference & infrastructure", "From model to working system.", "We build a path to serving models, connecting services, and monitoring performance with reliability and evolution in mind.", ["Model serving", "Monitoring", "Infrastructure"], "AI infrastructure & MLOps", Network],
  ] as const;

  return <main className="solutions-new">
    <CompanyPageIntro
      eyebrow={ar ? "DEVTECH AI / الحلول" : "DEVTECH AI / SOLUTIONS"}
      title={ar ? "أنظمة ذكاء اصطناعي لمتطلبات واقعية." : "AI systems for operational challenges."}
      description={ar ? "نصمم الأنظمة حول البيانات وسير العمل والقرارات التي تحتاج إلى دعمها، مع متطلبات تكامل وتقييم واضحة." : "We design around the data, workflows, and decisions a system needs to support, with explicit requirements for integration and evaluation."}
      actionLabel={ar ? "استكشف الحلول" : "Explore solutions"}
      actionHref="#solutions"
      secondaryLabel={ar ? "ناقش مشروعك" : "Discuss your project"}
      secondaryHref="/contact"
      detailsTitle={ar ? "مجالات التطبيق" : "APPLICATION AREAS"}
      details={ar ? ["التحليل البصري","المعرفة والأنظمة اللغوية","سير العمل والخدمات الذكية"] : ["Visual analysis","Knowledge & language systems","Intelligent workflows & services"]}
    />
    <section className="solutions-areas-new" id="solutions"><div className="container"><div className="solutions-areas-head"><div><span className="solutions-kicker">{ar ? "01 / كيف يمكننا المساعدة" : "01 / HOW WE CAN HELP"}</span><h2>{ar ? <>ذكاء يلتقي <span>بالواقع.</span></> : <>Where intelligence meets <span>real life.</span></>}</h2></div><p>{ar ? "كل حل يبدأ بسؤال مهم، ثم يتشكل حول ما يحتاج إلى تحقيقه فعلاً." : "Every solution starts with a meaningful question, then takes shape around what it needs to accomplish."}</p></div><div className="solutions-area-grid">{solutions.map(([number, label, title, description, tags, category, Icon]) => <article key={number} className={`solutions-area-card solutions-area-${number}`}><div className="solutions-area-top"><span>{number} / {label}</span><span className="solutions-area-icon"><Icon size={21}/></span></div><div className="solutions-area-content"><h3>{title}</h3><p>{description}</p><div className="solutions-area-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><Link href={`/contact?category=${encodeURIComponent(category)}`} className="solutions-area-link">{ar ? "ناقش الفكرة" : "Discuss this idea"} <ArrowUpRight size={15}/></Link><div className="solutions-area-art" aria-hidden="true"><i/><i/><i/></div></article>)}</div></div></section>
    <section className="solutions-vision-new"><div className="container solutions-vision-layout"><div><span className="solutions-kicker">{ar ? "02 / رؤيتنا" : "02 / OUR VISION"}</span><div className="solutions-vision-mark" aria-hidden="true">✳</div></div><div><h2>{ar ? <>نبدأ بالتحدي.<br/><span>ونبني لما هو أبعد.</span></> : <>Start with the challenge.<br/><span>Build for what comes next.</span></>}</h2><p>{ar ? "رؤيتنا هي جعل الذكاء الاصطناعي مفيداً في الحياة العملية: أنظمة تتكامل مع الأشخاص والبيانات وسير العمل، وتستمر في التطور." : "Our vision is to make AI useful in practice: systems that fit the people, data, and workflows around them—and keep evolving."}</p><Link href="/engineering" className="solutions-text-link">{ar ? "اكتشف كيف نعمل" : "Discover how we work"} <ArrowUpRight size={16}/></Link></div></div></section>
    <section className="solutions-next-new"><div className="container"><div><span className="solutions-kicker">{ar ? "لنجعل فكرتك واقعاً" : "LET'S MAKE YOUR IDEA REAL"}</span><h2>{ar ? <>لديك تحدٍ كبير؟<br/><span>لنبدأ الحديث.</span></> : <>Have a big challenge?<br/><span>Let's talk.</span></>}</h2></div><Link href="/contact" className="solutions-primary-link">{ar ? "ناقش مشروعك" : "Discuss your project"}<span><ArrowUpRight size={17}/></span></Link></div></section>
  </main>;
}
