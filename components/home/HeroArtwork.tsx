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
          ? "تصور تفاعلي لنظام الرؤية الحاسوبية، الكاميرا الذكية، وحدة معالجة ذكاء الحافة، ولوحة المراقبة الحية"
          : "Interactive Computer Vision and Edge AI system visualization showing a smart optical camera, real-time object detection and tracking scene, Edge AI NPU processor, and live event monitoring panels"
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

        {/* Soft blue/cyan glowing sensor nodes on the orbital lines */}
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

      {/* Main central floating translucent glass panel: Smart Camera -> CV Scene -> Edge AI Unit */}
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
              <span>AEGIS VISION · EDGE AI PIPELINE</span>
            </div>
            <div className="dt-chrome-status">
              <span className="dt-chrome-bar" />
              <span className="dt-chrome-bar dt-chrome-bar-short" />
            </div>
          </div>

          {/* Computer Vision & Edge AI Product Stage (Replaces generic neural brain) */}
          <div className="dt-brain-visual-stage">
            <div className="dt-brain-core-glow" aria-hidden="true" />

            <svg
              className="dt-brain-image"
              viewBox="0 0 640 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="dt-stage-bg" x1="0" y1="0" x2="640" y2="360" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#07153E" />
                  <stop offset="48%" stopColor="#0D2568" />
                  <stop offset="100%" stopColor="#1E185A" />
                </linearGradient>
                <radialGradient id="dt-stage-flare" cx="52%" cy="48%" r="55%">
                  <stop offset="0%" stopColor="#35BEFF" stopOpacity="0.32" />
                  <stop offset="45%" stopColor="#1050FF" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#07153E" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="dt-fov-cone" x1="118" y1="175" x2="410" y2="175" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5CE1FF" stopOpacity="0.38" />
                  <stop offset="45%" stopColor="#1050FF" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#873BFF" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="dt-cam-body" x1="36" y1="110" x2="136" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2A4EA8" />
                  <stop offset="50%" stopColor="#162E72" />
                  <stop offset="100%" stopColor="#0B1945" />
                </linearGradient>
                <radialGradient id="dt-cam-lens" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#9BEBFF" />
                  <stop offset="35%" stopColor="#1050FF" />
                  <stop offset="75%" stopColor="#081B4D" />
                  <stop offset="100%" stopColor="#1D3F91" />
                </radialGradient>
                <linearGradient id="dt-edge-chip" x1="486" y1="92" x2="604" y2="262" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1A398B" />
                  <stop offset="50%" stopColor="#122563" />
                  <stop offset="100%" stopColor="#2A1C74" />
                </linearGradient>
                <linearGradient id="dt-stream-line" x1="125" y1="175" x2="505" y2="175" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5CE1FF" />
                  <stop offset="55%" stopColor="#3566FF" />
                  <stop offset="100%" stopColor="#B57CFF" />
                </linearGradient>
              </defs>

              {/* Deep sapphire vision stage background */}
              <rect width="640" height="360" rx="18" fill="url(#dt-stage-bg)" />
              <rect width="640" height="360" rx="18" fill="url(#dt-stage-flare)" />

              {/* Subtle spatial calibration grid */}
              <g stroke="rgba(120, 185, 255, 0.11)" strokeWidth="1">
                <line x1="0" y1="64" x2="640" y2="64" />
                <line x1="0" y1="124" x2="640" y2="124" />
                <line x1="0" y1="184" x2="640" y2="184" />
                <line x1="0" y1="244" x2="640" y2="244" />
                <line x1="0" y1="304" x2="640" y2="304" />
                <line x1="148" y1="0" x2="148" y2="360" />
                <line x1="252" y1="0" x2="252" y2="360" />
                <line x1="356" y1="0" x2="356" y2="360" />
                <line x1="460" y1="0" x2="460" y2="360" />
              </g>

              {/* Optical Field-of-View (FOV) beam projecting from Smart Camera into the live scene */}
              <polygon
                points="126,176 202,62 442,62 442,294 202,294"
                fill="url(#dt-fov-cone)"
              />
              <path
                d="M126 176L202 62H442M126 176L202 294H442"
                stroke="rgba(92, 225, 255, 0.48)"
                strokeWidth="1.3"
                strokeDasharray="5 4"
              />

              {/* ============================================================
                  STAGE 1 (LEFT): SMART OPTICAL CAMERA & SENSOR UNIT
                 ============================================================ */}
              <g>
                {/* Top label badge */}
                <rect
                  x="26"
                  y="54"
                  width="112"
                  height="22"
                  rx="6"
                  fill="rgba(16, 80, 255, 0.35)"
                  stroke="rgba(92, 225, 255, 0.55)"
                  strokeWidth="1"
                />
                <circle cx="38" cy="65" r="3.2" fill="#5CE1FF" />
                <text x="46" y="68.5" fill="#E8F6FF" fontSize="9.2" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">
                  OPTICAL SENSOR
                </text>

                {/* Camera body housing */}
                <rect
                  x="30"
                  y="108"
                  width="98"
                  height="136"
                  rx="22"
                  fill="url(#dt-cam-body)"
                  stroke="rgba(115, 205, 255, 0.65)"
                  strokeWidth="1.6"
                />
                {/* Inner bezel */}
                <rect
                  x="39"
                  y="118"
                  width="80"
                  height="116"
                  rx="16"
                  fill="rgba(7, 20, 58, 0.65)"
                  stroke="rgba(92, 225, 255, 0.25)"
                  strokeWidth="1"
                />
                {/* Status LED & IR sensor */}
                <circle cx="53" cy="131" r="3" fill="#35F2A6" />
                <circle cx="105" cy="131" r="3" fill="#5CE1FF" opacity="0.8" />

                {/* Multi-element optical lens */}
                <circle
                  cx="79"
                  cy="174"
                  r="31"
                  fill="url(#dt-cam-lens)"
                  stroke="#5CE1FF"
                  strokeWidth="1.8"
                />
                <circle
                  cx="79"
                  cy="174"
                  r="22"
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
                <circle cx="79" cy="174" r="11" fill="#061238" stroke="#35BEFF" strokeWidth="1.4" />
                <circle cx="74" cy="169" r="3.8" fill="#FFFFFF" opacity="0.9" />
                <circle cx="84" cy="179" r="1.8" fill="#5CE1FF" opacity="0.85" />

                {/* Camera telemetry footer */}
                <text x="48" y="222" fill="#A9D6FF" fontSize="8.5" fontWeight="600" fontFamily="sans-serif" letterSpacing="0.05em">
                  4K HDR · 60 FPS
                </text>

                {/* Mounting base */}
                <path
                  d="M66 244V264M92 244V264M54 264H104"
                  stroke="rgba(115, 205, 255, 0.55)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>

              {/* ============================================================
                  STAGE 2 (CENTER): LIVE COMPUTER VISION PERCEPTION VIEWFINDER
                 ============================================================ */}
              <g>
                {/* Viewfinder frame */}
                <rect
                  x="176"
                  y="46"
                  width="274"
                  height="268"
                  rx="14"
                  fill="rgba(8, 22, 64, 0.58)"
                  stroke="rgba(92, 225, 255, 0.42)"
                  strokeWidth="1.4"
                />

                {/* Viewfinder Header Bar */}
                <rect
                  x="176"
                  y="46"
                  width="274"
                  height="28"
                  rx="14"
                  fill="rgba(16, 62, 168, 0.48)"
                />
                <circle cx="192" cy="60" r="3.5" fill="#35F2A6" />
                <text x="202" y="63.5" fill="#FFFFFF" fontSize="9.2" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.05em">
                  LIVE PERCEPTION · ZONE A
                </text>
                <text x="382" y="63.5" fill="#7CE7FF" fontSize="8.8" fontWeight="700" fontFamily="sans-serif">
                  3 OBJECTS
                </text>

                {/* Perspective ground mesh inside viewfinder */}
                <path
                  d="M186 244H440M186 274H440M234 208L192 302M286 208L264 302M338 208L356 302M390 208L432 302"
                  stroke="rgba(92, 225, 255, 0.16)"
                  strokeWidth="1"
                />

                {/* Monitored Zone Polygon */}
                <polygon
                  points="196,232 428,232 440,298 184,298"
                  fill="rgba(53, 190, 255, 0.08)"
                  stroke="rgba(53, 190, 255, 0.35)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />

                {/* --- DETECTION 1: Tracked Person with Pose Keypoints --- */}
                <g>
                  {/* Bounding box */}
                  <rect
                    x="198"
                    y="108"
                    width="88"
                    height="148"
                    rx="6"
                    fill="rgba(53, 190, 255, 0.12)"
                    stroke="#35BEFF"
                    strokeWidth="1.6"
                  />
                  {/* Corner HUD brackets */}
                  <path d="M198 122V108H212" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M286 122V108H272" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M198 242V256H212" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M286 242V256H272" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />

                  {/* Detection label pill */}
                  <rect x="198" y="88" width="92" height="17" rx="4" fill="#0754FF" />
                  <text x="204" y="99.5" fill="#FFFFFF" fontSize="8.5" fontWeight="700" fontFamily="sans-serif">
                    PERSON #04 · 98.6%
                  </text>

                  {/* Human pose skeleton & keypoints */}
                  <circle cx="242" cy="132" r="8" fill="rgba(92, 225, 255, 0.3)" stroke="#5CE1FF" strokeWidth="1.6" />
                  <circle cx="242" cy="132" r="2.8" fill="#FFFFFF" />
                  {/* Torso & limbs */}
                  <path
                    d="M242 140V188M220 156L242 148L264 156M220 156L214 182M264 156L270 180M242 188L226 234M242 188L258 234"
                    stroke="#5CE1FF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Keypoint joints */}
                  {[
                    [242, 148],
                    [220, 156],
                    [264, 156],
                    [214, 182],
                    [270, 180],
                    [242, 188],
                    [226, 234],
                    [258, 234],
                  ].map(([kx, ky], i) => (
                    <circle key={i} cx={kx} cy={ky} r="3" fill="#FFFFFF" stroke="#0754FF" strokeWidth="1.4" />
                  ))}

                  {/* Motion trajectory vector */}
                  <path
                    d="M242 246C262 252 284 256 306 254"
                    stroke="#35F2A6"
                    strokeWidth="1.8"
                    strokeDasharray="3 3"
                  />
                  <circle cx="306" cy="254" r="3.2" fill="#35F2A6" />
                </g>

                {/* --- DETECTION 2: Tracked Autonomous / Fleet Vehicle --- */}
                <g>
                  <rect
                    x="308"
                    y="128"
                    width="124"
                    height="86"
                    rx="6"
                    fill="rgba(135, 59, 255, 0.15)"
                    stroke="#B57CFF"
                    strokeWidth="1.6"
                  />
                  <path d="M308 140V128H320" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  <path d="M432 140V128H420" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  <path d="M308 202V214H320" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  <path d="M432 202V214H420" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

                  {/* Label */}
                  <rect x="308" y="108" width="102" height="17" rx="4" fill="#873BFF" />
                  <text x="314" y="119.5" fill="#FFFFFF" fontSize="8.5" fontWeight="700" fontFamily="sans-serif">
                    VEHICLE #12 · 96.4%
                  </text>

                  {/* Stylized vehicle wireframe silhouette */}
                  <path
                    d="M324 184L338 156H398L414 184H324Z"
                    fill="rgba(181, 124, 255, 0.32)"
                    stroke="#D6B8FF"
                    strokeWidth="1.5"
                  />
                  <rect x="320" y="180" width="98" height="16" rx="4" fill="rgba(92, 225, 255, 0.35)" stroke="#5CE1FF" strokeWidth="1.3" />
                  <circle cx="340" cy="198" r="7" fill="#081844" stroke="#5CE1FF" strokeWidth="2" />
                  <circle cx="398" cy="198" r="7" fill="#081844" stroke="#5CE1FF" strokeWidth="2" />
                </g>

                {/* Bottom scene status pill inside viewfinder */}
                <rect
                  x="192"
                  y="272"
                  width="242"
                  height="28"
                  rx="7"
                  fill="rgba(7, 22, 66, 0.86)"
                  stroke="rgba(92, 225, 255, 0.38)"
                  strokeWidth="1"
                />
                <circle cx="206" cy="286" r="4" fill="#35F2A6" />
                <text x="216" y="289.5" fill="#E8F6FF" fontSize="8.8" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.04em">
                  EVENT: AUTHORIZED ACTIVITY · RISK SCORE 0.08
                </text>
              </g>

              {/* ============================================================
                  STAGE 3 (RIGHT): EDGE AI PROCESSING UNIT & EVENT OUTPUT
                 ============================================================ */}
              <g>
                {/* Data stream lines connecting Viewfinder to Edge AI Unit */}
                <path
                  d="M450 130H488M450 180H488M450 230H488"
                  stroke="url(#dt-stream-line)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
                <circle cx="468" cy="130" r="3.5" fill="#5CE1FF" />
                <circle cx="468" cy="180" r="3.5" fill="#FFFFFF" />
                <circle cx="468" cy="230" r="3.5" fill="#B57CFF" />

                {/* Edge AI Hardware Module */}
                <rect
                  x="488"
                  y="88"
                  width="124"
                  height="184"
                  rx="18"
                  fill="url(#dt-edge-chip)"
                  stroke="rgba(165, 130, 255, 0.7)"
                  strokeWidth="1.6"
                />

                {/* Top label */}
                <rect
                  x="502"
                  y="102"
                  width="96"
                  height="20"
                  rx="5"
                  fill="rgba(135, 59, 255, 0.35)"
                  stroke="rgba(185, 145, 255, 0.55)"
                  strokeWidth="1"
                />
                <text x="514" y="115" fill="#FFFFFF" fontSize="8.5" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">
                  EDGE AI NPU
                </text>

                {/* Processor die & neural cores */}
                <rect
                  x="512"
                  y="134"
                  width="76"
                  height="76"
                  rx="12"
                  fill="rgba(8, 20, 58, 0.85)"
                  stroke="#5CE1FF"
                  strokeWidth="1.5"
                />
                {/* Pins around NPU */}
                <path
                  d="M528 126V134M550 126V134M572 126V134M528 210V218M550 210V218M572 210V218M504 152H512M504 172H512M504 192H512M588 152H596M588 172H596M588 192H596"
                  stroke="#5CE1FF"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                {/* 4 Tensor/Vision Core blocks */}
                <rect x="522" y="144" width="24" height="24" rx="4" fill="rgba(16, 80, 255, 0.55)" stroke="#7CE7FF" strokeWidth="1" />
                <rect x="554" y="144" width="24" height="24" rx="4" fill="rgba(135, 59, 255, 0.55)" stroke="#D2B3FF" strokeWidth="1" />
                <rect x="522" y="176" width="24" height="24" rx="4" fill="rgba(135, 59, 255, 0.55)" stroke="#D2B3FF" strokeWidth="1" />
                <rect x="554" y="176" width="24" height="24" rx="4" fill="rgba(53, 190, 255, 0.55)" stroke="#FFFFFF" strokeWidth="1" />

                {/* Metrics inside Edge AI Module */}
                <text x="506" y="236" fill="#A9D6FF" fontSize="8.5" fontWeight="700" fontFamily="sans-serif">
                  ONNX · TensorRT
                </text>
                <text x="506" y="252" fill="#35F2A6" fontSize="9.5" fontWeight="800" fontFamily="sans-serif">
                  11.4 ms INFERENCE
                </text>
              </g>
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
              <span>CAMERA → EDGE AI → DASHBOARD</span>
              <strong>ON-DEVICE LIVE</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-panel 1: Floating Edge Vision Mesh Panel (Top Right) */}
      <div className="dt-float-card dt-float-worldmap" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-float-title">Edge Vision Mesh</span>
          <span className="dt-float-live-dot" />
        </div>
        <div className="dt-worldmap-canvas">
          <svg viewBox="0 0 190 88" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Stylized camera & edge device topology */}
            <g fill="rgba(35, 95, 245, 0.28)">
              <circle cx="28" cy="22" r="2" /><circle cx="34" cy="20" r="2" /><circle cx="40" cy="23" r="2" />
              <circle cx="25" cy="28" r="2" /><circle cx="31" cy="27" r="2.2" /><circle cx="37" cy="29" r="2" />
              <circle cx="88" cy="20" r="2" /><circle cx="94" cy="18" r="2" /><circle cx="100" cy="20" r="2" />
              <circle cx="86" cy="26" r="2" /><circle cx="92" cy="25" r="2.2" /><circle cx="98" cy="26" r="2" />
              <circle cx="94" cy="39" r="2.2" /><circle cx="101" cy="40" r="2" /><circle cx="108" cy="38" r="2.2" />
              <circle cx="130" cy="30" r="2" /><circle cx="137" cy="31" r="2" /><circle cx="144" cy="32" r="2" />
              <circle cx="136" cy="38" r="2.2" /><circle cx="143" cy="39" r="2" /><circle cx="149" cy="40" r="2" />
            </g>

            {/* Glowing connection arcs between Smart Cameras, Edge Box, and Dashboard */}
            <path
              d="M36 28C62 10 82 12 96 25"
              stroke="#1050FF"
              strokeWidth="1.35"
              strokeDasharray="3 2"
              opacity="0.85"
            />
            <path
              d="M96 25C104 30 106 34 108 38"
              stroke="#35BEFF"
              strokeWidth="1.5"
              opacity="0.95"
            />
            <path
              d="M108 38C122 26 134 28 144 36"
              stroke="#873BFF"
              strokeWidth="1.35"
              strokeDasharray="3 2"
              opacity="0.85"
            />

            {/* Active Vision Nodes */}
            <circle cx="36" cy="28" r="5.5" fill="rgba(53, 190, 255, 0.32)" />
            <circle cx="36" cy="28" r="2.6" fill="#1050FF" />

            <circle cx="96" cy="25" r="6" fill="rgba(16, 80, 255, 0.32)" />
            <circle cx="96" cy="25" r="2.8" fill="#35BEFF" />

            <circle cx="108" cy="38" r="7" fill="rgba(53, 190, 255, 0.44)" />
            <circle cx="108" cy="38" r="3.2" fill="#0754FF" />

            <circle cx="144" cy="36" r="5.5" fill="rgba(135, 59, 255, 0.32)" />
            <circle cx="144" cy="36" r="2.6" fill="#873BFF" />
          </svg>
        </div>
        <div className="dt-worldmap-foot">
          <span>Architecture</span>
          <strong>Edge + Cloud</strong>
        </div>
      </div>

      {/* Sub-panel 2: Miniature Computer-Vision Detection Preview (Left / Bottom-Left) */}
      <div className="dt-float-card dt-float-vision" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-vision-badge">
            <i /> CV · DETECT &amp; TRACK
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
          <strong>11.4 ms</strong>
        </div>
      </div>

      {/* Sub-panel 3: Edge Inference Telemetry Panel (Bottom Right) */}
      <div className="dt-float-card dt-float-analytics" aria-hidden="true">
        <div className="dt-float-card-head">
          <span className="dt-float-title">Edge Optimization</span>
          <span className="dt-analytics-badge">ON-DEVICE</span>
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
          <span>ONNX · TensorRT</span>
          <strong>Low-Latency Edge</strong>
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
