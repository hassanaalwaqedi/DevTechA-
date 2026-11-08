import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type CompanyPageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  detailsTitle: string;
  details: readonly string[];
};

export function CompanyPageIntro(props: CompanyPageIntroProps) {
  return <section className="company-page-intro"><div className="container">
    <span className="company-label">{props.eyebrow}</span>
    <div className="company-page-intro-grid"><div>
      <h1>{props.title}</h1><p>{props.description}</p>
      <div className="company-actions"><Link href={props.actionHref} className="company-button">{props.actionLabel}<ArrowUpRight size={16}/></Link><Link href={props.secondaryHref} className="company-text-link">{props.secondaryLabel}<ArrowUpRight size={16}/></Link></div>
    </div><aside className="company-page-details" aria-label={props.detailsTitle}><h2>{props.detailsTitle}</h2><ol>{props.details.map((detail, index) => <li key={detail}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{detail}</li>)}</ol></aside></div>
  </div></section>;
}
