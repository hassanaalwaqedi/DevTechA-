type HeroArtworkProps = {
  arabic?: boolean;
};

export function HeroArtwork({ arabic = false }: HeroArtworkProps) {
  return (
    <div
      className="dt-hero-artwork"
      dir="ltr"
      role="img"
      aria-label={
        arabic
          ? "مخطط هندسي ثلاثي الأبعاد يوضح معمارية الأنظمة البرمجية ووكلاء الذكاء الاصطناعي وأتمتة العمليات والتكامل السحابي"
          : "3D Isometric B2B Software and AI Systems Architecture visualization showing enterprise workflows, AI agents, automated API pipelines, and cloud infrastructure"
      }
    >
      {/* Restrained ambient architectural lighting */}
      <div className="dt-art-ambient dt-art-ambient-blue" aria-hidden="true" />
      <div className="dt-art-ambient dt-art-ambient-violet" aria-hidden="true" />

      {/* Subtle 3D orbital structural grid */}
      <svg
        className="dt-art-orbits"
        viewBox="0 0 760 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="dt-orbit-1" x1="40" y1="130" x2="720" y2="430" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#35BEFF" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#1050FF" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#873BFF" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="dt-node-glow-cyan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="40%" stopColor="#35BEFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1050FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform="rotate(-11 380 256)">
          <ellipse
            cx="380"
            cy="256"
            rx="338"
            ry="126"
            stroke="url(#dt-orbit-1)"
            strokeWidth="1.25"
            strokeDasharray="6 6"
          />
        </g>

        <g className="dt-orbit-node dt-orbit-node-1">
          <circle cx="64" cy="316" r="12" fill="url(#dt-node-glow-cyan)" />
          <circle cx="64" cy="316" r="4" fill="#FFFFFF" />
        </g>
        <g className="dt-orbit-node dt-orbit-node-2">
          <circle cx="696" cy="196" r="13" fill="url(#dt-node-glow-cyan)" />
          <circle cx="696" cy="196" r="4.2" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Main Isometric 3D Engineering Architecture Blueprint Frame */}
      <div className="dt-brain-glass-frame">
        <div className="dt-brain-glass-inner">
          {/* Top Engineering Console Chrome */}
          <div className="dt-brain-panel-chrome" aria-hidden="true">
            <div className="dt-chrome-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="dt-chrome-pill">
              <i className="dt-chrome-pulse" />
              <span>HIRZEXA · ENTERPRISE SYSTEM ARCHITECTURE</span>
            </div>
            <div className="dt-chrome-status">
              <span className="dt-chrome-bar" />
              <span className="dt-chrome-bar dt-chrome-bar-short" />
            </div>
          </div>

          {/* 3D Isometric Engineering Stack & Live Data Movement Stage */}
          <div className="dt-brain-visual-stage">
            <svg
              className="dt-brain-image"
              viewBox="0 0 640 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="dt-iso-bg" x1="0" y1="0" x2="640" y2="360" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#071233" />
                  <stop offset="52%" stopColor="#0C1F56" />
                  <stop offset="100%" stopColor="#161447" />
                </linearGradient>
                <linearGradient id="dt-iso-plane-top" x1="180" y1="60" x2="460" y2="160" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#163B9E" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#2B1E78" stopOpacity="0.92" />
                </linearGradient>
                <linearGradient id="dt-iso-plane-mid" x1="160" y1="140" x2="480" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#102C7A" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#1E2568" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="dt-iso-plane-bot" x1="150" y1="215" x2="490" y2="320" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0A1D54" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#151B4D" stopOpacity="0.94" />
                </linearGradient>
                <linearGradient id="dt-bus-flow" x1="60" y1="180" x2="580" y2="180" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#35BEFF" />
                  <stop offset="50%" stopColor="#1050FF" />
                  <stop offset="100%" stopColor="#35F2A6" />
                </linearGradient>
              </defs>

              {/* Deep Architectural Canvas */}
              <rect width="640" height="360" rx="18" fill="url(#dt-iso-bg)" />

              {/* Precision Isometric Engineering Blueprint Grid */}
              <g stroke="rgba(120, 175, 255, 0.1)" strokeWidth="1">
                <line x1="0" y1="60" x2="640" y2="60" />
                <line x1="0" y1="120" x2="640" y2="120" />
                <line x1="0" y1="180" x2="640" y2="180" />
                <line x1="0" y1="240" x2="640" y2="240" />
                <line x1="0" y1="300" x2="640" y2="300" />
                <line x1="128" y1="0" x2="128" y2="360" />
                <line x1="256" y1="0" x2="256" y2="360" />
                <line x1="384" y1="0" x2="384" y2="360" />
                <line x1="512" y1="0" x2="512" y2="360" />
              </g>

              {/* LEFT COLUMN: BUSINESS INPUTS & LEGACY SYSTEMS */}
              <g>
                <rect
                  x="24"
                  y="52"
                  width="136"
                  height="256"
                  rx="14"
                  fill="rgba(8, 22, 64, 0.85)"
                  stroke="rgba(92, 225, 255, 0.38)"
                  strokeWidth="1.2"
                />
                <text x="38" y="74" fill="#7CE7FF" fontSize="8.5" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.08em">
                  01 · BUSINESS INPUTS
                </text>

                {/* Input Block A: CRM & ERP */}
                <rect x="36" y="88" width="112" height="58" rx="9" fill="rgba(16, 80, 255, 0.22)" stroke="rgba(92, 225, 255, 0.45)" strokeWidth="1" />
                <circle cx="48" cy="104" r="3.5" fill="#35BEFF" />
                <text x="58" y="107" fill="#FFFFFF" fontSize="9.2" fontWeight="700" fontFamily="sans-serif">
                  CRM &amp; Operations
                </text>
                <text x="48" y="124" fill="#A9D6FF" fontSize="8" fontFamily="sans-serif">
                  Workflows · Tickets · ERP
                </text>

                {/* Input Block B: Knowledge & Docs */}
                <rect x="36" y="158" width="112" height="58" rx="9" fill="rgba(135, 59, 255, 0.22)" stroke="rgba(185, 145, 255, 0.45)" strokeWidth="1" />
                <circle cx="48" cy="174" r="3.5" fill="#B57CFF" />
                <text x="58" y="177" fill="#FFFFFF" fontSize="9.2" fontWeight="700" fontFamily="sans-serif">
                  Enterprise Data
                </text>
                <text x="48" y="194" fill="#D5C4FF" fontSize="8" fontFamily="sans-serif">
                  SQL · Docs · Knowledge
                </text>

                {/* Input Block C: External APIs & Sensors */}
                <rect x="36" y="228" width="112" height="58" rx="9" fill="rgba(16, 80, 255, 0.18)" stroke="rgba(92, 225, 255, 0.38)" strokeWidth="1" />
                <circle cx="48" cy="244" r="3.5" fill="#35F2A6" />
                <text x="58" y="247" fill="#FFFFFF" fontSize="9.2" fontWeight="700" fontFamily="sans-serif">
                  APIs &amp; Streams
                </text>
                <text x="48" y="264" fill="#A9D6FF" fontSize="8" fontFamily="sans-serif">
                  Webhooks · Vision (AEGIS)
                </text>
              </g>

              {/* CENTER: 3D ISOMETRIC LAYERED ENGINEERING CORE */}
              <g>
                {/* Vertical 3D structural pillars connecting the 3 isometric planes */}
                <line x1="230" y1="105" x2="230" y2="265" stroke="rgba(92, 225, 255, 0.35)" strokeWidth="1.4" strokeDasharray="3 3" />
                <line x1="320" y1="68" x2="320" y2="230" stroke="rgba(92, 225, 255, 0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="410" y1="105" x2="410" y2="265" stroke="rgba(181, 124, 255, 0.35)" strokeWidth="1.4" strokeDasharray="3 3" />

                {/* Bottom Isometric Plane 03: Cloud Infrastructure, Databases & Microservices */}
                <polygon
                  points="320,214 446,260 320,308 194,260"
                  fill="url(#dt-iso-plane-bot)"
                  stroke="#5CE1FF"
                  strokeWidth="1.5"
                />
                <text x="320" y="258" textAnchor="middle" fill="#A9D6FF" fontSize="8.5" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">
                  CLOUD · POSTGRESQL · DOCKER CI/CD
                </text>
                <text x="320" y="273" textAnchor="middle" fill="#35F2A6" fontSize="8" fontWeight="700" fontFamily="sans-serif">
                  HIGH-AVAILABILITY INFRASTRUCTURE
                </text>

                {/* Middle Isometric Plane 02: Process Automation & Custom Backend APIs */}
                <polygon
                  points="320,136 446,182 320,230 194,182"
                  fill="url(#dt-iso-plane-mid)"
                  stroke="#7CE7FF"
                  strokeWidth="1.6"
                />
                <text x="320" y="180" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">
                  WORKFLOW AUTOMATION &amp; FASTAPI
                </text>
                <text x="320" y="195" textAnchor="middle" fill="#7CE7FF" fontSize="8" fontWeight="600" fontFamily="sans-serif">
                  API ORCHESTRATION · BUSINESS LOGIC
                </text>

                {/* Top Isometric Plane 01: AI Agents, Enterprise RAG & Decision Engine */}
                <polygon
                  points="320,54 446,100 320,148 194,100"
                  fill="url(#dt-iso-plane-top)"
                  stroke="#B57CFF"
                  strokeWidth="1.8"
                />
                <circle cx="320" cy="82" r="4" fill="#35F2A6" />
                <text x="320" y="102" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.06em">
                  AI AGENTS &amp; ENTERPRISE RAG
                </text>
                <text x="320" y="117" textAnchor="middle" fill="#E2D4FF" fontSize="8" fontWeight="600" fontFamily="sans-serif">
                  LLM INTEGRATION · HUMAN-IN-THE-LOOP
                </text>
              </g>

              {/* Animated Data Bus Lines Connecting Inputs -> 3D Core -> Business Outcomes */}
              <g>
                <path d="M160 116H212" stroke="url(#dt-bus-flow)" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M160 184H196" stroke="url(#dt-bus-flow)" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M160 256H212" stroke="url(#dt-bus-flow)" strokeWidth="2" strokeDasharray="4 3" />

                <path d="M428 116H480" stroke="url(#dt-bus-flow)" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M444 184H480" stroke="url(#dt-bus-flow)" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M428 256H480" stroke="url(#dt-bus-flow)" strokeWidth="2" strokeDasharray="4 3" />

                <circle cx="186" cy="116" r="3.5" fill="#5CE1FF">
                  <animate attributeName="cx" values="164;208;164" dur="3.6s" repeatCount="indefinite" />
                </circle>
                <circle cx="178" cy="184" r="3.5" fill="#FFFFFF">
                  <animate attributeName="cx" values="162;194;162" dur="2.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="456" cy="184" r="3.5" fill="#35F2A6">
                  <animate attributeName="cx" values="444;476;444" dur="2.8s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* RIGHT COLUMN: MEASURABLE BUSINESS OUTCOMES & DELIVERED PLATFORMS */}
              <g>
                <rect
                  x="480"
                  y="52"
                  width="136"
                  height="256"
                  rx="14"
                  fill="rgba(8, 22, 64, 0.88)"
                  stroke="rgba(53, 242, 166, 0.45)"
                  strokeWidth="1.3"
                />
                <text x="494" y="74" fill="#35F2A6" fontSize="8.5" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.08em">
                  02 · BUSINESS OUTPUT
                </text>

                {/* Output Block A */}
                <rect x="492" y="88" width="112" height="58" rx="9" fill="rgba(53, 242, 166, 0.12)" stroke="rgba(53, 242, 166, 0.45)" strokeWidth="1" />
                <text x="502" y="108" fill="#FFFFFF" fontSize="9.2" fontWeight="700" fontFamily="sans-serif">
                  Automated Ops
                </text>
                <text x="502" y="124" fill="#A9F9D8" fontSize="8" fontFamily="sans-serif">
                  Zero Manual Bottlenecks
                </text>

                {/* Output Block B */}
                <rect x="492" y="158" width="112" height="58" rx="9" fill="rgba(16, 80, 255, 0.24)" stroke="rgba(92, 225, 255, 0.5)" strokeWidth="1" />
                <text x="502" y="178" fill="#FFFFFF" fontSize="9.2" fontWeight="700" fontFamily="sans-serif">
                  Custom SaaS &amp; Web
                </text>
                <text x="502" y="194" fill="#A9D6FF" fontSize="8" fontFamily="sans-serif">
                  Production Platforms
                </text>

                {/* Output Block C */}
                <rect x="492" y="228" width="112" height="58" rx="9" fill="rgba(135, 59, 255, 0.24)" stroke="rgba(185, 145, 255, 0.5)" strokeWidth="1" />
                <text x="502" y="248" fill="#FFFFFF" fontSize="9.2" fontWeight="700" fontFamily="sans-serif">
                  Unified Cloud API
                </text>
                <text x="502" y="264" fill="#E2D4FF" fontSize="8" fontFamily="sans-serif">
                  Observable &amp; Scalable
                </text>
              </g>
            </svg>
          </div>

          {/* Bottom Console Telemetry Bar */}
          <div className="dt-brain-panel-footer" aria-hidden="true">
            <div className="dt-brain-wave">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="dt-brain-metrics-mini">
              <span>DISCOVERY → ARCHITECTURE → PRODUCTION</span>
              <strong>B2B ENGINEERING PARTNER</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Card 1: Top Right — System Architecture & Cloud */}
      <div className="dt-float-card dt-float-worldmap" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-float-title">Cloud &amp; Integrations</span>
          <span className="dt-float-live-dot" />
        </div>
        <div className="dt-worldmap-canvas">
          <svg viewBox="0 0 190 88" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M28 46C62 18 86 20 104 42" stroke="#1050FF" strokeWidth="1.5" strokeDasharray="3 2" />
            <path d="M104 42C124 24 146 26 164 40" stroke="#873BFF" strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="28" cy="46" r="6" fill="rgba(16, 80, 255, 0.22)" />
            <circle cx="28" cy="46" r="3" fill="#1050FF" />
            <circle cx="104" cy="42" r="7" fill="rgba(53, 190, 255, 0.32)" />
            <circle cx="104" cy="42" r="3.4" fill="#0754FF" />
            <circle cx="164" cy="40" r="6" fill="rgba(135, 59, 255, 0.25)" />
            <circle cx="164" cy="40" r="3" fill="#873BFF" />
          </svg>
        </div>
        <div className="dt-worldmap-foot">
          <span>APIs · Microservices</span>
          <strong>Enterprise Scale</strong>
        </div>
      </div>

      {/* Floating Card 2: Bottom Left — AI Agents & Automation */}
      <div className="dt-float-card dt-float-vision" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-vision-badge">
            <i /> AI AGENTS &amp; RAG
          </span>
          <span className="dt-vision-fps">PRODUCTION</span>
        </div>
        <div className="dt-vision-scene">
          <svg viewBox="0 0 184 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="184" height="96" rx="8" fill="#0E225A" />
            <rect x="14" y="16" width="156" height="24" rx="5" fill="rgba(53, 190, 255, 0.16)" stroke="#35BEFF" strokeWidth="1.1" />
            <text x="24" y="31" fill="#FFFFFF" fontSize="8" fontWeight="700" fontFamily="sans-serif">
              1. Knowledge Retrieval (RAG)
            </text>
            <rect x="14" y="52" width="156" height="26" rx="5" fill="rgba(53, 242, 166, 0.15)" stroke="#35F2A6" strokeWidth="1.1" />
            <text x="24" y="68" fill="#E8FFF5" fontSize="8" fontWeight="700" fontFamily="sans-serif">
              2. Verified Workflow Execution
            </text>
          </svg>
        </div>
        <div className="dt-vision-foot">
          <span>Custom Software</span>
          <strong>HUMAN-VERIFIED</strong>
        </div>
      </div>

      {/* Floating Card 3: Bottom Right — Delivery & ROI */}
      <div className="dt-float-card dt-float-analytics" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-float-title">Operational Efficiency</span>
          <span className="dt-analytics-badge">AUTOMATED</span>
        </div>
        <div className="dt-analytics-chart">
          <svg viewBox="0 0 180 66" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="6" y1="54" x2="174" y2="54" stroke="rgba(120, 145, 225, 0.2)" />
            <path
              d="M10 48C36 44 58 36 86 28C114 20 140 14 170 8"
              stroke="#1050FF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="86" cy="28" r="3.5" fill="#FFFFFF" stroke="#1050FF" strokeWidth="2" />
            <circle cx="170" cy="8" r="4" fill="#FFFFFF" stroke="#873BFF" strokeWidth="2.2" />
          </svg>
        </div>
        <div className="dt-analytics-foot">
          <span>Manual Work ↓</span>
          <strong>System Speed ↑</strong>
        </div>
      </div>
    </div>
  );
}
