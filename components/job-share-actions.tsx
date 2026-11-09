"use client";

import { Check, Copy, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";

export function JobShareActions({
  slug,
  title,
  revision = "v4",
  compact = false,
}: {
  slug: string;
  title: string;
  revision?: string;
  compact?: boolean;
}) {
  const ar = useLanguage() === "ar";
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/careers/${slug}?share=${encodeURIComponent(revision)}`);
  }, [revision, slug]);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareLink() {
    if (!url) return;
    if (navigator.share) {
      await navigator.share({
        title: ar ? `فرصة وظيفية في DevTech AI: ${title}` : `We’re hiring: ${title} at DevTech AI`,
        text: ar
          ? `استكشف وظيفة ${title} لدى DevTech AI وقدّم الآن:`
          : `Explore the ${title} role at DevTech AI — Computer Vision & Edge Intelligence:`,
        url,
      });
      return;
    }
    await copyLink();
  }

  const whatsappMessage = ar
    ? `✨ *DevTech AI — شركة الرؤية الحاسوبية وذكاء الحافة*\n📌 *فرصة وظيفية:* ${title}\nاستكشف التفاصيل وقدّم الآن:\n${url}`
    : `✨ *DevTech AI — Computer Vision & Edge Intelligence*\n📌 *We’re Hiring:* ${title}\nExplore the role & apply:\n${url}`;

  const encodedUrl = encodeURIComponent(url);
  const encodedWhatsapp = encodeURIComponent(whatsappMessage);
  const encodedTweet = encodeURIComponent(
    ar ? `فرصة وظيفية في DevTech AI: ${title}` : `We’re hiring: ${title} at DevTech AI`
  );

  return (
    <div className={compact ? "share-actions share-actions-compact" : "share-actions"}>
      <a
        href={url ? `https://wa.me/?text=${encodedWhatsapp}` : "#"}
        target="_blank"
        rel="noreferrer"
        className="share-button share-button-whatsapp"
        title={ar ? "مشاركة عبر واتساب" : "Share on WhatsApp"}
      >
        <MessageCircle size={15} />
        <span>{ar ? "واتساب" : "WhatsApp"}</span>
      </a>

      <button
        type="button"
        className="share-button"
        onClick={copyLink}
        disabled={!url}
        title={ar ? "نسخ رابط الوظيفة" : "Copy job link"}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        <span>{copied ? (ar ? "تم النسخ" : "Copied") : ar ? "نسخ الرابط" : "Copy link"}</span>
      </button>

      {!compact && (
        <>
          <button type="button" className="share-button" onClick={shareLink} disabled={!url}>
            <Share2 size={15} />
            <span>{ar ? "مشاركة" : "Share"}</span>
          </button>

          <div className="share-network-links">
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
              className="share-pill-link"
            >
              LinkedIn
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedTweet}&url=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
              className="share-pill-link"
            >
              X
            </a>
            <a
              href={`/api/social-card?v=2027-v2&mode=job&title=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noreferrer"
              className="share-pill-link"
              title={ar ? "معاينة بطاقة المشاركة" : "Preview social card"}
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
