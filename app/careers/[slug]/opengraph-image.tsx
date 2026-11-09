import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getJobBySlug } from "@/lib/db";
import type { JobVisualCategory } from "@/lib/data";
import { jobVisualCategoryLabels } from "@/lib/job-visuals";

export const runtime = "nodejs";
export const alt = "DevTech AI — Open Position in Computer Vision & Edge Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const socialFonts = Promise.all([
  readFile(join(process.cwd(), "public", "fonts", "Almarai-Regular.ttf")),
  readFile(join(process.cwd(), "public", "fonts", "Almarai-Bold.ttf")),
]);

const arabicText = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/;

function socialExcerpt(value: string, limit: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const clipped = clean.slice(0, limit + 1).replace(/\s+\S*$/, "").trim();
  return `${clipped || clean.slice(0, limit).trim()}…`;
}

function visualText(value: string, isArabic: boolean) {
  return isArabic ? value.trim().split(/\s+/).reverse().join(" ") : value;
}

function resolvePortraitFile(category: JobVisualCategory): string {
  if (category === "computer-vision" || category === "machine-learning" || category === "llm") {
    return "human-ai-technology.jpg";
  }
  if (category === "security" || category === "product" || category === "design") {
    return "human-ai-aegis.jpg";
  }
  if (category === "backend" || category === "infrastructure" || category === "operations") {
    return "human-ai-engineering.jpg";
  }
  if (category === "human-resources" || category === "talent" || category === "customer-success") {
    return "human-ai-contact.jpg";
  }
  return "human-ai-about.jpg";
}

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  const title = job?.title || "Engineer the Systems Behind Intelligent Vision";
  const category = job?.visualCategory || "computer-vision";
  const skills = job?.skills.slice(0, 2) || ["Computer Vision", "Edge AI"];
  const isArabic = arabicText.test(title);
  const titleSize = title.length > 42 ? 44 : title.length > 28 ? 50 : 56;
  const roleSummary = socialExcerpt(
    job?.responsibilities[0] ||
      job?.description ||
      "Join DevTech AI in building computer vision models, low-latency Edge AI systems, smart devices, and vision software platforms.",
    isArabic ? 85 : 115
  );

  const [[regularFont, boldFont], portraitUri] = await Promise.all([
    socialFonts,
    (async () => {
      try {
        const raw = await readFile(join(process.cwd(), "public", resolvePortraitFile(category)));
        const buf = await sharp(raw).resize(380, 226, { fit: "cover" }).jpeg({ quality: 86 }).toBuffer();
        return `data:image/jpeg;base64,${buf.toString("base64")}`;
      } catch {
        return "";
      }
    })(),
  ]);

  const categoryLabel = jobVisualCategoryLabels[category]?.toUpperCase() || "COMPUTER VISION & EDGE AI";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          overflow: "hidden",
          background: "linear-gradient(135deg, #F6F8FF 0%, #ECF1FF 52%, #F2ECFF 100%)",
          color: "#080D21",
          fontFamily: "Almarai",
          padding: "24px 28px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "36px 46px",
            borderRadius: 28,
            background: "rgba(255, 255, 255, 0.94)",
            border: "1.5px solid rgba(120, 145, 225, 0.38)",
            boxShadow: "0 24px 60px rgba(15, 38, 105, 0.10)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #0754FF 0%, #873BFF 100%)",
                  color: "#FFFFFF",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                D
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 22, fontWeight: 700 }}>
                  <span>DevTech</span>
                  <span style={{ color: "#0754FF" }}>AI</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#526285", letterSpacing: 1.3 }}>
                  COMPUTER VISION & EDGE INTELLIGENCE
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 18px",
                borderRadius: 999,
                background: "#F0F5FF",
                border: "1px solid rgba(16, 80, 255, 0.32)",
                color: "#0754FF",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "#10B981" }} />
              {visualText(isArabic ? "فرصة وظيفية متاحة" : "WE'RE HIRING · OPEN ROLE", isArabic)}
            </div>
          </div>

          {/* Main Content Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28 }}>
            <div
              style={{
                width: 620,
                display: "flex",
                flexDirection: "column",
                alignItems: isArabic ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: "rgba(16, 80, 255, 0.08)",
                  color: "#0754FF",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 999, background: "#0754FF" }} />
                {visualText(job?.department?.toUpperCase() || "DEVTECH AI CAREERS", isArabic)}
              </div>

              <div
                style={{
                  fontSize: titleSize,
                  lineHeight: 1.08,
                  fontWeight: 700,
                  color: "#080D21",
                  letterSpacing: isArabic ? 0 : -1.5,
                }}
              >
                {visualText(title, isArabic)}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 14,
                  paddingLeft: 14,
                  borderLeft: "3.5px solid #0754FF",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: "#0754FF", letterSpacing: 1.1 }}>
                  {visualText(isArabic ? "المهمة والدور / 01" : "ROLE MISSION & IMPACT / 01", isArabic)}
                </span>
                <span style={{ marginTop: 4, fontSize: 15, lineHeight: 1.45, color: "#465473" }}>
                  {visualText(roleSummary, isArabic)}
                </span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                {[job?.location || "Remote", job?.employmentType || "Full-time", skills[0] || "Vision & AI"].map(
                  (label, idx) => (
                    <span
                      key={`${label}-${idx}`}
                      style={{
                        display: "flex",
                        padding: "8px 15px",
                        borderRadius: 999,
                        background: idx === 0 ? "rgba(7, 84, 255, 0.1)" : "#FFFFFF",
                        border: idx === 0 ? "1px solid rgba(7, 84, 255, 0.42)" : "1px solid rgba(120, 145, 225, 0.38)",
                        color: idx === 0 ? "#0754FF" : "#1E294B",
                        fontSize: 12.5,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Right Column: Human-AI Eye-Contact Stage */}
            <div
              style={{
                width: 392,
                height: 328,
                borderRadius: 20,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "linear-gradient(140deg, #07153E 0%, #0D2568 55%, #1E175A 100%)",
                border: "1.5px solid rgba(92, 225, 255, 0.45)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, color: "#E8F6FF" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: "#35F2A6" }} />
                  <span>HUMAN-AI VISION · LIVE HUD</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#5CE1FF" }}>99.4% LOCK</span>
              </div>

              <div
                style={{
                  width: 364,
                  height: 214,
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "flex",
                  border: "1px solid rgba(92, 225, 255, 0.55)",
                }}
              >
                {portraitUri ? (
                  <img
                    src={portraitUri}
                    alt=""
                    width={364}
                    height={214}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "rgba(7, 18, 54, 0.85)",
                  border: "1px solid rgba(92, 225, 255, 0.35)",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF" }}>{categoryLabel}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#35F2A6" }}>EDGE NPU · 60 FPS</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 18,
              borderTop: "1px solid rgba(120, 145, 225, 0.28)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#526285" }}>
              <strong style={{ color: "#080D21" }}>Intelligence that sees the world.</strong>
              <span>· Computer Vision, Edge AI & Smart Devices</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "11px 24px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #0754FF 0%, #873BFF 100%)",
                color: "#FFFFFF",
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              {visualText(isArabic ? "قدّم الآن ↗" : "APPLY FOR THIS ROLE ↗", isArabic)}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Almarai", data: regularFont, style: "normal", weight: 400 },
        { name: "Almarai", data: boldFont, style: "normal", weight: 700 },
      ],
    }
  );
}
