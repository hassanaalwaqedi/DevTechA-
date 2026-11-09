"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

const stages = [
  [
    "01",
    "Camera / Sensor Input",
    "Ingest live video streams from IP cameras, optical sensors, or local RTSP endpoints with resilient reconnection, frame pacing, and exposure handling.",
    "RTSP / Optical Sensor Streams",
  ],
  [
    "02",
    "Video Processing",
    "Decode, resize, normalize, and batch video frames using OpenCV and hardware-accelerated pipelines while filtering motion regions of interest.",
    "OpenCV · Frame Decoding & ROI",
  ],
  [
    "03",
    "Computer Vision Models",
    "Execute object detection, multi-object tracking, pose estimation, and visual event recognition built with PyTorch and YOLO architectures.",
    "PyTorch · YOLO · Object Tracking",
  ],
  [
    "04",
    "Edge Inference Optimization",
    "Run quantized (FP16/INT8) models locally via ONNX Runtime and TensorRT (when supported) for low-latency, privacy-conscious edge execution.",
    "ONNX Runtime · TensorRT · Local NPU",
  ],
  [
    "05",
    "Event Intelligence",
    "Translate raw bounding boxes and trajectories into structured temporal events, zone rules, assisted risk scores, and configurable alert triggers.",
    "Temporal Rules · Risk Scoring",
  ],
  [
    "06",
    "Application / Dashboard",
    "Deliver structured events, live annotated video streams, and operator notifications through FastAPI, Dockerized microservices, and web/mobile interfaces.",
    "FastAPI · Docker · Live Monitoring UI",
  ],
] as const;

const arabicStages = [
  [
    "01",
    "مدخلات الكاميرا والحساسات",
    "استقبال البث المرئي الحي من كاميرات IP والحساسات البصرية أو بروتوكولات RTSP مع إدارة استقرار الاتصال ومعدل الإطارات.",
    "RTSP / البث البصري المباشر",
  ],
  [
    "02",
    "معالجة الفيديو (Video Processing)",
    "فك ترميز الإطارات وتحجيمها ومعالجتها المسبقة باستخدام OpenCV مع تحديد مناطق الاهتمام والحركة.",
    "OpenCV · تجهيز الإطارات",
  ],
  [
    "03",
    "نماذج الرؤية الحاسوبية",
    "تشغيل نماذج كشف الأجسام وتتبع المسارات المتعددة والتعرف على الأنشطة المبنية باستخدام PyTorch ومعماريات YOLO.",
    "PyTorch · YOLO · التتبع البصري",
  ],
  [
    "04",
    "الاستدلال المحسّن على الحافة (Edge Inference)",
    "تشغيل النماذج المضغوطة محلياً عبر ONNX Runtime وTensorRT لتحقيق زمن استجابة منخفض وحماية الخصوصية على الجهاز.",
    "ONNX Runtime · TensorRT · معالجة محلية",
  ],
  [
    "05",
    "ذكاء الأحداث (Event Intelligence)",
    "تحويل الإحداثيات والمسارات إلى أحداث زمنية مفهومة، وقواعد مناطق، وتقييم مخاطر مساعد، وتنبيهات ذكية.",
    "تفسير الأحداث · تقييم المخاطر",
  ],
  [
    "06",
    "التطبيق ولوحة المراقبة (Dashboard)",
    "توصيل الأحداث المنظمة والبث الحي والتنبيهات عبر خدمات FastAPI وحاويات Docker وواجهات الويب والجوال.",
    "FastAPI · Docker · لوحة تحكم المشغل",
  ],
] as const;

export function EngineeringLifecycle() {
  const [active, setActive] = useState(0);
  const ar = useLanguage() === "ar";
  const currentStages = ar ? arabicStages : stages;
  const stage = currentStages[active];

  return (
    <section className="lifecycle section" aria-labelledby="lifecycle-title">
      <div className="container">
        <div className="section-kicker">
          {ar ? "خط أنابيب الرؤية التفاعلي" : "Interactive Vision Pipeline"}
        </div>
        <div className="section-title-row lifecycle-intro">
          <h2 id="lifecycle-title">
            {ar ? (
              <>
                من إشارة الكاميرا إلى <span>لوحة التحكم والتطبيق.</span>
              </>
            ) : (
              <>
                From camera sensor to <span>live application output.</span>
              </>
            )}
          </h2>
          <p>
            {ar
              ? "استكشف المراحل الست التي تحول البث المرئي الخام إلى أحداث ذكية وتنبيهات فورية."
              : "Inspect each stage of our six-step computer vision and Edge AI architecture."}
          </p>
        </div>

        <div className="lifecycle-shell">
          <div
            className="lifecycle-rail"
            aria-label={ar ? "مراحل خط أنابيب الرؤية" : "Vision pipeline stages"}
          >
            {currentStages.map(([number, title], index) => (
              <button
                key={title}
                type="button"
                aria-pressed={active === index}
                className={active === index ? "active" : ""}
                onClick={() => setActive(index)}
              >
                <span>{number}</span>
                <strong>{title}</strong>
                <i aria-hidden="true">→</i>
              </button>
            ))}
          </div>

          <div className="lifecycle-detail" aria-live="polite">
            <div>
              <div className="detail-index detail-top">
                <span>
                  {stage[0]} / {ar ? "مرحلة خط الأنابيب" : "PIPELINE STAGE"}
                </span>
                <span>DEVTECH AI VISION</span>
              </div>
              <h3>{stage[1]}</h3>
              <p>{stage[2]}</p>
            </div>

            <div className="detail-output">
              <span>{ar ? "التقنيات والمخرجات" : "KEY TECHNOLOGIES & OUTPUT"}</span>
              <strong>{stage[3]}</strong>
              <div className="detail-meter">
                {currentStages.map((_, idx) => (
                  <i key={idx} className={idx <= active ? "lit" : ""} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
