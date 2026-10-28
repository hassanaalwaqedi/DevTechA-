import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getJobBySlug } from "@/lib/db";
import type { JobVisualCategory } from "@/lib/data";
import { jobVisualCategoryLabels } from "@/lib/job-visuals";

export const runtime = "nodejs";
export const alt = "DevTech AI open role";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";

const socialFonts = Promise.all([
  readFile(join(process.cwd(), "public", "fonts", "Almarai-Regular.ttf")),
  readFile(join(process.cwd(), "public", "fonts", "Almarai-Bold.ttf")),
]);
const arabicText = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/;

const accentColors = {
  lime: "#dfff61",
  violet: "#d1c4ff",
  copper: "#ef9b75",
  sage: "#a9cdbb",
  blue: "#98b8ff",
} as const;

const nodePositions = [[18,24],[72,18],[15,72],[74,70],[45,8],[44,78]];

const arabicCategoryLabels: Record<JobVisualCategory, string> = {
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
  default: "هندسة ذكية",
  disabled: "هوية مخصصة",
};

function CategoryVisual({category, accent, isArabic}: {category: JobVisualCategory; accent: string; isArabic: boolean}) {
  const pipeline = category === "operations" ? ["INTAKE","PLAN","DELIVER","REVIEW"] : ["API","QUEUE","MODEL","DATA"];
  const people = category === "human-resources" || category === "talent";
  const infrastructure = category === "backend" || category === "infrastructure" || category === "operations";
  const categoryLabel = isArabic ? arabicCategoryLabels[category] : jobVisualCategoryLabels[category].toUpperCase();

  return <div style={{width: 344, height: 292, position: "relative", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", padding: "20px 22px", border: "1px solid rgba(255,255,255,.14)", borderRadius: 18, background: "rgba(37,42,35,.94)"}}>
    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", color: "#aeb5a9", fontSize: 10, fontWeight: 700, letterSpacing: isArabic ? 0 : 1.3}}><span>{isArabic ? "ذكاء الدور" : "AI ROLE SIGNAL"}</span><span style={{width: 7, height: 7, display: "flex", borderRadius: 99, background: accent, boxShadow: `0 0 18px ${accent}`}}/></div>
    <div dir={isArabic ? "rtl" : "ltr"} style={{display: "flex", alignSelf: isArabic ? "flex-end" : "flex-start", marginTop: 7, color: accent, fontSize: 17, fontWeight: 700, letterSpacing: isArabic ? 0 : .5}}>{categoryLabel}</div>
    <div style={{height: 190, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10, overflow: "hidden"}}>
      {people ? <div style={{width: 190, height: 170, position: "relative", display: "flex", alignItems: "center", justifyContent: "center"}}><div style={{width: 78, height: 78, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 99, border: `1px solid ${accent}`, background: `${accent}18`, color: accent, fontSize: 10, fontWeight: 700}}>{isArabic ? "فريق" : "PEOPLE"}</div>{nodePositions.map(([left,top],index)=><span key={index} style={{position: "absolute", left: `${left}%`, top: `${top}%`, width: 16, height: 16, display: "flex", borderRadius: 99, border: `2px solid ${accent}`, background: "#252a23", boxShadow: `0 0 0 4px ${accent}18`}}/>)}</div> : null}
      {category === "marketing" ? <div style={{width: 190, height: 170, position: "relative", display: "flex", alignItems: "center", justifyContent: "center"}}><div style={{position: "absolute", width: 150, height: 150, display: "flex", border: `1px solid ${accent}50`, borderRadius: 99}}/><div style={{position: "absolute", width: 100, height: 100, display: "flex", border: `1px solid ${accent}90`, borderRadius: 99}}/><div style={{width: 58, height: 58, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 99, background: accent, color: "#1b1e19", fontSize: 9, fontWeight: 900}}>REACH</div>{nodePositions.slice(0,4).map(([left,top],index)=><span key={index} style={{position: "absolute", left: `${left}%`, top: `${top}%`, width: 8, height: 8, display: "flex", borderRadius: 99, background: accent}}/>)}</div> : null}
      {category === "sales" ? <div style={{width: 230, display: "flex", flexDirection: "column", alignItems: "center", gap: 8}}>{[["LEADS","240",210],["QUALIFIED","86",155],["WON","24",98]].map(([label,value,width])=><div key={String(label)} style={{width: Number(width), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${accent}80`, borderRadius: 7, background: `${accent}12`, color: "#dfe5da", fontSize: 9, letterSpacing: .7}}><span>{label}</span><strong style={{color:accent,fontSize:13}}>{value}</strong></div>)}</div> : null}
      {category === "finance" ? <div style={{width: 235, height: 145, display: "flex", alignItems: "flex-end", gap: 12, padding: "0 8px 8px", borderBottom: `1px solid ${accent}80`}}>{[42,68,54,83,72,94].map((height,index)=><span key={index} style={{width: 25, height: `${height}%`, display: "flex", background: `linear-gradient(180deg, ${accent}35, ${accent})`, borderRadius: "5px 5px 0 0"}}/>)}</div> : null}
      {category === "product" ? <div style={{width: 260, height: 120, position: "relative", display: "flex", alignItems: "center"}}><div style={{position:"absolute",left:10,right:10,top:52,width:240,height:1,display:"flex",background:`${accent}90`}}/>{["DISCOVER","DEFINE","BUILD","LEARN"].map((stage,index)=><div key={stage} style={{position:"absolute",left:index*73,top:40,width:48,display:"flex",flexDirection:"column",alignItems:"center",gap:16,color:"#bac2b6",fontSize:7,letterSpacing:.5}}><span style={{width:16,height:16,display:"flex",borderRadius:99,border:`2px solid ${accent}`,background:"#252a23"}}/>{stage}</div>)}</div> : null}
      {category === "design" ? <div style={{width: 235, height: 145, display: "flex", flexDirection: "column", padding: 11, border: `1px solid ${accent}80`, borderRadius: 8, background: "#1d211c"}}><div style={{height:16,display:"flex",gap:5,borderBottom:"1px solid rgba(255,255,255,.12)"}}>{[.4,.7,1].map((opacity,index)=><span key={index} style={{width:6,height:6,display:"flex",borderRadius:99,background:accent,opacity}}/>)}</div><div style={{display:"flex",flex:1,gap:8,paddingTop:9}}><div style={{width:78,display:"flex",flexDirection:"column",gap:8}}><span style={{display:"flex",flex:1,border:`1px solid ${accent}45`,borderRadius:4}}/><span style={{display:"flex",flex:1,border:`1px solid ${accent}45`,borderRadius:4}}/></div><span style={{display:"flex",flex:1,border:`1px solid ${accent}80`,borderRadius:4,background:`${accent}12`}}/></div></div> : null}
      {category === "customer-success" ? <div style={{width:270,height:140,position:"relative",display:"flex"}}><svg width="270" height="140" viewBox="0 0 270 140"><path d="M8 115 C55 115 53 25 98 50 S155 128 196 73 235 24 264 35" fill="none" stroke={accent} strokeWidth="2"/></svg>{["ONBOARD","ADOPT","GROW"].map((stage,index)=><span key={stage} style={{position:"absolute",left:8+index*92,top:112-index*31,display:"flex",padding:"5px 7px",border:`1px solid ${accent}70`,borderRadius:99,background:"#252a23",color:"#c3cac0",fontSize:7}}>{stage}</span>)}</div> : null}
      {category === "audio-ai" ? <div style={{width:255,height:130,display:"flex",alignItems:"center",gap:6}}>{[25,58,92,47,76,110,62,38,94,70,48,88,55,30,65,100,52,78].map((height,index)=><span key={index} style={{width:8,height,display:"flex",borderRadius:4,background:`linear-gradient(180deg,${accent},${accent}20)`}}/>)}</div> : null}
      {category === "computer-vision" ? <div style={{width:245,height:145,position:"relative",display:"flex",border:"1px solid rgba(255,255,255,.08)"}}><div style={{position:"absolute",left:22,top:25,width:105,height:85,display:"flex",border:`2px solid ${accent}`}}><span style={{position:"absolute",top:-18,color:accent,fontSize:7}}>OBJ-01 / 94%</span></div><div style={{position:"absolute",right:18,top:47,width:72,height:58,display:"flex",border:`1px solid ${accent}aa`}}/></div> : null}
      {category === "machine-learning" ? <div style={{width:240,height:145,position:"relative",display:"flex"}}>{nodePositions.map(([left,top],index)=><span key={index} style={{position:"absolute",left:`${left}%`,top:`${top}%`,width:index%2?17:13,height:index%2?17:13,display:"flex",borderRadius:99,border:`2px solid ${accent}`,background:"#252a23",boxShadow:`0 0 18px ${accent}45`}}/>)}</div> : null}
      {category === "llm" ? <div style={{width:255,display:"flex",flexDirection:"column",gap:8}}>{["INPUT / CONTEXT","EMBED / ATTEND","REASON / OUTPUT"].map((token,index)=><span key={token} style={{display:"flex",alignSelf:index===1?"center":index===2?"flex-end":"flex-start",padding:"10px 13px",border:`1px solid ${accent}75`,borderRadius:7,color:accent,fontSize:9,letterSpacing:.8}}>{token}</span>)}</div> : null}
      {category === "security" ? <div style={{width:120,height:120,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${accent}`,borderRadius:"44px 44px 60px 60px",color:accent,fontSize:10,fontWeight:800,boxShadow:`inset 0 0 30px ${accent}12`}}>SECURE</div> : null}
      {infrastructure ? <div style={{display:"flex",alignItems:"center",gap:7}}>{pipeline.map((stage,index)=><div key={stage} style={{width:61,height:61,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${accent}80`,borderRadius:99,background:index===2?`${accent}18`:"#252a23",color:index===2?accent:"#bdc5ba",fontSize:7}}>{stage}</div>)}</div> : null}
      {category === "default" || category === "disabled" ? <div style={{width:155,height:155,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{position:"absolute",inset:0,display:"flex",border:`1px solid ${accent}65`,borderRadius:99}}/><div style={{position:"absolute",inset:25,display:"flex",border:`1px solid ${accent}`,borderRadius:99}}/><span style={{color:accent,fontSize:28}}>+</span></div> : null}
    </div>
  </div>;
}

export default async function OpenGraphImage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const job = await getJobBySlug(slug);
  const title = job?.title || "Build what comes next";
  const accent = accentColors[job?.accentColor || "violet"];
  const titleSize = title.length > 42 ? 48 : title.length > 28 ? 57 : 68;
  const skills = job?.skills.slice(0, 3) || ["AI", "Engineering", "Systems"];
  const isArabic = arabicText.test(title);
  const [regularFont, boldFont] = await socialFonts;

  return new ImageResponse(
    <div style={{width: "100%", height: "100%", position: "relative", display: "flex", overflow: "hidden", background: "#171a16", color: "#f7f8ef", fontFamily: "Almarai"}}>
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
          <div style={{display: "flex", alignItems: "center", gap: 10, padding: "11px 17px", border: `1px solid ${accent}80`, borderRadius: 999, background: "#252a23", color: accent, fontSize: 15, fontWeight: 700, letterSpacing: isArabic ? 0 : 1.4}}><span style={{width: 8, height: 8, display: "flex", borderRadius: 999, background: accent}}/> {isArabic ? "فرصة متاحة" : "WE'RE HIRING"}</div>
        </div>

        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28}}>
          <div dir={isArabic ? "rtl" : "ltr"} style={{width: 680, display: "flex", flexDirection: "column", alignItems: isArabic ? "flex-end" : "flex-start", textAlign: isArabic ? "right" : "left"}}>
            <div style={{display: "flex", alignItems: "center", gap: 12, marginBottom: 20, color: "#b9c0b4", fontSize: 16, fontWeight: 700, letterSpacing: 2}}>
              <span style={{width: 9, height: 9, display: "flex", borderRadius: 999, background: accent}}/>
              {job?.department?.toUpperCase() || "DEVTECH AI CAREERS"}
            </div>
            <div style={{display: "flex", fontSize: titleSize, lineHeight: 1.02, fontWeight: 700, letterSpacing: -2.7}}>{title}</div>
            <div style={{display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28}}>
              {[job?.location || "Remote", job?.employmentType || "Open role", ...skills.slice(0,2)].map((label, index) => <span key={`${label}-${index}`} style={{display: "flex", padding: "9px 13px", border: "1px solid rgba(255,255,255,.16)", borderRadius: 999, background: "rgba(255,255,255,.035)", color: index < 2 ? "#f7f8ef" : "#b9c0b4", fontSize: 14, fontWeight: 700}}>{label}</span>)}
            </div>
          </div>
          <CategoryVisual category={job?.visualCategory || "default"} accent={accent} isArabic={isArabic}/>
        </div>

        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 26, borderTop: "1px solid rgba(255,255,255,.14)"}}>
          <div style={{display: "flex", color: "#aeb5a9", fontSize: 15, letterSpacing: isArabic ? 0 : .7}}>{isArabic ? "هندسة ذكية. أثر حقيقي." : "Engineering intelligence with precision."}</div>
          <div style={{display: "flex", alignItems: "center", gap: 20, padding: "8px 9px 8px 20px", borderRadius: 999, background: accent, color: "#1b1e19", fontSize: 16, fontWeight: 800}}>
            {isArabic ? "استكشف الفرصة" : "VIEW ROLE"} <span style={{width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "#1b1e19", color: "#fff", fontSize: 22}}>+</span>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {name: "Almarai", data: regularFont, style: "normal", weight: 400},
        {name: "Almarai", data: boldFont, style: "normal", weight: 700},
      ],
    },
  );
}
