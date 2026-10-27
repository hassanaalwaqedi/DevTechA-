import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = { title: "Expertise", description: "DevTech AI expertise across model engineering, computer vision, LLM systems, AI infrastructure, and intelligent backend architecture." };

const areas: Array<[string, string, string[]]> = [
  ["AI Model Engineering", "Custom neural networks, task-specific model adaptation, training pipelines, evaluation design, and inference optimization.", ["Model selection", "Fine-tuning workflows", "Evaluation harnesses"]],
  ["Computer Vision & Intelligent Perception", "Visual intelligence for dynamic environments: object detection, tracking, video analytics, and operational signals.", ["Vision pipelines", "Multi-object tracking", "Real-time processing"]],
  ["LLM Systems & Generative AI", "Useful language systems require retrieval, orchestration, evaluation, and clear operational boundaries—not only a prompt.", ["RAG architectures", "Multimodal workflows", "Agent systems"]],
  ["AI Infrastructure & MLOps", "Deployable model serving, reliable workloads, observability, and the infrastructure required to operate intelligent systems.", ["GPU inference", "Containerized deployment", "Monitoring"]],
  ["Intelligent Backend Architecture", "High-performance APIs, real-time event processing, scalable data services, and integration architecture.", ["Data pipelines", "Event systems", "Enterprise APIs"]],
  ["Applied Research & Prototyping", "Technical feasibility, experimentation, and evidence-driven prototypes that establish a credible path to production.", ["Feasibility studies", "Benchmarking", "Research-to-production"]],
];

export default function ExpertisePage() { return <main><PageHero eyebrow="Engineering capabilities" title={<>AI expertise for systems that have to <span>work.</span></>}>We develop the models, systems, and operating foundations behind intelligent products—choosing the technical path that fits the problem, not the trend.</PageHero><section className="content-section"><div className="container"><div className="content-grid">{areas.map(([title, text, items]) => <article className="feature-panel" key={title}><h2>{title}</h2><p>{text}</p><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></div></section></main>; }
