import type { Metadata } from "next";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import {
  ArrowUpRight,
  Building2,
  Factory,
  Home,
  ShieldAlert,
  Store,
} from "lucide-react";
import { getLocale } from "@/lib/locale";
import "../solutions/solutions.css";

export const metadata: Metadata = {
  title: "Applications — Smart Homes, Retail, Workplace, Safety & Industrial Vision",
  description:
    "Explore real-world applications of DevTech AI's computer vision and Edge AI systems across Smart Homes, Retail Intelligence, Workplace Monitoring, Safety & Security, and Industrial Vision.",
};

export default async function ApplicationsPage() {
  const ar = (await getLocale()) === "ar";

  const applications = ar
    ? ([
        {
          id: "smart-homes",
          number: "01",
          domain: "المنازل الذكية · Smart Homes",
          status: "نطاق تطبيقي قيد التطوير · Active R&D",
          statusType: "active",
          title: "مراقبة منزلية ذكية وتنبيهات قابلة للتخصيص.",
          description:
            "تحويل الكاميرات المنزلية إلى أنظمة تفهم المشهد محلياً على الحافة (Edge AI) مع الحفاظ على الخصوصية، لتمييز الأشخاص والمركبات والطرود وإرسال تنبيهات دقيقة قابلة للتخصيص.",
          scenario:
            "مثال تطبيقي: كاميرا منزلية ذكية تعالج الفيديو محلياً لتنبيه صاحب المنزل عند وصول طرد أو حركة في المدخل دون إرسال الفيديو الخام للسحابة.",
          tags: ["كشف الأجسام", "الخصوصية على الحافة", "تنبيهات مخصصة", "تطبيق الجوال"],
          category: "Intelligent Devices & Cameras",
          Icon: Home,
        },
        {
          id: "retail-intelligence",
          number: "02",
          domain: "ذكاء التجزئة · Retail Intelligence",
          status: "عرض تقني وتطبيقي · Active Demonstration",
          statusType: "active",
          title: "مراقبة بصرية وتحليلات تشغيلية للمتاجر.",
          description:
            "استخدام الرؤية الحاسوبية لتحليل تدفق الزوار، ومستويات الإشغال، ومناطق التفاعل داخل المتاجر وصالات العرض لدعم القرارات التشغيلية.",
          scenario:
            "مثال تطبيقي: رصد أوقات الذروة وطوابير الانتظار عبر الكاميرات الحالية وتحويلها إلى مؤشرات تشغيلية في لوحة تحكم المتجر.",
          tags: ["تحليلات الفيديو", "كثافة الحركة", "لوحة تحكم تشغيلية", "Edge AI"],
          category: "Computer Vision Systems",
          Icon: Store,
        },
        {
          id: "workplace-monitoring",
          number: "03",
          domain: "مراقبة بيئات العمل · Workplace Monitoring",
          status: "عرض تقني وتطبيقي · Active Demonstration",
          statusType: "active",
          title: "كشف الأحداث وإشراف تشغيلي قابل للضبط.",
          description:
            "أنظمة رؤية مرنة للمكاتب والمرافق اللوجستية تتيح كشف الأحداث البصرية، متابعة المناطق المخصصة، وتنظيم التنبيهات وفق قواعد تشغيلية واضحة.",
          scenario:
            "مثال تطبيقي: متابعة حركة المركبات والمشاة في ساحات التحميل وإشعار المشرفين عند حدوث ازدحام أو دخول منطقة مقيدة.",
          tags: ["تتبع متعدد الأجسام", "إدارة المناطق", "إشعارات المشغلين", "FastAPI"],
          category: "Vision Software & Dashboards",
          Icon: Building2,
        },
        {
          id: "safety-security",
          number: "04",
          domain: "السلامة والأمن البصري · Safety & Security",
          status: "نموذج AEGIS AI التوضيحي · AEGIS AI Demonstration",
          statusType: "active",
          title: "وعي ظرفي وكشف أحداث بصري وتحليل مخاطر مساعد.",
          description:
            "يعمل نظام AEGIS AI على تحليل بث الكاميرات في الوقت الفعلي لكشف الأجسام وتتبعها وتفسير الأحداث وتقديم تقييم مخاطر مساعد يدعم المشغلين البشريين.",
          scenario:
            "مثال تطبيقي (AEGIS AI): تحليل فوري للكاميرات مع مؤشر مخاطر مساعد وتنبيهات للمشغل البشري لمراجعة الحدث (نظام مساعد للإنسان وليس قراراً أمنياً ذاتياً).",
          tags: ["AEGIS AI", "تقييم المخاطر المساعد", "الوعي الظرفي", "تنبيهات المشغل"],
          category: "AEGIS AI & Safety Vision",
          Icon: ShieldAlert,
        },
        {
          id: "industrial-vision",
          number: "05",
          domain: "الرؤية الصناعية · Industrial Vision",
          status: "مجال تطبيقي مستقبلي · Planned Application",
          statusType: "planned",
          title: "تطبيقات الفحص البصري ومراقبة العمليات الصناعية.",
          description:
            "توسيع معمارية الرؤية الحاسوبية وذكاء الحافة نحو خطوط الإنتاج والمرافق الصناعية للفحص البصري الآلي، ومراقبة سير العمليات، ورصد الحالات غير الاعتيادية بزمن استجابة منخفض.",
          scenario:
            "خارطة الطريق الصناعية: نشر نماذج YOLO / ONNX محسنة على وحدات حافة صناعية لمراقبة جودة المنتجات وسلامة العمليات في الوقت الفعلي.",
          tags: ["الفحص البصري (مخطط)", "مراقبة العمليات", "ONNX / TensorRT", "كاميرات صناعية"],
          category: "Edge AI & Model Optimization",
          Icon: Factory,
        },
      ] as const)
    : ([
        {
          id: "smart-homes",
          number: "01",
          domain: "Smart Homes",
          status: "Active R&D · Configurable Vision",
          statusType: "active",
          title: "Home monitoring and configurable alerts.",
          description:
            "Turning residential cameras and edge nodes into privacy-conscious visual systems that recognize people, vehicles, and deliveries locally while sending configurable mobile notifications.",
          scenario:
            "Product Scenario: On-device camera inference detects activity in defined entry zones and delivers structured event summaries without streaming continuous raw video to the cloud.",
          tags: ["On-Device Privacy", "Configurable Alerts", "Object Recognition", "Mobile App"],
          category: "Intelligent Devices & Cameras",
          Icon: Home,
        },
        {
          id: "retail-intelligence",
          number: "02",
          domain: "Retail Intelligence",
          status: "Active Vision Demonstration",
          statusType: "active",
          title: "Visual monitoring and operational analytics.",
          description:
            "Computer vision analytics that help retail spaces understand foot-traffic patterns, queue activity, and zone occupancy using existing IP camera infrastructure.",
          scenario:
            "Product Scenario: Multi-camera tracking aggregates anonymized zone occupancy and dwell metrics into a live operational dashboard.",
          tags: ["Video Analytics", "Zone Occupancy", "Queue Monitoring", "Operational Dashboard"],
          category: "Computer Vision Systems",
          Icon: Store,
        },
        {
          id: "workplace-monitoring",
          number: "03",
          domain: "Workplace Monitoring",
          status: "Active Vision Demonstration",
          statusType: "active",
          title: "Event detection and configurable workplace oversight.",
          description:
            "Configurable visual monitoring for commercial facilities, warehouses, and campuses—detecting zone events, vehicle movement, and operational bottlenecks in real time.",
          scenario:
            "Product Scenario: Edge vision boxes process facility camera streams to log corridor activity and notify supervisors when configurable rules are triggered.",
          tags: ["Event Detection", "Multi-Object Tracking", "Configurable Rules", "Edge AI"],
          category: "Vision Software & Dashboards",
          Icon: Building2,
        },
        {
          id: "safety-security",
          number: "04",
          domain: "Safety & Security",
          status: "AEGIS AI Demonstration",
          statusType: "active",
          title: "Situational awareness, visual event detection, and assisted risk analysis.",
          description:
            "Powered by our AEGIS AI architecture, cameras and edge processors work together to highlight relevant visual events, compute assisted risk scores, and surface clear alerts for human operators.",
          scenario:
            "Product Scenario (AEGIS AI): Real-time camera analysis combines object tracking and event interpretation with human-in-the-loop operator alerts—supporting human judgment rather than making autonomous security decisions.",
          tags: ["AEGIS AI", "Assisted Risk Analysis", "Situational Awareness", "Operator Alerts"],
          category: "AEGIS AI & Safety Vision",
          Icon: ShieldAlert,
        },
        {
          id: "industrial-vision",
          number: "05",
          domain: "Industrial Vision",
          status: "Planned Application · Future Roadmap",
          statusType: "planned",
          title: "Future visual inspection and process-monitoring applications.",
          description:
            "Extending our low-latency Edge AI and optical perception pipeline into manufacturing and industrial environments for automated visual inspection, equipment monitoring, and workflow verification.",
          scenario:
            "Future Application Direction: High-frame-rate optical sensors paired with TensorRT/ONNX edge compute units for real-time surface inspection and process anomaly alerting.",
          tags: ["Visual Inspection (Planned)", "Process Monitoring", "TensorRT / ONNX", "Industrial Edge"],
          category: "Edge AI & Model Optimization",
          Icon: Factory,
        },
      ] as const);

  return (
    <main className="solutions-new">
      <CompanyPageIntro
        eyebrow={ar ? "DEVTECH AI / التطبيقات" : "DEVTECH AI / APPLICATIONS"}
        title={
          ar
            ? "تقنيات الرؤية في العالم الحقيقي."
            : "Computer vision for real-world environments."
        }
        description={
          ar
            ? "نصمم أنظمة الرؤية الحاسوبية وذكاء الحافة لتناسب البيئات الواقعية — من المنازل الذكية والتجزئة إلى بيئات العمل والسلامة والرؤية الصناعية."
            : "We engineer computer vision and Edge AI systems around real operating environments—spanning Smart Homes, Retail Intelligence, Workplace Monitoring, Safety & Security, and future Industrial Vision."
        }
        actionLabel={ar ? "استكشف حالات الاستخدام" : "Explore applications"}
        actionHref="#applications"
        secondaryLabel={ar ? "استكشف نظام AEGIS AI" : "Explore AEGIS AI"}
        secondaryHref="/products#aegis-ai"
        detailsTitle={ar ? "قطاعات التطبيق الخمسة" : "FIVE APPLICATION DOMAINS"}
        details={
          ar
            ? [
                "المنازل الذكية وذكاء التجزئة",
                "مراقبة بيئات العمل والسلامة البصرية (AEGIS AI)",
                "الرؤية الصناعية وفحص العمليات (تطبيقات مستقبلية)",
              ]
            : [
                "Smart Homes & Retail Intelligence",
                "Workplace Monitoring & Safety Vision (AEGIS AI)",
                "Industrial Vision & Inspection (Future Roadmap)",
              ]
        }
        videoSrc="/videos/human-ai-about.mp4"
        videoPoster="/human-ai-about.jpg"
        videoBadge={ar ? "تطبيقات الرؤية الذكية · 10 ثوانٍ" : "REAL-WORLD VISION · 10s LOOP"}
        videoTitle={
          ar
            ? "أنظمة رؤية مصممة للإنسان والبيئات الواقعية"
            : "Human-Centered Computer Vision in Action"
        }
        videoSubtitle={
          ar
            ? "من المنازل الذكية والتجزئة إلى السلامة والصناعة"
            : "Smart Homes · Retail · Workplace · Safety"
        }
        videoTelemetry="MULTI-ZONE ACTIVE · 60 FPS"
      />

      <section className="solutions-areas-new" id="applications">
        <div className="container">
          <div className="solutions-areas-head">
            <div>
              <span className="solutions-kicker">
                {ar ? "01 / حالات الاستخدام الواقعية" : "01 / REAL-WORLD USE CASES"}
              </span>
              <h2>
                {ar ? (
                  <>
                    حيث تلتقي الرؤية الذكية <span>بالحياة اليومية.</span>
                  </>
                ) : (
                  <>
                    Where visual intelligence meets <span>real operations.</span>
                  </>
                )}
              </h2>
            </div>
            <p>
              {ar
                ? "نميّز بوضوح بين العروض التقنية الحالية قيد العرض والتطوير وبين مجالات التطبيق المستقبلية المخطط لها."
                : "Each application combines optical capture, Edge AI inference, and operator software—clearly distinguishing active demonstrations from planned application areas."}
            </p>
          </div>

          <div className="solutions-area-grid">
            {applications.map(
              ({
                id,
                number,
                domain,
                status,
                statusType,
                title,
                description,
                scenario,
                tags,
                category,
                Icon,
              }) => (
                <article
                  id={id}
                  key={id}
                  className={`solutions-area-card solutions-area-${number}`}
                >
                  <div style={{ width: "100%" }}>
                    <div className="solutions-area-top">
                      <span>
                        {number} / {domain}
                      </span>
                      <span className="solutions-area-icon">
                        <Icon size={21} />
                      </span>
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <span
                        className={`solutions-status-badge ${
                          statusType === "active"
                            ? "solutions-status-active"
                            : "solutions-status-planned"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="solutions-area-content">
                      <h3>{title}</h3>
                      <p>{description}</p>
                      <div className="solutions-scenario-box">{scenario}</div>
                      <div className="solutions-area-tags">
                        {tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/contact?category=${encodeURIComponent(category)}`}
                    className="solutions-area-link"
                  >
                    {ar ? "ناقش هذا التطبيق" : "Discuss this application"}{" "}
                    <ArrowUpRight size={15} />
                  </Link>
                  <div className="solutions-area-art" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      <section className="solutions-vision-new">
        <div className="container solutions-vision-layout">
          <div>
            <span className="solutions-kicker">
              {ar ? "02 / تصميم مسؤول وعملاني" : "02 / RESPONSIBLE VISION DESIGN"}
            </span>
            <div className="solutions-vision-mark" aria-hidden="true">
              ✳
            </div>
          </div>
          <div>
            <h2>
              {ar ? (
                <>
                  إدراك بصري يدعم الإنسان
                  <br />
                  <span>ويحترم الخصوصية.</span>
                </>
              ) : (
                <>
                  Visual intelligence that assists people
                  <br />
                  <span>and respects privacy.</span>
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نصمم أنظمة الرؤية الحاسوبية وذكاء الحافة لتعمل كأدوات مساعدة للمشغلين والمستخدمين — مع معالجة محلية على الحافة لتقليل نقل البيانات، وتنبيهات قابلة للتعديل، وإشراف بشري واضح."
                : "Our vision systems are engineered to assist human operators with structured perception and configurable alerts—prioritizing local edge processing, clear operating boundaries, and human-in-the-loop oversight."}
            </p>
            <Link href="/engineering" className="solutions-text-link">
              {ar ? "تعرّف على خط أنابيب الرؤية الهندسي" : "Explore our vision engineering pipeline"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="solutions-next-new">
        <div className="container">
          <div>
            <span className="solutions-kicker">
              {ar ? "تطبيقات مخصصة" : "CUSTOM VISION DEPLOYMENTS"}
            </span>
            <h2>
              {ar ? (
                <>
                  هل لديك بيئة تشغيل تتطلب رؤية ذكية؟
                  <br />
                  <span>لنتحدث عن المتطلبات.</span>
                </>
              ) : (
                <>
                  Have a real-world vision use case?
                  <br />
                  <span>Let&apos;s scope the system.</span>
                </>
              )}
            </h2>
          </div>
          <Link href="/contact" className="solutions-primary-link">
            {ar ? "تواصل معنا" : "Discuss your application"}
            <span>
              <ArrowUpRight size={17} />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}

