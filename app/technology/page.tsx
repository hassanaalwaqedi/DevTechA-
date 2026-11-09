import type { Metadata } from "next";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { ArrowUpRight, Camera, Cpu, Eye, MonitorPlay } from "lucide-react";
import { getLocale } from "@/lib/locale";
import "../expertise/expertise.css";

export const metadata: Metadata = {
  title: "Technology — Computer Vision, Edge AI, Intelligent Devices & Vision Software",
  description:
    "Explore DevTech AI's four core technology pillars: Computer Vision, Edge AI inference, Intelligent Devices, and Vision Software.",
};

export default async function TechnologyPage() {
  const ar = (await getLocale()) === "ar";

  const pillars = ar
    ? ([
        {
          id: "computer-vision",
          number: "01",
          title: "الرؤية الحاسوبية (Computer Vision)",
          description:
            "نماذج إدراك بصري مصممة لتحويل البث المرئي من الكاميرات والحساسات إلى إشارات منظمة وتحليلات دقيقة في الوقت الفعلي.",
          capabilities: [
            "كشف الأجسام (Object detection)",
            "تتبع الأجسام (Object tracking)",
            "تحليلات الفيديو الفورية",
            "فهم الأحداث البصرية",
            "التعرف على الأنشطة والحركة",
            "نماذج الرؤية واللغة (VLMs)",
            "التنبيهات الذكية القابلة للتخصيص",
          ],
          tags: ["YOLO", "PyTorch", "OpenCV", "Multi-Object Tracking", "Vision-Language"],
          note: null,
          Icon: Eye,
        },
        {
          id: "edge-ai",
          number: "02",
          title: "ذكاء الحافة (Edge AI)",
          description:
            "تشغيل نماذج الرؤية مباشرة على أجهزة الحافة لمعالجة الفيديو محلياً بزمن استجابة منخفض مع الحفاظ على الخصوصية وتقليل استهلاك النطاق الترددي.",
          capabilities: [
            "الاستدلال على الجهاز (On-device inference)",
            "معالجة الفيديو محلياً",
            "تحسين وضغط النماذج (Quantization)",
            "النشر على أجهزة الحافة (Edge deployment)",
            "استدلال بزمن استجابة منخفض",
            "معمارية تراعي الخصوصية",
            "معالجة هجينة بين الحافة والسحابة",
          ],
          tags: ["ONNX Runtime", "TensorRT", "FP16 / INT8", "Low-Latency Edge", "Hybrid Cloud"],
          note: null,
          Icon: Cpu,
        },
        {
          id: "intelligent-devices",
          number: "03",
          title: "الأجهزة الذكية (Intelligent Devices)",
          description:
            "تطوير وتكامل الكاميرات الذكية ووحدات معالجة الحافة وأجهزة المراقبة المعتمدة على الذكاء الاصطناعي للمنازل والشركات والقطاعات الصناعية.",
          capabilities: [
            "الكاميرات الذكية (قيد التطوير)",
            "أجهزة المراقبة المدعومة بالذكاء الاصطناعي (نماذج أولية)",
            "وحدات معالجة ذكاء الحافة (Edge AI Units)",
            "أجهزة إنترنت الأشياء البصرية (Vision IoT)",
            "منتجات الرؤية القابلة للارتداء (مفهوم مستقبلي)",
          ],
          tags: ["Smart Cameras", "Edge AI Boxes", "Vision IoT", "Hardware + Software"],
          note: "ملاحظة الشفافية: نميّز بوضوح بين الأنظمة المطورة حالياً والنماذج الأولية والمفاهيم المستقبلية — الأجهزة المذكورة قيد البحث والتطوير وليست مطروحة تجارياً بعد.",
          Icon: Camera,
        },
        {
          id: "vision-software",
          number: "04",
          title: "برمجيات الرؤية (Vision Software)",
          description:
            "المنظومة البرمجية الداعمة لمنتجات الرؤية الذكية: من لوحات المراقبة الحية وإدارة الأجهزة إلى تنبيهات الأحداث وتطبيقات الهواتف والاتصال السحابي.",
          capabilities: [
            "تطبيقات إدارة الأجهزة والكاميرات",
            "لوحات المراقبة والتحليلات (Dashboards)",
            "واجهات البث المرئي الحي",
            "إدارة الأحداث وسجلات الرؤية",
            "نظام الإشعارات والتنبيهات الفورية",
            "خدمات الاستدلال السحابي",
            "تطبيقات الهواتف الذكية",
            "بروتوكولات اتصال الأجهزة بالسحابة",
          ],
          tags: ["Monitoring Dashboards", "Live Video UI", "FastAPI", "Device APIs", "Mobile Apps"],
          note: null,
          Icon: MonitorPlay,
        },
      ] as const)
    : ([
        {
          id: "computer-vision",
          number: "01",
          title: "Computer Vision",
          description:
            "Visual perception models engineered to transform raw camera feeds into structured spatial data, real-time object tracking, and actionable event understanding.",
          capabilities: [
            "Object detection",
            "Object tracking",
            "Real-time video analytics",
            "Visual event understanding",
            "Activity recognition",
            "Vision-language models",
            "Intelligent alerting",
          ],
          tags: ["YOLO", "PyTorch", "OpenCV", "Multi-Object Tracking", "Vision-Language"],
          note: null,
          Icon: Eye,
        },
        {
          id: "edge-ai",
          number: "02",
          title: "Edge AI",
          description:
            "On-device intelligence that processes video streams locally at the camera or edge node—delivering millisecond latency, bandwidth efficiency, and privacy-conscious operation.",
          capabilities: [
            "On-device AI inference",
            "Local video processing",
            "Model optimization",
            "Edge deployment",
            "Low-latency inference",
            "Privacy-conscious architecture",
            "Hybrid edge-cloud processing",
          ],
          tags: ["ONNX Runtime", "TensorRT", "FP16 / INT8", "Low-Latency Edge", "Hybrid Cloud"],
          note: null,
          Icon: Cpu,
        },
        {
          id: "intelligent-devices",
          number: "03",
          title: "Intelligent Devices",
          description:
            "Hardware-software vision systems combining optical sensors, edge compute units, and embedded firmware into practical intelligent devices.",
          capabilities: [
            "Smart cameras (In Development)",
            "AI-enabled monitoring devices (Prototype)",
            "Edge AI processing units (Architecture & Integration)",
            "Vision-enabled IoT devices (In Development)",
            "Future wearable vision products (Concept)",
          ],
          tags: ["Smart Cameras", "Edge AI Units", "Vision IoT", "Embedded Vision"],
          note: "Development Transparency: We clearly distinguish active software/vision systems, hardware prototypes, and future concepts. Hardware devices are currently in R&D and not yet commercially released.",
          Icon: Camera,
        },
        {
          id: "vision-software",
          number: "04",
          title: "Vision Software",
          description:
            "The supporting software ecosystem for our intelligent vision products—connecting edge devices to live operator dashboards, mobile apps, and cloud workflows.",
          capabilities: [
            "Device management applications",
            "Monitoring dashboards",
            "Live video interfaces",
            "Event management",
            "Notifications",
            "Cloud inference services",
            "Mobile applications",
            "Device-to-cloud communication",
          ],
          tags: ["Monitoring Dashboards", "Live Video UI", "FastAPI", "Device APIs", "Mobile Apps"],
          note: null,
          Icon: MonitorPlay,
        },
      ] as const);

  return (
    <main className="expertise-new">
      <CompanyPageIntro
        eyebrow={ar ? "DEVTECH AI / التقنية الأساسية" : "DEVTECH AI / CORE TECHNOLOGY"}
        title={
          ar
            ? "الرؤية الحاسوبية وذكاء الحافة."
            : "Computer Vision & Edge Intelligence."
        }
        description={
          ar
            ? "ترتكز منظومتنا التقنية على أربع ركائز مترابطة — الرؤية الحاسوبية، وذكاء الحافة، والأجهزة الذكية، وبرمجيات الرؤية — لتحويل الكاميرات والأجهزة إلى أنظمة ذكية."
            : "Our technology stack integrates four core pillars—Computer Vision, Edge AI, Intelligent Devices, and Vision Software—turning cameras and sensors into intelligent systems."
        }
        actionLabel={ar ? "استكشف الركائز الأربع" : "Explore the 4 pillars"}
        actionHref="#pillars"
        secondaryLabel={ar ? "استكشف منتجات الرؤية" : "Explore vision products"}
        secondaryHref="/products"
        detailsTitle={ar ? "الركائز التقنية الأربع" : "FOUR TECHNOLOGY PILLARS"}
        details={
          ar
            ? [
                "الرؤية الحاسوبية وتحليلات الفيديو الفورية",
                "الاستدلال على الحافة (Edge AI) وتحسين النماذج",
                "الأجهزة الذكية ومنصات برمجيات الرؤية",
              ]
            : [
                "Computer Vision & real-time video analytics",
                "On-device Edge AI inference & model optimization",
                "Intelligent Devices & Vision Software platforms",
              ]
        }
      />

      <section className="expertise-capabilities-new" id="pillars">
        <div className="container">
          <div className="expertise-capabilities-head">
            <div>
              <span className="expertise-kicker">
                {ar ? "01 / الركائز التقنية" : "01 / CORE TECHNOLOGY PILLARS"}
              </span>
              <h2>
                {ar ? (
                  <>
                    الذكاء البصري في كل <span>طبقة.</span>
                  </>
                ) : (
                  <>
                    Visual intelligence in every <span>layer.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نجمع بين نماذج الرؤية الحاسوبية، والمعالجة على الحافة، والأجهزة الذكية، والبرمجيات في معمارية واحدة متكاملة."
                : "From optical capture and on-device neural inference to smart hardware and operator dashboards."}
            </p>
          </div>

          <div className="expertise-pillars-grid">
            {pillars.map(({ id, number, title, description, capabilities, tags, note, Icon }) => (
              <article
                id={id}
                key={id}
                className={`expertise-capability-card expertise-card-${number}`}
              >
                <div>
                  <div className="expertise-card-top">
                    <span>{number} / TECHNOLOGY PILLAR</span>
                    <span className="expertise-card-icon">
                      <Icon size={21} />
                    </span>
                  </div>
                  <div className="expertise-card-content">
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <ul className="expertise-pillar-list">
                      {capabilities.map((cap) => (
                        <li key={cap}>{cap}</li>
                      ))}
                    </ul>
                    {note ? <p className="expertise-stage-note">{note}</p> : null}
                  </div>
                </div>
                <div className="expertise-card-tags">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="expertise-card-art" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="expertise-vision-new">
        <div className="container expertise-vision-layout">
          <div>
            <span className="expertise-kicker">
              {ar ? "02 / من الكاميرا إلى القرار" : "02 / FROM CAMERA TO INSIGHT"}
            </span>
            <div className="expertise-vision-mark" aria-hidden="true">
              ✳
            </div>
          </div>
          <div>
            <h2>
              {ar ? (
                <>
                  النموذج البصري هو البداية فقط.
                  <br />
                  <span>نبني النظام الكامل حوله.</span>
                </>
              ) : (
                <>
                  Perception is only the start.
                  <br />
                  <span>We engineer the complete vision system.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نربط نماذج الرؤية الحاسوبية بمسارات الفيديو، ومحركات الاستدلال على الحافة (ONNX / TensorRT)، وتطبيقات المراقبة الحية لنساعد الفرق والمؤسسات على فهم المشاهد البصرية واتخاذ قرارات أدق."
                : "We connect computer vision models with low-latency video pipelines, edge inference runtimes (ONNX Runtime, TensorRT), and live operator software—turning visual streams into reliable operational intelligence."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <Link href="/engineering" className="expertise-text-link">
                {ar ? "استكشف خط أنابيب الرؤية الهندسي" : "Explore our vision engineering pipeline"}{" "}
                <ArrowUpRight size={16} />
              </Link>
              <Link href="/ai-architect" className="expertise-text-link">
                {ar ? "جرّب معماري الأنظمة الذكي" : "Try Interactive AI System Architect"}{" "}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="expertise-next-new">
        <div className="container">
          <div>
            <span className="expertise-kicker">
              {ar ? "تطبيقات ومنتجات الرؤية" : "VISION PRODUCTS & APPLICATIONS"}
            </span>
            <h2>
              {ar ? (
                <>
                  هل تطور منتج رؤية أو نظام حافة؟
                  <br />
                  <span>لنتحدث عن معماريتك.</span>
                </>
              ) : (
                <>
                  Building a vision product or edge system?
                  <br />
                  <span>Let&apos;s architect it together.</span>
                </>
              )}
            </h2>
          </div>
          <Link href="/contact" className="expertise-primary-link">
            {ar ? "تواصل مع فريقنا الهندسي" : "Talk to our vision engineers"}
            <span>
              <ArrowUpRight size={17} />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}

