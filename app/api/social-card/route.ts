import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { JobVisualCategory } from "@/lib/data";
import { jobVisualCategoryLabels, normalizeVisualCategory } from "@/lib/job-visuals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fonts = Promise.all([
  readFile(join(process.cwd(), "public", "fonts", "Almarai-Regular.ttf")),
  readFile(join(process.cwd(), "public", "fonts", "Almarai-Bold.ttf")),
]);

const accentColors = {
  lime: "#dfff61",
  violet: "#d1c4ff",
  copper: "#ef9b75",
  sage: "#a9cdbb",
  blue: "#98b8ff",
} as const;

const arabicCategoryLabels: Partial<Record<JobVisualCategory, string>> = {
  "machine-learning": "تعلم الآلة",
  backend: "الأنظمة الخلفية",
  talent: "استقطاب المواهب",
  "human-resources": "الموارد البشرية",
  marketing: "التسويق",
  sales: "المبيعات",
  finance: "المالية",
  product: "هندسة المنتجات",
  design: "التصميم",
  operations: "العمليات",
  "customer-success": "نجاح العملاء",
};

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function cleanParam(url: URL, key: string, fallback: string, limit: number) {
  return (url.searchParams.get(key) || fallback).replace(/\s+/g, " ").trim().slice(0, limit);
}

function wrapWords(value: string, maxCharacters: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) {
    const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
    const remaining = words.slice(consumed).join(" ");
    lines.push(remaining.length > maxCharacters + 8 ? `${remaining.slice(0, maxCharacters + 5).replace(/\s+\S*$/, "")}…` : remaining);
  }
  return lines.slice(0, maxLines);
}

function categoryArt(category: JobVisualCategory, accent: string) {
  const circles = [[910,276],[961,252],[1014,278],[907,359],[961,382],[1017,356]];
  if (category === "human-resources" || category === "talent") return `<g fill="none" stroke="${accent}"><circle cx="962" cy="320" r="44" fill="${accent}16"/><circle cx="962" cy="320" r="17" fill="${accent}24"/></g>${circles.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#252a23" stroke="${accent}" stroke-width="2"/>`).join("")}`;
  if (category === "marketing") return `<g fill="none" stroke="${accent}"><circle cx="962" cy="320" r="85" opacity=".35"/><circle cx="962" cy="320" r="55" opacity=".7"/><circle cx="962" cy="320" r="24" fill="${accent}"/><path d="M962 320 L1031 275" stroke-width="3"/></g><circle cx="1031" cy="275" r="8" fill="${accent}"/>`;
  if (category === "sales") return `<g fill="${accent}16" stroke="${accent}"><rect x="858" y="259" width="208" height="42" rx="8"/><rect x="881" y="313" width="162" height="42" rx="8"/><rect x="913" y="367" width="98" height="42" rx="8"/></g>`;
  if (category === "finance") return `<g fill="${accent}">${[44,76,58,104,88,124].map((height,index) => `<rect x="${868 + index * 34}" y="${413 - height}" width="21" height="${height}" rx="4" opacity="${.45 + index * .09}"/>`).join("")}</g><path d="M854 414H1070" stroke="${accent}" opacity=".5"/>`;
  if (category === "product") return `<path d="M854 330H1070" stroke="${accent}" opacity=".7"/>${[870,930,994,1055].map((x,index) => `<g><circle cx="${x}" cy="330" r="10" fill="#252a23" stroke="${accent}" stroke-width="2"/><text x="${x}" y="367" text-anchor="middle" class="micro">${["DISCOVER","DEFINE","BUILD","LEARN"][index]}</text></g>`).join("")}`;
  if (category === "design") return `<rect x="855" y="247" width="215" height="155" rx="11" fill="#1d211c" stroke="${accent}"/><path d="M855 279H1070" stroke="${accent}" opacity=".45"/><rect x="873" y="300" width="68" height="80" rx="5" fill="${accent}12" stroke="${accent}" opacity=".65"/><rect x="956" y="300" width="95" height="80" rx="5" fill="${accent}18" stroke="${accent}"/>`;
  if (category === "customer-success") return `<path d="M850 386 C890 386 890 270 934 310 S991 404 1025 333 1050 276 1072 287" fill="none" stroke="${accent}" stroke-width="3"/><g fill="${accent}"><circle cx="850" cy="386" r="6"/><circle cx="934" cy="310" r="6"/><circle cx="1025" cy="333" r="6"/><circle cx="1072" cy="287" r="6"/></g>`;
  if (category === "audio-ai") return `<g fill="${accent}">${[28,54,88,42,72,116,62,37,92,67,46,84,52,31,64].map((height,index) => `<rect x="${858 + index * 14}" y="${320 - height/2}" width="7" height="${height}" rx="4" opacity="${.45 + (index%4)*.15}"/>`).join("")}</g>`;
  if (category === "computer-vision") return `<rect x="850" y="250" width="220" height="150" rx="8" fill="none" stroke="${accent}" opacity=".3"/><rect x="877" y="278" width="105" height="82" fill="${accent}08" stroke="${accent}" stroke-width="3"/><rect x="997" y="305" width="54" height="46" fill="none" stroke="${accent}"/>`;
  if (category === "machine-learning" || category === "llm") return `<g stroke="${accent}" opacity=".45">${circles.slice(0,5).map(([x,y],index) => `<path d="M962 320L${x} ${y}"/>`).join("")}</g><circle cx="962" cy="320" r="23" fill="${accent}22" stroke="${accent}" stroke-width="2"/>${circles.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#252a23" stroke="${accent}" stroke-width="2"/>`).join("")}`;
  if (category === "security") return `<path d="M962 248 L1020 271 V329 C1020 373 992 402 962 416 C932 402 904 373 904 329 V271 Z" fill="${accent}12" stroke="${accent}" stroke-width="3"/><circle cx="962" cy="325" r="18" fill="none" stroke="${accent}"/><path d="M962 343V366" stroke="${accent}" stroke-width="4"/>`;
  if (category === "backend" || category === "infrastructure" || category === "operations") return `${["API","QUEUE","MODEL","DATA"].map((label,index) => `<g><circle cx="${866 + index * 64}" cy="324" r="27" fill="${index === 2 ? `${accent}22` : "#252a23"}" stroke="${accent}"/><text x="${866 + index * 64}" y="328" text-anchor="middle" class="micro">${label}</text></g>`).join("")}`;
  return `<circle cx="962" cy="320" r="82" fill="none" stroke="${accent}" opacity=".35"/><circle cx="962" cy="320" r="51" fill="none" stroke="${accent}"/><circle cx="962" cy="320" r="8" fill="${accent}"/>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = cleanParam(url, "title", "Build what comes next", 120);
  const department = cleanParam(url, "department", "DEVTECH AI CAREERS", 80);
  const summary = cleanParam(url, "summary", "Build meaningful intelligent systems.", 160);
  const location = cleanParam(url, "location", "Remote", 40);
  const employment = cleanParam(url, "employment", "Open role", 40);
  const skill = cleanParam(url, "skill", "Engineering", 40);
  const category = normalizeVisualCategory(url.searchParams.get("category"));
  const accentName = url.searchParams.get("accent") as keyof typeof accentColors;
  const accent = accentColors[accentName] || accentColors.violet;
  const arabic = url.searchParams.get("lang") === "ar";
  const [regularFont, boldFont] = await fonts;
  const titleLines = wrapWords(title, arabic ? 24 : 25, 2);
  const summaryLines = wrapWords(summary, arabic ? 54 : 65, 2);
  const textX = arabic ? 716 : 64;
  const anchor = "start";
  const direction = arabic ? "rtl" : "ltr";
  const categoryLabel = arabic && arabicCategoryLabels[category] ? arabicCategoryLabels[category]! : jobVisualCategoryLabels[category].toUpperCase();
  const hiring = arabic ? "فرصة متاحة" : "WE'RE HIRING";
  const taskLabel = arabic ? "المهمة / 01" : "WHAT YOU'LL DO / 01";
  const action = arabic ? "استكشف الفرصة" : "VIEW ROLE";
  const titleY = titleLines.length === 1 ? 270 : 232;
  const summaryLabelY = titleY + titleLines.length * 58 + 18;
  const chipsY = summaryLabelY + summaryLines.length * 28 + 36;
  const chips: Array<readonly [string, number]> = [[location, 0], [employment, 1], [skill, 2]];
  const regular = regularFont.toString("base64");
  const bold = boldFont.toString("base64");
  const etag = `"${createHash("sha1").update(url.search).digest("hex")}"`;
  if (request.headers.get("if-none-match") === etag) return new Response(null, {status: 304, headers: {ETag: etag}});

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#ffffff" opacity=".035"/></pattern>
      <style>
        @font-face{font-family:Almarai;src:url(data:font/ttf;base64,${regular});font-weight:400}
        @font-face{font-family:Almarai;src:url(data:font/ttf;base64,${bold});font-weight:700}
        text{font-family:Almarai,Arial,sans-serif;fill:#f7f8ef}.muted{fill:#aeb5a9}.accent{fill:${accent}}.dark{fill:#1b1e19}.micro{font-size:7px;font-weight:700;fill:#bec5ba}
      </style>
    </defs>
    <rect width="1200" height="630" fill="#171a16"/><rect width="1200" height="630" fill="url(#grid)"/>
    <circle cx="1040" cy="95" r="285" fill="none" stroke="${accent}" opacity=".28"/><circle cx="1040" cy="95" r="220" fill="none" stroke="#d1c4ff" opacity=".25"/>
    <g transform="translate(64 58)"><rect y="18" width="7" height="13" rx="4" fill="${accent}"/><rect x="12" y="9" width="7" height="22" rx="4" fill="${accent}"/><rect x="24" width="7" height="31" rx="4" fill="${accent}"/><text x="46" y="27" font-size="23" font-weight="700">DEVTECH <tspan fill="${accent}">AI</tspan></text></g>
    <g transform="translate(965 54)"><rect width="171" height="43" rx="22" fill="#252a23" stroke="${accent}" opacity=".95"/><circle cx="20" cy="21.5" r="4" fill="${accent}"/><text x="98" y="27" text-anchor="middle" direction="${direction}" font-size="14" font-weight="700" class="accent">${xml(hiring)}</text></g>
    <circle cx="${arabic ? 716 : 67}" cy="185" r="5" fill="${accent}"/><text x="${arabic ? 700 : 84}" y="191" text-anchor="${anchor}" direction="${direction}" font-size="15" font-weight="700" letter-spacing="${arabic ? 0 : 1.6}" class="muted">${xml(department.toUpperCase())}</text>
    <text x="${textX}" y="${titleY}" text-anchor="${anchor}" direction="${direction}" unicode-bidi="embed" font-size="${title.length > 46 ? 45 : title.length > 30 ? 52 : 62}" font-weight="700">${titleLines.map((line,index) => `<tspan x="${textX}" dy="${index ? 58 : 0}">${xml(line)}</tspan>`).join("")}</text>
    <text x="${textX}" y="${summaryLabelY}" text-anchor="${anchor}" direction="${direction}" font-size="9" font-weight="700" letter-spacing="${arabic ? 0 : 1.2}" class="accent">${xml(taskLabel)}</text>
    <text x="${textX}" y="${summaryLabelY + 27}" text-anchor="${anchor}" direction="${direction}" unicode-bidi="embed" font-size="15" font-weight="400" class="muted">${summaryLines.map((line,index) => `<tspan x="${textX}" dy="${index ? 26 : 0}">${xml(line)}</tspan>`).join("")}</text>
    <g transform="translate(${arabic ? 716 : 64} ${chipsY})" direction="${direction}">${chips.map(([label,index]) => { const width = Math.max(82, label.length * 8.5 + 28); const offset = index === 0 ? 0 : index === 1 ? 96 : 206; const x = arabic ? -offset - width : offset; return `<g transform="translate(${x} 0)"><rect width="${width}" height="36" rx="18" fill="#ffffff08" stroke="#ffffff26"/><text x="${width/2}" y="23" text-anchor="middle" font-size="12" font-weight="700" class="${index < 2 ? "" : "muted"}">${xml(label)}</text></g>`;}).join("")}</g>
    <g><rect x="792" y="150" width="344" height="292" rx="18" fill="#252a23" opacity=".99" stroke="#ffffff" stroke-opacity=".14"/><text x="${arabic ? 1110 : 815}" y="181" text-anchor="${anchor}" direction="${direction}" font-size="10" font-weight="700" letter-spacing="${arabic ? 0 : 1.2}" class="muted">${arabic ? "ذكاء الدور" : "AI ROLE SIGNAL"}</text><circle cx="1109" cy="176" r="4" fill="${accent}"/><text x="${arabic ? 1110 : 815}" y="210" text-anchor="${anchor}" font-size="17" font-weight="700" class="accent" direction="${direction}">${xml(categoryLabel)}</text>${categoryArt(category,accent)}</g>
    <path d="M64 496H1136" stroke="#ffffff" opacity=".14"/><text x="64" y="557" font-size="14" class="muted">${arabic ? "هندسة ذكية. أثر حقيقي." : "Engineering intelligence with precision."}</text>
    <g transform="translate(962 523)"><rect width="174" height="53" rx="27" fill="${accent}"/><text x="74" y="33" text-anchor="middle" direction="${direction}" font-size="14" font-weight="700" class="dark">${xml(action)}</text><circle cx="146" cy="26.5" r="19" fill="#1b1e19"/><text x="146" y="33" text-anchor="middle" font-size="20">+</text></g>
  </svg>`;

  const image = await sharp(Buffer.from(svg)).png({compressionLevel: 9, palette: true}).toBuffer();
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(image.byteLength),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ETag: etag,
    },
  });
}
