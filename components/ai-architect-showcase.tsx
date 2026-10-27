import Link from "next/link";
import { ArrowUpRight, Cpu, GitBranch, Network, Sparkles } from "lucide-react";

export function AiArchitectShowcase({arabic = false}: {arabic?: boolean}) {
  const copy = arabic ? {
    eyebrow: "ذكاء ديف تك", title: "فكرتك الكبيرة القادمة تبدأ بهندسة ذكية.",
    description: "حوّل تحدي عملك إلى مخطّط هندسي منظم. يساعدك معماري حلول الذكاء الاصطناعي على استكشاف التقنيات، وتحديد المتطلبات، وتصميم أسس نظامك الذكي القادم.",
    launch: "ابدأ مع معماري الذكاء", how: "اكتشف كيف يعمل", input: "تحدي العمل", process: "تحليل هندسي", output: "مخطّط تقني",
    prompt: "صف الفكرة والبيانات والقيود…", analysing: "تحليل المتطلبات", architecture: "تصميم البنية", risks: "تحديد المخاطر", ready: "الموجز جاهز للمراجعة",
  } : {
    eyebrow: "DEVTECH INTELLIGENCE", title: "Your Next Big Idea Starts With Intelligent Engineering.",
    description: "Turn your business challenge into a structured engineering blueprint. Our AI Solutions Architect helps you explore technologies, define requirements, and design the foundations of your next intelligent system.",
    launch: "Launch AI Architect", how: "See How It Works", input: "Business challenge", process: "Engineering analysis", output: "Technical blueprint",
    prompt: "Describe the idea, data, and constraints…", analysing: "Requirements analysis", architecture: "Architecture design", risks: "Risk discovery", ready: "Brief ready for review",
  };
  return <section className="home-ai-architect" aria-labelledby="home-ai-title"><div className="container home-ai-grid"><div className="home-ai-copy"><div className="home-ai-eyebrow"><Sparkles size={14}/>{copy.eyebrow}</div><h2 id="home-ai-title">{copy.title}</h2><p>{copy.description}</p><div className="home-ai-actions"><Link href="/ai-architect" className="home-ai-primary">{copy.launch}<span><ArrowUpRight size={18}/></span></Link><Link href="/ai-architect#how-it-works" className="home-ai-secondary">{copy.how}<ArrowUpRight size={14}/></Link></div><div className="home-ai-flow" aria-label={arabic ? "مسار إنشاء الموجز التقني" : "Technical brief workflow"}><span>{copy.input}</span><i>→</i><span>{copy.process}</span><i>→</i><span>{copy.output}</span></div></div><div className="home-ai-preview" aria-hidden="true"><div className="home-ai-preview-top"><span><i/>AI ARCHITECT / LIVE</span><Sparkles size={16}/></div><div className="home-ai-prompt"><span>{copy.prompt}</span><ArrowUpRight size={15}/></div><div className="home-ai-nodes"><div><Network size={17}/><span>{copy.analysing}</span><b>01</b></div><div><GitBranch size={17}/><span>{copy.architecture}</span><b>02</b></div><div><Cpu size={17}/><span>{copy.risks}</span><b>03</b></div></div><div className="home-ai-ready"><span className="home-ai-pulse"/><span>{copy.ready}</span><strong>100%</strong></div><div className="home-ai-orbit home-ai-orbit-one"/><div className="home-ai-orbit home-ai-orbit-two"/></div></div></section>;
}
