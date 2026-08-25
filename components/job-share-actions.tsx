"use client";

import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

export function JobShareActions({slug, title, compact = false}: {slug: string; title: string; compact?: boolean}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setUrl(`${window.location.origin}/careers/${slug}`); }, [slug]);

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
    if (navigator.share) { await navigator.share({title, text: `View the ${title} role at DevTech AI`, url}); return; }
    await copyLink();
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`We’re hiring: ${title} at DevTech AI`);
  return <div className={compact ? "share-actions share-actions-compact" : "share-actions"}>
    <button type="button" className="share-button" onClick={copyLink} disabled={!url} title="Copy job link">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy link"}</button>
    {!compact && <button type="button" className="share-button" onClick={shareLink} disabled={!url}><Share2 size={15}/> Share</button>}
    {!compact && <div className="share-network-links"><span>Share on</span><a href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noreferrer">WhatsApp</a><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noreferrer">LinkedIn</a><a href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noreferrer">X</a><a href={url || "#"} target="_blank" rel="noreferrer"><ExternalLink size={13}/></a></div>}
  </div>;
}
