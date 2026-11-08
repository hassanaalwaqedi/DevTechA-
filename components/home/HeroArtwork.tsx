import Image from "next/image";

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
          ? "تصور ثلاثي الأبعاد للشبكة العصبية وأنظمة الذكاء الاصطناعي"
          : "Futuristic 3D AI neural network brain visualization with computer vision, global telemetry, and analytics panels"
      }
    >
      {/* Ambient background glow clouds */}
      <div className="dt-art-ambient dt-art-ambient-blue" aria-hidden="true" />
      <div className="dt-art-ambient dt-art-ambient-violet" aria-hidden="true" />
      <div className="dt-art-ambient dt-art-ambient-cyan" aria-hidden="true" />

      {/* Elliptical orbital lines & glowing nodes */}
      <svg
        className="dt-art-orbits"
        viewBox="0 0 760 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="dt-orbit-1" x1="40" y1="130" x2="720" y2="430" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#35BEFF" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#1050FF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#873BFF" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="dt-orbit-2" x1="70" y1="400" x2="690" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1050FF" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#35BEFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#873BFF" stopOpacity="0.7" />
          </linearGradient>
          <radialGradient id="dt-node-glow-cyan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="35%" stopColor="#35BEFF" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#1050FF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1050FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dt-node-glow-violet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="38%" stopColor="#873BFF" stopOpacity="0.9" />
            <stop offset="72%" stopColor="#1050FF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#873BFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Primary tilted elliptical orbit */}
        <g transform="rotate(-13 380 256)">
          <ellipse
            cx="380"
            cy="256"
            rx="344"
            ry="132"
            stroke="url(#dt-orbit-1)"
            strokeWidth="1.5"
          />
          <ellipse
            cx="380"
            cy="256"
            rx="314"
            ry="112"
            stroke="url(#dt-orbit-1)"
            strokeWidth="1.1"
            strokeDasharray="6 5"
            opacity="0.75"
          />
        </g>

        {/* Secondary counter-tilted elliptical orbit */}
        <g transform="rotate(17 380 256)">
          <ellipse
            cx="380"
            cy="256"
            rx="326"
            ry="116"
            stroke="url(#dt-orbit-2)"
            strokeWidth="1.35"
          />
        </g>

        {/* Outer whisper halo ring */}
        <ellipse
          cx="380"
          cy="256"
          rx="362"
          ry="164"
          stroke="rgba(53, 190, 255, 0.28)"
          strokeWidth="1.1"
        />

        {/* Soft blue/cyan glowing nodes on the orbital lines */}
        <g className="dt-orbit-node dt-orbit-node-1">
          <circle cx="48" cy="332" r="16" fill="url(#dt-node-glow-cyan)" />
          <circle cx="48" cy="332" r="5" fill="#FFFFFF" />
        </g>
        <g className="dt-orbit-node dt-orbit-node-2">
          <circle cx="712" cy="180" r="17" fill="url(#dt-node-glow-cyan)" />
          <circle cx="712" cy="180" r="5.2" fill="#FFFFFF" />
        </g>
        <g className="dt-orbit-node dt-orbit-node-3">
          <circle cx="118" cy="148" r="15" fill="url(#dt-node-glow-violet)" />
          <circle cx="118" cy="148" r="4.5" fill="#FFFFFF" />
        </g>
        <g className="dt-orbit-node dt-orbit-node-4">
          <circle cx="672" cy="346" r="15" fill="url(#dt-node-glow-cyan)" />
          <circle cx="672" cy="346" r="4.5" fill="#FFFFFF" />
        </g>
        <g className="dt-orbit-node dt-orbit-node-5">
          <circle cx="268" cy="118" r="13" fill="url(#dt-node-glow-cyan)" />
          <circle cx="268" cy="118" r="3.8" fill="#E6F7FF" />
        </g>
        <g className="dt-orbit-node dt-orbit-node-1">
          <circle cx="496" cy="124" r="12" fill="url(#dt-node-glow-violet)" />
          <circle cx="496" cy="124" r="3.5" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Small translucent secondary panels positioned behind and beside the main panel */}
      <div className="dt-glass-secondary dt-glass-secondary-left" aria-hidden="true">
        <div className="dt-secondary-header">
          <span className="dt-dot" />
          <span className="dt-dot" />
          <span className="dt-line-short" />
        </div>
        <div className="dt-secondary-grid">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="dt-glass-secondary dt-glass-secondary-right" aria-hidden="true">
        <div className="dt-secondary-header">
          <span className="dt-line-short" />
          <span className="dt-dot-cyan" />
        </div>
        <div className="dt-secondary-bars">
          <i style={{ height: "45%" }} />
          <i style={{ height: "72%" }} />
          <i style={{ height: "58%" }} />
          <i style={{ height: "90%" }} />
          <i style={{ height: "68%" }} />
        </div>
      </div>

      {/* Main central floating translucent blue glass panel */}
      <div className="dt-brain-glass-frame">
        <div className="dt-brain-glass-inner">
          {/* Subtle glass top chrome */}
          <div className="dt-brain-panel-chrome" aria-hidden="true">
            <div className="dt-chrome-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="dt-chrome-pill">
              <i className="dt-chrome-pulse" />
              <span>AI NEURAL CORE</span>
            </div>
            <div className="dt-chrome-status">
              <span className="dt-chrome-bar" />
              <span className="dt-chrome-bar dt-chrome-bar-short" />
            </div>
          </div>

          {/* Glowing 3D Neural Brain Core */}
          <div className="dt-brain-visual-stage">
            <div className="dt-brain-core-glow" aria-hidden="true" />
            <Image
              src="/hero-neural-brain.jpg"
              alt="3D glowing neural network brain"
              width={640}
              height={360}
              priority
              className="dt-brain-image"
            />

            {/* Vector synaptic overlay for ultra-crisp glowing filaments and nodes */}
            <svg
              className="dt-brain-synapse-overlay"
              viewBox="0 0 460 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="dt-synapse-line" x1="80" y1="50" x2="380" y2="230" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5CE1FF" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#B47CFF" stopOpacity="0.9" />
                </linearGradient>
                <radialGradient id="dt-synapse-node" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="42%" stopColor="#35BEFF" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#35BEFF" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Subtle HUD framing brackets */}
              <path d="M28 34V20H42" stroke="rgba(175, 228, 255, 0.55)" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M432 34V20H418" stroke="rgba(175, 228, 255, 0.55)" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M28 246V260H42" stroke="rgba(175, 228, 255, 0.55)" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M432 246V260H418" stroke="rgba(175, 228, 255, 0.55)" strokeWidth="1.3" strokeLinecap="round" />

              {/* Synaptic pulse pathways */}
              <path
                d="M138 110C168 84 205 76 242 88C278 100 308 90 334 118"
                stroke="url(#dt-synapse-line)"
                strokeWidth="1.25"
                strokeDasharray="4 4"
              />
              <path
                d="M126 146C164 134 198 150 236 136C274 122 304 140 342 154"
                stroke="url(#dt-synapse-line)"
                strokeWidth="1.15"
                opacity="0.82"
              />
              <path
                d="M172 184C204 168 238 174 274 190"
                stroke="url(#dt-synapse-line)"
                strokeWidth="1.15"
                opacity="0.75"
              />

              {/* Glowing cortical nodes */}
              {[
                [146, 106, 7.5],
                [194, 78, 8.5],
                [246, 86, 9.5],
                [298, 94, 8],
                [332, 120, 7.5],
                [132, 144, 7],
                [184, 138, 9],
                [234, 134, 10.5],
                [282, 138, 8.5],
                [328, 156, 7.5],
                [176, 182, 7.5],
                [228, 176, 8.5],
                [284, 188, 8],
                [256, 214, 7],
              ].map(([cx, cy, r], idx) => (
                <g key={idx} className={`dt-synapse-dot dt-synapse-dot-${(idx % 4) + 1}`}>
                  <circle cx={cx} cy={cy} r={r} fill="url(#dt-synapse-node)" />
                  <circle cx={cx} cy={cy} r={2.3} fill="#FFFFFF" />
                </g>
              ))}
            </svg>
          </div>

          {/* Centered telemetry bar inside main glass panel */}
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
              <span>SYNAPTIC MESH</span>
              <strong>ACTIVE</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-panel 1: Floating World-Map Data Panel (Top Right) */}
      <div className="dt-float-card dt-float-worldmap" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-float-title">Global Telemetry</span>
          <span className="dt-float-live-dot" />
        </div>
        <div className="dt-worldmap-canvas">
          <svg viewBox="0 0 190 88" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Stylized dotted/vector continents */}
            <g fill="rgba(35, 95, 245, 0.34)">
              {/* North America */}
              <circle cx="28" cy="22" r="2" /><circle cx="34" cy="20" r="2" /><circle cx="40" cy="23" r="2" />
              <circle cx="25" cy="28" r="2" /><circle cx="31" cy="27" r="2.2" /><circle cx="37" cy="29" r="2" />
              <circle cx="43" cy="28" r="2" /><circle cx="34" cy="34" r="2" /><circle cx="40" cy="35" r="2" />
              <circle cx="45" cy="41" r="1.8" />
              {/* South America */}
              <circle cx="52" cy="52" r="2" /><circle cx="57" cy="54" r="2" /><circle cx="55" cy="60" r="2.2" />
              <circle cx="60" cy="61" r="2" /><circle cx="56" cy="67" r="2" /><circle cx="54" cy="73" r="1.8" />
              {/* Europe */}
              <circle cx="88" cy="20" r="2" /><circle cx="94" cy="18" r="2" /><circle cx="100" cy="20" r="2" />
              <circle cx="86" cy="26" r="2" /><circle cx="92" cy="25" r="2.2" /><circle cx="98" cy="26" r="2" />
              <circle cx="104" cy="25" r="2" /><circle cx="95" cy="31" r="2" />
              {/* Africa & MENA */}
              <circle cx="88" cy="40" r="2" /><circle cx="94" cy="39" r="2.2" /><circle cx="101" cy="40" r="2" />
              <circle cx="108" cy="38" r="2.2" /><circle cx="92" cy="46" r="2" /><circle cx="99" cy="47" r="2" />
              <circle cx="105" cy="46" r="2" /><circle cx="98" cy="54" r="2" /><circle cx="103" cy="55" r="2" />
              <circle cx="101" cy="62" r="2" /><circle cx="102" cy="68" r="1.8" />
              {/* Asia */}
              <circle cx="114" cy="22" r="2" /><circle cx="121" cy="21" r="2" /><circle cx="128" cy="23" r="2" />
              <circle cx="135" cy="24" r="2" /><circle cx="142" cy="26" r="2" /><circle cx="116" cy="29" r="2" />
              <circle cx="123" cy="28" r="2.2" /><circle cx="130" cy="30" r="2" /><circle cx="137" cy="31" r="2" />
              <circle cx="144" cy="32" r="2" /><circle cx="151" cy="33" r="2" /><circle cx="122" cy="36" r="2" />
              <circle cx="129" cy="37" r="2" /><circle cx="136" cy="38" r="2.2" /><circle cx="143" cy="39" r="2" />
              <circle cx="149" cy="40" r="2" /><circle cx="132" cy="45" r="2" /><circle cx="142" cy="46" r="2" />
              {/* Australia */}
              <circle cx="150" cy="62" r="2" /><circle cx="156" cy="61" r="2" /><circle cx="162" cy="63" r="2" />
              <circle cx="153" cy="68" r="2" /><circle cx="159" cy="68" r="2" />
            </g>

            {/* Glowing connection arcs */}
            <path
              d="M36 28C62 8 82 10 96 25"
              stroke="#1050FF"
              strokeWidth="1.25"
              strokeDasharray="3 2"
              opacity="0.8"
            />
            <path
              d="M96 25C104 30 106 34 108 38"
              stroke="#35BEFF"
              strokeWidth="1.35"
              opacity="0.95"
            />
            <path
              d="M108 38C122 26 134 28 144 36"
              stroke="#873BFF"
              strokeWidth="1.25"
              strokeDasharray="3 2"
              opacity="0.85"
            />

            {/* Glowing active nodes */}
            <circle cx="36" cy="28" r="5" fill="rgba(53, 190, 255, 0.32)" />
            <circle cx="36" cy="28" r="2.5" fill="#1050FF" />

            <circle cx="96" cy="25" r="5.5" fill="rgba(16, 80, 255, 0.3)" />
            <circle cx="96" cy="25" r="2.6" fill="#35BEFF" />

            <circle cx="108" cy="38" r="6.5" fill="rgba(53, 190, 255, 0.42)" />
            <circle cx="108" cy="38" r="3" fill="#0754FF" />

            <circle cx="144" cy="36" r="5" fill="rgba(135, 59, 255, 0.32)" />
            <circle cx="144" cy="36" r="2.5" fill="#873BFF" />
          </svg>
        </div>
        <div className="dt-worldmap-foot">
          <span>Active Nodes</span>
          <strong>Multi-Region</strong>
        </div>
      </div>

      {/* Sub-panel 2: Miniature Computer-Vision Detection Preview (Left / Bottom-Left) */}
      <div className="dt-float-card dt-float-vision" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-vision-badge">
            <i /> CV · DETECT
          </span>
          <span className="dt-vision-fps">60 FPS</span>
        </div>
        <div className="dt-vision-scene">
          <svg viewBox="0 0 184 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="dt-cv-bg" x1="0" y1="0" x2="184" y2="96" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0E2563" />
                <stop offset="58%" stopColor="#184094" />
                <stop offset="100%" stopColor="#31257E" />
              </linearGradient>
              <linearGradient id="dt-cv-scan" x1="0" y1="0" x2="0" y2="96" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#35BEFF" stopOpacity="0" />
                <stop offset="50%" stopColor="#35BEFF" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#35BEFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="184" height="96" rx="8" fill="url(#dt-cv-bg)" />

            {/* Perspective grid lines */}
            <path d="M0 68H184" stroke="rgba(145, 200, 255, 0.18)" strokeWidth="0.8" />
            <path d="M0 82H184" stroke="rgba(145, 200, 255, 0.18)" strokeWidth="0.8" />
            <path d="M92 38L18 96" stroke="rgba(145, 200, 255, 0.16)" strokeWidth="0.8" />
            <path d="M92 38L68 96" stroke="rgba(145, 200, 255, 0.16)" strokeWidth="0.8" />
            <path d="M92 38L116 96" stroke="rgba(145, 200, 255, 0.16)" strokeWidth="0.8" />
            <path d="M92 38L166 96" stroke="rgba(145, 200, 255, 0.16)" strokeWidth="0.8" />

            {/* Detected Silhouette 1 */}
            <rect
              x="22"
              y="42"
              width="58"
              height="34"
              rx="4"
              fill="rgba(53, 190, 255, 0.16)"
              stroke="#35BEFF"
              strokeWidth="1.4"
            />
            <path d="M22 49V42H29" stroke="#FFFFFF" strokeWidth="1.8" />
            <path d="M80 49V42H73" stroke="#FFFFFF" strokeWidth="1.8" />
            <path d="M22 69V76H29" stroke="#FFFFFF" strokeWidth="1.8" />
            <path d="M80 69V76H73" stroke="#FFFFFF" strokeWidth="1.8" />
            <path d="M30 64L35 53H65L70 64H30Z" fill="rgba(135, 222, 255, 0.5)" />
            <circle cx="38" cy="66" r="3.8" fill="#5CE1FF" />
            <circle cx="62" cy="66" r="3.8" fill="#5CE1FF" />
            <rect x="22" y="29" width="48" height="12" rx="3" fill="#0754FF" />
            <text x="26" y="37.5" fill="#FFFFFF" fontSize="7.2" fontWeight="700" fontFamily="sans-serif">
              OBJ · 98%
            </text>

            {/* Detected Silhouette 2 */}
            <rect
              x="104"
              y="26"
              width="52"
              height="52"
              rx="4"
              fill="rgba(135, 59, 255, 0.18)"
              stroke="#A578FF"
              strokeWidth="1.3"
            />
            <circle cx="130" cy="37" r="4.2" fill="#5CE1FF" />
            <path
              d="M130 42V60M130 47L119 54M130 47L141 54M130 60L122 72M130 60L138 72"
              stroke="#5CE1FF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <rect x="104" y="13" width="50" height="12" rx="3" fill="#873BFF" />
            <text x="108" y="21.5" fill="#FFFFFF" fontSize="7.2" fontWeight="700" fontFamily="sans-serif">
              TRK · 96%
            </text>

            <rect width="184" height="22" y="34" fill="url(#dt-cv-scan)" />
          </svg>
        </div>
        <div className="dt-vision-foot">
          <span>Detection · Tracking</span>
          <strong>12.4 ms</strong>
        </div>
      </div>

      {/* Sub-panel 3: Small Analytics Chart Panel (Bottom Right) */}
      <div className="dt-float-card dt-float-analytics" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-float-title">Model Precision</span>
          <span className="dt-analytics-badge">+18.4%</span>
        </div>
        <div className="dt-analytics-chart">
          <svg viewBox="0 0 180 66" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="dt-chart-fill" x1="90" y1="6" x2="90" y2="62" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1050FF" stopOpacity="0.34" />
                <stop offset="65%" stopColor="#873BFF" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#873BFF" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="dt-chart-stroke" x1="6" y1="50" x2="174" y2="8" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#35BEFF" />
                <stop offset="50%" stopColor="#1050FF" />
                <stop offset="100%" stopColor="#873BFF" />
              </linearGradient>
            </defs>

            <line x1="6" y1="16" x2="174" y2="16" stroke="rgba(120, 145, 225, 0.16)" strokeDasharray="2 2" />
            <line x1="6" y1="35" x2="174" y2="35" stroke="rgba(120, 145, 225, 0.16)" strokeDasharray="2 2" />
            <line x1="6" y1="54" x2="174" y2="54" stroke="rgba(120, 145, 225, 0.16)" />

            <rect x="18" y="40" width="8" height="18" rx="2" fill="rgba(16, 80, 255, 0.12)" />
            <rect x="44" y="33" width="8" height="25" rx="2" fill="rgba(16, 80, 255, 0.15)" />
            <rect x="70" y="35" width="8" height="23" rx="2" fill="rgba(16, 80, 255, 0.15)" />
            <rect x="96" y="25" width="8" height="33" rx="2" fill="rgba(16, 80, 255, 0.18)" />
            <rect x="122" y="19" width="8" height="39" rx="2" fill="rgba(135, 59, 255, 0.22)" />
            <rect x="148" y="12" width="8" height="46" rx="2" fill="rgba(16, 80, 255, 0.28)" />

            <path
              d="M8 50C28 48 38 37 56 35C74 33 84 39 102 26C120 14 138 20 154 11L172 7V58H8V50Z"
              fill="url(#dt-chart-fill)"
            />
            <path
              d="M8 50C28 48 38 37 56 35C74 33 84 39 102 26C120 14 138 20 154 11L172 7"
              stroke="url(#dt-chart-stroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="102" cy="26" r="3.5" fill="#FFFFFF" stroke="#1050FF" strokeWidth="2" />
            <circle cx="154" cy="11" r="4" fill="#FFFFFF" stroke="#873BFF" strokeWidth="2.2" />
          </svg>
        </div>
        <div className="dt-analytics-foot">
          <span>Inference Throughput</span>
          <strong>99.8% SLA</strong>
        </div>
      </div>

      {/* Foreground 3D orbital arc sweeping across the composition */}
      <svg
        className="dt-art-orbits dt-art-orbits-front"
        viewBox="0 0 760 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="dt-front-arc" x1="50" y1="320" x2="710" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#35BEFF" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#5CE1FF" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#3566FF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#873BFF" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <g transform="rotate(-13 380 256)">
          {/* Front lower half of the elliptical orbit */}
          <path
            d="M 36 256 A 344 132 0 0 0 724 256"
            stroke="url(#dt-front-arc)"
            strokeWidth="1.6"
          />
        </g>
        <g className="dt-orbit-node dt-orbit-node-1">
          <circle cx="175" cy="392" r="13" fill="url(#dt-node-glow-cyan)" />
          <circle cx="175" cy="392" r="4.2" fill="#FFFFFF" />
        </g>
        <g className="dt-orbit-node dt-orbit-node-3">
          <circle cx="556" cy="348" r="14" fill="url(#dt-node-glow-violet)" />
          <circle cx="556" cy="348" r="4.2" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Luminous Circular Platform underneath the main visual */}
      <div className="dt-luminous-platform" aria-hidden="true">
        <div className="dt-platform-beam" />
        <svg
          className="dt-platform-svg"
          viewBox="0 0 560 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="dt-plat-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#65DCFF" stopOpacity="0.98" />
              <stop offset="34%" stopColor="#1558FF" stopOpacity="0.68" />
              <stop offset="70%" stopColor="#873BFF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#873BFF" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="dt-plat-ring" x1="50" y1="70" x2="510" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#35BEFF" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#873BFF" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="dt-plat-base" x1="80" y1="40" x2="480" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E6EEFF" stopOpacity="0.92" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#DCE6FF" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          <ellipse cx="280" cy="90" rx="235" ry="40" fill="rgba(16, 60, 180, 0.13)" />
          <ellipse cx="280" cy="86" rx="185" ry="30" fill="rgba(135, 59, 255, 0.14)" />

          <ellipse
            cx="280"
            cy="72"
            rx="224"
            ry="42"
            stroke="rgba(53, 190, 255, 0.42)"
            strokeWidth="1.2"
          />

          <ellipse
            cx="280"
            cy="74"
            rx="192"
            ry="35"
            fill="url(#dt-plat-base)"
            stroke="rgba(120, 155, 240, 0.38)"
            strokeWidth="1.2"
          />

          <ellipse cx="280" cy="70" rx="176" ry="31" fill="url(#dt-plat-core)" />

          <ellipse
            cx="280"
            cy="70"
            rx="154"
            ry="25"
            stroke="url(#dt-plat-ring)"
            strokeWidth="1.8"
          />
          <ellipse
            cx="280"
            cy="70"
            rx="112"
            ry="18"
            stroke="rgba(255, 255, 255, 0.88)"
            strokeWidth="1.4"
            strokeDasharray="8 5"
          />
          <ellipse
            cx="280"
            cy="70"
            rx="66"
            ry="10"
            fill="rgba(255, 255, 255, 0.78)"
          />
        </svg>
      </div>
    </div>
  );
}
