"use client";

import { useMemo } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  PhoneCall,
  Trophy,
} from "lucide-react";
import type { CrmLeadRecord, CrmStage } from "@/lib/crm-types";

function buildDailySeries(timestamps: Array<string | null | undefined>, days = 7): number[] {
  const now = Date.now();
  const buckets = new Array<number>(days).fill(0);
  for (const raw of timestamps) {
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) continue;
    const diffDays = Math.floor((now - t) / 86400_000);
    if (diffDays >= 0 && diffDays < days) {
      buckets[days - 1 - diffDays] += 1;
    }
  }
  return buckets;
}

function CrmSparkline({
  values,
  strokeStart,
  strokeEnd,
  id,
}: {
  values: number[];
  strokeStart: string;
  strokeEnd: string;
  id: string;
}) {
  const width = 88;
  const height = 26;
  const padY = 4;
  const maxVal = Math.max(...values, 1);
  const allZero = values.every((v) => v === 0);

  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * width : width;
    const y = allZero ? height - 6 : height - padY - (v / maxVal) * (height - padY * 2);
    return { x, y };
  });

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  return (
    <svg
      className="hz-cc-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`crm-s-${id}`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={strokeStart} stopOpacity="0.6" />
          <stop offset="100%" stopColor={strokeEnd} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`crm-f-${id}`} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={strokeEnd} stopOpacity="0.22" />
          <stop offset="100%" stopColor={strokeEnd} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#crm-f-${id})`} />
      <path d={d} stroke={`url(#crm-s-${id})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CrmKpiStrip({
  leads,
  stageCounts,
  onSelectStageFilter,
}: {
  leads: CrmLeadRecord[];
  stageCounts: Record<CrmStage, number>;
  onSelectStageFilter: (stage: string) => void;
}) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400_000;

  const newAndBooked = stageCounts.new_lead + stageCounts.meeting_booked;
  const newLast7d = useMemo(
    () => leads.filter((l) => new Date(l.createdAt).getTime() >= sevenDaysAgo).length,
    [leads, sevenDaysAgo]
  );

  const discoveryDone = stageCounts.discovery_completed;
  const proposalsAndNeg = stageCounts.proposal_sent + stageCounts.negotiation;
  const wonCount = stageCounts.won;
  const activeCount = leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length;
  const withBudgetCount = leads.filter(
    (l) => l.stage !== "won" && l.stage !== "lost" && Boolean(l.budgetRange?.trim())
  ).length;

  const seriesAll = useMemo(() => buildDailySeries(leads.map((l) => l.createdAt)), [leads]);
  const seriesDiscovery = useMemo(
    () =>
      buildDailySeries(
        leads
          .filter((l) => l.stage === "discovery_completed")
          .map((l) => l.updatedAt)
      ),
    [leads]
  );
  const seriesProp = useMemo(
    () =>
      buildDailySeries(
        leads
          .filter((l) => l.stage === "proposal_sent" || l.stage === "negotiation")
          .map((l) => l.updatedAt)
      ),
    [leads]
  );
  const seriesWon = useMemo(
    () => buildDailySeries(leads.filter((l) => l.stage === "won").map((l) => l.updatedAt)),
    [leads]
  );
  const seriesActive = useMemo(
    () =>
      buildDailySeries(
        leads.filter((l) => l.stage !== "won" && l.stage !== "lost").map((l) => l.createdAt)
      ),
    [leads]
  );

  return (
    <section className="hz-cc-kpi-grid" aria-label="Sales CRM Pipeline KPIs">
      {/* 1. New & Booked Calls */}
      <button
        type="button"
        className="hz-cc-kpi-card hz-cc-kpi-btn"
        onClick={() => onSelectStageFilter("meeting_booked")}
      >
        <div className="hz-cc-kpi-head">
          <PhoneCall size={14} color="#60A5FA" />
          <span>New &amp; Booked Calls</span>
        </div>
        <div className="hz-cc-kpi-body">
          <div className="hz-cc-kpi-val-wrap">
            <strong>{newAndBooked}</strong>
            <div className="hz-crm-kpi-meta">
              <span className="hz-tone-emerald">+{newLast7d}</span>
              <span>in last 7 days</span>
            </div>
          </div>
          <CrmSparkline id="new" values={seriesAll} strokeStart="#3B82F6" strokeEnd="#60A5FA" />
        </div>
      </button>

      {/* 2. Discovery Completed */}
      <button
        type="button"
        className="hz-cc-kpi-card hz-cc-kpi-btn"
        onClick={() => onSelectStageFilter("discovery_completed")}
      >
        <div className="hz-cc-kpi-head">
          <CheckCircle2 size={14} color="#A78BFA" />
          <span>Discovery Completed</span>
        </div>
        <div className="hz-cc-kpi-body">
          <div className="hz-cc-kpi-val-wrap">
            <strong>{discoveryDone}</strong>
            <div className="hz-crm-kpi-meta">
              <span>Ready for scope</span>
            </div>
          </div>
          <CrmSparkline
            id="disc"
            values={seriesDiscovery}
            strokeStart="#6366F1"
            strokeEnd="#A855F7"
          />
        </div>
      </button>

      {/* 3. Proposals & Negotiation */}
      <button
        type="button"
        className="hz-cc-kpi-card hz-cc-kpi-btn"
        onClick={() => onSelectStageFilter("proposal_sent")}
      >
        <div className="hz-cc-kpi-head">
          <FileText size={14} color="#60A5FA" />
          <span>Proposals &amp; Negotiation</span>
        </div>
        <div className="hz-cc-kpi-body">
          <div className="hz-cc-kpi-val-wrap">
            <strong>{proposalsAndNeg}</strong>
            <div className="hz-crm-kpi-meta">
              <span>{stageCounts.negotiation} negotiating</span>
            </div>
          </div>
          <CrmSparkline id="prop" values={seriesProp} strokeStart="#3B82F6" strokeEnd="#818CF8" />
        </div>
      </button>

      {/* 4. Won Opportunities */}
      <button
        type="button"
        className="hz-cc-kpi-card hz-cc-kpi-btn"
        onClick={() => onSelectStageFilter("won")}
      >
        <div className="hz-cc-kpi-head">
          <Trophy size={14} color="#A78BFA" />
          <span>Won Opportunities</span>
        </div>
        <div className="hz-cc-kpi-body">
          <div className="hz-cc-kpi-val-wrap">
            <strong>{wonCount}</strong>
            <div className="hz-crm-kpi-meta">
              <span>{stageCounts.lost} closed-lost</span>
            </div>
          </div>
          <CrmSparkline id="won" values={seriesWon} strokeStart="#8B5CF6" strokeEnd="#34D399" />
        </div>
      </button>

      {/* 5. Active Opportunities (Truthful alternative to fake revenue totals) */}
      <button
        type="button"
        className="hz-cc-kpi-card hz-cc-kpi-btn hz-crm-kpi-highlight"
        onClick={() => onSelectStageFilter("all")}
      >
        <div className="hz-cc-kpi-head">
          <BriefcaseBusiness size={14} color="#34D399" />
          <span>Active Opportunities</span>
        </div>
        <div className="hz-cc-kpi-body">
          <div className="hz-cc-kpi-val-wrap">
            <strong>{activeCount}</strong>
            <div className="hz-crm-kpi-meta">
              <span className="hz-tone-emerald">{withBudgetCount} budgeted</span>
              <span>client-stated</span>
            </div>
          </div>
          <CrmSparkline
            id="active"
            values={seriesActive}
            strokeStart="#3B82F6"
            strokeEnd="#34D399"
          />
        </div>
      </button>
    </section>
  );
}
