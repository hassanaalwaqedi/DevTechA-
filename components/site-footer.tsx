import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer"><div className="container"><div className="footer-top"><div><Link href="/" className="brand"><span className="brand-mark">d/</span>DevTech AI</Link><p>AI engineered for real-world impact.</p></div><div className="footer-links"><Link href="/products">Products</Link><Link href="/services">Services</Link><Link href="/about">About</Link><Link href="/careers">Careers</Link><Link href="/contact">Contact</Link><a href="mailto:hello@devtech.ai">Email us</a><a href="https://www.linkedin.com/company/144674058" target="_blank" rel="noreferrer">LinkedIn</a></div></div><div className="footer-bottom"><span>© 2026 DevTech AI</span><span>Software, intelligence, and the space between.</span></div></div></footer>;
}
