"use client";

import { useEffect, useRef, useState } from "react";
import type { JobAccent, JobVisualCategory } from "@/lib/data";
import { jobVisualCategoryLabels, type JobVisualVariant } from "@/lib/job-visuals";

type Props = {
  category: JobVisualCategory;
  accent?: JobAccent;
  variant?: JobVisualVariant | string;
  compact?: boolean;
  label?: string;
};

export function JobVisualization({category, accent = "violet", variant = "geometric", compact = false, label}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {rootMargin: "120px"});
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const accessibleLabel = label || `${jobVisualCategoryLabels[category]} conceptual role visualization; illustrative and not model output`;
  if (category === "disabled") {
    return <div ref={rootRef} className={`role-visual role-visual-static accent-${accent}`} role="img" aria-label={accessibleLabel}><span className="rv-static-mark">DEVTECH / ROLE</span></div>;
  }

  return <div ref={rootRef} className={`role-visual role-visual-${category} accent-${accent}${compact ? " compact" : ""}${visible ? "" : " is-paused"}`} data-variant={variant} role="img" aria-label={accessibleLabel}>
    <div className="rv-grid"/>
    <div className="rv-label"><i/>SIMULATED / {jobVisualCategoryLabels[category].toUpperCase()}</div>
    {category === "audio-ai" ? <><div className="rv-frequencies"><span>40 HZ</span><span>1 KHZ</span><span>16 KHZ</span></div><svg className="rv-wave" viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true"><path d="M0 75 C40 10 60 140 100 75 S160 15 200 75 260 135 300 75 360 5 400 75 460 145 500 75 560 25 600 75"/></svg><div className="rv-bars">{Array.from({length: 18},(_,i)=><i key={i}/>)}</div></> : null}
    {category === "computer-vision" ? <><div className="rv-detect one"><span>OBJ-01 / 94%</span></div><div className="rv-detect two"><span>OBJ-02 / 87%</span></div><svg className="rv-track" viewBox="0 0 500 260" aria-hidden="true"><path d="M40 220 Q170 30 300 150 T470 55"/></svg></> : null}
    {category === "machine-learning" ? <div className="rv-network">{Array.from({length: 12},(_,i)=><i key={i}/>)}</div> : null}
    {category === "llm" ? <div className="rv-tokens">{["INPUT","EMBED","ATTEND","REASON","OUTPUT"].map((item)=><span key={item}>{item}</span>)}</div> : null}
    {category === "infrastructure" || category === "backend" ? <div className="rv-pipeline">{["API","QUEUE","MODEL","DATA"].map((item)=><span key={item}>{item}</span>)}</div> : null}
    {category === "security" ? <div className="rv-shield"><span>SECURE</span><i/><i/><i/></div> : null}
    {category === "talent" ? <div className="rv-talent">{Array.from({length: 7},(_,i)=><i key={i}/>)}</div> : null}
    {category === "human-resources" ? <div className="rv-people-ops"><strong>PEOPLE OPS</strong>{Array.from({length: 6},(_,i)=><i key={i}/>)}</div> : null}
    {category === "marketing" ? <div className="rv-campaign"><strong>CAMPAIGN</strong><i/><i/><i/>{Array.from({length: 5},(_,i)=><span key={i}/>)}</div> : null}
    {category === "sales" ? <div className="rv-funnel"><span>LEADS <b>240</b></span><span>QUALIFIED <b>86</b></span><span>WON <b>24</b></span></div> : null}
    {category === "finance" ? <div className="rv-finance"><div className="rv-ledger"><span>FORECAST</span><span>ACTUAL</span><span>+18.4%</span></div><div className="rv-finance-bars">{[42,68,54,83,72,94].map((height,index)=><i key={index} style={{height: `${height}%`}}/>)}</div></div> : null}
    {category === "product" ? <div className="rv-roadmap"><i/>{["DISCOVER","DEFINE","BUILD","LEARN"].map((stage,index)=><span key={stage} style={{insetInlineStart: `${8 + index * 28}%`}}><b>{String(index + 1).padStart(2,"0")}</b>{stage}</span>)}</div> : null}
    {category === "design" ? <div className="rv-design-system"><div className="rv-design-toolbar"><i/><i/><i/></div><div className="rv-design-canvas"><span/><span/><span/><span/></div><strong>COMPONENT / 04</strong></div> : null}
    {category === "operations" ? <div className="rv-operations">{["INTAKE","PLAN","DELIVER","REVIEW"].map((stage,index)=><span key={stage}><b>{String(index + 1).padStart(2,"0")}</b>{stage}</span>)}</div> : null}
    {category === "customer-success" ? <div className="rv-customer-journey"><svg viewBox="0 0 520 160" preserveAspectRatio="none" aria-hidden="true"><path d="M15 125 C100 125 95 35 185 55 S290 145 365 80 445 30 505 38"/></svg>{["ONBOARD","ADOPT","GROW","ADVOCATE"].map((stage,index)=><span key={stage} style={{insetInlineStart: `${5 + index * 28}%`, insetBlockStart: `${65 - index * 8}%`}}>{stage}</span>)}</div> : null}
    {category === "default" ? <div className="rv-geometry"><i/><i/><i/></div> : null}
    <div className="rv-foot">{variant.toUpperCase()} <span><i/>ACTIVE</span></div>
  </div>;
}
