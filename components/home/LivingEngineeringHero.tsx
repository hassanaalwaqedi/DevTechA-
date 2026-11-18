"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Cloud,
  Cpu,
  Database,
  Layers,
  Pause,
  Play,
  Plug,
  Search,
  Shield,
  Workflow,
  X,
} from "lucide-react";
import {
  createDefaultDemoConfig,
  type DemoNodeConfig,
  type DemoNodeId,
  type DemoScenarioId,
  type InteractiveDemoConfig,
} from "@/lib/demo-config-types";

const CANVAS_W = 680;
const CANVAS_H = 415;

const NODE_ICONS: Record<DemoNodeId, typeof Cpu> = {
  core: Cpu,
  "api-gateway": Shield,
  "ai-agent": Bot,
  "rag-knowledge": Search,
  "workflow-automation": Workflow,
  "database-storage": Database,
  "cloud-infra": Cloud,
  "enterprise-integrations": Plug,
};

const SPEED_DURATION_MS: Record<"slow" | "normal" | "fast", number> = {
  slow: 2800,
  normal: 1950,
  fast: 1250,
};

function getBezierControlPoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const bend = Math.min(32, dist * 0.14);
  const nx = -dy / dist;
  const ny = dx / dist;
  return { cx: mx + nx * bend, cy: my + ny * bend };
}

function getBezierPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number
) {
  const { cx, cy } = getBezierControlPoint(a, b);
  const inv = 1 - t;
  return {
    x: inv * inv * a.x + 2 * inv * t * cx + t * t * b.x,
    y: inv * inv * a.y + 2 * inv * t * cy + t * t * b.y,
  };
}

function buildCurvePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const { cx, cy } = getBezierControlPoint(a, b);
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export type LivingEngineeringHeroProps = {
  arabic?: boolean;
  config?: InteractiveDemoConfig;
  compact?: boolean;
  isAdminPreview?: boolean;
};

export function LivingEngineeringHero({
  arabic = false,
  config: providedConfig,
  compact = false,
  isAdminPreview = false,
}: LivingEngineeringHeroProps) {
  const config = useMemo(
    () => providedConfig || createDefaultDemoConfig(),
    [providedConfig]
  );

  const enabledScenarios = useMemo(
    () => config.scenarios.filter((s) => s.enabled),
    [config.scenarios]
  );

  const defaultId = useMemo<DemoScenarioId>(() => {
    const preferred = enabledScenarios.find(
      (s) => s.id === config.settings.defaultScenarioId
    );
    return preferred?.id || enabledScenarios[0]?.id || "ai-agent";
  }, [enabledScenarios, config.settings.defaultScenarioId]);

  const [activeScenarioId, setActiveScenarioId] = useState<DemoScenarioId>(defaultId);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<DemoNodeId | null>(null);
  const [isInView, setIsInView] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const packetRef = useRef<SVGGElement | null>(null);
  const trailRef = useRef<SVGCircleElement | null>(null);
  const stepStartRef = useRef<number>(0);

  // Sync default scenario if admin updates default in preview
  useEffect(() => {
    setActiveScenarioId(defaultId);
    setActiveStepIndex(0);
  }, [defaultId]);

  // Dismiss node tooltip with Escape key
  useEffect(() => {
    if (!selectedNodeId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNodeId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeId]);

  const activeScenario = useMemo(
    () =>
      enabledScenarios.find((s) => s.id === activeScenarioId) ||
      enabledScenarios[0] ||
      config.scenarios[0],
    [enabledScenarios, activeScenarioId, config.scenarios]
  );

  const enabledNodes = useMemo(
    () => config.nodes.filter((n) => n.enabled),
    [config.nodes]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<DemoNodeId, DemoNodeConfig>();
    for (const node of config.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [config.nodes]);

  const visibleConnections = useMemo(
    () =>
      config.connections.filter(
        (c) =>
          c.enabled &&
          nodeMap.get(c.from)?.enabled &&
          nodeMap.get(c.to)?.enabled
      ),
    [config.connections, nodeMap]
  );

  const steps = activeScenario.steps;
  const safeStepIndex = Math.min(activeStepIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[safeStepIndex] || steps[0];

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Pause animation automatically when scrolled out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        setIsInView(Boolean(entries[0]?.isIntersecting));
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 60 FPS GPU-friendly data packet animation loop using direct SVG DOM refs (zero React re-renders per frame)
  useEffect(() => {
    const fromNode = nodeMap.get(currentStep.fromNode);
    const toNode = nodeMap.get(currentStep.toNode);
    if (!fromNode || !toNode) return;

    if (reducedMotion) {
      const mid = getBezierPoint(fromNode, toNode, 0.5);
      packetRef.current?.setAttribute("transform", `translate(${mid.x}, ${mid.y})`);
      trailRef.current?.setAttribute("transform", `translate(${mid.x}, ${mid.y})`);
      return;
    }

    if (isPaused || !isInView) return;

    const stepDuration = SPEED_DURATION_MS[config.settings.animationSpeed] || 1950;
    let frameId = 0;
    stepStartRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - stepStartRef.current;
      const rawT = Math.min(1, elapsed / stepDuration);
      const easedT =
        rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      const pt = getBezierPoint(fromNode, toNode, easedT);
      const trailT = Math.max(0, easedT - 0.11);
      const trailPt = getBezierPoint(fromNode, toNode, trailT);

      if (packetRef.current) {
        packetRef.current.setAttribute(
          "transform",
          `translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`
        );
      }
      if (trailRef.current) {
        trailRef.current.setAttribute(
          "transform",
          `translate(${trailPt.x.toFixed(2)}, ${trailPt.y.toFixed(2)})`
        );
      }

      if (rawT >= 1) {
        setActiveStepIndex((prev) => (prev + 1 >= steps.length ? 0 : prev + 1));
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [
    currentStep,
    nodeMap,
    isPaused,
    isInView,
    reducedMotion,
    config.settings.animationSpeed,
    steps.length,
  ]);

  // Subtle 3D tilt parallax on desktop fine pointers (zero React state updates)
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        reducedMotion ||
        !config.settings.parallaxEnabled ||
        event.pointerType !== "mouse" ||
        !tiltRef.current
      ) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      const rotY = (nx * 4.5).toFixed(2);
      const rotX = (-ny * 3.8).toFixed(2);
      tiltRef.current.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    },
    [reducedMotion, config.settings.parallaxEnabled]
  );

  const handlePointerLeave = useCallback(() => {
    if (tiltRef.current) {
      tiltRef.current.style.transform =
        "perspective(1200px) rotateX(0deg) rotateY(0deg)";
    }
  }, []);

  const handleSelectScenario = (id: DemoScenarioId) => {
    setActiveScenarioId(id);
    setActiveStepIndex(0);
    setIsPaused(false);
    setSelectedNodeId(null);
  };

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;

  const scenarioEdgeSet = useMemo(() => {
    const set = new Set<string>();
    for (const st of steps) {
      set.add(`${st.fromNode}->${st.toNode}`);
      set.add(`${st.toNode}->${st.fromNode}`);
    }
    return set;
  }, [steps]);

  if (!config.settings.enabled && !isAdminPreview) {
    return null;
  }

  const themeClass = `dt-living-theme-${config.settings.visualTheme}`;

  // Position compact popover cleanly inside the canvas away from the clicked node
  const popoverPlacementClass = selectedNode
    ? selectedNode.y < 185
      ? "is-bottom"
      : "is-top"
    : "is-bottom";

  return (
    <div
      ref={containerRef}
      className={`dt-living-hero ${themeClass} ${compact ? "dt-living-hero-compact" : ""}`}
      dir={arabic ? "rtl" : "ltr"}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Compact Three-Scenario Switcher */}
      <div className="dt-living-topbar">
        <div
          className="dt-living-tabs"
          role="tablist"
          aria-label={
            arabic
              ? "سيناريوهات الهندسة التفاعلية"
              : "Interactive engineering scenarios"
          }
        >
          {enabledScenarios.map((scenario) => {
            const active = scenario.id === activeScenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`dt-living-tab ${active ? "active" : ""}`}
                onClick={() => handleSelectScenario(scenario.id)}
              >
                <span className="dt-living-tab-dot" aria-hidden="true" />
                <span>{arabic ? scenario.shortTab.ar : scenario.shortTab.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating 3D-Inspired Interactive Engineering Architecture Canvas */}
      <div
        ref={tiltRef}
        className="dt-living-canvas-shell"
        dir="ltr"
        onClick={(e) => {
          if (e.target === e.currentTarget && selectedNodeId) {
            setSelectedNodeId(null);
          }
        }}
      >
        <div className="dt-living-canvas-glow" aria-hidden="true" />
        <div className="dt-living-canvas-grid" aria-hidden="true" />

        {/* SVG Connection Mesh + Luminous Data Packet */}
        <svg
          className="dt-living-svg"
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="dt-live-edge-active"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#0754FF" />
              <stop offset="50%" stopColor="#35BEFF" />
              <stop offset="100%" stopColor="#873BFF" />
            </linearGradient>
            <radialGradient id="dt-live-packet-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="38%" stopColor="#35BEFF" stopOpacity="0.96" />
              <stop offset="72%" stopColor="#1050FF" stopOpacity="0.48" />
              <stop offset="100%" stopColor="#873BFF" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dt-live-core-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1050FF" stopOpacity="0.22" />
              <stop offset="55%" stopColor="#873BFF" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#873BFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Subtle 3D Orbital Depth Rings centered on HIRZEXA Core */}
          <circle cx="340" cy="185" r="145" fill="url(#dt-live-core-halo)" />
          <ellipse
            cx="340"
            cy="185"
            rx="168"
            ry="118"
            stroke="rgba(16, 80, 255, 0.12)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <ellipse
            cx="340"
            cy="185"
            rx="242"
            ry="158"
            stroke="rgba(135, 59, 255, 0.09)"
            strokeWidth="1"
            strokeDasharray="5 8"
          />

          {/* Connection Mesh */}
          {visibleConnections.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const d = buildCurvePath(from, to);
            const isCurrentEdge =
              (edge.from === currentStep.fromNode &&
                edge.to === currentStep.toNode) ||
              (edge.to === currentStep.fromNode &&
                edge.from === currentStep.toNode);
            const isInScenario = scenarioEdgeSet.has(`${edge.from}->${edge.to}`);

            return (
              <path
                key={edge.id}
                d={d}
                stroke={
                  isCurrentEdge
                    ? "url(#dt-live-edge-active)"
                    : isInScenario
                    ? "rgba(16, 80, 255, 0.34)"
                    : "rgba(120, 145, 225, 0.16)"
                }
                strokeWidth={isCurrentEdge ? 2.8 : isInScenario ? 1.65 : 1.1}
                strokeDasharray={
                  isCurrentEdge ? "none" : isInScenario ? "5 4" : "3 5"
                }
                className={isCurrentEdge ? "dt-live-path-glow" : ""}
              />
            );
          })}

          {/* Highlight Active Step Route */}
          {nodeMap.get(currentStep.fromNode) && nodeMap.get(currentStep.toNode) ? (
            <path
              d={buildCurvePath(
                nodeMap.get(currentStep.fromNode)!,
                nodeMap.get(currentStep.toNode)!
              )}
              stroke="url(#dt-live-edge-active)"
              strokeWidth="3"
              strokeLinecap="round"
              className="dt-live-path-glow"
            />
          ) : null}

          {/* Trailing Data Packet Glow */}
          <circle
            ref={trailRef}
            r="5"
            fill="#873BFF"
            fillOpacity="0.44"
            transform={`translate(${
              nodeMap.get(currentStep.fromNode)?.x || 340
            }, ${nodeMap.get(currentStep.fromNode)?.y || 185})`}
          />

          {/* Primary Luminous Data Packet */}
          <g
            ref={packetRef}
            transform={`translate(${
              nodeMap.get(currentStep.fromNode)?.x || 340
            }, ${nodeMap.get(currentStep.fromNode)?.y || 185})`}
          >
            <circle r="15" fill="url(#dt-live-packet-glow)" />
            <circle r="5" fill="#FFFFFF" stroke="#0754FF" strokeWidth="2" />
          </g>
        </svg>

        {/* Interactive Clickable Glass Architecture Nodes (Short Names Only) */}
        <div
          className="dt-living-nodes-layer"
          onClick={(e) => {
            if (e.target === e.currentTarget && selectedNodeId) {
              setSelectedNodeId(null);
            }
          }}
        >
          {enabledNodes.map((node) => {
            const Icon = NODE_ICONS[node.id] || Layers;
            const isCore = node.id === "core";
            const isActive = currentStep.activeNodes.includes(node.id);
            const isTarget = currentStep.toNode === node.id;
            const isSelected = selectedNodeId === node.id;

            return (
              <button
                key={node.id}
                type="button"
                style={{
                  left: `${(node.x / CANVAS_W) * 100}%`,
                  top: `${(node.y / CANVAS_H) * 100}%`,
                }}
                className={[
                  "dt-arch-node",
                  isCore ? "dt-arch-node-core" : "",
                  `dt-arch-accent-${node.accent}`,
                  isActive ? "is-active" : "",
                  isTarget ? "is-target" : "",
                  isSelected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId((prev) =>
                    prev === node.id ? null : node.id
                  );
                }}
                aria-expanded={isSelected}
                aria-label={arabic ? node.title.ar : node.title.en}
              >
                <span className="dt-arch-node-pulse" aria-hidden="true" />
                <span className="dt-arch-node-icon" aria-hidden="true">
                  <Icon size={isCore ? 19 : 14} strokeWidth={2.1} />
                </span>
                <span className="dt-arch-node-label" dir="auto">
                  {arabic ? node.shortLabel.ar : node.shortLabel.en}
                </span>
              </button>
            );
          })}
        </div>

        {/* Compact Click-to-Inspect Node Popover Tooltip */}
        {selectedNode ? (
          <div
            className={`dt-node-popover ${popoverPlacementClass}`}
            dir={arabic ? "rtl" : "ltr"}
            role="dialog"
            aria-label={arabic ? selectedNode.title.ar : selectedNode.title.en}
          >
            <div className="dt-node-popover-head">
              <div>
                <span className="dt-node-popover-role">
                  {arabic ? selectedNode.role.ar : selectedNode.role.en}
                </span>
                <h4>{arabic ? selectedNode.title.ar : selectedNode.title.en}</h4>
              </div>
              <button
                type="button"
                className="dt-node-popover-close"
                onClick={() => setSelectedNodeId(null)}
                aria-label={arabic ? "إغلاق" : "Close"}
              >
                <X size={14} />
              </button>
            </div>
            <p className="dt-node-popover-desc">
              {arabic ? selectedNode.description.ar : selectedNode.description.en}
            </p>
            <div className="dt-node-popover-tags">
              {selectedNode.techTags.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Sleek Integrated Execution-Progress Indicator */}
        {config.settings.showSimulationPanel ? (
          <div
            className="dt-living-progress-pill"
            dir={arabic ? "rtl" : "ltr"}
            aria-live="polite"
          >
            <span className="dt-living-progress-dot" aria-hidden="true" />
            <span className="dt-living-progress-label">
              {arabic ? currentStep.label.ar : currentStep.label.en}
            </span>

            <div
              className="dt-living-progress-steps"
              role="group"
              aria-label={
                arabic ? "مراحل تنفيذ المحاكاة" : "Simulated execution progress"
              }
            >
              {steps.map((step, idx) => {
                const state =
                  idx < safeStepIndex
                    ? "done"
                    : idx === safeStepIndex
                    ? "active"
                    : "idle";
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`dt-living-progress-seg is-${state}`}
                    onClick={() => {
                      setActiveStepIndex(idx);
                      setIsPaused(true);
                    }}
                    title={arabic ? step.label.ar : step.label.en}
                    aria-label={arabic ? step.label.ar : step.label.en}
                  />
                );
              })}
            </div>

            <button
              type="button"
              className="dt-living-progress-toggle"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={
                isPaused
                  ? arabic
                    ? "تشغيل المحاكاة"
                    : "Resume simulation"
                  : arabic
                  ? "إيقاف المحاكاة مؤقتاً"
                  : "Pause simulation"
              }
              title={
                isPaused
                  ? arabic
                    ? "تشغيل"
                    : "Play"
                  : arabic
                  ? "إيقاف مؤقت"
                  : "Pause"
              }
            >
              {isPaused ? <Play size={11} /> : <Pause size={11} />}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
