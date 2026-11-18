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
          ? "مخطط معمارية أنظمة الذكاء الاصطناعي والبرمجيات"
          : "AI and Software Systems architecture diagram"
      }
    >
      <div className="diagram-heading diagram-top">
        <span>
          {arabic
            ? "معمارية الأنظمة البرمجية والذكاء الاصطناعي (من البيانات إلى المنصة)"
            : "AI & SOFTWARE ARCHITECTURE · DATA TO ENTERPRISE PLATFORM"}
        </span>
        <span>01 — 06</span>
      </div>

      <div className="diagram-flow diagram-flow-6">
        <div>
          <span>01 / {arabic ? "المدخلات" : "INPUT"}</span>
          <strong>{arabic ? "البيانات والواجهات" : "Data & APIs"}</strong>
          <small>{arabic ? "قواعد البيانات · المستندات · البث" : "Databases · Documents · Streams"}</small>
        </div>

        <div>
          <span>02 / {arabic ? "الهيكلة" : "INDEX"}</span>
          <strong>{arabic ? "معالجة وفهرسة البيانات" : "Data & Knowledge"}</strong>
          <small>{arabic ? "تجهيز البيانات · فهرسة RAG" : "Pipelines · Vector & SQL indexing"}</small>
        </div>

        <div className="highlight">
          <span>03 / {arabic ? "الذكاء" : "INTELLIGENCE"}</span>
          <strong>{arabic ? "الوكلاء ونماذج AI" : "AI Agents & Models"}</strong>
          <small>{arabic ? "LLMs · RAG · الرؤية الحاسوبية" : "LLMs · Enterprise RAG · Applied CV"}</small>
        </div>

        <div className="highlight">
          <span>04 / {arabic ? "الأتمتة" : "AUTOMATION"}</span>
          <strong>{arabic ? "أتمتة العمليات" : "Process Automation"}</strong>
          <small>{arabic ? "محركات سير العمل · تكامل CRM" : "Workflow orchestration · CRM & APIs"}</small>
        </div>

        <div>
          <span>05 / {arabic ? "الخدمات" : "BACKEND"}</span>
          <strong>{arabic ? "الأنظمة الخلفية" : "Backend & Cloud"}</strong>
          <small>{arabic ? "FastAPI · الخدمات المصغرة · الأمان" : "FastAPI · Microservices · Security"}</small>
        </div>

        <div>
          <span>06 / {arabic ? "المنصة" : "PLATFORM"}</span>
          <strong>{arabic ? "تطبيقات المؤسسات" : "Web & SaaS Apps"}</strong>
          <small>{arabic ? "Next.js · لوحات التحكم · التكامل" : "Next.js · Dashboards · Client Apps"}</small>
        </div>
      </div>

      <div className="diagram-monitor">
        <span>
          {arabic ? "التشغيل السحابي والمراقبة المستمرة" : "CLOUD DEPLOYMENT, CI/CD & OBSERVABILITY"}
        </span>
        <span>
          {arabic
            ? "تكامل الأنظمة · مراقبة الأداء · التوسع المستمر ↺"
            : "Containerized runtime · API telemetry · Continuous delivery ↺"}
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
