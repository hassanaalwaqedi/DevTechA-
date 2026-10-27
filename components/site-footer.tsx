import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return <footer className="site-footer"><div className="container">
    <div className="footer-callout"><div><div className="section-kicker">A technical conversation</div><h2>Let&apos;s engineer what&apos;s next.</h2></div><Link className="button button-primary" href="/contact">Discuss your project <ArrowUpRight size={16}/></Link></div>
    <div className="footer-grid"><div><Link href="/" className="brand"><span className="brand-mark"><i/><i/><i/></span><span>DEVTECH <em>AI</em></span></Link><p>AI engineering and intelligent systems development for complex real-world environments.</p></div><div className="footer-links"><Link href="/expertise">Expertise</Link><Link href="/solutions">Solutions</Link><Link href="/engineering">Engineering</Link><Link href="/work">Our work</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link></div><div className="footer-contact"><span>Direct</span><a href="mailto:hello@devtech.ai">hello@devtech.ai</a><a href="https://www.linkedin.com/company/144674058" target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13}/></a></div></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} DevTech AI</span><span>Engineering intelligence with precision.</span></div>
  </div></footer>;
}
