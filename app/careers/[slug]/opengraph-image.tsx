import { ImageResponse } from "next/og";
import { getJobBySlug } from "@/lib/db";

export const alt = "DevTech AI open role";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";

const accentColors = {
  lime: "#dfff61",
  violet: "#d1c4ff",
  copper: "#ef9b75",
  sage: "#a9cdbb",
  blue: "#98b8ff",
} as const;

export default async function OpenGraphImage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const job = await getJobBySlug(slug);
  const title = job?.title || "Build what comes next";
  const accent = accentColors[job?.accentColor || "violet"];
  const titleSize = title.length > 42 ? 52 : title.length > 28 ? 60 : 70;
  const skills = job?.skills.slice(0, 3) || ["AI", "Engineering", "Systems"];

  return new ImageResponse(
    <div style={{width: "100%", height: "100%", position: "relative", display: "flex", overflow: "hidden", background: "#171a16", color: "#f7f8ef", fontFamily: "Arial, sans-serif"}}>
      <div style={{position: "absolute", inset: 0, display: "flex", backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "48px 48px"}}/>
      <div style={{position: "absolute", top: -180, right: -130, width: 610, height: 610, display: "flex", border: `1px solid ${accent}55`, borderRadius: 999}}/>
      <div style={{position: "absolute", top: -105, right: -55, width: 460, height: 460, display: "flex", border: "1px solid #d1c4ff55", borderRadius: 999}}/>

      <div style={{width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "54px 64px"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <div style={{display: "flex", alignItems: "center", gap: 14}}>
            <div style={{height: 31, display: "flex", alignItems: "flex-end", gap: 5}}>
              <div style={{width: 7, height: 13, display: "flex", borderRadius: 5, background: accent}}/>
              <div style={{width: 7, height: 22, display: "flex", borderRadius: 5, background: accent}}/>
              <div style={{width: 7, height: 31, display: "flex", borderRadius: 5, background: accent}}/>
            </div>
            <div style={{display: "flex", alignItems: "baseline", gap: 7, fontSize: 23, fontWeight: 800, letterSpacing: 1}}>DEVTECH <span style={{color: accent}}>AI</span></div>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 10, padding: "11px 17px", border: `1px solid ${accent}80`, borderRadius: 999, background: "#252a23", color: accent, fontSize: 15, fontWeight: 800, letterSpacing: 1.4}}><span style={{width: 8, height: 8, display: "flex", borderRadius: 999, background: accent}}/> WE&apos;RE HIRING</div>
        </div>

        <div style={{maxWidth: 860, display: "flex", flexDirection: "column"}}>
          <div style={{display: "flex", alignItems: "center", gap: 12, marginBottom: 20, color: "#b9c0b4", fontSize: 16, fontWeight: 700, letterSpacing: 2}}>
            <span style={{width: 9, height: 9, display: "flex", borderRadius: 999, background: accent}}/>
            {job?.department?.toUpperCase() || "DEVTECH AI CAREERS"}
          </div>
          <div style={{display: "flex", fontSize: titleSize, lineHeight: 1.02, fontWeight: 700, letterSpacing: -2.7}}>{title}</div>
          <div style={{display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28}}>
            {[job?.location || "Remote", job?.employmentType || "Open role", ...skills].map((label, index) => <span key={`${label}-${index}`} style={{display: "flex", padding: "9px 13px", border: "1px solid rgba(255,255,255,.16)", borderRadius: 999, background: "rgba(255,255,255,.035)", color: index < 2 ? "#f7f8ef" : "#b9c0b4", fontSize: 14, fontWeight: 700}}>{label}</span>)}
          </div>
        </div>

        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 26, borderTop: "1px solid rgba(255,255,255,.14)"}}>
          <div style={{display: "flex", color: "#aeb5a9", fontSize: 15, letterSpacing: .7}}>Engineering intelligence with precision.</div>
          <div style={{display: "flex", alignItems: "center", gap: 20, padding: "8px 9px 8px 20px", borderRadius: 999, background: accent, color: "#1b1e19", fontSize: 16, fontWeight: 800}}>
            VIEW ROLE <span style={{width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "#1b1e19", color: "#fff", fontSize: 22}}>→</span>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
