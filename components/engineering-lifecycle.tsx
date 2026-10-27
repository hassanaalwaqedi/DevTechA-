"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

const stages = [
  ["01", "Research & Discovery", "Define the operating environment, risks, data constraints, and technical feasibility before choosing a model."],
  ["02", "System Architecture", "Map services, interfaces, failure modes, data boundaries, and the human decisions the system will support."],
  ["03", "Data Engineering", "Build governed data flows, annotation strategy, retrieval pipelines, and evaluation datasets."],
  ["04", "Model Development", "Select, adapt, and evaluate models against the task—not a generic benchmark."],
  ["05", "Evaluation & Optimization", "Instrument quality, latency, cost, safety, and edge cases to make tradeoffs visible."],
  ["06", "Deployment", "Package inference, integrations, and delivery infrastructure for dependable operation."],
  ["07", "Monitoring", "Observe drift, quality signals, runtime behavior, and the next iteration of the system."],
] as const;
const arabicStages = [["01", "البحث والاكتشاف", "نحدد بيئة التشغيل والمخاطر وقيود البيانات والجدوى التقنية قبل اختيار النموذج."], ["02", "معمارية النظام", "نرسم الخدمات والواجهات وحدود البيانات وطرق التعامل مع الأعطال والقرارات البشرية."], ["03", "هندسة البيانات", "نبني تدفقات بيانات منظمة واستراتيجية للتصنيف والاسترجاع ومجموعات التقييم."], ["04", "تطوير النموذج", "نختار النماذج ونكيّفها ونقيّمها وفق المهمة واحتياجاتها الفعلية."], ["05", "التقييم والتحسين", "نقيس الجودة والسرعة والتكلفة والسلامة والحالات الاستثنائية لتوضيح المفاضلات."], ["06", "النشر", "نجهّز النموذج والتكاملات والبنية التحتية لتشغيل موثوق."], ["07", "المراقبة", "نراقب تغير البيانات والجودة وسلوك النظام لنوجه التطوير المستمر."]] as const;

export function EngineeringLifecycle() {
  const [active, setActive] = useState(0);
  const ar = useLanguage() === "ar";
  const currentStages = ar ? arabicStages : stages;
  const stage = currentStages[active];
  return <section className="lifecycle section" aria-labelledby="lifecycle-title"><div className="container">
    <div className="section-kicker">{ar ? "دورة العمل الهندسي" : "Engineering lifecycle"}</div>
    <div className="section-title-row"><h2 id="lifecycle-title">{ar ? <>من تصميم النموذج إلى <span>ذكاء يعمل في الواقع.</span></> : <>From model architecture to <span>production intelligence.</span></>}</h2><p>{ar ? "تترابط القرارات الهندسية من الفرضية الأولى إلى تشغيل النظام في الواقع." : "AI systems become useful when every engineering decision connects—from the first hypothesis to operation in the field."}</p></div>
    <div className="lifecycle-shell">
      <div className="lifecycle-rail" aria-label={ar ? "مراحل دورة العمل الهندسي" : "Engineering lifecycle stages"}>{currentStages.map(([number, title], index) => <button key={title} type="button" aria-pressed={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>{number}</span>{title}</button>)}</div>
      <div className="lifecycle-detail" aria-live="polite"><div className="detail-index">{stage[0]} / {ar ? "العمل الهندسي" : "SYSTEMS PRACTICE"}</div><h3>{stage[1]}</h3><p>{stage[2]}</p><div className="detail-meter"><span style={{width: `${((active + 1) / stages.length) * 100}%`}}/></div><small>{ar ? `المرحلة ${active + 1} من ${stages.length}` : `Stage ${active + 1} of ${stages.length}`}</small></div>
    </div>
  </div></section>;
}
