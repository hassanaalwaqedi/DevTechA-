import Link from "next/link";
import { ArrowUpRight, Check, Globe2, HeartHandshake, Sparkles, UsersRound } from "lucide-react";
import { getPublishedJobs } from "@/lib/db";
import { CareersDirectory } from "@/components/careers-directory";

export default async function CareersPage() {
  const jobs = await getPublishedJobs();
  return <main>
    <section className="page-hero careers-hero">
      <div className="container careers-hero-grid">
        <div className="careers-hero-copy">
          <div className="eyebrow careers-eyebrow"><span className="status-dot"/> Careers at DevTech AI</div>
          <div className="careers-hero-note"><span>Hiring thoughtfully</span><span>01 / 04</span></div>
          <h1>Do the best<br/>work of your<br/><em>career.</em></h1>
          <p>We’re a small, distributed team building products with care. If you like hard problems, high agency, and work that reaches beyond the screen, we’d like to hear from you.</p>
          <div className="hero-actions"><Link href="#open-roles" className="button-light">Explore open roles <ArrowUpRight size={15}/></Link><Link href="/about" className="career-text-link">Meet the team <ArrowUpRight size={15}/></Link></div>
          <div className="careers-trust-row"><span><Check size={13}/> Remote-first</span><span><Check size={13}/> Small, senior team</span><span><Check size={13}/> Real ownership</span></div>
        </div>
        <div className="careers-hero-panel">
          <div className="panel-topline"><span>DEVTECH AI / 2024—NOW</span><span>01</span></div>
          <div className="careers-panel-orb"><Sparkles size={22}/><strong>Make it<br/><em>matter.</em></strong></div>
          <div className="careers-panel-note"><span className="panel-note-dot"/><span>Context over ceremony</span></div>
          <p>We believe the best work happens when smart people have context, trust, and room to think.</p>
          <div className="career-stats"><div><strong>01</strong><span>Team, by design</span></div><div><strong>100%</strong><span>Remote-friendly</span></div><div><strong>∞</strong><span>Curiosity required</span></div></div>
        </div>
      </div>
    </section>

    <section className="career-ticker" aria-label="DevTech AI ways of working"><div className="career-ticker-track"><span>PRODUCT THINKING</span><i>✳</i><span>APPLIED AI</span><i>✳</i><span>REMOTE BY DEFAULT</span><i>✳</i><span>ROOM TO THINK</span><i>✳</i><span>PRODUCT THINKING</span><i>✳</i><span>APPLIED AI</span><i>✳</i><span>REMOTE BY DEFAULT</span><i>✳</i><span>ROOM TO THINK</span><i>✳</i></div></section>

    <section id="open-roles" className="section career-openings"><div className="container"><div className="section-head"><div><div className="eyebrow">Open positions</div><h2>Find your next good problem.</h2></div><p className="section-intro">We hire for how you think, how you work with others, and what you want to make possible.</p></div><CareersDirectory initialJobs={jobs}/></div></section>

    <section className="section section-tint career-principles"><div className="container"><div className="section-head"><div><div className="eyebrow">The way we work</div><h2>Room to do your best work.</h2></div><p className="section-intro">A clear point of view, without a rigid playbook. We care about the quality of the work and the quality of the days that make it.</p></div><div className="career-values-grid"><article><div className="career-value-icon"><UsersRound size={18}/></div><div className="build-number">01 —</div><h3>Own the outcome</h3><p>Autonomy with context, not isolation. You’ll know what matters and have space to decide how to get there.</p></article><article><div className="career-value-icon"><Globe2 size={18}/></div><div className="build-number">02 —</div><h3>Work from anywhere</h3><p>We’re distributed by default. Async when it helps, together when it matters, and always intentional.</p></article><article><div className="career-value-icon"><HeartHandshake size={18}/></div><div className="build-number">03 —</div><h3>Stay human</h3><p>Direct communication, generous feedback, and a team that leaves room for life outside the work.</p></article></div></div></section>

    <section className="career-bottom-cta"><div className="container"><div><div className="eyebrow">Don’t see your role?</div><h2>Good people are always welcome.</h2></div><a className="button-dark" href="mailto:hello@devtech.ai?subject=Working%20at%20DevTech%20AI">Introduce yourself <ArrowUpRight size={15}/></a></div></section>
  </main>;
}
