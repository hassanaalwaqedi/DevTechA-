"use client";

import { PanelLeft, PanelRight, ShieldCheck } from "lucide-react";

export function AgentHeader({
  mobileLeftOpen,
  mobileRightOpen,
  authorizedDomainsCount,
  onToggleLeft,
  onToggleRight,
}: {
  mobileLeftOpen: boolean;
  mobileRightOpen: boolean;
  authorizedDomainsCount: number;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}) {
  return (
    <header className="hz-ag-header">
      <div className="hz-ag-header-copy">
        <div className="hz-ag-eyebrow">
          <span>CENTRAL INTELLIGENCE ENGINE · VOICE &amp; TEXT</span>
        </div>
        <h1>HIRZEXA AI Agent Workspace</h1>
        <p>
          Query live company data, review bookings and candidates, draft communications,
          and execute approved actions through English/Arabic voice and text.
        </p>
      </div>

      {/* Responsive compact drawer triggers for laptop / tablet / mobile */}
      <div className="hz-ag-header-actions">
        <button
          type="button"
          className={`hz-btn hz-btn-sm hz-ag-drawer-btn ${
            mobileLeftOpen ? "hz-btn-primary" : "hz-btn-secondary"
          }`}
          onClick={onToggleLeft}
        >
          <PanelLeft size={13} />
          <span>Controls &amp; History</span>
        </button>

        <button
          type="button"
          className={`hz-btn hz-btn-sm hz-ag-drawer-btn ${
            mobileRightOpen ? "hz-btn-primary" : "hz-btn-secondary"
          }`}
          onClick={onToggleRight}
        >
          <ShieldCheck size={13} />
          <span>Capabilities ({authorizedDomainsCount})</span>
          <PanelRight size={13} />
        </button>
      </div>
    </header>
  );
}
