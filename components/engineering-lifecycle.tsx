"use client";

import { useState } from "react";

const stages = [
  ["01", "Research & Discovery", "Define the operating environment, risks, data constraints, and technical feasibility before choosing a model."],
  ["02", "System Architecture", "Map services, interfaces, failure modes, data boundaries, and the human decisions the system will support."],
  ["03", "Data Engineering", "Build governed data flows, annotation strategy, retrieval pipelines, and evaluation datasets."],
  ["04", "Model Development", "Select, adapt, and evaluate models against the task—not a generic benchmark."],
  ["05", "Evaluation & Optimization", "Instrument quality, latency, cost, safety, and edge cases to make tradeoffs visible."],
  ["06", "Deployment", "Package inference, integrations, and delivery infrastructure for dependable operation."],
  ["07", "Monitoring", "Observe drift, quality signals, runtime behavior, and the next iteration of the system."],
] as const;

export function EngineeringLifecycle() {
  const [active, setActive] = useState(0);
  const stage = stages[active];
  return <section className="lifecycle section" aria-labelledby="lifecycle-title"><div className="container">
    <div className="section-kicker">Engineering lifecycle</div>
    <div className="section-title-row"><h2 id="lifecycle-title">From model architecture to <span>production intelligence.</span></h2><p>AI systems become useful when every engineering decision connects—from the first hypothesis to operation in the field.</p></div>
    <div className="lifecycle-shell">
      <div className="lifecycle-rail" role="tablist" aria-label="Engineering lifecycle stages">{stages.map(([number, title], index) => <button key={title} role="tab" aria-selected={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>{number}</span>{title}</button>)}</div>
      <div className="lifecycle-detail" role="tabpanel"><div className="detail-index">{stage[0]} / SYSTEMS PRACTICE</div><h3>{stage[1]}</h3><p>{stage[2]}</p><div className="detail-meter"><span style={{width: `${((active + 1) / stages.length) * 100}%`}}/></div><small>Stage {active + 1} of {stages.length}</small></div>
    </div>
  </div></section>;
}
