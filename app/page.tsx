import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { EngineeringLifecycle } from "@/components/engineering-lifecycle";
import { ArchitectureDiagram, ModelDiagram } from "@/components/technical-visuals";
import { IntelligenceCore } from "@/components/intelligence-core";
import { SystemsShowcase } from "@/components/systems-showcase";
import { HowWeWork } from "@/components/how-we-work";
import { ArabicHome } from "@/components/arabic-home";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "AI Engineering & Intelligent Systems", description: "Custom AI models, computer vision, scalable inference infrastructure, and intelligent systems engineered for real-world complexity." };

export default async function Home() {
  if (await getLocale() === "ar") return <ArabicHome />;
  return <main className="art-home">
    <section className="startup-hero"><div className="container"><div className="startup-hero-grid"><div className="startup-hero-copy"><div className="startup-badge"><span/> INDEPENDENT AI ENGINEERING STUDIO</div><h1>Big ideas<br/>need <span>better<br/>intelligence<span className="startup-dot">.</span></span></h1><p>We engineer the intelligence behind your systems—from custom AI models to the infrastructure that brings them to life.</p><div className="startup-hero-actions"><Link href="/expertise" className="startup-main-cta">Explore what we do <span><ArrowUpRight size={19}/></span></Link><Link href="/contact" className="startup-secondary-cta">Have a project in mind? <ArrowDownRight size={15}/></Link></div><div className="startup-hero-note"><span>NOT JUST AI.<br/>AI ENGINEERED.</span><span>01 / SCROLL TO EXPLORE ↓</span></div></div><IntelligenceCore/></div></div></section>

    <div className="startup-ticker" aria-hidden="true"><div><span>CURIOUS BY DESIGN</span><b>✳</b><span>ENGINEERED FOR REAL LIFE</span><b>✳</b><span>INTELLIGENCE IN MOTION</span><b>✳</b><span>CURIOUS BY DESIGN</span><b>✳</b><span>ENGINEERED FOR REAL LIFE</span><b>✳</b><span>INTELLIGENCE IN MOTION</span><b>✳</b></div></div>

    <section className="art-intro"><div className="container art-intro-grid"><div className="art-label">01 / THE PRACTICE</div><div><h2>Intelligence is only as good as the system around it.</h2><p>We work across models, data, software, and infrastructure—connecting deep technical thinking to the realities of production.</p></div><Link href="/about" className="art-round-link" aria-label="About DevTech AI"><ArrowUpRight size={24}/></Link></div></section>

    <section className="art-expertise"><div className="container"><div className="art-section-heading"><div><div className="art-label">02 / ENGINEERING EXPERTISE</div><h2>Depth across the<br/><em>entire system.</em></h2></div><p>From the model to the machinery that makes it useful, every layer matters.</p></div><div className="discipline-layout"><div className="discipline-feature"><ModelDiagram/><div><span className="art-label">01 / MODEL ENGINEERING</span><h3>From experiment to dependable inference.</h3><p>Model development, adaptation, evaluation, and optimization—designed around the task and its constraints.</p><Link href="/expertise" className="art-inline-link">Explore model engineering <ArrowUpRight size={15}/></Link></div></div><div className="discipline-list"><Link href="/expertise#vision"><span>02</span><div><h3>Computer vision</h3><p>Detection, tracking & visual intelligence</p></div><ArrowUpRight size={18}/></Link><Link href="/expertise#language"><span>03</span><div><h3>LLM systems</h3><p>Retrieval, reasoning & agent workflows</p></div><ArrowUpRight size={18}/></Link><Link href="/expertise#infrastructure"><span>04</span><div><h3>AI infrastructure</h3><p>Serving, observability & MLOps</p></div><ArrowUpRight size={18}/></Link><Link href="/expertise#systems"><span>05</span><div><h3>Backend systems</h3><p>Data services & distributed architecture</p></div><ArrowUpRight size={18}/></Link></div></div></div></section>

    <SystemsShowcase />

    <section className="art-architecture"><div className="container"><div className="architecture-copy"><div className="art-label">SYSTEMS THINKING</div><h2>The model is one part.<br/><em>The system is the work.</em></h2><p>We connect intelligence to the data, services, interfaces, and feedback loops that make it useful in practice.</p></div><ArchitectureDiagram/></div></section>

    <HowWeWork />

    <EngineeringLifecycle />

    <section className="art-work"><div className="container"><div className="art-section-heading"><div><div className="art-label">05 / SELECTED WORK</div><h2>Built for the world<br/><em>outside the lab.</em></h2></div><Link href="/work" className="art-inline-link">Explore our work <ArrowUpRight size={16}/></Link></div><article className="khair-feature"><div className="khair-visual"><Image src="/khair-discover.png" alt="Khair platform discovery interface" fill sizes="(max-width: 800px) 100vw, 65vw"/><span>PRODUCT PLATFORM / 01</span></div><div className="khair-copy"><div className="art-label">FEATURED PLATFORM</div><h3>Khair<span> ↗</span></h3><p>A digital platform for discovering meaningful events, joining communities, and helping organizers bring people together.</p><div className="khair-facts"><span>PLATFORM ENGINEERING</span><span>COMMUNITY & EVENTS</span></div><a href="https://khair-it-app.web.app/" target="_blank" rel="noreferrer" className="art-inline-link">Visit the platform <ArrowUpRight size={15}/></a></div></article></div></section>

    <section className="art-manifesto"><div className="container manifesto-grid"><div className="art-label">06 / OUR POINT OF VIEW</div><div><h2>We don&apos;t just integrate AI.<br/><em>We engineer it.</em></h2><p>We combine machine learning, software architecture, and production infrastructure to develop intelligent systems designed for complex real-world environments.</p><Link href="/engineering" className="art-inline-link">Our engineering practice <ArrowUpRight size={15}/></Link></div><div className="manifesto-stamp"><span>DEVTECH</span><strong>AI</strong><span>ENGINEERED<br/>WITH INTENT</span></div></div></section>
  </main>;
}
