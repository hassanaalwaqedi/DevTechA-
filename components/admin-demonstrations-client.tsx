"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  GitBranch,
  Layers,
  Network,
  RotateCcw,
  Save,
  Send,
  Sliders,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/admin-ui/primitives";
import { LivingEngineeringHero } from "@/components/home/LivingEngineeringHero";
import type {
  DemoScenarioId,
  InteractiveDemoConfig,
  StoredDemoConfigEnvelope,
} from "@/lib/demo-config-types";

type AdminTab = "settings" | "scenarios" | "nodes" | "connections";

export function AdminDemonstrationsClient({
  initialEnvelope,
}: {
  initialEnvelope: StoredDemoConfigEnvelope;
}) {
  const [draft, setDraft] = useState<InteractiveDemoConfig>(initialEnvelope.draft);
  const [lastPublishedAt, setLastPublishedAt] = useState<string>(
    initialEnvelope.lastPublishedAt
  );
  const [activeTab, setActiveTab] = useState<AdminTab>("settings");
  const [selectedScenarioId, setSelectedScenarioId] = useState<DemoScenarioId>(
    initialEnvelope.draft.settings.defaultScenarioId
  );
  const [previewArabic, setPreviewArabic] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");

  const activeScenario =
    draft.scenarios.find((s) => s.id === selectedScenarioId) || draft.scenarios[0];

  async function saveOrPublish(action: "save_draft" | "publish") {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/demonstrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, config: draft }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to save configuration.");
        return;
      }
      setDraft(result.envelope.draft);
      setLastPublishedAt(result.envelope.lastPublishedAt);
      setDirty(false);
      setNotice(
        action === "publish"
          ? "Published live. Homepage visitors now see this updated interactive architecture demonstration."
          : "Draft saved cleanly. Review the live preview and click Save & Publish Live when ready."
      );
    } catch {
      setError("Network error while updating demonstration configuration.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        "Restore default HIRZEXA interactive demonstration settings and publish immediately?"
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/demonstrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to restore defaults.");
        return;
      }
      setDraft(result.envelope.draft);
      setLastPublishedAt(result.envelope.lastPublishedAt);
      setDirty(false);
      setNotice("Default interactive demonstration configuration restored and published.");
    } catch {
      setError("Network error while resetting configuration.");
    } finally {
      setSaving(false);
    }
  }

  function updateSettings(patch: Partial<InteractiveDemoConfig["settings"]>) {
    setDirty(true);
    setDraft((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }

  function updateScenario(
    scenarioId: DemoScenarioId,
    updater: (
      scenario: InteractiveDemoConfig["scenarios"][number]
    ) => InteractiveDemoConfig["scenarios"][number]
  ) {
    setDirty(true);
    setDraft((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === scenarioId ? updater(s) : s)),
    }));
  }

  function moveScenarioStep(scenarioId: DemoScenarioId, idx: number, dir: -1 | 1) {
    updateScenario(scenarioId, (scenario) => {
      const target = idx + dir;
      if (target < 0 || target >= scenario.steps.length) return scenario;
      const nextSteps = [...scenario.steps];
      const [moved] = nextSteps.splice(idx, 1);
      nextSteps.splice(target, 0, moved);
      return { ...scenario, steps: nextSteps };
    });
  }

  function updateNode(
    nodeId: string,
    updater: (
      node: InteractiveDemoConfig["nodes"][number]
    ) => InteractiveDemoConfig["nodes"][number]
  ) {
    setDirty(true);
    setDraft((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? updater(n) : n)),
    }));
  }

  function toggleConnection(connectionId: string) {
    setDirty(true);
    setDraft((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId ? { ...c, enabled: !c.enabled } : c
      ),
    }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Website · Live Studio"
        title="Interactive Demonstrations"
        description="Configure the homepage engineering simulation, localized scenarios, nodes, and connections with a persistent live preview."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge tone={dirty ? "amber" : "emerald"}>
              {dirty ? "Unsaved Draft Edits" : "Synced"}
            </StatusBadge>
            <StatusBadge tone={draft.settings.enabled ? "blue" : "neutral"}>
              {draft.settings.enabled ? "Simulation Active" : "Static Fallback"}
            </StatusBadge>
          </div>
        }
      />

      {error ? <p className="hz-alert hz-alert-error">{error}</p> : null}
      {notice ? (
        <p className="hz-alert hz-alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} /> {notice}
        </p>
      ) : null}

      <div className="hz-studio-layout">
        {/* LEFT COLUMN: Configuration Tabs & Forms */}
        <div style={{ minWidth: 0 }}>
          <div className="hz-segmented" style={{ marginBottom: 14, flexWrap: "wrap" }}>
            {(
              [
                ["settings", "Visualization", Sliders],
                ["scenarios", "Scenarios", Layers],
                ["nodes", "Nodes", Network],
                ["connections", "Connections", GitBranch],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                className={activeTab === id ? "is-active" : ""}
                onClick={() => setActiveTab(id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* TAB 1: VISUALIZATION & ANIMATION SETTINGS */}
          {activeTab === "settings" ? (
            <section className="hz-card">
              <div className="hz-card-head">
                <div>
                  <h2>Visualization &amp; Animation Controls</h2>
                  <p>Tune homepage playback behavior, visual presentation theme, and disclosure copy.</p>
                </div>
              </div>

              <div className="field-grid" style={{ marginBottom: 16 }}>
                <label className="product-toggle">
                  <input
                    type="checkbox"
                    checked={draft.settings.enabled}
                    onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  />
                  <span>
                    <strong>Enable Interactive Simulation</strong>
                    <small>When off, the hero cleanly renders the static architecture frame.</small>
                  </span>
                </label>

                <label className="product-toggle">
                  <input
                    type="checkbox"
                    checked={draft.settings.backgroundEffectsEnabled}
                    onChange={(e) =>
                      updateSettings({ backgroundEffectsEnabled: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Animated Background Effects</strong>
                    <small>Architectural engineering grid, subtle lights, and signal pulses.</small>
                  </span>
                </label>

                <label className="product-toggle">
                  <input
                    type="checkbox"
                    checked={draft.settings.showSimulationPanel}
                    onChange={(e) =>
                      updateSettings({ showSimulationPanel: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Execution Progress Indicator</strong>
                    <small>Compact floating progress pill integrated along the canvas bottom.</small>
                  </span>
                </label>

                <label className="product-toggle">
                  <input
                    type="checkbox"
                    checked={draft.settings.showFloatingWidgets}
                    onChange={(e) =>
                      updateSettings({ showFloatingWidgets: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Interactive Helper Badges</strong>
                    <small>Subtle floating node-inspection prompt inside the canvas.</small>
                  </span>
                </label>

                <label className="product-toggle">
                  <input
                    type="checkbox"
                    checked={draft.settings.parallaxEnabled}
                    onChange={(e) =>
                      updateSettings({ parallaxEnabled: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Cursor-Based 3D Parallax</strong>
                    <small>Desktop GPU tilt (disabled on touch and reduced-motion devices).</small>
                  </span>
                </label>
              </div>

              <div className="field-grid">
                <div className="field">
                  <label>Default Engineering Scenario</label>
                  <select
                    value={draft.settings.defaultScenarioId}
                    onChange={(e) =>
                      updateSettings({
                        defaultScenarioId: e.target.value as DemoScenarioId,
                      })
                    }
                  >
                    {draft.scenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Animation Speed</label>
                  <select
                    value={draft.settings.animationSpeed}
                    onChange={(e) =>
                      updateSettings({
                        animationSpeed: e.target.value as "slow" | "normal" | "fast",
                      })
                    }
                  >
                    <option value="slow">Slow (2.8s / stage — detailed inspection)</option>
                    <option value="normal">Normal (1.95s / stage — recommended)</option>
                    <option value="fast">Fast (1.25s / stage — energetic pacing)</option>
                  </select>
                </div>

                <div className="field full">
                  <label>Approved Visual Presentation Theme</label>
                  <select
                    value={draft.settings.visualTheme}
                    onChange={(e) =>
                      updateSettings({
                        visualTheme: e.target.value as
                          | "luminous-blue"
                          | "architectural-indigo"
                          | "vivid-violet",
                      })
                    }
                  >
                    <option value="luminous-blue">Luminous Blue &amp; White (Default HIRZEXA)</option>
                    <option value="architectural-indigo">Architectural Indigo Glass</option>
                    <option value="vivid-violet">Vivid Blue-Violet Accents</option>
                  </select>
                </div>

                <div className="field">
                  <label>Simulation Disclosure Badge (English)</label>
                  <input
                    value={draft.settings.simulationBadge.en}
                    onChange={(e) =>
                      updateSettings({
                        simulationBadge: {
                          ...draft.settings.simulationBadge,
                          en: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="field">
                  <label>Simulation Disclosure Badge (Arabic)</label>
                  <input
                    dir="rtl"
                    value={draft.settings.simulationBadge.ar}
                    onChange={(e) =>
                      updateSettings({
                        simulationBadge: {
                          ...draft.settings.simulationBadge,
                          ar: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* TAB 2: SCENARIOS & STEP ORDERING */}
          {activeTab === "scenarios" ? (
            <section className="hz-card">
              <div className="hz-card-head">
                <div>
                  <h2>Engineering Scenarios &amp; Step Order</h2>
                  <p>Edit localized copy and reorder execution stages for each scenario.</p>
                </div>
                <select
                  value={selectedScenarioId}
                  onChange={(e) =>
                    setSelectedScenarioId(e.target.value as DemoScenarioId)
                  }
                  style={{ width: "auto", minWidth: 220 }}
                >
                  {draft.scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title.en} ({s.enabled ? "Enabled" : "Disabled"})
                    </option>
                  ))}
                </select>
              </div>

              {activeScenario ? (
                <>
                  <div className="field-grid" style={{ marginBottom: 18 }}>
                    <label className="product-toggle field full">
                      <input
                        type="checkbox"
                        checked={activeScenario.enabled}
                        onChange={(e) =>
                          updateScenario(activeScenario.id, (s) => ({
                            ...s,
                            enabled: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        <strong>Scenario Active on Homepage</strong>
                        <small>Keep at least one engineering scenario enabled for public visitors.</small>
                      </span>
                    </label>

                    <div className="field">
                      <label>Scenario Title (English)</label>
                      <input
                        value={activeScenario.title.en}
                        onChange={(e) =>
                          updateScenario(activeScenario.id, (s) => ({
                            ...s,
                            title: { ...s.title, en: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Scenario Title (Arabic)</label>
                      <input
                        dir="rtl"
                        value={activeScenario.title.ar}
                        onChange={(e) =>
                          updateScenario(activeScenario.id, (s) => ({
                            ...s,
                            title: { ...s.title, ar: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Business Outcome Note (English)</label>
                      <input
                        value={activeScenario.businessValue.en}
                        onChange={(e) =>
                          updateScenario(activeScenario.id, (s) => ({
                            ...s,
                            businessValue: { ...s.businessValue, en: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Business Outcome Note (Arabic)</label>
                      <input
                        dir="rtl"
                        value={activeScenario.businessValue.ar}
                        onChange={(e) =>
                          updateScenario(activeScenario.id, (s) => ({
                            ...s,
                            businessValue: { ...s.businessValue, ar: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <p className="hz-eyebrow" style={{ marginBottom: 10 }}>
                    Demonstration Steps ({activeScenario.steps.length})
                  </p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {activeScenario.steps.map((step, idx) => (
                      <div
                        key={step.id}
                        style={{
                          padding: 14,
                          borderRadius: "var(--hz-radius-md)",
                          border: "1px solid var(--hz-border)",
                          background: "var(--hz-surface-inset)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 10,
                            gap: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <StatusBadge tone="blue">Step {idx + 1}</StatusBadge>
                            <strong style={{ color: "var(--hz-text-strong)", fontSize: 12.5 }}>
                              {step.fromNode} → {step.toNode}
                            </strong>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="hz-btn hz-btn-secondary hz-btn-sm"
                              disabled={idx === 0}
                              onClick={() => moveScenarioStep(activeScenario.id, idx, -1)}
                              title="Move step up"
                              aria-label="Move step up"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              className="hz-btn hz-btn-secondary hz-btn-sm"
                              disabled={idx === activeScenario.steps.length - 1}
                              onClick={() => moveScenarioStep(activeScenario.id, idx, 1)}
                              title="Move step down"
                              aria-label="Move step down"
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="field-grid">
                          <div className="field">
                            <label>Stage Label (EN)</label>
                            <input
                              value={step.label.en}
                              onChange={(e) =>
                                updateScenario(activeScenario.id, (s) => ({
                                  ...s,
                                  steps: s.steps.map((st, i) =>
                                    i === idx
                                      ? { ...st, label: { ...st.label, en: e.target.value } }
                                      : st
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="field">
                            <label>Stage Label (AR)</label>
                            <input
                              dir="rtl"
                              value={step.label.ar}
                              onChange={(e) =>
                                updateScenario(activeScenario.id, (s) => ({
                                  ...s,
                                  steps: s.steps.map((st, i) =>
                                    i === idx
                                      ? { ...st, label: { ...st.label, ar: e.target.value } }
                                      : st
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="field">
                            <label>Explanation (EN)</label>
                            <input
                              value={step.detail.en}
                              onChange={(e) =>
                                updateScenario(activeScenario.id, (s) => ({
                                  ...s,
                                  steps: s.steps.map((st, i) =>
                                    i === idx
                                      ? { ...st, detail: { ...st.detail, en: e.target.value } }
                                      : st
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="field">
                            <label>Explanation (AR)</label>
                            <input
                              dir="rtl"
                              value={step.detail.ar}
                              onChange={(e) =>
                                updateScenario(activeScenario.id, (s) => ({
                                  ...s,
                                  steps: s.steps.map((st, i) =>
                                    i === idx
                                      ? { ...st, detail: { ...st.detail, ar: e.target.value } }
                                      : st
                                  ),
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {/* TAB 3: ARCHITECTURE NODES */}
          {activeTab === "nodes" ? (
            <section className="hz-card">
              <div className="hz-card-head">
                <div>
                  <h2>Architecture Nodes</h2>
                  <p>Manage bilingual node titles, technical descriptions, and canvas visibility.</p>
                </div>
                <StatusBadge tone="neutral">{draft.nodes.length} nodes</StatusBadge>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {draft.nodes.map((node) => (
                  <div
                    key={node.id}
                    style={{
                      padding: 14,
                      borderRadius: "var(--hz-radius-md)",
                      border: "1px solid var(--hz-border)",
                      background: "var(--hz-surface-inset)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: "var(--hz-text-strong)", fontSize: 13 }}>
                          {node.title.en}
                        </strong>
                        <code
                          style={{
                            color: "#93c5fd",
                            background: "var(--hz-blue-soft)",
                            padding: "2px 6px",
                            borderRadius: 5,
                            fontSize: 11,
                          }}
                        >
                          {node.id}
                        </code>
                      </div>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          fontSize: 12,
                          color: "var(--hz-text-secondary)",
                          cursor: node.id === "core" ? "default" : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{ width: "auto", height: "auto", accentColor: "var(--hz-blue)" }}
                          checked={node.enabled}
                          disabled={node.id === "core"}
                          onChange={(e) =>
                            updateNode(node.id, (n) => ({ ...n, enabled: e.target.checked }))
                          }
                        />
                        <span>{node.id === "core" ? "Core (Always Active)" : "Visible"}</span>
                      </label>
                    </div>

                    <div className="field-grid">
                      <div className="field">
                        <label>Title (EN)</label>
                        <input
                          value={node.title.en}
                          onChange={(e) =>
                            updateNode(node.id, (n) => ({
                              ...n,
                              title: { ...n.title, en: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Title (AR)</label>
                        <input
                          dir="rtl"
                          value={node.title.ar}
                          onChange={(e) =>
                            updateNode(node.id, (n) => ({
                              ...n,
                              title: { ...n.title, ar: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Technical Description (EN)</label>
                        <textarea
                          value={node.description.en}
                          onChange={(e) =>
                            updateNode(node.id, (n) => ({
                              ...n,
                              description: { ...n.description, en: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Technical Description (AR)</label>
                        <textarea
                          dir="rtl"
                          value={node.description.ar}
                          onChange={(e) =>
                            updateNode(node.id, (n) => ({
                              ...n,
                              description: { ...n.description, ar: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* TAB 4: NODE CONNECTIONS */}
          {activeTab === "connections" ? (
            <section className="hz-card">
              <div className="hz-card-head">
                <div>
                  <h2>Architecture Connections</h2>
                  <p>Toggle directed data pathways rendered between active system nodes.</p>
                </div>
                <StatusBadge tone="neutral">
                  {draft.connections.filter((c) => c.enabled).length} / {draft.connections.length} active
                </StatusBadge>
              </div>
              <div className="communication-settings-grid">
                {draft.connections.map((conn) => (
                  <label
                    key={conn.id}
                    className="product-toggle"
                    style={{ alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={conn.enabled}
                      onChange={() => toggleConnection(conn.id)}
                    />
                    <span>
                      <strong>
                        {conn.from} → {conn.to}
                      </strong>
                      <small>
                        {conn.label.en} · {conn.label.ar}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* RIGHT COLUMN: Persistent Live Interactive Preview */}
        <aside className="hz-studio-preview" aria-label="Live Interactive Demonstration Preview">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 14px",
              borderBottom: "1px solid var(--hz-border)",
              background: "var(--hz-surface-inset)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Eye size={14} style={{ color: "#93c5fd" }} />
              <strong style={{ fontSize: 12.5, color: "var(--hz-text-strong)" }}>
                Live Draft Preview
              </strong>
            </div>
            <div className="hz-segmented">
              <button
                type="button"
                className={!previewArabic ? "is-active" : ""}
                onClick={() => setPreviewArabic(false)}
              >
                EN (LTR)
              </button>
              <button
                type="button"
                className={previewArabic ? "is-active" : ""}
                onClick={() => setPreviewArabic(true)}
              >
                العربية (RTL)
              </button>
            </div>
          </div>

          <div
            className="corporate-site"
            style={{
              padding: 18,
              background: "#F8F9FF",
              color: "#080D21",
            }}
          >
            <LivingEngineeringHero
              arabic={previewArabic}
              config={draft}
              isAdminPreview
            />
          </div>
        </aside>
      </div>

      {/* STICKY PUBLISH BAR */}
      <div className="hz-studio-sticky-bar">
        <div style={{ fontSize: 12, color: "var(--hz-text-secondary)" }}>
          Last published:{" "}
          <strong style={{ color: "var(--hz-text-strong)" }}>
            {new Date(lastPublishedAt).toLocaleString("en-US")}
          </strong>{" "}
          · Live changes propagate immediately to <code>/</code>.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="hz-btn hz-btn-ghost hz-btn-sm"
            disabled={saving}
            onClick={() => void handleReset()}
          >
            <RotateCcw size={13} /> Restore Defaults
          </button>
          <button
            type="button"
            className="hz-btn hz-btn-secondary hz-btn-sm"
            disabled={saving}
            onClick={() => void saveOrPublish("save_draft")}
          >
            <Save size={13} /> Save Draft
          </button>
          <button
            type="button"
            className="hz-btn hz-btn-primary hz-btn-sm"
            disabled={saving}
            onClick={() => void saveOrPublish("publish")}
          >
            <Send size={13} /> {saving ? "Publishing…" : "Save & Publish Live"}
          </button>
        </div>
      </div>
    </>
  );
}
