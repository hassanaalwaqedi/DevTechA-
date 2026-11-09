export function ComputationalSculpture() {
  return (
    <div className="sculpture" role="img" aria-label="Abstract layered computer vision and edge intelligence architecture">
      <div className="sculpture-meta">
        <span>FIG. 01 / VISION PIPELINE STUDY</span>
        <span>HIRZEXA</span>
      </div>
      <svg viewBox="0 0 600 480" aria-hidden="true">
        <defs>
          <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#35BEFF" />
            <stop offset=".45" stopColor="#1050FF" />
            <stop offset="1" stopColor="#873BFF" />
          </linearGradient>
          <linearGradient id="edge" x1="0" x2="1">
            <stop stopColor="#1050FF" stopOpacity=".25" />
            <stop offset=".5" stopColor="#35BEFF" />
            <stop offset="1" stopColor="#873BFF" stopOpacity=".4" />
          </linearGradient>
        </defs>
        <g className="sculpture-stack" transform="translate(300 243)">
          {Array.from({ length: 13 }, (_, i) => (
            <g key={i} transform={`translate(0 ${i * 7 - 43})`} opacity={0.2 + i * 0.045}>
              <path
                d="M0 -146 L205 -48 L0 51 L-205 -48 Z"
                fill={i === 6 ? "url(#plate)" : "none"}
                fillOpacity=".14"
                stroke="url(#edge)"
                strokeWidth="1"
              />
              <path
                d="M0 -146 L0 51 M-205 -48 L205 -48 M-102 -97 L102 1 M102 -97 L-102 1"
                fill="none"
                stroke="#3566FF"
                strokeOpacity=".24"
                strokeWidth=".65"
              />
            </g>
          ))}
          <path d="M0 -189 V94 M-205 -91 V-3 M205 -91 V-3" stroke="#1050FF" strokeOpacity=".45" strokeDasharray="2 7" />
          <circle cy="-48" r="3" fill="#35BEFF" />
          <circle cx="-205" cy="-48" r="2" fill="#1050FF" />
          <circle cx="205" cy="-48" r="2" fill="#873BFF" />
        </g>
      </svg>
      <div className="sculpture-caption">
        <span>VISUAL INTELLIGENCE, IN LAYERS</span>
        <span>CAMERA / EDGE AI / DASHBOARD</span>
      </div>
    </div>
  );
}

export function ArchitectureDiagram({ arabic = false }: { arabic?: boolean }) {
  return (
    <div
      className="architecture-diagram"
      aria-label={
        arabic
          ? "مخطط خط أنابيب الرؤية الحاسوبية وذكاء الحافة"
          : "Computer Vision and Edge AI pipeline architecture diagram"
      }
    >
      <div className="diagram-heading diagram-top">
        <span>
          {arabic
            ? "خط أنابيب هندسة الرؤية (من الكاميرا إلى التطبيق)"
            : "VISION ENGINEERING PIPELINE · CAMERA TO DASHBOARD"}
        </span>
        <span>01 — 06</span>
      </div>

      <div className="diagram-flow diagram-flow-6">
        <div>
          <span>01 / {arabic ? "الالتقاط" : "INPUT"}</span>
          <strong>{arabic ? "الكاميرا / الحساس" : "Camera / Sensor"}</strong>
          <small>{arabic ? "بث بصري · RTSP / الكاميرات" : "Optical & RTSP video streams"}</small>
        </div>

        <div>
          <span>02 / {arabic ? "المعالجة" : "INGEST"}</span>
          <strong>{arabic ? "معالجة الفيديو" : "Video Processing"}</strong>
          <small>{arabic ? "OpenCV · فك الترميز وتجهيز الإطارات" : "OpenCV · Frame decoding & prep"}</small>
        </div>

        <div className="highlight">
          <span>03 / {arabic ? "الإدراك" : "PERCEPTION"}</span>
          <strong>{arabic ? "نماذج الرؤية الحاسوبية" : "Computer Vision Models"}</strong>
          <small>{arabic ? "YOLO · PyTorch · الكشف والتتبع" : "YOLO · PyTorch · Detection & tracking"}</small>
        </div>

        <div className="highlight">
          <span>04 / {arabic ? "ذكاء الحافة" : "EDGE AI"}</span>
          <strong>{arabic ? "الاستدلال على الحافة" : "Edge Inference"}</strong>
          <small>{arabic ? "ONNX Runtime · TensorRT · زمن منخفض" : "ONNX Runtime · TensorRT optimization"}</small>
        </div>

        <div>
          <span>05 / {arabic ? "الفهم" : "REASONING"}</span>
          <strong>{arabic ? "ذكاء الأحداث" : "Event Intelligence"}</strong>
          <small>{arabic ? "تفسير المشهد · تقييم المخاطر والتنبيهات" : "Scene logic · Risk scoring & rules"}</small>
        </div>

        <div>
          <span>06 / {arabic ? "المخرجات" : "OUTPUT"}</span>
          <strong>{arabic ? "التطبيق / لوحة المراقبة" : "Application / Dashboard"}</strong>
          <small>{arabic ? "FastAPI · واجهات المراقبة والتنبيهات" : "FastAPI · Live UI, alerts & APIs"}</small>
        </div>
      </div>

      <div className="diagram-monitor">
        <span>
          {arabic ? "التشغيل والمراقبة المستمرة" : "EDGE-TO-CLOUD TELEMETRY & OBSERVABILITY"}
        </span>
        <span>
          {arabic
            ? "استدلال محلي منخفض الكمون · مزامنة الأحداث · تحديث النماذج ↺"
            : "Low-latency local inference · Event sync · Model iteration ↺"}
        </span>
      </div>
    </div>
  );
}

export function ModelDiagram({ arabic = false }: { arabic?: boolean }) {
  return (
    <div
      className="model-diagram"
      aria-label={
        arabic
          ? "تصور لمراحل تطوير وتحسين نماذج الرؤية"
          : "Illustrative computer vision model optimization workflow"
      }
    >
      <div className="diagram-heading">
        <span>{arabic ? "تطوير نماذج الرؤية" : "VISION MODEL PIPELINE"}</span>
        <span>{arabic ? "من التدريب إلى الحافة" : "TRAIN TO EDGE"}</span>
      </div>
      <div className="model-flow">
        <div>
          <span>01</span>
          <strong>{arabic ? "البيانات البصرية" : "Visual Data"}</strong>
          <small>{arabic ? "إعداد وتوسيم المشاهد" : "Curate & annotate frames"}</small>
        </div>
        <b>↗</b>
        <div>
          <span>02</span>
          <strong>{arabic ? "التدريب (PyTorch / YOLO)" : "Vision Model"}</strong>
          <small>{arabic ? "تدريب الكشف والتتبع" : "Train detection & tracking"}</small>
        </div>
        <b>↗</b>
        <div>
          <span>03</span>
          <strong>{arabic ? "تحسين الحافة (ONNX)" : "Edge Optimize"}</strong>
          <small>{arabic ? "ضغط ونشر بزمن منخفض" : "Quantize & deploy to edge"}</small>
        </div>
      </div>
      <div className="model-foot">
        {arabic
          ? "PyTorch / YOLO ← ONNX Runtime / TensorRT ← استدلال الحافة"
          : "PYTORCH / YOLO → ONNX RUNTIME / TENSORRT → EDGE INFERENCE"}
      </div>
    </div>
  );
}
