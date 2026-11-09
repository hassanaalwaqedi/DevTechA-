import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const steps = [
  [
    "01",
    "Optical & Scene Scoping",
    "We analyze camera placement, frame rates, lighting conditions, privacy boundaries, and target visual events before selecting a model architecture.",
    "CAMERA / SCENE CALIBRATION",
  ],
  [
    "02",
    "Vision Model Engineering",
    "We train, fine-tune, and benchmark object detection, multi-object tracking, and activity recognition models using PyTorch, YOLO, and OpenCV.",
    "PYTORCH / YOLO / OPENCV",
  ],
  [
    "03",
    "Edge Optimization & Runtime",
    "We export and quantize models for ONNX Runtime and TensorRT (when supported) to achieve low-latency, on-device inference within hardware constraints.",
    "ONNX RUNTIME / TENSORRT",
  ],
  [
    "04",
    "Event APIs & Monitoring UI",
    "We connect edge inference pipelines to FastAPI services, Dockerized deployments, device communication APIs, and live operator dashboards.",
    "FASTAPI / DOCKER / DASHBOARD",
  ],
] as const;

const arabicSteps = [
  [
    "01",
    "تحديد المشهد والكاميرات",
    "ندرس زوايا الكاميرات ومعدل الإطارات وظروف الإضاءة وحدود الخصوصية والأحداث المستهدفة قبل اختيار معمارية النموذج.",
    "الكاميرات / معايرة المشهد",
  ],
  [
    "02",
    "هندسة نماذج الرؤية",
    "ندرب ونخصص نماذج كشف الأجسام وتتبعها والتعرف على الأنشطة باستخدام PyTorch وYOLO وOpenCV.",
    "PYTORCH / YOLO / OPENCV",
  ],
  [
    "03",
    "تحسين النماذج للحافة",
    "نحول النماذج ونضغطها لتعمل عبر ONNX Runtime وTensorRT لتحقيق استدلال محلي سريع ضمن قيود العتاد.",
    "ONNX RUNTIME / TENSORRT",
  ],
  [
    "04",
    "واجهات الأحداث ولوحات المراقبة",
    "نربط محركات الاستدلال بخدمات FastAPI وحاويات Docker وواجهات اتصال الأجهزة ولوحات المراقبة الحية.",
    "FASTAPI / DOCKER / DASHBOARD",
  ],
] as const;

export function HowWeWork({ arabic = false }: { arabic?: boolean }) {
  return (
    <section className="how-work" id="how-we-work">
      <div className="container">
        <div className="how-work-heading how-work-head">
          <div>
            <div className="art-label">
              {arabic ? "01 / منهجية هندسة الرؤية" : "01 / VISION ENGINEERING METHODOLOGY"}
            </div>
            <h2>
              {arabic ? (
                <>
                  من عدسة الكاميرا
                  <br />
                  <em>إلى ذكاء لحظي قابل للتنفيذ.</em>
                </>
              ) : (
                <>
                  From camera frame
                  <br />
                  <em>to actionable edge intelligence.</em>
                </>
              )}
            </h2>
          </div>
          <p>
            {arabic
              ? "بناء نظام رؤية حاسوبية موثوق يتطلب ربط البصريات ومعالجة الفيديو وتحسين النماذج للحافة وتطبيقات المراقبة في مسار هندسي واحد."
              : "Reliable computer vision is an end-to-end engineering discipline—connecting frame capture, model optimization, edge deployment, and operator software."}
          </p>
        </div>
        <div className="work-steps">
          {(arabic ? arabicSteps : steps).map(([number, title, text, tag]) => (
            <article key={number} className="work-step motion-reveal">
              <div className="step-marker work-step-top">
                <span>{number}</span>
                <small>{tag}</small>
              </div>
              <div className="step-copy">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <Link href="/technology" className="art-inline-link">
          {arabic ? "استكشف الركائز التقنية الأربع" : "Explore our four technology pillars"}{" "}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
