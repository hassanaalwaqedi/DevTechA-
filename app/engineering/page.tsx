import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getLocale } from "@/lib/locale";
import { EngineeringLifecycle } from "@/components/engineering-lifecycle";
import { ArchitectureDiagram } from "@/components/technical-visuals";
import { HowWeWork } from "@/components/how-we-work";

export const metadata: Metadata = {
  title: "Engineering — Computer Vision Pipeline, Edge AI Optimization & Stack",
  description:
    "How DevTech AI builds computer vision and Edge AI systems from camera input to application output using Python, OpenCV, PyTorch, YOLO, ONNX Runtime, TensorRT, FastAPI, and Docker.",
};

export default async function EngineeringPage() {
  const ar = (await getLocale()) === "ar";

  const stackItems = ar
    ? [
        [
          "VISION & ML CORE",
          "Python · PyTorch · YOLO",
          "تدريب وتخصيص نماذج كشف الأجسام، وتتبع المسارات المتعددة، والتعرف على الأنشطة البصرية.",
        ],
        [
          "VIDEO PIPELINE",
          "OpenCV · Stream Processing",
          "استقبال بث الكاميرات (RTSP/IP)، فك ترميز الإطارات، ومعالجة الفيديو في الوقت الفعلي.",
        ],
        [
          "EDGE AI INFERENCE",
          "ONNX Runtime · TensorRT",
          "تحسين وضغط النماذج للتشغيل على أجهزة الحافة بزمن استجابة منخفض (عند توفر دعم العتاد).",
        ],
        [
          "BACKEND & APIS",
          "FastAPI · Device Communication APIs",
          "واجهات برمجية عالية الأداء لمزامنة الأحداث، وإدارة الأجهزة، وتوصيل التنبيهات الفورية.",
        ],
        [
          "DEPLOYMENT & CONTAINERS",
          "Docker · Edge-Cloud Runtime",
          "تغليف خدمات الاستدلال والأنظمة الخلفية لضمان التشغيل الموثوق على الحافة أو السحابة.",
        ],
        [
          "MONITORING INTERFACES",
          "Live Dashboards & Operator Alerts",
          "واجهات ويب وجوال لاستعراض الكاميرات، وتقييم المخاطر المساعد، ومراجعة سجل الأحداث.",
        ],
      ]
    : [
        [
          "VISION & ML CORE",
          "Python · PyTorch · YOLO",
          "Training, fine-tuning, and evaluating object detection, multi-object tracking, and activity recognition models.",
        ],
        [
          "VIDEO PROCESSING",
          "OpenCV · Frame Pipelines",
          "Real-time RTSP/optical stream ingestion, frame decoding, spatial calibration, and region-of-interest filtering.",
        ],
        [
          "EDGE AI INFERENCE",
          "ONNX Runtime · TensorRT",
          "Model quantization, graph optimization, and low-latency local inference on supported edge accelerators.",
        ],
        [
          "PLATFORM & DEVICE APIS",
          "FastAPI · Device Communication APIs",
          "Asynchronous event ingestion, device-to-cloud telemetry, webhook alerts, and operator control APIs.",
        ],
        [
          "CONTAINERIZED RUNTIME",
          "Docker · Hybrid Edge-Cloud",
          "Reproducible packaging for on-premise edge appliances and scalable cloud inference services.",
        ],
        [
          "OPERATOR SOFTWARE",
          "Monitoring Dashboards & Mobile UI",
          "Real-time visual overlays, event timelines, assisted risk scoring, and human-in-the-loop alert workflows.",
        ],
      ];

  return (
    <main className="editorial-page engineering-page">
      <section className="engineering-hero">
        <div className="container">
          <div className="art-label">
            {ar
              ? "الهندسة / من الكاميرا إلى لوحة التحكم"
              : "ENGINEERING / FROM CAMERA TO APPLICATION OUTPUT"}
          </div>
          <h1>
            {ar ? (
              <>
                مصممة لترى.
                <br />
                <em>ومبنية لتعمل على الحافة.</em>
              </>
            ) : (
              <>
                Engineered to see.
                <br />
                <em>Built for the edge.</em>
              </>
            )}
          </h1>
          <div className="engineering-hero-bottom">
            <p>
              {ar
                ? "نصمم أنظمة الرؤية الحاسوبية وذكاء الحافة كمسار هندسي متكامل — من التقاط الإطار البصري وتشغيل نماذج YOLO / ONNX إلى لوحات المراقبة والتنبيهات الفورية."
                : "We architect computer vision and Edge AI systems end to end—making latency, model precision, privacy boundaries, and hardware constraints explicit at every stage."}
            </p>
            <span>
              DEVTECH AI
              <br />
              {ar ? "معمارية الرؤية / 01" : "VISION ARCHITECTURE / 01"}
            </span>
          </div>
          <ArchitectureDiagram arabic={ar} />
        </div>
      </section>

      <HowWeWork arabic={ar} />

      <EngineeringLifecycle />

      {/* Engineering Stack Section */}
      <section className="engineering-stack-section" id="stack">
        <div className="container">
          <div className="art-label">
            {ar ? "التقنيات والأدوات الهندسية" : "VISION & EDGE ENGINEERING STACK"}
          </div>
          <div className="how-work-head" style={{ marginTop: "14px", marginBottom: "24px" }}>
            <h2>
              {ar ? (
                <>
                  حزمة تقنية مبنية <span>للأداء الفوري.</span>
                </>
              ) : (
                <>
                  Production stack for <span>real-time perception.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نعتمد على أدوات قياسية ومجربة في تطوير نماذج الرؤية الحاسوبية، وتحسين الاستدلال على الحافة، وبناء الأنظمة الخلفية."
                : "We combine proven computer vision frameworks, edge inference runtimes, and modern backend services."}
            </p>
          </div>

          <div className="engineering-stack-grid">
            {stackItems.map(([badge, title, desc]) => (
              <article key={title} className="engineering-stack-card">
                <span>{badge}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>

          <div style={{ marginTop: "28px" }}>
            <Link href="/ai-architect" className="art-inline-link">
              {ar
                ? "جرّب معماري الأنظمة التفاعلي (AI System Architect)"
                : "Launch Interactive AI System Architect"}{" "}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="engineering-principles">
        <div className="container">
          <div className="art-label">
            {ar
              ? "مبادئنا الهندسية / ما نلتزم به"
              : "ARCHITECTURAL PRINCIPLES / WHAT WE HOLD CONSTANT"}
          </div>
          <div className="principle-grid">
            <article>
              <span>01</span>
              <h3>
                {ar
                  ? "القياس على مشاهد حقيقية."
                  : "Benchmark on real scenes."}
              </h3>
              <p>
                {ar
                  ? "نختبر نماذج الرؤية تحت ظروف الإضاءة والزوايا ومعدلات الإطارات الواقعية وليس فقط على مجموعات البيانات القياسية."
                  : "We evaluate detection, tracking, and false-positive rates against real camera angles, lighting conditions, and edge hardware budgets."}
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>
                {ar
                  ? "كفاءة الحافة والخصوصية."
                  : "Edge efficiency & privacy by design."}
              </h3>
              <p>
                {ar
                  ? "معالجة الفيديو محلياً على الحافة تقلل زمن الاستجابة وتوفر النطاق الترددي وتحمي خصوصية الأفراد والمؤسسات."
                  : "Processing video streams locally at the edge reduces latency, conserves bandwidth, and keeps sensitive visual feeds within defined boundaries."}
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>
                {ar
                  ? "الذكاء كأداة مساعدة للإنسان."
                  : "Human-in-the-loop intelligence."}
              </h3>
              <p>
                {ar
                  ? "نصمم التنبيهات وتقييم المخاطر لتوضيح السياق ومساعدة المشغلين البشريين على اتخاذ قرارات مدروسة."
                  : "Our vision software and alerts are built to surface structured context and assist human operators—never to replace human judgment."}
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
