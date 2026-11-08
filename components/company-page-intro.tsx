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
  return (
    <section className="company-page-intro dt-page-intro">
      <div className="container">
        <div className="company-page-intro-grid dt-page-intro-grid">
          <div className="dt-page-intro-copy">
            <span className="company-label dt-page-intro-pill">
              <i className="dt-page-intro-dot" aria-hidden="true" />
              <span>{props.eyebrow}</span>
            </span>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
            <div className="company-actions dt-page-intro-actions">
              <Link href={props.actionHref} className="company-button dt-intro-btn-primary">
                <span>{props.actionLabel}</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link href={props.secondaryHref} className="company-text-link dt-intro-btn-secondary">
                <span>{props.secondaryLabel}</span>
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          <aside
            className="company-page-details dt-page-intro-card"
            aria-label={props.detailsTitle}
          >
            <div className="dt-page-intro-card-head">
              <h2>
                <i aria-hidden="true" />
                {props.detailsTitle}
              </h2>
              <span>DEVTECH AI</span>
            </div>
            <ol>
              {props.details.map((detail, index) => (
                <li key={detail}>
                  <span aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong>{detail}</strong>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}
