"use client";

import { useState } from "react";
import { Calendar, User } from "lucide-react";
import { StatusBadge } from "@/components/admin-ui/primitives";
import {
  formatLocalDateTime,
  getInitials,
  getMonogramColor,
  stageTone,
  type LeadQualityStatus,
} from "@/components/crm/types";
import { CRM_STAGE_LABELS, type CrmLeadRecord, type CrmStage } from "@/lib/crm-types";

const BOARD_STAGES: CrmStage[] = [
  "new_lead",
  "meeting_booked",
  "discovery_completed",
  "proposal_sent",
  "negotiation",
  "won",
];

export function PipelineBoard({
  leads,
  selectedId,
  qualityMap,
  canEdit,
  onSelectLead,
  onMoveStage,
}: {
  leads: CrmLeadRecord[];
  selectedId: string | null;
  qualityMap: Map<string, LeadQualityStatus>;
  canEdit: boolean;
  onSelectLead: (lead: CrmLeadRecord) => void;
  onMoveStage: (lead: CrmLeadRecord, targetStage: CrmStage) => void;
}) {
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<CrmStage | null>(null);

  return (
    <div className="hz-kanban" aria-label="Interactive Sales Pipeline Board">
      {BOARD_STAGES.map((stage) => {
        const colLeads = leads.filter((l) => l.stage === stage);
        return (
          <div
            key={stage}
            className={`hz-kanban-col hz-crm-kanban-col ${
              dropStage === stage ? "is-drop-target" : ""
            }`}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setDropStage(stage);
            }}
            onDragLeave={() => {
              if (dropStage === stage) setDropStage(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDropStage(null);
              if (!dragLeadId || !canEdit) return;
              const dragged = leads.find((l) => l.id === dragLeadId);
              setDragLeadId(null);
              if (dragged && dragged.stage !== stage) {
                onMoveStage(dragged, stage);
              }
            }}
          >
            <div className="hz-kanban-col-head">
              <span>{CRM_STAGE_LABELS[stage].en}</span>
              <StatusBadge tone={stageTone(stage)}>{colLeads.length}</StatusBadge>
            </div>

            {colLeads.length > 0 ? (
              colLeads.map((lead) => {
                const quality = qualityMap.get(lead.id);
                const meeting = formatLocalDateTime(lead.scheduledSlotIso || lead.nextFollowUpAt);
                return (
                  <button
                    key={lead.id}
                    type="button"
                    draggable={canEdit}
                    onDragStart={() => setDragLeadId(lead.id)}
                    onDragEnd={() => {
                      setDragLeadId(null);
                      setDropStage(null);
                    }}
                    className={`hz-kanban-card hz-crm-opp-card ${
                      selectedId === lead.id ? "active" : ""
                    }`}
                    onClick={() => onSelectLead(lead)}
                  >
                    <div className="hz-crm-opp-head">
                      <span
                        className="hz-crm-monogram is-sm"
                        style={{ background: getMonogramColor(lead.company || lead.fullName) }}
                      >
                        {getInitials(lead.company || lead.fullName)}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong className="hz-crm-opp-title">
                          {lead.company || lead.fullName}
                        </strong>
                        <span className="hz-crm-opp-sub">{lead.serviceTrack}</span>
                      </div>
                    </div>

                    <div className="hz-crm-opp-meta">
                      <span>
                        <User size={11} />{" "}
                        {lead.ownerName ||
                          lead.ownerEmail ||
                          (lead.ownerId ? "Assigned Representative" : "Unassigned")}
                      </span>
                      {lead.scheduledSlotIso ? (
                        <span>
                          <Calendar size={11} /> {meeting.dateLabel}
                        </span>
                      ) : null}
                    </div>

                    <div className="hz-crm-opp-foot">
                      <span className="hz-crm-opp-ref">{lead.referenceId}</span>
                      {lead.budgetRange ? (
                        <span className="hz-crm-opp-budget">{lead.budgetRange}</span>
                      ) : quality && quality.kind !== "genuine" ? (
                        <span className={`hz-crm-flag-tag is-${quality.kind}`}>
                          {quality.label}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="hz-crm-kanban-empty">
                {canEdit ? "Drop an opportunity here" : "No opportunities"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
