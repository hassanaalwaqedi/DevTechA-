import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { ArrowUpRight, BrainCircuit, Eye } from "lucide-react";
import { getLocale } from "@/lib/locale";
import { getProductsResult } from "@/lib/db";
import { khairProduct, KHAIR_URL, type Product } from "@/lib/data";
import "./work.css";

export const metadata: Metadata = {title: "Our Work", description: "Explore DevTech AI's featured product and illustrative intelligent systems concepts."};


function PublishedPortfolio({products, arabic}: {products: Product[]; arabic: boolean}) {
  const projects = products.filter((product) => product.slug !== khairProduct.slug);
  if (!projects.length) return null;

  return <section className="work-portfolio-new" id="project-portfolio">
    <div className="container">
      <div className="work-portfolio-head">
        <div>
          <span className="work-kicker">{arabic ? "محفظة المشاريع / مباشرة" : "PROJECT PORTFOLIO / LIVE"}</span>
          <h2>{arabic ? <>أنظمة جديدة.<br/><span>أثر حقيقي.</span></> : <>New systems.<br/><span>Real momentum.</span></>}</h2>
        </div>
        <p>{arabic ? "كل منتج منشور من استوديو DevTech AI يظهر هنا تلقائياً، من الفكرة الأولى إلى المنصة الجاهزة." : "Every published product from the DevTech AI studio appears here automatically, from first concept to working platform."}</p>
      </div>
      <div className="work-project-grid">
        {projects.map((product, index) => <article className="work-project-card" key={product.slug}>
          <div className="work-project-media" style={{background: product.color}}>
            <div className="work-project-meta"><span>{String(index + 2).padStart(2, "0")}</span><span>{product.status}</span></div>
            {product.image ? <img src={product.image} alt={`${product.name} product preview`} loading="lazy"/> : <div className="work-project-placeholder" aria-hidden="true"><span>✦</span><i/><i/><i/></div>}
          </div>
          <div className="work-project-copy">
            <div>
              <span className="work-project-eyebrow">{product.eyebrow}</span>
              <h3>{product.name}</h3>
              <p dir="auto">{product.description}</p>
            </div>
            <div className="work-project-bottom">
              <div className="work-tags">{product.platform.map((platform) => <span key={platform}>{platform}</span>)}</div>
              <div className="work-project-actions">
                <Link href={`/products#${product.slug}`} className="work-text-link">{arabic ? "عرض المشروع" : "View project"} <ArrowUpRight size={15}/></Link>
                {product.launchUrl ? <a href={product.launchUrl} target="_blank" rel="noreferrer" className="work-text-link">{arabic ? "فتح المنصة" : "Open platform"} <ArrowUpRight size={15}/></a> : null}
              </div>
            </div>
          </div>
        </article>)}
      </div>
    </div>
  </section>;
}

export default async function WorkPage() {
  const [locale, result] = await Promise.all([getLocale(), getProductsResult()]);
  const ar = locale === "ar";
  const products = result.available ? result.products : [khairProduct];
  return <main className="work-new">
    <CompanyPageIntro
      eyebrow={ar ? "DEVTECH AI / أعمالنا" : "DEVTECH AI / OUR WORK"}
      title={ar ? "مشاريع ومنصات هندسية." : "Selected engineering work."}
      description={ar ? "استكشف المشاريع والمنصات التي نجمع فيها بين تصميم المنتجات وهندسة البرمجيات والأنظمة." : "Explore projects and platforms that bring product development, software engineering, and systems architecture together."}
      actionLabel={ar ? "المشروع المميز" : "View featured project"}
      actionHref="#featured-work"
      secondaryLabel={ar ? "ناقش مشروعك" : "Discuss your project"}
      secondaryHref="/contact"
      detailsTitle={ar ? "مجالات العمل" : "ENGINEERING DISCIPLINES"}
      details={ar ? ["تطوير المنصات والمنتجات","هندسة التطبيقات والخدمات","تكامل الأنظمة"] : ["Platform & product development","Application & service engineering","Systems integration"]}
    />
    <section className="work-feature-new" id="featured-work"><div className="container"><div className="work-feature-head"><div><span className="work-kicker">{ar ? "01 / منتج مميز" : "01 / FEATURED PLATFORM"}</span><h2>{ar ? <>التواصل يبدأ من <span>خير.</span></> : <>Bringing people together with <span>Khair.</span></>}</h2></div><p>{ar ? "منصة رقمية تتيح اكتشاف الفعاليات والانضمام إلى المجتمعات ومساعدة المنظمين على جمع الناس معاً." : "A digital platform for discovering events, joining communities, and helping organizers bring people together."}</p></div><article className="work-khair-card"><div className="work-khair-image"><Image src="/khair-discover.png" alt={ar ? "واجهة اكتشاف الفعاليات في منصة خير" : "Event discovery interface in the Khair platform"} fill sizes="(max-width: 850px) 100vw, 65vw"/><span>{ar ? "لقطة من واجهة المنصة" : "PLATFORM INTERFACE"}</span></div><div className="work-khair-copy"><div><div className="work-khair-label"><span>✳</span> {ar ? "هندسة المنتجات" : "PRODUCT ENGINEERING"}</div><h3>{ar ? "خير" : "Khair"}</h3><p>{ar ? "تربط خير بين الاكتشاف والمجتمعات والمنظمين ضمن تجربة رقمية متكاملة." : "Khair connects discovery, communities, and organizers in one digital experience."}</p></div><div className="work-khair-bottom"><div className="work-tags"><span>{ar ? "منصة رقمية" : "DIGITAL PLATFORM"}</span><span>{ar ? "الفعاليات والمجتمعات" : "EVENTS & COMMUNITY"}</span></div><a href={KHAIR_URL} target="_blank" rel="noreferrer" className="work-text-link">{ar ? "زيارة منصة خير" : "Visit Khair"} <ArrowUpRight size={16}/></a></div></div></article></div></section>
    <section className="work-ideas-new"><div className="container"><div className="work-ideas-head"><div><span className="work-kicker">{ar ? "02 / تصورات هندسية" : "02 / SYSTEMS WE'RE EXPLORING"}</span><h2>{ar ? <>المزيد من الأفكار.<br/><span>إمكانات أكبر.</span></> : <>More ideas.<br/><span>More possibilities.</span></>}</h2></div><p>{ar ? "هذه تصورات توضيحية لقدراتنا وليست دراسات حالة لمشاريع مؤكدة." : "These illustrative concepts show the kinds of systems we can explore together; they are not confirmed project case studies."}</p></div><div className="work-ideas-grid"><article className="work-idea-card work-idea-vision"><div className="work-idea-top"><span>{ar ? "تصوّر / الرؤية الحاسوبية" : "CONCEPT / COMPUTER VISION"}</span><Eye size={21}/></div><div className="work-idea-art work-idea-eye" aria-hidden="true"><i/><i/><i/><span>✳</span></div><div><h3>{ar ? "رؤية أوضح للعالم." : "A clearer view of the world."}</h3><p>{ar ? "تصور لأنظمة تجمع كشف الأجسام وتتبعها مع إشارات تساعد على فهم ما يحدث." : "An illustrative direction for systems that combine detection and tracking with useful event signals."}</p></div><Link href="/contact?category=Computer%20vision" className="work-text-link">{ar ? "ناقش الفكرة" : "Discuss this idea"} <ArrowUpRight size={15}/></Link></article><article className="work-idea-card work-idea-knowledge"><div className="work-idea-top"><span>{ar ? "تصوّر / أنظمة المعرفة" : "CONCEPT / KNOWLEDGE SYSTEMS"}</span><BrainCircuit size={21}/></div><div className="work-idea-art work-idea-nodes" aria-hidden="true"><i/><i/><i/><span>✳</span></div><div><h3>{ar ? "المعرفة حين نحتاجها." : "Knowledge when it matters."}</h3><p>{ar ? "تصور لهندسة الاسترجاع والنماذج اللغوية للوصول إلى المعرفة في سياقها المناسب." : "An illustrative direction for retrieval and language systems that bring knowledge into context."}</p></div><Link href="/contact?category=LLM%20%2F%20RAG%20systems" className="work-text-link">{ar ? "ناقش الفكرة" : "Discuss this idea"} <ArrowUpRight size={15}/></Link></article></div></div></section>
    <section className="work-vision-new"><div className="container work-vision-layout"><div><span className="work-kicker">{ar ? "03 / رؤيتنا" : "03 / OUR VISION"}</span><span className="work-vision-mark" aria-hidden="true">✳</span></div><div><h2>{ar ? <>نبني لما هو<br/><span>أبعد من الفكرة.</span></> : <>Build beyond<br/><span>the idea.</span></>}</h2><p>{ar ? "رؤيتنا هي الجمع بين التفكير التصميمي والهندسة الدقيقة لصنع منتجات وأنظمة مفيدة للناس في العالم الحقيقي." : "Our vision is to bring thoughtful design and precise engineering together to create products and systems that are useful to people in the real world."}</p><Link href="/about" className="work-text-link">{ar ? "تعرّف علينا" : "Get to know us"} <ArrowUpRight size={16}/></Link></div></div></section>
    <section className="work-next-new"><div className="container"><div><span className="work-kicker">{ar ? "لنجعل فكرتك واقعاً" : "LET'S MAKE YOUR IDEA REAL"}</span><h2>{ar ? <>مشروعك القادم؟<br/><span>لنبدأ معاً.</span></> : <>Your next idea?<br/><span>Let's build it.</span></>}</h2></div><Link href="/contact" className="work-primary-link">{ar ? "ناقش مشروعك" : "Discuss your project"}<span><ArrowUpRight size={17}/></span></Link></div></section>
    <PublishedPortfolio products={products} arabic={ar}/>
  </main>;
}
