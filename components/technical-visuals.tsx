export function ComputationalSculpture() {
  return <div className="sculpture" role="img" aria-label="Abstract layered computational architecture">
    <div className="sculpture-meta"><span>FIG. 01 / SYSTEM STUDY</span><span>DEVTECH AI</span></div>
    <svg viewBox="0 0 600 480" aria-hidden="true">
      <defs><linearGradient id="plate" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ead6c4"/><stop offset=".45" stopColor="#c98262"/><stop offset="1" stopColor="#4b3433"/></linearGradient><linearGradient id="edge" x1="0" x2="1"><stop stopColor="#c76a45" stopOpacity=".15"/><stop offset=".5" stopColor="#f5c3a2"/><stop offset="1" stopColor="#b5a0d9" stopOpacity=".3"/></linearGradient></defs>
      <g className="sculpture-stack" transform="translate(300 243)">
        {Array.from({length: 13}, (_, i) => <g key={i} transform={`translate(0 ${i * 7 - 43})`} opacity={.2 + i * .045}><path d="M0 -146 L205 -48 L0 51 L-205 -48 Z" fill={i === 6 ? "url(#plate)" : "none"} fillOpacity=".12" stroke="url(#edge)" strokeWidth="1"/><path d="M0 -146 L0 51 M-205 -48 L205 -48 M-102 -97 L102 1 M102 -97 L-102 1" fill="none" stroke="#e0af94" strokeOpacity=".24" strokeWidth=".65"/></g>)}
        <path d="M0 -189 V94 M-205 -91 V-3 M205 -91 V-3" stroke="#c76a45" strokeOpacity=".45" strokeDasharray="2 7"/>
        <circle cy="-48" r="3" fill="#f4d8bf"/><circle cx="-205" cy="-48" r="2" fill="#a5c9bf"/><circle cx="205" cy="-48" r="2" fill="#b5a0d9"/>
      </g>
    </svg><div className="sculpture-caption"><span>INTELLIGENCE, IN LAYERS</span><span>MODEL / SYSTEM / OPERATION</span></div>
  </div>;
}

export function ArchitectureDiagram({arabic = false}: {arabic?: boolean}) {
  return <div className="architecture-diagram" aria-label={arabic ? "تصور لمعمارية نظام ذكاء اصطناعي" : "Conceptual AI system architecture"}><div className="diagram-heading"><span>{arabic ? "معمارية مرجعية" : "REFERENCE ARCHITECTURE"}</span><span>01 — 04</span></div><div className="diagram-flow"><div><small>01 / {arabic ? "المدخلات" : "INPUT"}</small><strong>{arabic ? <>خدمات<br/>البيانات</> : <>Data<br/>services</>}</strong><span>{arabic ? "السياق والاسترجاع" : "Context & retrieval"}</span></div><i aria-hidden="true">{arabic ? "←" : "→"}</i><div><small>02 / {arabic ? "المعالجة" : "COMPUTE"}</small><strong>{arabic ? <>تشغيل<br/>النموذج</> : <>Model<br/>inference</>}</strong><span>{arabic ? "التقييم والتشغيل" : "Evaluation & serving"}</span></div><i aria-hidden="true">{arabic ? "←" : "→"}</i><div><small>03 / {arabic ? "التقديم" : "DELIVERY"}</small><strong>{arabic ? <>أنظمة<br/>الإنتاج</> : <>Production<br/>systems</>}</strong><span>{arabic ? "الواجهات والتكامل" : "APIs & integration"}</span></div></div><div className="diagram-monitor"><span>04 / {arabic ? "المراقبة" : "OBSERVABILITY"}</span><span>{arabic ? "مراقبة · ملاحظات · تحسين مستمر" : "Monitoring · feedback · iteration ↺"}</span></div></div>;
}

export function ModelDiagram({arabic = false}: {arabic?: boolean}) {
  return <div className="model-diagram" aria-label={arabic ? "تصور لمراحل تطوير النموذج" : "Illustrative model development workflow"}><div className="diagram-heading"><span>{arabic ? "تطوير النموذج" : "MODEL DEVELOPMENT"}</span><span>{arabic ? "مخطط توضيحي" : "CONCEPTUAL WORKFLOW"}</span></div><div className="model-flow"><div><span>01</span><strong>{arabic ? "البيانات" : "Data"}</strong><small>{arabic ? "إعداد وتنظيم" : "Prepare & curate"}</small></div><b>↗</b><div><span>02</span><strong>{arabic ? "النموذج" : "Model"}</strong><small>{arabic ? "تدريب وتكييف" : "Train & adapt"}</small></div><b>↗</b><div><span>03</span><strong>{arabic ? "التقييم" : "Evaluate"}</strong><small>{arabic ? "قياس وتحسين" : "Measure & refine"}</small></div></div><div className="model-foot">{arabic ? "تجربة ← تقييم ← تطوير" : "EXPERIMENT → EVALUATE → ITERATE"}</div></div>;
}
