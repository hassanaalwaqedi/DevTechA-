import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { JobVisualCategory } from "@/lib/data";
import { jobVisualCategoryLabels, normalizeVisualCategory } from "@/lib/job-visuals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fontsPromise = Promise.all([
  readFile(join(process.cwd(), "public", "fonts", "Almarai-Regular.ttf")),
  readFile(join(process.cwd(), "public", "fonts", "Almarai-Bold.ttf")),
]);

const sceneFiles = {
  technology: "human-ai-technology.jpg",
  aegis: "human-ai-aegis.jpg",
  engineering: "human-ai-engineering.jpg",
  about: "human-ai-about.jpg",
  contact: "human-ai-contact.jpg",
} as const;

type SceneKey = keyof typeof sceneFiles;

const portraitCache = new Map<SceneKey, Promise<string>>();

function getPortraitBase64(scene: SceneKey): Promise<string> {
  const cached = portraitCache.get(scene);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const filePath = join(process.cwd(), "public", sceneFiles[scene]);
      const raw = await readFile(filePath);
      const resized = await sharp(raw)
        .resize(372, 224, { fit: "cover", position: "attention" })
        .jpeg({ quality: 86 })
        .toBuffer();
      return `data:image/jpeg;base64,${resized.toString("base64")}`;
    } catch {
      return "";
    }
  })();

  portraitCache.set(scene, promise);
  return promise;
}

const accentPalette = {
  lime: { primary: "#0754FF", secondary: "#35BEFF", badgeBg: "#EAF2FF" },
  violet: { primary: "#6D28D9", secondary: "#873BFF", badgeBg: "#F1EBFF" },
  copper: { primary: "#0B4BFF", secondary: "#7C3AED", badgeBg: "#EDF1FF" },
  sage: { primary: "#065F46", secondary: "#10B981", badgeBg: "#E6FAF3" },
  blue: { primary: "#0754FF", secondary: "#35BEFF", badgeBg: "#EAF2FF" },
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

function cleanParam(url: URL, key: string, fallback: string, limit: number) {
  return (url.searchParams.get(key) || fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
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

function resolveScene(sceneParam: string | null, category: JobVisualCategory): SceneKey {
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "page" ? "page" : "job";
  const title = cleanParam(
    url,
    "title",
    mode === "page" ? "Intelligence that sees the world." : "Build what comes next",
    110
  );
  const department = cleanParam(
    url,
    "department",
    mode === "page" ? "DEVTECH AI · COMPUTER VISION & EDGE AI" : "DEVTECH AI CAREERS",
    80
  );
  const summary = cleanParam(
    url,
    "summary",
    "Computer vision models, low-latency Edge AI inference, smart devices, and vision software platforms.",
    165
  );
  const location = cleanParam(url, "location", mode === "page" ? "Computer Vision" : "Remote", 38);
  const employment = cleanParam(url, "employment", mode === "page" ? "On-Device Edge AI" : "Full-time", 38);
  const skill = cleanParam(url, "skill", mode === "page" ? "AEGIS AI & Smart Devices" : "Vision & AI", 38);
  const category = normalizeVisualCategory(url.searchParams.get("category"));
  const accentName = url.searchParams.get("accent") as keyof typeof accentPalette;
  const palette = accentPalette[accentName] || accentPalette.blue;
  const arabic = url.searchParams.get("lang") === "ar" || /[\u0600-\u06ff]/.test(title);
  const scene = resolveScene(url.searchParams.get("scene"), category);

  const etag = `"${createHash("sha1").update(`2027-v2:${url.search}`).digest("hex")}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const [[regularFont, boldFont], portraitDataUri] = await Promise.all([
    fontsPromise,
    getPortraitBase64(scene),
  ]);

  const titleLines = wrapWords(title, arabic ? 23 : 24, 2);
  const summaryLines = wrapWords(summary, arabic ? 52 : 60, 2);
  const textX = arabic ? 696 : 74;
  const anchor = "start";
  const direction = arabic ? "rtl" : "ltr";

  const defaultBadge =
    mode === "page"
      ? arabic
        ? "الرؤية الحاسوبية وذكاء الحافة"
        : "COMPUTER VISION & EDGE AI"
      : arabic
      ? "فرصة وظيفية متاحة"
      : "WE'RE HIRING · OPEN ROLE";
  const topBadge = cleanParam(url, "badge", defaultBadge, 36);

  const taskLabel =
    mode === "page"
      ? arabic
        ? "القدرات والتقنيات / 01"
        : "CAPABILITIES & FOCUS / 01"
      : arabic
      ? "المهمة والدور / 01"
      : "ROLE MISSION & IMPACT / 01";

  const actionText =
    mode === "page"
      ? arabic
        ? "استكشف الآن ↗"
        : "EXPLORE DEVTECH AI ↗"
      : arabic
      ? "قدّم الآن ↗"
      : "APPLY FOR THIS ROLE ↗";

  const categoryLabel =
    mode === "page"
      ? cleanParam(url, "telemetry", "HUMAN-AI VISION · 60 FPS · 11.4ms", 42)
      : arabic && arabicCategoryLabels[category]
      ? arabicCategoryLabels[category]!
      : jobVisualCategoryLabels[category].toUpperCase();

  const titleFontSize = title.length > 46 ? 44 : title.length > 30 ? 50 : 56;
  const titleY = titleLines.length === 1 ? 262 : 232;
  const summaryLabelY = titleY + titleLines.length * (titleFontSize + 6) + 8;
  const chipsY = summaryLabelY + summaryLines.length * 26 + 38;

  const chips = [location, employment, skill].filter(Boolean);
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
        }" stroke="${isPrimary ? "rgba(7, 84, 255, 0.42)" : "rgba(120, 145, 225, 0.38)"}" stroke-width="1.3"/>
        <text x="${width / 2}" y="24" text-anchor="middle" font-size="12.5" font-weight="700" fill="${
          isPrimary ? "#0754FF" : "#1E294B"
        }">${xml(label)}</text>
      </g>`;
    })
    .join("");

  const regularBase64 = regularFont.toString("base64");
  const boldBase64 = boldFont.toString("base64");

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
      <clipPath id="portrait-clip">
        <rect x="752" y="176" width="368" height="220" rx="14"/>
      </clipPath>
      <style>
        @font-face{font-family:Almarai;src:url(data:font/ttf;base64,${regularBase64});font-weight:400}
        @font-face{font-family:Almarai;src:url(data:font/ttf;base64,${boldBase64});font-weight:700}
        text{font-family:Almarai,Arial,sans-serif}
      </style>
    </defs>

    <!-- Background Canvas -->
    <rect width="1200" height="630" fill="url(#bg-grad)"/>
    <rect width="1200" height="630" fill="url(#orb-blue)"/>
    <rect width="1200" height="630" fill="url(#orb-violet)"/>
    <rect width="1200" height="630" fill="url(#grid)"/>

    <!-- Outer Glassmorphic Card Frame -->
    <rect x="28" y="24" width="1144" height="582" rx="28" fill="url(#card-surface)" stroke="rgba(120, 145, 225, 0.38)" stroke-width="1.5"/>

    <!-- Top Decorative Accent Bar -->
    <rect x="74" y="24" width="220" height="4" rx="2" fill="url(#brand-pill)"/>

    <!-- TOP HEADER: Brand Identity + Status Pill -->
    <g transform="translate(74 56)">
      <rect width="42" height="42" rx="12" fill="url(#brand-pill)"/>
      <path d="M13 13H22C26.5 13 30 16.5 30 21C30 25.5 26.5 29 22 29H13V13Z" fill="none" stroke="#FFFFFF" stroke-width="2.6"/>
      <circle cx="21.5" cy="21" r="3.2" fill="#5CE1FF"/>
      <text x="56" y="23" font-size="22" font-weight="700" fill="#080D21">DevTech <tspan fill="#0754FF">AI</tspan></text>
      <text x="56" y="39" font-size="10.5" font-weight="700" letter-spacing="1.4" fill="#526285">COMPUTER VISION &amp; EDGE INTELLIGENCE</text>
    </g>

    <!-- Top Right Pill -->
    <g transform="translate(866 56)">
      <rect width="258" height="40" rx="20" fill="#F0F5FF" stroke="rgba(16, 80, 255, 0.32)" stroke-width="1.3"/>
      <circle cx="22" cy="20" r="5" fill="#10B981"/>
      <circle cx="22" cy="20" r="9" fill="#10B981" fill-opacity="0.22"/>
      <text x="138" y="25" text-anchor="middle" direction="${direction}" font-size="11.5" font-weight="700" letter-spacing="${arabic ? 0 : 1.1}" fill="#0754FF">${xml(topBadge)}</text>
    </g>

    <!-- LEFT COLUMN: Kicker, Headline, Mission Summary & Metadata Chips -->
    <g>
      <rect x="${arabic ? 696 - Math.max(190, Math.round(department.length * 8.6 + 44)) : 74}" y="132" width="${Math.max(190, Math.round(department.length * 8.6 + 44))}" height="28" rx="14" fill="rgba(16, 80, 255, 0.08)" stroke="rgba(16, 80, 255, 0.22)" stroke-width="1"/>
      <circle cx="${arabic ? 680 : 90}" cy="146" r="4.5" fill="#0754FF"/>
      <text x="${arabic ? 666 : 104}" y="151" text-anchor="${anchor}" direction="${direction}" font-size="11.5" font-weight="700" letter-spacing="${arabic ? 0 : 1.2}" fill="#0754FF">${xml(department.toUpperCase())}</text>

      <!-- Main Title -->
      <text x="${textX}" y="${titleY}" text-anchor="${anchor}" direction="${direction}" unicode-bidi="embed" font-size="${titleFontSize}" font-weight="700" fill="#080D21">
        ${titleLines
          .map(
            (line, index) =>
              `<tspan x="${textX}" dy="${index ? titleFontSize + 6 : 0}">${xml(line)}</tspan>`
          )
          .join("")}
      </text>

      <!-- Mission / Overview Callout -->
      <rect x="${arabic ? 692 : 74}" y="${summaryLabelY - 12}" width="3.5" height="${summaryLines.length * 26 + 26}" rx="2" fill="url(#brand-pill)"/>
      <text x="${arabic ? 680 : 90}" y="${summaryLabelY}" text-anchor="${anchor}" direction="${direction}" font-size="10.5" font-weight="700" letter-spacing="${arabic ? 0 : 1.2}" fill="#0754FF">${xml(taskLabel)}</text>
      <text x="${arabic ? 680 : 90}" y="${summaryLabelY + 25}" text-anchor="${anchor}" direction="${direction}" unicode-bidi="embed" font-size="15.5" font-weight="400" fill="#465473">
        ${summaryLines
          .map((line, index) => `<tspan x="${arabic ? 680 : 90}" dy="${index ? 25 : 0}">${xml(line)}</tspan>`)
          .join("")}
      </text>

      <!-- Metadata Pills -->
      <g transform="translate(${arabic ? 696 : 74} ${chipsY})" direction="${direction}">
        ${chipElements}
      </g>
    </g>

    <!-- RIGHT COLUMN: 2027 Human-AI Eye-Contact & Computer Vision HUD Stage -->
    <g>
      <!-- Outer Glass Glow Frame -->
      <rect x="730" y="126" width="402" height="346" rx="24" fill="#E6EEFF" stroke="rgba(16, 80, 255, 0.28)" stroke-width="1.5"/>
      <!-- Deep Sapphire Inner Stage -->
      <rect x="738" y="134" width="386" height="330" rx="18" fill="url(#stage-dark)" stroke="rgba(92, 225, 255, 0.45)" stroke-width="1.2"/>

      <!-- Stage Top Chrome -->
      <circle cx="758" cy="155" r="4" fill="#35F2A6"/>
      <text x="770" y="159" font-size="10" font-weight="700" letter-spacing="1.1" fill="#E8F6FF">HUMAN-AI EYE CONTACT · LIVE HUD</text>
      <text x="1044" y="159" font-size="9.5" font-weight="700" fill="#5CE1FF">99.4% LOCK</text>

      <!-- Photorealistic Human-AI Eye-Contact Portrait -->
      ${
        portraitDataUri
          ? `<image href="${portraitDataUri}" x="752" y="176" width="368" height="220" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait-clip)"/>`
          : `<rect x="752" y="176" width="368" height="220" rx="14" fill="#102A72"/>`
      }

      <!-- Translucent HUD Vignette & Corner Brackets over Portrait -->
      <rect x="752" y="176" width="368" height="220" rx="14" fill="none" stroke="rgba(92, 225, 255, 0.55)" stroke-width="1.4"/>
      <path d="M766 202V188H780M1106 202V188H1092M766 370V384H780M1106 370V384H1092" fill="none" stroke="#5CE1FF" stroke-width="2.2" stroke-linecap="round"/>

      <!-- Subtle Optical Iris Reticle -->
      <circle cx="936" cy="276" r="46" fill="none" stroke="rgba(92, 225, 255, 0.55)" stroke-width="1.3" stroke-dasharray="5 4"/>
      <circle cx="936" cy="276" r="62" fill="none" stroke="rgba(165, 130, 255, 0.42)" stroke-width="1.1"/>
      <path d="M880 276H892M980 276H992M936 220V232M936 320V332" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1.3" stroke-linecap="round"/>

      <!-- Bottom Telemetry Bar inside Sapphire Stage -->
      <rect x="752" y="408" width="368" height="42" rx="11" fill="rgba(7, 18, 54, 0.86)" stroke="rgba(92, 225, 255, 0.38)" stroke-width="1"/>
      <circle cx="772" cy="429" r="4.5" fill="#35BEFF"/>
      <text x="786" y="433" font-size="11.5" font-weight="700" fill="#FFFFFF">${xml(categoryLabel)}</text>
      <text x="1046" y="433" font-size="10" font-weight="700" fill="#35F2A6">EDGE NPU</text>
    </g>

    <!-- FOOTER BAR -->
    <line x1="74" y1="498" x2="1126" y2="498" stroke="rgba(120, 145, 225, 0.28)" stroke-width="1.2"/>
    <text x="74" y="552" font-size="14.5" font-weight="700" fill="#080D21">
      Intelligence that sees the world. <tspan font-weight="400" fill="#526285">· Computer Vision, Edge AI &amp; Smart Devices</tspan>
    </text>

    <!-- CTA Pill Button -->
    <g transform="translate(888 520)">
      <rect width="238" height="50" rx="25" fill="url(#brand-pill)"/>
      <text x="119" y="31" text-anchor="middle" direction="${direction}" font-size="13.5" font-weight="700" letter-spacing="${arabic ? 0 : 0.8}" fill="#FFFFFF">${xml(actionText)}</text>
    </g>
  </svg>`;

  const image = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, quality: 92 })
    .toBuffer();

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(image.byteLength),
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      ETag: etag,
    },
  });
}
