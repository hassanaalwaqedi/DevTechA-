"use client";

import Link from "next/link";
import { Menu, ArrowUpRight, X } from "lucide-react";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="container nav"><Link href="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark">d/</span>DevTech AI</Link><nav className={`nav-links${open ? " open" : ""}`}><Link href="/products" onClick={() => setOpen(false)}>Products</Link><Link href="/services" onClick={() => setOpen(false)}>Services</Link><Link href="/about" onClick={() => setOpen(false)}>About</Link><Link href="/careers" onClick={() => setOpen(false)}>Careers</Link></nav><Link className="nav-cta" href="/contact">Start a conversation <ArrowUpRight size={15}/></Link><button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button></div></header>;
}
