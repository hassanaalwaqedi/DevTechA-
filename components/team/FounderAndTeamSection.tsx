import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { getTeamCopy, TEAM_MEMBERS, type TeamMember } from "@/lib/team";

function MemberAvatar({
  member,
  locale,
  size = "lg",
}: {
  member: TeamMember;
  locale: Locale;
  size?: "sm" | "lg";
}) {
  const ar = locale === "ar";
  const alt = ar ? member.photoAlt.ar : member.photoAlt.en;

  if (member.photoSrc) {
    return (
      <div className={`dt-team-avatar dt-team-avatar-${size}`}>
        <Image
          src={member.photoSrc}
          alt={alt}
          width={size === "lg" ? 112 : 52}
          height={size === "lg" ? 112 : 52}
          sizes={size === "lg" ? "112px" : "52px"}
          className="dt-team-avatar-img"
        />
      </div>
    );
  }

  return (
    <div
      className={`dt-team-avatar dt-team-avatar-${size} dt-team-avatar-placeholder`}
      role="img"
      aria-label={alt}
    >
      {member.isFounder ? (
        <span className="dt-team-initials" aria-hidden="true">
          {member.initials}
        </span>
      ) : (
        <span className="dt-team-neutral-mark" aria-hidden="true">
          <UserRound size={size === "lg" ? 28 : 20} strokeWidth={1.75} />
          <small>{member.initials}</small>
        </span>
      )}
    </div>
  );
}

export function FounderAndTeamSection({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const t = getTeamCopy(locale);

  return (
    <section
      className="dt-team-section"
      id="founder-team"
      dir={ar ? "rtl" : "ltr"}
      aria-labelledby="dt-team-heading"
    >
      <div className="container">
        <div className="dt-team-head">
          <div>
            <span className="about-kicker">
              <i /> {t.kicker}
            </span>
            <h2 id="dt-team-heading">
              {t.titleBefore}
              <span>{t.titleAccent}</span>
            </h2>
          </div>
          <p>{t.subtitle}</p>
        </div>

        <div className="dt-team-grid">
          {TEAM_MEMBERS.map((member) => {
            const name = ar ? member.displayName.ar : member.displayName.en;
            const position = ar ? member.position.ar : member.position.en;
            const biography = ar ? member.biography.ar : member.biography.en;
            const specializations = member.specializations
              ? ar
                ? member.specializations.ar
                : member.specializations.en
              : null;

            return (
              <article
                key={member.id}
                className={`dt-team-card${member.isFounder ? " dt-team-card-founder" : ""}`}
              >
                <div className="dt-team-card-top">
                  <div className="dt-team-identity">
                    <MemberAvatar member={member} locale={locale} size="lg" />
                    <div className="dt-team-title-block">
                      <div className="dt-team-badges">
                        <span
                          className={`dt-team-role-badge${
                            member.isFounder ? " is-founder" : ""
                          }`}
                        >
                          {member.isFounder ? t.founderBadge : t.memberBadge}
                        </span>
                        <span className="dt-team-company-tag">{member.company}</span>
                      </div>
                      <h3>{name}</h3>
                      <p className="dt-team-position">{position}</p>
                    </div>
                  </div>
                </div>

                <p className="dt-team-bio">{biography}</p>

                {specializations ? (
                  <div className="dt-team-specs">
                    <span className="dt-team-specs-label">{t.focusLabel}</span>
                    <div className="dt-team-spec-tags">
                      {specializations.map((item) => (
                        <span key={item} className="dt-team-spec-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="dt-team-card-footer">
                  {member.linkedinUrl ? (
                    <a
                      href={member.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dt-team-linkedin"
                      aria-label={`${name} — ${t.linkedinLabel}`}
                    >
                      <span>{t.linkedinLabel}</span>
                      <ArrowUpRight size={15} />
                    </a>
                  ) : (
                    <span className="dt-team-verified-note">
                      {member.company} · {position}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FounderTeamPreview({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const t = getTeamCopy(locale);

  return (
    <section
      className="dt-team-preview-section"
      dir={ar ? "rtl" : "ltr"}
      aria-labelledby="dt-team-preview-heading"
    >
      <div className="container">
        <div className="dt-team-preview-shell">
          <div className="dt-team-preview-copy">
            <span className="dt-section-eyebrow">{t.kicker}</span>
            <h2 id="dt-team-preview-heading">
              {t.titleBefore}
              <span>{t.titleAccent}</span>
            </h2>
            <p>{t.subtitle}</p>
            <Link href="/about#founder-team" className="dt-team-preview-link">
              <span>{t.previewAction}</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="dt-team-preview-cards">
            {TEAM_MEMBERS.map((member) => {
              const name = ar ? member.displayName.ar : member.displayName.en;
              const position = ar ? member.position.ar : member.position.en;
              return (
                <Link
                  key={member.id}
                  href="/about#founder-team"
                  className="dt-team-preview-card"
                >
                  <MemberAvatar member={member} locale={locale} size="sm" />
                  <div className="dt-team-preview-meta">
                    <strong>{name}</strong>
                    <span>{position}</span>
                  </div>
                  <ArrowUpRight size={15} className="dt-team-preview-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

