import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Clock3,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { Job } from "@/lib/data";
import { JobShareActions } from "@/components/job-share-actions";

function formatLocationAndMode(location?: string, workMode?: string): string {
  const loc = (location || "").trim();
  const mode = (workMode || "").trim();
  if (!loc) return mode;
  if (!mode) return loc;
  if (loc.toLowerCase() === mode.toLowerCase()) return loc;
  return `${loc} · ${mode}`;
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/ال/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function resolveEmploymentLabel(job: Job): {
  typeLabel: string;
  durationLabel: string | null;
  badgeTone: "internship" | "fulltime" | "parttime" | "default";
} {
  const rawType = (job.employmentType || "").trim();
  const rawDuration = (job.duration || "").trim();
  const lowerType = rawType.toLowerCase();
  const lowerTitle = (job.title || "").toLowerCase();
  const isInternTitle =
    /\bintern(ship)?\b/i.test(lowerTitle) ||
    lowerTitle.includes("متدرب") ||
    lowerTitle.includes("تدريب");

  let badgeTone: "internship" | "fulltime" | "parttime" | "default" = "default";
  let typeLabel = rawType || "Open role";
  let schedulePrefix: string | null = null;

  if (lowerType.includes("intern") || isInternTitle) {
    badgeTone = "internship";
    typeLabel = "Internship";
    if (lowerType === "full-time" || lowerType === "part-time") {
      schedulePrefix = rawType;
    }
  } else if (lowerType.includes("full")) {
    badgeTone = "fulltime";
  } else if (lowerType.includes("part")) {
    badgeTone = "parttime";
  }

  let normalizedDuration = rawDuration;
  if (
    badgeTone === "internship" &&
    normalizedDuration.toLowerCase() === "permanent"
  ) {
    normalizedDuration = "";
  } else if (/^\d+\s*[-–]\s*\d+$/.test(normalizedDuration)) {
    normalizedDuration = `${normalizedDuration} months`;
  }

  const parts: string[] = [];
  if (schedulePrefix) parts.push(schedulePrefix);
  if (
    normalizedDuration &&
    normalizedDuration.toLowerCase() !== typeLabel.toLowerCase() &&
    normalizedDuration.toLowerCase() !== (schedulePrefix || "").toLowerCase()
  ) {
    parts.push(normalizedDuration);
  }

  return {
    typeLabel,
    durationLabel: parts.length > 0 ? parts.join(" · ") : null,
    badgeTone,
  };
}

function resolveCompensationDisplay(job: Job, arabic: boolean): string {
  const compType = (job.compensationType || "").trim();
  const compText = (job.compensationText || "").trim();
  const normText = normalizeForComparison(compText);
  const normTitle = normalizeForComparison(job.title || "");
  const normDept = normalizeForComparison(job.department || "");

  // Guard against rows where the job title or department was accidentally copied into compensationText
  const textIsDuplicateMetadata =
    normText.length > 0 &&
    (normText === normTitle ||
      normTitle.includes(normText) ||
      normText.includes(normTitle) ||
      (normDept.length > 0 && normDept.includes(normText)));

  if (compText && !textIsDuplicateMetadata) {
    if (
      compType &&
      !compText.toLowerCase().includes(compType.toLowerCase()) &&
      compType.toLowerCase() !== "unpaid"
    ) {
      return `${compType} · ${compText}`;
    }
    return compText;
  }

  if (compType) {
    return compType;
  }

  return arabic
    ? "تُشارك التفاصيل خلال مراحل التوظيف"
    : "Details shared during the process.";
}

export function CareersDirectory({
  initialJobs,
  available,
  arabic,
}: {
  initialJobs: Job[];
  available: boolean;
  arabic: boolean;
}) {
  const jobs = initialJobs.filter((job) => job.status === "open");

  if (!available || !jobs.length) {
    return (
      <div className="dt-career-empty-card">
        <span className="dt-career-empty-icon">
          <BriefcaseBusiness size={22} />
        </span>
        <div className="dt-career-empty-copy">
          <h3>
            {arabic
              ? available
                ? "لا توجد وظائف متاحة حالياً."
                : "تعذّر تحميل الوظائف المتاحة حالياً."
              : available
              ? "No open positions right now."
              : "Open positions are temporarily unavailable."}
          </h3>
          <p>
            {arabic
              ? available
                ? "تواصل معنا للاستفسار عن فرص العمل المستقبلية."
                : "يرجى المحاولة لاحقاً أو التواصل معنا للاستفسار عن الوظائف."
              : available
              ? "Contact us to enquire about future opportunities."
              : "Please try again later or contact us for information about current openings."}
          </p>
        </div>
        <a
          href="mailto:careers@hirzexa.com?subject=Careers%20at%20HIRZEXA"
          className="dt-job-view-btn"
        >
          <span>{arabic ? "تواصل معنا" : "Contact recruitment"}</span>
          <ArrowUpRight size={16} />
        </a>
      </div>
    );
  }

  return (
    <div className="dt-job-cards-list">
      {jobs.map((job, index) => {
        const numberLabel = String(index + 1).padStart(2, "0");
        const locationLabel = formatLocationAndMode(job.location, job.workMode);
        const { typeLabel, durationLabel, badgeTone } =
          resolveEmploymentLabel(job);
        const compensationLabel = resolveCompensationDisplay(job, arabic);

        return (
          <article className="dt-job-card" key={job.id}>
            {/* Left Area: Identifier, Department, Title, Description, Technical Tags */}
            <div className="dt-job-card-left">
              <div className="dt-job-card-header">
                <span className="dt-job-index">{numberLabel}</span>
                {job.department ? (
                  <span className="dt-job-department" dir="auto">
                    {job.department}
                  </span>
                ) : null}
              </div>

              <h3 className="dt-job-title" dir="auto">
                <Link href={`/careers/${job.slug}`}>{job.title}</Link>
              </h3>

              <p className="dt-job-description" dir="auto">
                {job.description}
              </p>

              {job.skills && job.skills.length > 0 ? (
                <div
                  className="dt-job-skills"
                  aria-label={arabic ? "المهارات التقنية" : "Technical skills"}
                >
                  {job.skills.slice(0, 5).map((skill) => (
                    <span className="dt-job-skill-tag" key={skill} dir="auto">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Middle Area: Location/Arrangement, Employment Type/Duration, Verified Compensation */}
            <div className="dt-job-card-middle">
              {locationLabel ? (
                <div className="dt-job-meta-item">
                  <span className="dt-job-meta-icon" aria-hidden="true">
                    <MapPin size={15} />
                  </span>
                  <div className="dt-job-meta-text">
                    <span className="dt-job-meta-label">
                      {arabic ? "الموقع ونمط العمل" : "Arrangement"}
                    </span>
                    <strong dir="auto">{locationLabel}</strong>
                  </div>
                </div>
              ) : null}

              <div className="dt-job-meta-item">
                <span className="dt-job-meta-icon" aria-hidden="true">
                  {durationLabel ? (
                    <Clock3 size={15} />
                  ) : (
                    <BriefcaseBusiness size={15} />
                  )}
                </span>
                <div className="dt-job-meta-text">
                  <span className="dt-job-meta-label">
                    {arabic ? "نوع التوظيف" : "Employment"}
                  </span>
                  <strong className="dt-job-employment-line">
                    <span
                      className={`dt-job-type-badge dt-job-type-${badgeTone}`}
                      dir="auto"
                    >
                      {typeLabel}
                    </span>
                    {durationLabel ? (
                      <span className="dt-job-duration" dir="auto">
                        · {durationLabel}
                      </span>
                    ) : null}
                  </strong>
                </div>
              </div>

              <div className="dt-job-meta-item">
                <span className="dt-job-meta-icon" aria-hidden="true">
                  <Sparkles size={15} />
                </span>
                <div className="dt-job-meta-text">
                  <span className="dt-job-meta-label">
                    {arabic ? "التعويض" : "Compensation"}
                  </span>
                  <span className="dt-job-compensation" dir="auto">
                    {compensationLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Area: View Position Button & Quick WhatsApp Share */}
            <div className="dt-job-card-right">
              <Link href={`/careers/${job.slug}`} className="dt-job-view-btn">
                <span>{arabic ? "عرض الوظيفة" : "View position"}</span>
                <ArrowUpRight size={16} />
              </Link>
              <JobShareActions slug={job.slug} title={job.title} compact />
            </div>
          </article>
        );
      })}
    </div>
  );
}
