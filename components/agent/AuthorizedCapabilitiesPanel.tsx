"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  Layers,
  Lock,
  Mail,
  Settings,
  ShieldCheck,
  TrendingUp,
  CheckSquare,
} from "lucide-react";
import type {
  AgentToolInspectorItem,
  DomainCapability,
} from "@/components/agent/types";

function CapabilityIcon({ icon }: { icon: DomainCapability["icon"] }) {
  if (icon === "crm") return <Database size={15} />;
  if (icon === "bookings") return <CalendarClock size={15} />;
  if (icon === "recruitment") return <BriefcaseBusiness size={15} />;
  if (icon === "analytics") return <TrendingUp size={15} />;
  if (icon === "communications") return <Mail size={15} />;
  return <CheckSquare size={15} />;
}

export function AuthorizedCapabilitiesPanel({
  capabilities,
  tools,
  actorInfo,
  canManageTeam,
  onCloseMobile,
}: {
  capabilities: DomainCapability[];
  tools: AgentToolInspectorItem[];
  actorInfo?: { fullName: string; roleLabel: string; scope: string };
  canManageTeam: boolean;
  onCloseMobile?: () => void;
}) {
  const [showTechRegistry, setShowTechRegistry] = useState(false);

  return (
    <aside className="hz-ag-right-panel" aria-label="Authorized Tool Registry">
      <div className="hz-ag-right-head">
        <div className="hz-ag-right-title-row">
          <Layers size={18} color="#818CF8" />
          <div>
            <h2>Authorized Tool Registry</h2>
            <p>Company domains HIRZEXA can access and execute for your role.</p>
          </div>
        </div>
      </div>

      <div className="hz-ag-cap-list">
        {capabilities.map((cap) => (
          <div
            key={cap.id}
            className={`hz-ag-cap-card ${cap.authorized ? "" : "is-restricted"}`}
          >
            <span className={`hz-ag-cap-icon is-${cap.icon}`} aria-hidden="true">
              <CapabilityIcon icon={cap.icon} />
            </span>

            <div className="hz-ag-cap-copy">
              <strong>{cap.label}</strong>
              <small>{cap.description}</small>
            </div>

            {cap.authorized ? (
              cap.requiresApproval ? (
                <span className="hz-ag-auth-pill is-approval">
                  <ShieldCheck size={11} />
                  <span>
                    Authorized
                    <em>Approval</em>
                  </span>
                </span>
              ) : (
                <span className="hz-ag-auth-pill is-ok">
                  <CheckCircle2 size={11} />
                  <span>Authorized</span>
                </span>
              )
            ) : (
              <span className="hz-ag-auth-pill is-locked">
                <Lock size={11} />
                <span>Restricted</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Collapsible Technical Tool Inspector (Hidden by default to keep workspace executive-focused) */}
      {tools.length > 0 ? (
        <div className="hz-ag-tech-accordion">
          <button
            type="button"
            className="hz-ag-tech-toggle"
            onClick={() => setShowTechRegistry((v) => !v)}
            aria-expanded={showTechRegistry}
          >
            <span>
              Technical Inspector ({tools.filter((t) => t.allowed).length}/{tools.length} tools)
            </span>
            {showTechRegistry ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showTechRegistry ? (
            <div className="hz-ag-tech-list">
              {actorInfo ? (
                <div className="hz-ag-tech-actor">
                  Role: <strong>{actorInfo.roleLabel}</strong> · Scope:{" "}
                  <code>{actorInfo.scope}</code>
                </div>
              ) : null}
              {tools.map((tool) => (
                <div key={tool.name} className="hz-ag-tech-item">
                  <div>
                    <code>{tool.name}</code>
                    <small>{tool.description}</small>
                  </div>
                  <span
                    className={`hz-ag-tech-state ${
                      !tool.allowed
                        ? "is-locked"
                        : tool.requiresConfirmation
                        ? "is-approval"
                        : "is-ok"
                    }`}
                  >
                    {!tool.allowed
                      ? "Locked"
                      : tool.requiresConfirmation
                      ? "Approval"
                      : "Read"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Footer Link to Role & Tool Authorizations */}
      {canManageTeam ? (
        <Link
          href="/admin/team"
          className="hz-ag-manage-link"
          onClick={onCloseMobile}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Settings size={14} color="#94A3B8" />
            <span>Manage Tool Authorizations</span>
          </span>
          <ChevronRight size={14} color="#7C8BB0" />
        </Link>
      ) : null}
    </aside>
  );
}
