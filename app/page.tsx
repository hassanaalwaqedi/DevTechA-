import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BrainCircuit, Boxes, Cpu, Eye, Network, ServerCog } from "lucide-react";
import { NeuralNetwork } from "@/components/neural-network";
import { EngineeringLifecycle } from "@/components/engineering-lifecycle";

export const metadata: Metadata = { title: "AI Engineering & Intelligent Systems", description: "Custom AI models, computer vision, scalable inference infrastructure, and intelligent systems engineered for real-world complexity." };

const expertise = [
  ["01", "AI Model Engineering", "Custom neural networks, training pipelines, adaptation, evaluation, and inference optimization.", BrainCircuit],
  ["02", "Computer Vision & Perception", "Detection, tracking, video analytics, and visual intelligence for dynamic environments.", Eye],
  ["03", "LLM Systems & Generative AI", "RAG architectures, multimodal workflows, fine-tuning, and purposeful agent systems.", Network],
  ["04", "AI Infrastructure & MLOps", "Model serving, GPU workloads, observability, containerized deployment, and reliable inference.", ServerCog],
  ["05", "Intelligent Backend Architecture", "Event-driven systems, high-performance APIs, data pipelines, and enterprise integrations.", Boxes],
  ["06", "Applied Research & Prototyping", "Feasibility studies, controlled experiments, evaluation frameworks, and a path to production.", Cpu],
] as const;

const projects = [
  { tag: "PLATFORM ENGINEERING", title: "Khair", text: "A digital platform for community and meaningful events, built around scalable application architecture and connected experiences.", tech: ["Platform systems", "Geospatial", "Integrations"], href: "https://khair-it-app.web.app/", external: true },
  { tag: "ENGINEERING CONCEPT", title: "Vision operations", text: "A case-study structure for intelligent video workflows, risk signals, and real-time event processing—available for project-specific discussion.", tech: ["Detection", "Tracking", "Event processing"], href: "/contact" },
  { tag: "ENGINEERING CONCEPT", title: "Knowledge systems", text: "A case-study structure for governed retrieval, language-model orchestration, and enterprise knowledge access.", tech: ["Retrieval", "Evaluation", "Observability"], href: "/contact" },
];

export default function Home() {
  return <main>
    <section className="hero"><div className="hero-grid-lines"/><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="container hero-layout">
      <div className="hero-copy"><div className="section-kicker"><span className="pulse-dot"/> AI ENGINEERING / INTELLIGENT SYSTEMS</div><h1>We engineer the intelligence behind your <span>systems.</span></h1><p>From custom AI models and advanced computer vision to scalable inference infrastructure, DevTech AI architects, develops, and deploys intelligent systems engineered for real-world complexity.</p><div className="hero-actions"><Link href="/expertise" className="button button-primary">Explore our expertise <ArrowUpRight size={16}/></Link><Link href="/contact" className="button button-quiet">Start a technical conversation <ArrowDownRight size={16}/></Link></div><div className="hero-ledger"><span>MODEL DEVELOPMENT</span><span>•</span><span>PRODUCTION SYSTEMS</span><span>•</span><span>APPLIED RESEARCH</span></div></div>
      <NeuralNetwork />
    </div></section>

    <section className="intro-strip"><div className="container"><p>DevTech AI is an AI engineering company. We work at the intersection of machine learning, software architecture, and production infrastructure.</p><Link href="/about">Our approach <ArrowUpRight size={15}/></Link></div></section>

    <section className="section expertise-section"><div className="container"><div className="section-title-row"><div><div className="section-kicker">Core engineering expertise</div><h2>Technical depth, made <span>operational.</span></h2></div><p>We build the engineering foundations that let intelligent products operate with reliability, clarity, and room to evolve.</p></div><div className="expertise-grid">{expertise.map(([number, title, text, Icon]) => <Link className="expertise-card" href="/expertise" key={number}><div className="card-top"><span>{number}</span><Icon size={21}/></div><h3>{title}</h3><p>{text}</p><span className="card-link">Explore capability <ArrowUpRight size={14}/></span></Link>)}</div></div></section>

    <EngineeringLifecycle />

    <section className="work-preview section"><div className="container"><div className="section-title-row"><div><div className="section-kicker">Selected work & systems</div><h2>Built around the <span>hard part.</span></h2></div><Link className="text-link" href="/work">View our work <ArrowUpRight size={15}/></Link></div><div className="project-grid">{projects.map((project, index) => <article className={`project-card project-${index + 1}`} key={project.title}><div className="project-visual"><div className="project-rings"/><span>{project.tag}</span><strong>{String(index + 1).padStart(2, "0")}</strong></div><div className="project-content"><div><h3>{project.title}</h3><p>{project.text}</p></div><ul>{project.tech.map((item) => <li key={item}>{item}</li>)}</ul><Link href={project.href} target={project.external ? "_blank" : undefined} rel={project.external ? "noreferrer" : undefined} className="card-link">{project.external ? "Visit platform" : "Discuss this system"} <ArrowUpRight size={14}/></Link></div></article>)}</div></div></section>

    <section className="philosophy"><div className="container philosophy-grid"><div className="section-kicker">Our philosophy</div><div><h2>We don&apos;t just integrate AI. <span>We engineer it.</span></h2><p>DevTech AI focuses on the engineering foundations of intelligent systems. We combine machine learning, software architecture, and production infrastructure to develop AI solutions designed for complex real-world environments.</p><Link href="/engineering" className="button button-quiet">How we engineer <ArrowUpRight size={16}/></Link></div><div className="precision-mark"><span>01</span><i/><span>PRECISION<br/>OVER PROMISES</span></div></div></section>

    <section className="technology section"><div className="container"><div className="section-kicker">Technology ecosystem</div><h2>Engineering choices in <span>context.</span></h2><div className="technology-list"><div><span>Machine learning</span><p>PyTorch · TensorFlow · YOLO · Transformers</p></div><div><span>Backend & systems</span><p>Python · Go · FastAPI · PostgreSQL · Redis</p></div><div><span>AI data infrastructure</span><p>Vector search · Qdrant · Kafka · Evaluation tooling</p></div><div><span>Deployment & product</span><p>Docker · Kubernetes · GPU inference · Next.js · TypeScript</p></div></div></div></section>
  </main>;
}
