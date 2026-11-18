import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Award, CheckCircle2, Cpu, Globe, Layers } from "lucide-react";
import { KHAIR_URL } from "@/lib/data";

export function VerifiedWorkSection({ arabic = false }: { arabic?: boolean }) {
  return (
    <section
      id="verified-work"
      className="dt-verified-work-section"
      aria-labelledby="dt-verified-work-heading"
    >
      <div className="container">
        <div className="dt-b2b-section-head">
          <div>
            <span className="dt-section-eyebrow">
              {arabic
                ? "أعمال ومنتجات مبرهنة · إثبات هندسي حقيقي"
                : "VERIFIED PROJECTS & TECHNICAL PROOF"}
            </span>
            <h2 id="dt-verified-work-heading" className="dt-section-title">
              {arabic
                ? "أنظمة حية ومشاريع حائزة على جوائز تبرهن عمقنا الهندسي."
                : "Real systems and documented engineering results."}
            </h2>
          </div>
          <p className="dt-b2b-section-subtitle">
            {arabic
              ? "نحن لا نختلق شهادات عملاء أو أرقاماً تسويقية؛ بل نعرض منصاتنا البرمجية الحية ومنتجاتنا الهندسية الموثقة بالأدلة."
              : "We never fabricate client logos or vanity metrics. Explore our live software platforms, award-winning flagship AI engineering, and interactive architecture tools."}
          </p>
        </div>

        <div className="dt-verified-work-grid">
          {/* Card 1: Khair Live Software Platform */}
          <article className="dt-verified-card">
            <div className="dt-verified-card-media">
              <Image
                src="/khair-discover.png"
                alt={
                  arabic
                    ? "منصة خير الرقمية لاكتشاف الفعاليات وإدارة المجتمعات"
                    : "Khair live digital platform for event discovery and community management"
                }
                width={640}
                height={360}
                className="dt-verified-img"
              />
              <span className="dt-verified-badge dt-verified-badge-live">
                <Globe size={13} />
                {arabic ? "منصة برمجية حية · Web & Mobile" : "LIVE SOFTWARE PLATFORM · WEB & MOBILE"}
              </span>
            </div>

            <div className="dt-verified-card-body">
              <span className="dt-verified-category">
                {arabic
                  ? "هندسة البرمجيات المخصصة والمنصات السحابية"
                  : "CUSTOM SOFTWARE & SAAS PLATFORM ENGINEERING"}
              </span>
              <h3>
                {arabic
                  ? "منصة خير (Khair) — منظومة إدارة الفعاليات والمجتمعات"
                  : "Khair — Full-Stack Community & Event Platform"}
              </h3>
              <p>
                {arabic
                  ? "منصة رقمية متكاملة تعمل في بيئة الإنتاج لربط اكتشاف الفعاليات وإدارة المجتمعات والمنظمين عبر تجربة ويب وجوال موحدة ومتعددة اللغات."
                  : "A live full-stack web and mobile-ready platform connecting event discovery, community management, and organizer workflows with bilingual Arabic/English support."}
              </p>

              <ul className="dt-verified-outcomes">
                <li>
                  <CheckCircle2 size={15} />
                  <span>
                    {arabic
                      ? "معمارية Full-Stack متكاملة مع لوحات تحكم للمنظمين ودعم RTL/LTR"
                      : "Full-stack web architecture, organizer dashboards & bilingual RTL/LTR UX"}
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={15} />
                  <span>
                    {arabic
                      ? "منشورة وتعمل مباشرة على السحابة مع قاعدة بيانات مهيأة للتوسع"
                      : "Deployed live in production cloud infrastructure with relational data design"}
                  </span>
                </li>
              </ul>

              <div className="dt-verified-actions">
                <a
                  href={KHAIR_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="dt-btn dt-btn-secondary"
                >
                  <span>{arabic ? "زيارة المنصة الحية" : "Visit Live Platform"}</span>
                  <ArrowUpRight size={16} />
                </a>
                <Link href="/products#featured-work" className="dt-verified-link">
                  <span>{arabic ? "تفاصيل المنصة" : "Platform overview"}</span>
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          </article>

          {/* Card 2: AEGIS Flagship Technical Proof */}
          <article className="dt-verified-card dt-verified-card-flagship">
            <div className="dt-verified-card-media">
              <Image
                src="/aegis/dashboard-overview.jpg"
                alt={
                  arabic
                    ? "لوحة تحكم ومعمارية مشروع AEGIS للذكاء الاصطناعي والسلامة البصرية"
                    : "AEGIS AI flagship visual safety and computer vision dashboard"
                }
                width={640}
                height={360}
                className="dt-verified-img"
              />
              <span className="dt-verified-badge dt-verified-badge-award">
                <Award size={13} />
                {arabic
                  ? "مشروع رائد · المركز الثاني — إسطنبول 2026"
                  : "FLAGSHIP TECHNICAL PROOF · 2ND PLACE WINNER 2026"}
              </span>
            </div>

            <div className="dt-verified-card-body">
              <span className="dt-verified-category">
                {arabic
                  ? "المنتجات والابتكار · هندسة الذكاء الاصطناعي والرؤية الحاسوبية"
                  : "PRODUCTS & INNOVATION · APPLIED AI & SYSTEM ARCHITECTURE"}
              </span>
              <h3>
                {arabic
                  ? "AEGIS — نظام السلامة البصرية وتحليل الفيديو الذكي"
                  : "AEGIS — AI-Powered Visual Safety & Event Intelligence"}
              </h3>
              <p>
                {arabic
                  ? "مشروع هندسي رائد يبرهن قدرة HIRZEXA على بناء أنظمة ذكاء اصطناعي معقدة تربط نماذج الاستدلال الفوري بالأنظمة الخلفية (FastAPI) ولوحات التحكم."
                  : "Our flagship applied AI product demonstrating end-to-end engineering across real-time neural inference, multi-object tracking, FastAPI event services, and operator dashboards."}
              </p>

              <ul className="dt-verified-outcomes">
                <li>
                  <CheckCircle2 size={15} />
                  <span>
                    {arabic
                      ? "فائز بالمركز الثاني في مسابقة الإبداع والابتكار (إسطنبول، 2026)"
                      : "Awarded 2nd Place at the Innovation & Invention Competition (Istanbul, 2026)"}
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={15} />
                  <span>
                    {arabic
                      ? "نتيجة تقييم داخلية مبلّغ عنها 95.3% عبر اختبارات مراقبة طبية وتجارية منضبطة"
                      : "95.3% reported internal evaluation result across controlled medical & retail testing"}
                  </span>
                </li>
              </ul>

              <div className="dt-verified-actions">
                <Link href="/products/aegis-ai" className="dt-btn dt-btn-primary">
                  <span>
                    {arabic ? "استعرض دراسة حالة AEGIS" : "Explore AEGIS Case Study"}
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
                <Link href="/book?track=aegis-vision" className="dt-verified-link">
                  <span>{arabic ? "اطلب عرضاً توضيحياً" : "Book AEGIS Demo"}</span>
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          </article>
        </div>

        {/* Interactive AI System Architect Banner */}
        <div className="dt-verified-architect-strip">
          <div className="dt-verified-architect-copy">
            <span className="dt-verified-architect-badge">
              <Cpu size={15} />
              {arabic ? "أداة هندسية تفاعلية مباشرة" : "LIVE INTERACTIVE ENGINEERING TOOL"}
            </span>
            <h3>
              {arabic
                ? "جرّب معماري الأنظمة الذكي (HIRZEXA AI System Architect)"
                : "Test Our Engineering Thinking: Interactive AI System Architect"}
            </h3>
            <p>
              {arabic
                ? "أدخل وصف مشكلتك التشغيلية ليقوم نظامنا بتوليد موجز معماري مبدئي يوضح الأهداف، والمعمارية المقترحة، والمخاطر الهندسية، ومراحل التنفيذ قبل جلستنا."
                : "Describe your operational challenge and generate a preliminary system architecture brief covering objectives, recommended stack, engineering risks, and delivery phases."}
            </p>
          </div>
          <div className="dt-verified-architect-actions">
            <Link href="/ai-architect" className="dt-btn dt-btn-secondary">
              <Layers size={16} />
              <span>
                {arabic ? "جرّب معماري الأنظمة" : "Launch AI System Architect"}
              </span>
              <ArrowUpRight size={16} />
            </Link>
            <Link href="/products" className="dt-verified-link">
              <span>{arabic ? "عرض كل الأعمال والمنتجات" : "View all products & work"}</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
