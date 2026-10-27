"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = [["Expertise", "/expertise"], ["Solutions", "/solutions"], ["Engineering", "/engineering"], ["Our work", "/work"], ["About", "/about"]];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  return <header className="site-header"><div className="container nav">
    <Link href="/" className="brand" onClick={() => setOpen(false)} aria-label="DevTech AI home"><span className="brand-mark"><i/><i/><i/></span><span>DEVTECH <em>AI</em></span></Link>
    <nav className={`nav-links${open ? " open" : ""}`} aria-label="Primary navigation">{links.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}<Link className="nav-mobile-contact" href="/contact" onClick={() => setOpen(false)}>Discuss your project <ArrowUpRight size={15}/></Link></nav>
    <Link className="nav-cta" href="/contact">Discuss your project <ArrowUpRight size={14}/></Link>
    <button className="menu-button" aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? <X size={21}/> : <Menu size={21}/>}</button>
  </div></header>;
}
