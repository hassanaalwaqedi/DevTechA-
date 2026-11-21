/**
 * Safe rich-text parser & email HTML renderer for HIRZEXA Recruitment Composer.
 *
 * Security guarantees:
 * - Zero arbitrary raw HTML injection (all user text is strictly HTML-escaped first).
 * - Zero `<script>`, `<iframe>`, event handlers (`onclick`, `onerror`), or `javascript:` URLs.
 * - Supports safe structured formatting only:
 *     - Paragraphs (blank-line separated) & line breaks
 *     - Bold: **text**
 *     - Italic: *text*
 *     - Safe links: [label](https://example.org) or [label](mailto:careers@hirzexa.com)
 *     - Unordered lists (- item or * item)
 *     - Ordered lists (1. item)
 * - Supports English (LTR) and Arabic (RTL) alignment cleanly across Gmail, Outlook, Apple Mail & mobile.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeSafeLinkUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function renderInlineSafeFormatting(escapedLine: string): string {
  // 1. Safe markdown links: [label](url)
  let out = escapedLine.replace(
    /\[([^\]]{1,120})\]\(([^)\s]{1,500})\)/g,
    (_full, rawLabel: string, rawUrl: string) => {
      const unescapedUrl = rawUrl.replace(/&amp;/g, "&");
      const safeUrl = sanitizeSafeLinkUrl(unescapedUrl);
      if (!safeUrl) return rawLabel;
      return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" style="color:#315CDA;font-weight:600;text-decoration:underline;">${rawLabel}</a>`;
    }
  );

  // 2. Bold: **text**
  out = out.replace(
    /\*\*([^*\n]{1,300})\*\*/g,
    '<strong style="font-weight:700;color:#182230;">$1</strong>'
  );

  // 3. Italic: *text* (avoid clashing with already-replaced tags)
  out = out.replace(/(^|[^*])\*([^*\n]{1,300})\*(?!\*)/g, "$1<em>$2</em>");

  return out;
}

export interface RenderedRichMessage {
  safeHtml: string;
  plainText: string;
  hasUnsafeLinksBlocked: boolean;
}

/**
 * Strips any raw HTML tags if pasted, normalizes line endings, and converts
 * safe markdown-style formatting into inline-styled email HTML + clean plain text.
 */
export function renderSafeRecruitmentRichText(
  rawInput: string,
  locale: "en" | "ar" = "en"
): RenderedRichMessage {
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const listPadSide = isAr ? "padding-right:22px;padding-left:0;" : "padding-left:22px;padding-right:0;";

  // Strip control characters except newline/tab; normalize CRLF -> LF
  const normalized = rawInput
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  if (!normalized) {
    return { safeHtml: "", plainText: "", hasUnsafeLinksBlocked: false };
  }

  let hasUnsafeLinksBlocked = false;
  // Detect any blocked javascript:/data: link attempts
  if (/\]\(\s*(?:javascript|data|vbscript):/i.test(normalized)) {
    hasUnsafeLinksBlocked = true;
  }

  const blocks = normalized.split(/\n{2,}/);
  const htmlParts: string[] = [];
  const plainParts: string[] = [];

  for (const rawBlock of blocks) {
    const lines = rawBlock
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;

    const isUnorderedList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
    const isOrderedList = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));

    if (isUnorderedList) {
      const itemsHtml = lines
        .map((line) => {
          const content = line.replace(/^\s*[-*•]\s+/, "");
          const formatted = renderInlineSafeFormatting(escapeHtml(content));
          return `<li style="margin:0 0 6px;font-size:14.5px;line-height:1.7;color:#344054;text-align:${align};">${formatted}</li>`;
        })
        .join("");
      htmlParts.push(
        `<ul style="margin:0 0 16px;${listPadSide}text-align:${align};">${itemsHtml}</ul>`
      );
      plainParts.push(
        lines.map((line) => `- ${stripFormattingToPlain(line.replace(/^\s*[-*•]\s+/, ""))}`).join("\n")
      );
      continue;
    }

    if (isOrderedList) {
      const itemsHtml = lines
        .map((line) => {
          const content = line.replace(/^\s*\d+[.)]\s+/, "");
          const formatted = renderInlineSafeFormatting(escapeHtml(content));
          return `<li style="margin:0 0 6px;font-size:14.5px;line-height:1.7;color:#344054;text-align:${align};">${formatted}</li>`;
        })
        .join("");
      htmlParts.push(
        `<ol style="margin:0 0 16px;${listPadSide}text-align:${align};">${itemsHtml}</ol>`
      );
      plainParts.push(
        lines
          .map((line, idx) => `${idx + 1}. ${stripFormattingToPlain(line.replace(/^\s*\d+[.)]\s+/, ""))}`)
          .join("\n")
      );
      continue;
    }

    const paragraphHtml = lines
      .map((line) => renderInlineSafeFormatting(escapeHtml(line.trim())))
      .join("<br />");
    htmlParts.push(
      `<p style="margin:0 0 14px;font-size:14.5px;line-height:1.72;color:#344054;text-align:${align};">${paragraphHtml}</p>`
    );
    plainParts.push(lines.map((line) => stripFormattingToPlain(line.trim())).join("\n"));
  }

  return {
    safeHtml: htmlParts.join("\n"),
    plainText: plainParts.join("\n\n"),
    hasUnsafeLinksBlocked,
  };
}

function stripFormattingToPlain(line: string): string {
  return line
    .replace(/\[([^\]]{1,120})\]\(([^)\s]{1,500})\)/g, (_m, label: string, url: string) => {
      const safe = sanitizeSafeLinkUrl(url);
      return safe ? `${label} (${safe})` : label;
    })
    .replace(/\*\*([^*\n]{1,300})\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]{1,300})\*(?!\*)/g, "$1$2");
}
