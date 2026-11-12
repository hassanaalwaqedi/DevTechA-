"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowDown, ArrowRight, Layers } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { ARCHITECTURE_LAYERS, getAegisCopy } from "@/lib/aegis-data";

export function ArchitectureExplorer({ locale }: { locale: Locale }) {
  const t = getAegisCopy(locale);
  const ar = locale === "ar";
  const [selectedIndex, setSelectedIndex] = useState(2); // Default highlight on Computer Vision layer
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<"overview" | "detailed">("detailed");

  const activeLayer =
    ARCHITECTURE_LAYERS[hoveredIndex ?? selectedIndex] ?? ARCHITECTURE_LAYERS[0];

  return (
    <section
      className="aegis-band aegis-band-dark"
      id="architecture"
      aria-labelledby="aegis-architecture-heading"
    >
      <div className="container">
        <div className="aegis-section-head">
          <div>
            <span className="aegis-eyebrow aegis-eyebrow-light">
              {t.architectureEyebrow}
            </span>
            <h2
              id="aegis-architecture-heading"
              className="aegis-heading aegis-heading-light"
            >
              {t.architectureTitle}
            </h2>
          </div>

          <div className="aegis-arch-head-right">
            <p className="aegis-subcopy aegis-subcopy-light">
              {t.architectureSubtitle}
            </p>
            <div className="aegis-mode-switch" role="group" aria-label="Architecture view mode">
              <button
                type="button"
                className={mode === "overview" ? "is-active" : ""}
                onClick={() => setMode("overview")}
              >
                {t.modeOverview}
              </button>
              <button
                type="button"
                className={mode === "detailed" ? "is-active" : ""}
                onClick={() => setMode("detailed")}
              >
                {t.modeDetailed}
              </button>
            </div>
          </div>
        </div>

        <div className="aegis-arch-layout">
          {/* Left: Interactive 6-Layer Stack with Data-Flow Connections */}
          <div className="aegis-arch-stack" role="list">
            {ARCHITECTURE_LAYERS.map((layer, index) => {
              const isSelected = index === selectedIndex;
              const isHighlighted =
                hoveredIndex === index ||
                (hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1);

              return (
                <div key={layer.id} className="aegis-arch-node-wrap" role="listitem">
                  <button
                    type="button"
                    className={`aegis-arch-node${isSelected ? " is-selected" : ""}${
                      isHighlighted ? " is-linked" : ""
                    }`}
                    onClick={() => setSelectedIndex(index)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    aria-pressed={isSelected}
                  >
                    <div className="aegis-arch-node-top">
                      <span className="aegis-arch-step">{layer.step}</span>
                      <span className={`aegis-status-chip is-${layer.status}`}>
                        {t.statusBadges[layer.status]}
                      </span>
                    </div>
                    <strong>{layer.title[locale]}</strong>
                    <p>{layer.shortSummary[locale]}</p>
                  </button>
                  {index < ARCHITECTURE_LAYERS.length - 1 ? (
                    <div className="aegis-arch-connector" aria-hidden="true">
                      <ArrowDown size={14} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Right: Live Inspector Panel */}
          <aside className="aegis-arch-inspector" aria-live="polite">
            <div className="aegis-inspector-head">
              <div>
                <span className="aegis-inspector-step">
                  <Layers size={14} aria-hidden="true" />
                  <span>
                    {ar ? `الطبقة ${activeLayer.step}` : `LAYER ${activeLayer.step}`}
                  </span>
                </span>
                <h3>{activeLayer.title[locale]}</h3>
              </div>
              <span className={`aegis-status-chip is-${activeLayer.status}`}>
                {t.statusBadges[activeLayer.status]}
              </span>
            </div>

            <p className="aegis-inspector-details">{activeLayer.details[locale]}</p>

            {mode === "detailed" ? (
              <div className="aegis-io-grid">
                <div className="aegis-io-col">
                  <span>{ar ? "المدخلات" : "Inputs"}</span>
                  <ul>
                    {activeLayer.inputs[locale].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="aegis-io-arrow" aria-hidden="true">
                  <ArrowRight size={16} />
                </div>

                <div className="aegis-io-col">
                  <span>{ar ? "المعالجة" : "Processing"}</span>
                  <ul>
                    {activeLayer.processing[locale].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="aegis-io-arrow" aria-hidden="true">
                  <ArrowRight size={16} />
                </div>

                <div className="aegis-io-col">
                  <span>{ar ? "المخرجات" : "Outputs"}</span>
                  <ul>
                    {activeLayer.outputs[locale].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="aegis-overview-pills">
                {activeLayer.processing[locale].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}

            {activeLayer.screenshot ? (
              <figure className="aegis-inspector-shot">
                <Image
                  src={activeLayer.screenshot.src}
                  alt={activeLayer.screenshot.alt[locale]}
                  width={1024}
                  height={443}
                  sizes="(max-width: 980px) 100vw, 50vw"
                  className="aegis-inspector-img"
                />
                <figcaption>{activeLayer.screenshot.caption[locale]}</figcaption>
              </figure>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}

