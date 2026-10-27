import type { ReactNode } from "react";

export function PageHero({eyebrow, title, children}: {eyebrow: string; title: ReactNode; children: ReactNode}) {
  return <section className="inner-hero"><div className="hero-grid-lines"/><div className="container"><div className="section-kicker">{eyebrow}</div><h1>{title}</h1><div className="inner-hero-copy">{children}</div></div></section>;
}
