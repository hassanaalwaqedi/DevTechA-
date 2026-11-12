import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CompanyPageIntro } from "@/components/company-page-intro";
import {
  COMPANY_EMAILS,
  companyMailto,
  type CompanyEmailChannel,
} from "@/lib/company-emails";
import type { Locale } from "@/lib/locale";

export interface DepartmentalCardItem {
  id?: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  channel: CompanyEmailChannel;
  subject: string;
  contactCategory: string;
}

export interface DepartmentalPageConfig {
  locale: Locale;
  eyebrowEn: string;
  eyebrowAr: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  actionHref: string;
  actionLabelEn: string;
  actionLabelAr: string;
  secondaryHref: string;
  secondaryLabelEn: string;
  secondaryLabelAr: string;
  detailsTitleEn: string;
  detailsTitleAr: string;
  detailsEn: readonly string[];
  detailsAr: readonly string[];
  cards: readonly DepartmentalCardItem[];
}

export function DepartmentalPageView(config: DepartmentalPageConfig) {
  const ar = config.locale === "ar";

  return (
    <main className="dt-departmental-page" dir={ar ? "rtl" : "ltr"}>
      <CompanyPageIntro
        eyebrow={ar ? config.eyebrowAr : config.eyebrowEn}
        title={ar ? config.titleAr : config.titleEn}
        description={ar ? config.descriptionAr : config.descriptionEn}
        actionHref={config.actionHref}
        actionLabel={ar ? config.actionLabelAr : config.actionLabelEn}
        secondaryHref={config.secondaryHref}
        secondaryLabel={ar ? config.secondaryLabelAr : config.secondaryLabelEn}
        detailsTitle={ar ? config.detailsTitleAr : config.detailsTitleEn}
        details={ar ? config.detailsAr : config.detailsEn}
      />

      <section className="dept-page-section">
        <div className="container">
          <div className="dept-card-grid">
            {config.cards.map((card) => {
              const email = COMPANY_EMAILS[card.channel];
              const title = ar ? card.titleAr : card.titleEn;
              const description = ar ? card.descriptionAr : card.descriptionEn;
              return (
                <article key={`${card.channel}-${card.subject}`} id={card.id} className="dept-card">
                  <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                  </div>
                  <div className="dept-email-strip-actions">
                    <a
                      href={companyMailto(card.channel, card.subject)}
                      className="dept-email-chip"
                      aria-label={`${title}: ${email}`}
                    >
                      <span dir="ltr">{email}</span>
                      <ArrowUpRight size={15} />
                    </a>
                    <Link
                      href={`/contact?category=${encodeURIComponent(card.contactCategory)}`}
                      className="dept-email-chip"
                    >
                      <span>{ar ? "إرسال عبر النموذج الموجه" : "Use routed inquiry form"}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

