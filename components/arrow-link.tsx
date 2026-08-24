import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="arrow-link">{children}<ArrowUpRight size={16}/></Link>; }
