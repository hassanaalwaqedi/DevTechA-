"use client";

import { ArrowDownRight, ArrowUpRight, BrainCircuit, CheckCircle2, Code2, Workflow } from "lucide-react";
import { useEffect, useState } from "react";

const serviceOptions = [
  {label: "Applied AI systems", shortLabel: "AI systems", description: "LLM products, RAG, agents, evaluation", icon: BrainCircuit},
  {label: "Intelligent automation", shortLabel: "Automation", description: "Workflows, integrations, less repetition", icon: Workflow},
  {label: "Software engineering", shortLabel: "Software", description: "Web, mobile, backend, platforms", icon: Code2},
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [selectedService, setSelectedService] = useState(serviceOptions[0].label);
  const [sentService, setSentService] = useState("");

  useEffect(() => {
    const requestedService = new URLSearchParams(window.location.search).get("service");
    const matchingService = serviceOptions.find((option) => option.label === requestedService || option.shortLabel === requestedService);
    if (matchingService) setSelectedService(matchingService.label);
  }, []);

  if (sent) return <main><section className="contact-success-hero"><div className="container"><div className="success-card contact-success-card"><CheckCircle2 size={38} color="#a6d3bf"/><div className="eyebrow ai-eyebrow">Message received</div><h1>We’ll take it from here.</h1><p>Thanks for reaching out about <strong>{sentService}</strong>. We’ll review the context and get back to you within a few working days.</p><a className="button-light" href="/">Back to DevTech AI <ArrowUpRight size={15}/></a></div></div></section></main>;

  return <main>
    <section className="contact-ai-hero"><div className="contact-ai-glow"/><div className="container contact-ai-hero-grid"><div><div className="eyebrow ai-eyebrow"><span className="status-dot"/> Start with the problem</div><h1>Tell us where <span>AI</span> can take you.</h1><p>Bring us the bottleneck, the blank page, or the workflow that should be smarter. We’ll help you find the right depth of technology.</p><div className="contact-hero-links"><a href="#conversation" className="button-light">Choose a service <ArrowDownRight size={15}/></a><a href="mailto:hello@devtech.ai" className="contact-ai-email">hello@devtech.ai <ArrowUpRight size={14}/></a></div></div><div className="contact-ai-map"><div className="contact-map-label">THE AI WORK / 01</div><div className="contact-map-center"><BrainCircuit size={27}/><span>Models →<br/>systems →<br/><em>impact</em></span></div><div className="contact-map-orbit orbit-one"><span>AI</span></div><div className="contact-map-orbit orbit-two"><span>FLOW</span></div><div className="contact-map-orbit orbit-three"><span>CODE</span></div><div className="contact-map-footer"><span>Deep technical thinking</span><span>Real-world outcomes</span></div></div></div></section>
    <section id="conversation" className="section contact-conversation"><div className="container contact-conversation-grid"><div className="contact-conversation-intro"><div className="eyebrow">A better starting point</div><h2>Choose what you want to make smarter.</h2><p>You don’t need a perfect brief. Pick the closest path and give us enough context to start a useful conversation.</p><div className="contact-side-note"><span className="contact-side-line"/><span>AI-first · automation-minded · product-aware</span></div></div><form className="form contact-form" onSubmit={(event) => {event.preventDefault(); setSentService(selectedService); setSent(true)}}><fieldset className="service-chooser"><legend>What can we help with?</legend><div className="service-option-grid">{serviceOptions.map((option) => { const Icon = option.icon; const selected = selectedService === option.label; return <button type="button" className={`service-option${selected ? " selected" : ""}`} aria-pressed={selected} onClick={() => setSelectedService(option.label)} key={option.label}><span className="service-option-icon"><Icon size={17}/></span><span className="service-option-copy"><strong>{option.shortLabel}</strong><small>{option.description}</small></span><span className="service-option-check">{selected ? "✓" : ""}</span></button>})}</div><input type="hidden" name="service" value={selectedService}/></fieldset><div className="form-section contact-form-fields"><h3>Give us the useful context.</h3><div className="field-grid"><div className="field"><label htmlFor="contactName">Name *</label><input id="contactName" name="name" required /></div><div className="field"><label htmlFor="contactEmail">Work email *</label><input id="contactEmail" name="email" type="email" required /></div><div className="field full"><label htmlFor="contactMessage">What are you trying to make possible? *</label><textarea id="contactMessage" name="message" required placeholder="Tell us what is happening today, what is getting in the way, and what better could look like." /></div></div></div><div className="form-actions"><button type="submit" className="button-dark">Start the conversation <ArrowUpRight size={15}/></button><p>Or email us directly at hello@devtech.ai</p></div></form></div></section>
    <section className="contact-proof"><div className="container contact-proof-grid"><div><div className="eyebrow">What happens next</div><h2>A focused first conversation.</h2></div><div className="contact-proof-steps"><div><span>01</span><p>We read the context.</p></div><div><span>02</span><p>We ask the sharper question.</p></div><div><span>03</span><p>We map a path forward.</p></div></div></div></section>
  </main>;
}
