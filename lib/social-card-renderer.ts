import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { JobVisualCategory } from "@/lib/data";
import { jobVisualCategoryLabels } from "@/lib/job-visuals";

const sceneFiles = {
  technology: "human-ai-technology.jpg",
  aegis: "human-ai-aegis.jpg",
  engineering: "human-ai-engineering.jpg",
  about: "human-ai-about.jpg",
  contact: "human-ai-contact.jpg",
} as const;

export type SceneKey = keyof typeof sceneFiles;

const fontsBase64Promise = (async () => {
  const [reg, bold] = await Promise.all([
    readFile(join(process.cwd(), "public", "fonts", "Almarai-Regular.ttf")),
    readFile(join(process.cwd(), "public", "fonts", "Almarai-Bold.ttf")),
  ]);
  return {
    regularBase64: reg.toString("base64"),
    boldBase64: bold.toString("base64"),
  };
})();

const logoDataUriPromise = readFile(join(process.cwd(), "public", "brand", "hirzexa-mark.png"))
  .then((data) => `data:image/png;base64,${data.toString("base64")}`);

const renderedCardCache = new Map<string, Buffer>();

const accentPalette = {
  lime: { primary: "#0754FF", secondary: "#35BEFF" },
  violet: { primary: "#6D28D9", secondary: "#873BFF" },
  copper: { primary: "#0B4BFF", secondary: "#7C3AED" },
  sage: { primary: "#065F46", secondary: "#10B981" },
  blue: { primary: "#0754FF", secondary: "#35BEFF" },
} as const;

const arabicCategoryLabels: Partial<Record<JobVisualCategory, string>> = {
  "audio-ai": "الذكاء الصوتي",
  "computer-vision": "الرؤية الحاسوبية",
  "machine-learning": "تعلم الآلة",
  llm: "النماذج اللغوية",
  backend: "الأنظمة الخلفية",
  infrastructure: "البنية التحتية",
  security: "الأمن السيبراني",
  talent: "استقطاب المواهب",
  "human-resources": "الموارد البشرية",
  marketing: "التسويق",
  sales: "المبيعات",
  finance: "المالية",
  product: "هندسة المنتجات",
  design: "التصميم",
  operations: "العمليات",
  "customer-success": "نجاح العملاء",
  default: "الرؤية الحاسوبية وذكاء الحافة",
};

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapWords(value: string, maxCharacters: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) {
    const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
    const remaining = words.slice(consumed).join(" ");
    lines.push(
      remaining.length > maxCharacters + 8
        ? `${remaining.slice(0, maxCharacters + 5).replace(/\s+\S*$/, "")}…`
        : remaining
    );
  }
  return lines.slice(0, maxLines);
}

export function resolveSceneForCategory(
  sceneParam: string | null | undefined,
  category: JobVisualCategory
): SceneKey {
  if (sceneParam && sceneParam in sceneFiles) {
    return sceneParam as SceneKey;
  }
  if (category === "computer-vision" || category === "machine-learning" || category === "llm") {
    return "technology";
  }
  if (category === "security" || category === "product" || category === "design") {
    return "aegis";
  }
  if (category === "backend" || category === "infrastructure" || category === "operations") {
    return "engineering";
  }
  if (
    category === "human-resources" ||
    category === "talent" ||
    category === "customer-success" ||
    category === "sales"
  ) {
    return "contact";
  }
  return "about";
}

export type SocialCardRenderInput = {
  mode: "page" | "job";
  title: string;
  department: string;
  badge?: string;
  summary: string;
  location: string;
  employment: string;
  skill: string;
  category?: JobVisualCategory;
  accent?: string;
  arabic?: boolean;
  scene?: SceneKey;
  telemetry?: string;
  format?: "jpeg" | "png";
};

export async function renderSocialCardBuffer(input: SocialCardRenderInput): Promise<Buffer> {
  const format = input.format || "jpeg";
  const cacheKey = JSON.stringify({ ...input, format });
  const cached = renderedCardCache.get(cacheKey);
  if (cached) return cached;

  const category = input.category || "computer-vision";
  const arabic = Boolean(input.arabic || /[\u0600-\u06ff]/.test(input.title));
  const palette =
    accentPalette[(input.accent as keyof typeof accentPalette) || "blue"] || accentPalette.blue;

  const [{ regularBase64, boldBase64 }, logoDataUri] = await Promise.all([
    fontsBase64Promise,
    logoDataUriPromise,
  ]);

  const titleLines = wrapWords(input.title, arabic ? 23 : 24, 2);
  const summaryLines = wrapWords(input.summary, arabic ? 52 : 60, 2);
  const textX = arabic ? 696 : 74;
  const anchor = "start";
  const direction = arabic ? "rtl" : "ltr";

  const defaultBadge =
    input.mode === "page"
      ? arabic
        ? "الرؤية الحاسوبية وذكاء الحافة"
        : "COMPUTER VISION & EDGE AI"
      : arabic
      ? "فرصة وظيفية متاحة"
      : "WE'RE HIRING · OPEN ROLE";
  const topBadge = (input.badge || defaultBadge).slice(0, 36);

  const taskLabel =
    input.mode === "page"
      ? arabic
        ? "القدرات والتقنيات / 01"
        : "CAPABILITIES & FOCUS / 01"
      : arabic
      ? "المهمة والدور / 01"
      : "ROLE MISSION & IMPACT / 01";

  const actionText =
    input.mode === "page"
      ? arabic
        ? "استكشف الآن ↗"
        : "EXPLORE HIRZEXA ↗"
      : arabic
      ? "قدّم الآن ↗"
      : "APPLY FOR THIS ROLE ↗";

  const categoryLabel =
    input.mode === "page"
      ? (input.telemetry || "HUMAN-AI VISION · REAL TIME · ON DEVICE").slice(0, 42)
      : arabic && arabicCategoryLabels[category]
      ? arabicCategoryLabels[category]!
      : (jobVisualCategoryLabels[category] || "Computer Vision & Edge AI").toUpperCase();

  const titleFontSize = input.title.length > 46 ? 44 : input.title.length > 30 ? 50 : 56;
  const titleY = titleLines.length === 1 ? 262 : 232;
  const summaryLabelY = titleY + titleLines.length * (titleFontSize + 6) + 8;
  const chipsY = summaryLabelY + summaryLines.length * 26 + 38;

  const chips = [input.location, input.employment, input.skill].filter(Boolean);
  let chipCursor = 0;
  const chipElements = chips
    .map((label, idx) => {
      const width = Math.max(108, Math.min(230, Math.round(label.length * 8.4 + 34)));
      const x = arabic ? -chipCursor - width : chipCursor;
      chipCursor += width + 10;
      const isPrimary = idx === 0;
      return `<g transform="translate(${x} 0)">
        <rect width="${width}" height="38" rx="19" fill="${
          isPrimary ? "rgba(7, 84, 255, 0.1)" : "#FFFFFF"
        }" stroke="${
          isPrimary ? "rgba(7, 84, 255, 0.42)" : "rgba(120, 145, 225, 0.38)"
        }" stroke-width="1.3"/>
        <text x="${width / 2}" y="24" text-anchor="middle" font-size="12.5" font-weight="700" fill="${
          isPrimary ? "#0754FF" : "#1E294B"
        }">${xml(label)}</text>
      </g>`;
    })
    .join("");

  const deptWidth = Math.max(190, Math.round(input.department.length * 8.6 + 44));

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-grad" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#F6F8FF"/>
        <stop offset="52%" stop-color="#ECF1FF"/>
        <stop offset="100%" stop-color="#F2ECFF"/>
      </linearGradient>
      <radialGradient id="orb-blue" cx="78%" cy="22%" r="48%">
        <stop offset="0%" stop-color="${palette.primary}" stop-opacity="0.18"/>
        <stop offset="60%" stop-color="#35BEFF" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#F6F8FF" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="orb-violet" cx="18%" cy="84%" r="45%">
        <stop offset="0%" stop-color="#873BFF" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#F6F8FF" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="card-surface" x1="28" y1="24" x2="1172" y2="606" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
        <stop offset="60%" stop-color="#F7FAFF" stop-opacity="0.92"/>
        <stop offset="100%" stop-color="#F3F0FF" stop-opacity="0.95"/>
      </linearGradient>
      <linearGradient id="brand-pill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0754FF"/>
        <stop offset="52%" stop-color="#3566FF"/>
        <stop offset="100%" stop-color="#873BFF"/>
      </linearGradient>
      <linearGradient id="stage-dark" x1="736" y1="132" x2="1136" y2="464" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#07153E"/>
        <stop offset="52%" stop-color="#0D2568"/>
        <stop offset="100%" stop-color="#1E175A"/>
      </linearGradient>
      <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
        <path d="M44 0H0V44" fill="none" stroke="#1050FF" stroke-opacity="0.055"/>
      </pattern>
      <style>
        @font-face{font-family:Almarai;src:url(data:font/ttf;base64,${regularBase64});font-weight:400}
        @font-face{font-family:Almarai;src:url(data:font/ttf;base64,${boldBase64});font-weight:700}
        text{font-family:Almarai,Arial,sans-serif}
      </style>
    </defs>

    <rect width="1200" height="630" fill="url(#bg-grad)"/>
    <rect width="1200" height="630" fill="url(#orb-blue)"/>
    <rect width="1200" height="630" fill="url(#orb-violet)"/>
    <rect width="1200" height="630" fill="url(#grid)"/>

    <rect x="28" y="24" width="1144" height="582" rx="28" fill="url(#card-surface)" stroke="rgba(120, 145, 225, 0.38)" stroke-width="1.5"/>
    <rect x="74" y="24" width="220" height="4" rx="2" fill="url(#brand-pill)"/>

    <g transform="translate(74 56)">
      <image href="${logoDataUri}" x="0" y="0" width="42" height="42"/>
      <text x="56" y="23" font-size="22" font-weight="700" fill="#080D21">HIRZEXA</text>
      <text x="56" y="39" font-size="10.5" font-weight="700" letter-spacing="1.4" fill="#526285">COMPUTER VISION &amp; EDGE INTELLIGENCE</text>
    </g>

    <g transform="translate(866 56)">
      <rect width="258" height="40" rx="20" fill="#F0F5FF" stroke="rgba(16, 80, 255, 0.32)" stroke-width="1.3"/>
      <circle cx="22" cy="20" r="5" fill="#10B981"/>
      <circle cx="22" cy="20" r="9" fill="#10B981" fill-opacity="0.22"/>
      <text x="138" y="25" text-anchor="middle" direction="${direction}" font-size="11.5" font-weight="700" letter-spacing="${
    arabic ? 0 : 1.1
  }" fill="#0754FF">${xml(topBadge)}</text>
    </g>

    <g>
      <rect x="${arabic ? 696 - deptWidth : 74}" y="132" width="${deptWidth}" height="28" rx="14" fill="rgba(16, 80, 255, 0.08)" stroke="rgba(16, 80, 255, 0.22)" stroke-width="1"/>
      <circle cx="${arabic ? 680 : 90}" cy="146" r="4.5" fill="#0754FF"/>
      <text x="${arabic ? 666 : 104}" y="151" text-anchor="${anchor}" direction="${direction}" font-size="11.5" font-weight="700" letter-spacing="${
    arabic ? 0 : 1.2
  }" fill="#0754FF">${xml(input.department.toUpperCase())}</text>

      <text x="${textX}" y="${titleY}" text-anchor="${anchor}" direction="${direction}" unicode-bidi="embed" font-size="${titleFontSize}" font-weight="700" fill="#080D21">
        ${titleLines
          .map(
            (line, index) =>
              `<tspan x="${textX}" dy="${index ? titleFontSize + 6 : 0}">${xml(line)}</tspan>`
          )
          .join("")}
      </text>

      <rect x="${arabic ? 692 : 74}" y="${summaryLabelY - 12}" width="3.5" height="${
    summaryLines.length * 26 + 26
  }" rx="2" fill="url(#brand-pill)"/>
      <text x="${arabic ? 680 : 90}" y="${summaryLabelY}" text-anchor="${anchor}" direction="${direction}" font-size="10.5" font-weight="700" letter-spacing="${
    arabic ? 0 : 1.2
  }" fill="#0754FF">${xml(taskLabel)}</text>
      <text x="${arabic ? 680 : 90}" y="${
    summaryLabelY + 25
  }" text-anchor="${anchor}" direction="${direction}" unicode-bidi="embed" font-size="15.5" font-weight="400" fill="#465473">
        ${summaryLines
          .map(
            (line, index) =>
              `<tspan x="${arabic ? 680 : 90}" dy="${index ? 25 : 0}">${xml(line)}</tspan>`
          )
          .join("")}
      </text>

      <g transform="translate(${arabic ? 696 : 74} ${chipsY})" direction="${direction}">
        ${chipElements}
      </g>
    </g>

    <g>
      <rect x="730" y="126" width="402" height="346" rx="24" fill="#E6EEFF" stroke="rgba(16, 80, 255, 0.28)" stroke-width="1.5"/>
      <rect x="738" y="134" width="386" height="330" rx="18" fill="url(#stage-dark)" stroke="rgba(92, 225, 255, 0.45)" stroke-width="1.2"/>

      <circle cx="758" cy="155" r="4" fill="#35F2A6"/>
      <text x="770" y="159" font-size="10" font-weight="700" letter-spacing="1.1" fill="#E8F6FF">CAMERA · VISION · EDGE AI</text>
      <text x="1044" y="159" font-size="9.5" font-weight="700" fill="#5CE1FF">SYSTEM VIEW</text>

      <rect x="752" y="176" width="368" height="220" rx="14" fill="#0A1D53"/>
      <path d="M752 232H1120M752 288H1120M752 344H1120M808 176V396M864 176V396M920 176V396M976 176V396M1032 176V396M1088 176V396" stroke="#5CE1FF" stroke-opacity="0.1"/>
      <rect x="774" y="240" width="94" height="72" rx="12" fill="#1648A5" stroke="#5CE1FF" stroke-width="2"/>
      <rect x="786" y="229" width="40" height="12" rx="5" fill="#35BEFF"/>
      <circle cx="823" cy="276" r="24" fill="#0A1D53" stroke="#72E4FF" stroke-width="3"/>
      <circle cx="823" cy="276" r="12" fill="#1354CC" stroke="#A7EBFF" stroke-width="2"/>
      <circle cx="817" cy="270" r="3" fill="#FFFFFF"/>
      <path d="M868 276H900M980 276H1018" stroke="#6BDBFF" stroke-width="2.5" stroke-dasharray="6 5"/>
      <path d="M892 270L900 276L892 282M1010 270L1018 276L1010 282" fill="none" stroke="#6BDBFF" stroke-width="2"/>
      <rect x="902" y="218" width="78" height="116" rx="8" fill="#102A72" stroke="#A579FF" stroke-width="2"/>
      <rect x="909" y="230" width="64" height="91" rx="3" fill="none" stroke="#5CE1FF" stroke-width="1.5" stroke-dasharray="4 3"/>
      <circle cx="941" cy="252" r="8" fill="#A579FF"/>
      <path d="M941 261V292M941 270L924 282M941 270L958 282M941 292L928 309M941 292L954 309" stroke="#7CE7FF" stroke-width="3" stroke-linecap="round"/>
      <rect x="1018" y="235" width="78" height="82" rx="13" fill="#31257E" stroke="#A579FF" stroke-width="2"/>
      <rect x="1037" y="253" width="40" height="46" rx="6" fill="#0A1D53" stroke="#72E4FF" stroke-width="1.5"/>
      <path d="M1043 263H1071M1043 273H1071M1043 283H1071" stroke="#5CE1FF" stroke-width="2"/>
      <text x="792" y="358" font-size="10" font-weight="700" fill="#DDEEFF">CAMERA</text>
      <text x="914" y="358" font-size="10" font-weight="700" fill="#DDEEFF">DETECT</text>
      <text x="1034" y="358" font-size="10" font-weight="700" fill="#DDEEFF">EDGE AI</text>

      <rect x="752" y="176" width="368" height="220" rx="14" fill="none" stroke="rgba(92, 225, 255, 0.55)" stroke-width="1.4"/>
      <path d="M766 202V188H780M1106 202V188H1092M766 370V384H780M1106 370V384H1092" fill="none" stroke="#5CE1FF" stroke-width="2.2" stroke-linecap="round"/>

      <rect x="752" y="408" width="368" height="42" rx="11" fill="rgba(7, 18, 54, 0.86)" stroke="rgba(92, 225, 255, 0.38)" stroke-width="1"/>
      <circle cx="772" cy="429" r="4.5" fill="#35BEFF"/>
      <text x="786" y="433" font-size="11.5" font-weight="700" fill="#FFFFFF">${xml(categoryLabel)}</text>
      <text x="1046" y="433" font-size="10" font-weight="700" fill="#35F2A6">EDGE NPU</text>
    </g>

    <line x1="74" y1="498" x2="1126" y2="498" stroke="rgba(120, 145, 225, 0.28)" stroke-width="1.2"/>
    <text x="74" y="552" font-size="14.5" font-weight="700" fill="#080D21">
      Intelligence that sees the world. <tspan font-weight="400" fill="#526285">· Computer Vision, Edge AI &amp; Smart Devices</tspan>
    </text>

    <g transform="translate(888 520)">
      <rect width="238" height="50" rx="25" fill="url(#brand-pill)"/>
      <text x="119" y="31" text-anchor="middle" direction="${direction}" font-size="13.5" font-weight="700" letter-spacing="${
    arabic ? 0 : 0.8
  }" fill="#FFFFFF">${xml(actionText)}</text>
    </g>
  </svg>`;

  const pipeline = sharp(Buffer.from(svg));
  const buffer =
    format === "png"
      ? await pipeline.png({ compressionLevel: 4, quality: 90 }).toBuffer()
      : await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();

  if (renderedCardCache.size > 150) {
    const firstKey = renderedCardCache.keys().next().value;
    if (firstKey) renderedCardCache.delete(firstKey);
  }
  renderedCardCache.set(cacheKey, buffer);
  return buffer;
}


type JobLike = {
  title: string;
  department?: string;
  description?: string;
  responsibilities?: string[];
  location?: string;
  workMode?: string;
  employmentType?: string;
  skills?: string[];
  visualCategory?: JobVisualCategory;
  accentColor?: string;
};

function jobExcerpt(value: string, limit = 135) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const clipped = clean.slice(0, limit + 1).replace(/\s+\S*$/, "").trim();
  return `${clipped || clean.slice(0, limit).trim()}…`;
}

export function buildJobCardInput(job: JobLike | null | undefined, format: "jpeg" | "png" = "jpeg"): SocialCardRenderInput {
  const title = job?.title || "Engineer the Systems Behind Intelligent Vision";
  return {
    mode: "job",
    title,
    department: job?.department || "HIRZEXA CAREERS",
    summary: jobExcerpt(
      job?.responsibilities?.[0] ||
        job?.description ||
        "Join HIRZEXA in building computer vision models, Edge AI inference systems, and intelligent devices."
    ),
    location: job ? `${job.location} · ${job.workMode}` : "Remote · Global",
    employment: job?.employmentType || "Full-time",
    skill: job?.skills?.[0] || "Computer Vision & AI",
    category: job?.visualCategory || "computer-vision",
    accent: job?.accentColor || "blue",
    arabic: /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(title),
    format,
  };
}

/** Fire-and-forget: render the job card into the in-memory cache so crawlers get it instantly. */
export function warmJobCard(job: JobLike | null | undefined) {
  void renderSocialCardBuffer(buildJobCardInput(job)).catch(() => undefined);
}
