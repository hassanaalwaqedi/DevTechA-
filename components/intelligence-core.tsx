export function IntelligenceCore({arabic = false}: {arabic?: boolean}) {
  return <div className="intelligence-core" role="img" aria-label={arabic ? "تصور تجريدي لأنظمة الذكاء الاصطناعي المترابطة" : "An abstract visualization of connected AI systems"}>
    <div className="core-top"><span>{arabic ? "تشريح فكرة" : "ANATOMY OF AN IDEA"}</span><span>{arabic ? "الشكل 001 ↗" : "FIG. 001 ↗"}</span></div>
    <div className="core-scene" aria-hidden="true"><div className="core-orbit core-orbit-one"/><div className="core-orbit core-orbit-two"/><div className="core-orbit core-orbit-three"/><div className="core-cross core-cross-one">✳</div><div className="core-cross core-cross-two">✳</div><div className="core-shape"><span className="core-glint"/><span className="core-glyph">✳</span></div><span className="core-tag core-tag-one">{arabic ? "مدخلات البيانات ↗" : "DATA IN ↗"}</span><span className="core-tag core-tag-two">{arabic ? "مخرجات ذكية ↗" : "INTELLIGENCE OUT ↗"}</span></div>
    <div className="core-bottom"><span><i/> {arabic ? "مصمم للتفكير بشكل مختلف" : "BUILT TO THINK DIFFERENTLY"}</span><span>{arabic ? "النموذج / النظام / العالم" : "MODEL / SYSTEM / WORLD"}</span></div>
  </div>;
}
