"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="hz-page-header">
      <div className="hz-page-header-copy">
        {eyebrow ? <span className="hz-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="hz-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  sublabel,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "blue" | "emerald" | "amber" | "rose";
}) {
  return (
    <div className={`hz-kpi-card hz-kpi-${tone}`}>
      <div className="hz-kpi-top">
        <span className="hz-kpi-label">{label}</span>
        {icon ? <span className="hz-kpi-icon">{icon}</span> : null}
      </div>
      <strong className="hz-kpi-value">{value}</strong>
      {sublabel ? <span className="hz-kpi-sub">{sublabel}</span> : null}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "violet" | "emerald" | "amber" | "rose";
  dot?: boolean;
}) {
  return (
    <span className={`hz-badge hz-badge-${tone}`}>
      {dot ? <span className="hz-badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="hz-empty-state">
      {icon ? <div className="hz-empty-icon">{icon}</div> : null}
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="hz-empty-action">{action}</div> : null}
    </div>
  );
}

export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  width = 580,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="hz-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="hz-slideover"
        style={{ width: `min(${width}px, 100vw)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="hz-slideover-head">
          <div className="hz-slideover-title-wrap">
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="hz-slideover-head-actions">
            {headerActions}
            <button
              type="button"
              className="hz-icon-btn"
              onClick={onClose}
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="hz-slideover-body">{children}</div>
      </aside>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  width = 560,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="hz-overlay hz-overlay-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="hz-modal"
        style={{ width: `min(${width}px, calc(100vw - 32px))` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="hz-slideover-head">
          <div className="hz-slideover-title-wrap">
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="hz-icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="hz-modal-body">{children}</div>
      </div>
    </div>
  );
}

/**
 * Clean, XSS-safe Markdown renderer for AI Agent messages and briefings.
 * Renders headings, bullet/numbered lists, **bold**, *italic*, and `inline code`
 * without ever showing raw Markdown asterisks or using dangerouslySetInnerHTML.
 */
function renderInlineTokens(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      tokens.push(<strong key={`b-${keyIdx++}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      tokens.push(<code key={`c-${keyIdx++}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      tokens.push(<em key={`i-${keyIdx++}`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let blockKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listOrdered) {
      blocks.push(
        <ol key={`ol-${blockKey++}`} className="hz-md-list">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineTokens(item)}</li>
          ))}
        </ol>
      );
    } else {
      blocks.push(
        <ul key={`ul-${blockKey++}`} className="hz-md-list">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineTokens(item)}</li>
          ))}
        </ul>
      );
    }
    listItems = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push(
        <h4 key={`h-${blockKey++}`} className="hz-md-heading">
          {renderInlineTokens(headingMatch[2])}
        </h4>
      );
      continue;
    }

    const bulletMatch = trimmed.match(/^(?:[-•*])\s+(.+)$/);
    if (bulletMatch) {
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(orderedMatch[1]);
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${blockKey++}`} className="hz-md-p">
        {renderInlineTokens(trimmed)}
      </p>
    );
  }

  flushList();
  return <div className="hz-markdown">{blocks}</div>;
}
