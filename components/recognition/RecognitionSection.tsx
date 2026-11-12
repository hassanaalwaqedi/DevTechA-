import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/locale";
import {
  RECOGNITION_FACTS,
  RECOGNITION_HERO_IMAGE,
  getRecognitionCopy,
} from "@/lib/awards";
import { RecognitionGallery } from "@/components/recognition/RecognitionGallery";

type RecognitionSectionProps = {
  locale: Locale;
  variant?: "full" | "compact";
};

export function RecognitionSection({
  locale,
  variant = "full",
}: RecognitionSectionProps) {
  const t = getRecognitionCopy(locale);
  const ar = locale === "ar";
  const ctaHref =
    variant === "compact" ? "/about#recognition" : "#recognition-evidence";

  return (
    <section
      className={`dt-rec-section${
        variant === "compact" ? " dt-rec-section-compact" : ""
      }`}
      id="recognition"
      dir={ar ? "rtl" : "ltr"}
      aria-labelledby="dt-recognition-heading"
    >
      <div className="container">
        {/* Featured Award — Editorial Two-Column Hero Presentation */}
        <div className="dt-rec-hero">
          <div className="dt-rec-hero-copy">
            <span className="dt-rec-eyebrow">{t.eyebrow}</span>
            <h2 id="dt-recognition-heading" className="dt-rec-headline">
              {t.headline}
            </h2>
            <p className="dt-rec-subheadline">{t.secondaryHeading}</p>
            <p className="dt-rec-description">{t.description}</p>

            <div className="dt-rec-competition-line">
              <span>{t.competitionLabel}</span>
              <strong>{t.competitionDetail}</strong>
            </div>

            <Link href={ctaHref} className="dt-rec-explore-link">
              <span>{t.exploreAchievement}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <figure className="dt-rec-hero-media">
            <div className="dt-rec-hero-frame">
              <Image
                src={RECOGNITION_HERO_IMAGE.src}
                alt={RECOGNITION_HERO_IMAGE.alt[locale]}
                width={RECOGNITION_HERO_IMAGE.width}
                height={RECOGNITION_HERO_IMAGE.height}
                sizes="(max-width: 980px) 100vw, 54vw"
                className="dt-rec-hero-img"
              />
            </div>
            <figcaption className="dt-rec-hero-caption">
              {t.heroCaption}
            </figcaption>
          </figure>
        </div>

        {/* Achievement Details — Refined Hairline Information Strip */}
        <dl
          className="dt-rec-facts-strip"
          aria-label={ar ? "بيانات الإنجاز" : "Achievement summary"}
        >
          {RECOGNITION_FACTS.map((fact) => (
            <div key={fact.id} className="dt-rec-fact-cell">
              <dd>{fact.value[locale]}</dd>
              <dt>{fact.label[locale]}</dt>
            </div>
          ))}
        </dl>

        {/* Documentary Evidence Gallery & Lightbox on full view */}
        {variant === "full" ? <RecognitionGallery locale={locale} /> : null}
      </div>
    </section>
  );
}

