import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const steps = [
  ["01", "Understand", "We map the problem, the people, the data, and the constraints before choosing the technology.", "DISCOVERY / FEASIBILITY"],
  ["02", "Architect", "We design the model, data flows, interfaces, and operating boundaries as one connected system.", "SYSTEM DESIGN / DATA"],
  ["03", "Build & evaluate", "We develop, test, and refine against the task, making quality and tradeoffs visible.", "EXPERIMENT / MEASURE"],
  ["04", "Deploy & evolve", "We connect the system to real workflows, observe its behavior, and make room for iteration.", "INFERENCE / MONITORING"],
] as const;
const arabicSteps = [["01", "نفهم", "نحدد التحدي والمستخدمين والبيانات والقيود قبل اختيار التقنية.", "اكتشاف / دراسة جدوى"], ["02", "نصمّم", "نصمم النموذج وتدفقات البيانات والواجهات وحدود التشغيل كنظام مترابط.", "معمارية / بيانات"], ["03", "نبني ونقيّم", "نطوّر ونختبر ونحسّن وفق متطلبات المهمة، مع قياس الجودة والمفاضلات.", "تجربة / قياس"], ["04", "ننشر ونطوّر", "نربط النظام بسير العمل الفعلي ونراقب أداءه ونواصل تحسينه.", "نشر / مراقبة"]] as const;

export function HowWeWork({arabic = false}: {arabic?: boolean}) {
  return <section className="how-work" id="how-we-work"><div className="container"><div className="how-work-heading"><div><div className="art-label">{arabic ? "04 / كيف نعمل" : "04 / HOW WE WORK"}</div><h2>{arabic ? <>من السؤال الأول<br/><em>إلى ذكاء يعمل.</em></> : <>From first question<br/><em>to working intelligence.</em></>}</h2></div><p>{arabic ? "الذكاء الاصطناعي المتقن رحلة هندسية متكاملة. نجعل كل مرحلة واضحة ومترابطة مع ما يليها." : "Good AI is an engineering process, not a single model. We make each stage deliberate, visible, and connected to the next."}</p></div><div className="work-steps">{(arabic ? arabicSteps : steps).map(([number, title, text, tag]) => <article key={number} className="work-step motion-reveal"><div className="step-marker"><span>{number}</span><i/></div><div className="step-copy"><h3>{title}</h3><p>{text}</p><small>{tag}</small></div></article>)}</div><Link href="/engineering" className="art-inline-link">{arabic ? "تعرّف على منهجنا الهندسي" : "See our engineering practice"} <ArrowUpRight size={15}/></Link></div></section>;
}
