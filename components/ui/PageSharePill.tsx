"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

export function PageSharePill({ arabic = false }: { arabic?: boolean }) {
  const pathname = usePathname();
  const [pageUrl, setPageUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("DevTech AI — Computer Vision & Edge Intelligence");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPageUrl(`${window.location.origin}${pathname || "/"}`);
    if (document.title) {
      setPageTitle(document.title);
    }
  }, [pathname]);

  async function handleCopy() {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = pageUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const whatsappText = arabic
    ? `✨ *${pageTitle}*\nالذكاء الذي يرى العالم — الرؤية الحاسوبية وذكاء الحافة:\n${pageUrl}`
    : `✨ *${pageTitle}*\nIntelligence that sees the world — Computer Vision & Edge AI:\n${pageUrl}`;

  return (
    <div className="share-actions share-actions-compact">
      <a
        href={pageUrl ? `https://wa.me/?text=${encodeURIComponent(whatsappText)}` : "#"}
        target="_blank"
        rel="noreferrer"
        className="share-button share-button-whatsapp"
        title={arabic ? "مشاركة هذه الصفحة عبر واتساب" : "Share this page on WhatsApp"}
      >
        <MessageCircle size={14} />
        <span>{arabic ? "مشاركة عبر واتساب" : "Share on WhatsApp"}</span>
      </a>
      <button
        type="button"
        className="share-button"
        onClick={handleCopy}
        disabled={!pageUrl}
        title={arabic ? "نسخ رابط الصفحة" : "Copy page link"}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? (arabic ? "تم النسخ" : "Copied") : arabic ? "نسخ الرابط" : "Copy link"}</span>
      </button>
    </div>
  );
}

