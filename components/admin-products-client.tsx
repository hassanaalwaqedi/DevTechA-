"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, ImageIcon, Pencil, Plus, Rocket, Trash2, X } from "lucide-react";
import type { Product } from "@/lib/data";

type ProductDraft = {
  name: string;
  slug: string;
  eyebrow: string;
  description: string;
  longDescription: string;
  status: string;
  platforms: string;
  color: string;
  imageUrl: string;
  gallery: string;
  launchUrl: string;
  featured: boolean;
  published: boolean;
};

const blankDraft: ProductDraft = {
  name: "",
  slug: "",
  eyebrow: "AI product",
  description: "",
  longDescription: "",
  status: "In development",
  platforms: "Web",
  color: "#d1c4ff",
  imageUrl: "",
  gallery: "",
  launchUrl: "",
  featured: false,
  published: false,
};

const lines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function ProductPreview({draft}: {draft: ProductDraft}) {
  return <aside className="product-admin-preview" aria-label="Public product preview">
    <div className="product-admin-preview-visual" style={{backgroundColor: draft.color}}>
      {draft.imageUrl ? <img key={draft.imageUrl} src={draft.imageUrl} alt="" onError={(event) => {event.currentTarget.hidden = true;}}/> : <ImageIcon size={34} aria-hidden="true"/>}
      <span>{draft.published ? "PUBLIC" : "DRAFT"}</span>
    </div>
    <div className="product-admin-preview-copy"><div className="eyebrow">{draft.eyebrow || "PRODUCT CATEGORY"}</div><h3>{draft.name || "Untitled product"}</h3><p>{draft.description || "A concise description will appear here on the public portfolio."}</p><div className="product-admin-preview-meta"><span>{draft.status || "Status"}</span><span>{lines(draft.platforms).join(" · ") || "Platform"}</span></div>{draft.launchUrl ? <span className="product-admin-launch"><Rocket size={13}/> Launch link configured</span> : null}</div>
  </aside>;
}

export function AdminProductsClient() {
  const [items, setItems] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetch("/api/products?admin=true", {cache: "no-store"});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || "Unable to load products."); return; }
    setItems(result.products || []);
  }

  useEffect(() => { void load(); }, []);

  function updateDraft<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({...current, [key]: value}));
  }

  function updateName(value: string) {
    setDraft((current) => ({...current, name: value, slug: slugEdited ? current.slug : slugify(value)}));
  }

  function startNew() {
    setEditing(null);
    setDraft(blankDraft);
    setSlugEdited(false);
    setCreating(true);
    setError("");
    setNotice("");
  }

  function startEdit(product: Product) {
    setEditing(product);
    setDraft({
      name: product.name,
      slug: product.slug,
      eyebrow: product.eyebrow,
      description: product.description,
      longDescription: product.longDescription,
      status: product.status,
      platforms: product.platform.join("\n"),
      color: product.color,
      imageUrl: product.image || "",
      gallery: (product.gallery || []).join("\n"),
      launchUrl: product.launchUrl || "",
      featured: Boolean(product.featured),
      published: product.published !== false,
    });
    setSlugEdited(true);
    setCreating(true);
    setError("");
    setNotice("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.slug.trim() || !draft.description.trim()) {
      setError("Name, slug, and short description are required.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      name: draft.name.trim(),
      slug: slugify(draft.slug),
      eyebrow: draft.eyebrow.trim(),
      description: draft.description.trim(),
      longDescription: draft.longDescription.trim() || draft.description.trim(),
      status: draft.status.trim(),
      platform: lines(draft.platforms),
      color: draft.color,
      imageUrl: draft.imageUrl.trim(),
      gallery: lines(draft.gallery),
      launchUrl: draft.launchUrl.trim(),
      featured: draft.featured,
      published: draft.published,
    };
    const response = await fetch(editing ? `/api/products/${editing.slug}` : "/api/products", {method: editing ? "PATCH" : "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(payload)});
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setError(result.error || "Unable to save product."); return; }
    setCreating(false);
    setEditing(null);
    setDraft(blankDraft);
    setSlugEdited(false);
    setNotice(result.extendedFieldsPending ? "Product saved. Apply the latest Supabase schema to enable gallery, launch link, and visibility controls." : "Product saved successfully.");
    await load();
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setDeleting(product.slug);
    setError("");
    const response = await fetch(`/api/products/${product.slug}`, {method: "DELETE"});
    const result = await response.json().catch(() => ({}));
    setDeleting("");
    if (!response.ok) { setError(result.error || "Unable to delete product."); return; }
    setNotice(`${product.name} was deleted.`);
    await load();
  }

  const visibleItems = items.filter((product) => `${product.name} ${product.eyebrow} ${product.status}`.toLowerCase().includes(search.toLowerCase()));

  return <>
    <div className="admin-toolbar product-admin-toolbar"><div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products"/><span>{items.length} {items.length === 1 ? "product" : "products"}</span></div><button className="button-dark" onClick={startNew}><Plus size={15}/> New product</button></div>
    {error ? <p className="admin-error" role="alert">{error}</p> : null}
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}

    {creating ? <form className="admin-panel product-editor" onSubmit={save}>
      <div className="admin-toolbar"><div><div className="eyebrow">{editing ? "Edit product" : "New portfolio entry"}</div><h2 style={{margin: "7px 0 0"}}>{editing ? editing.name : "Shape the product story"}</h2></div><button type="button" className="button-small" aria-label="Close editor" onClick={() => {setCreating(false); setEditing(null);}}><X size={15}/></button></div>
      <div className="product-editor-layout"><div className="field-grid product-fields">
        <div className="field"><label htmlFor="product-name">Name *</label><input id="product-name" required value={draft.name} onChange={(event) => updateName(event.target.value)} placeholder="e.g. Aegis AI"/></div>
        <div className="field"><label htmlFor="product-slug">URL slug *</label><input id="product-slug" required value={draft.slug} onChange={(event) => {setSlugEdited(true); updateDraft("slug", event.target.value);}} placeholder="aegis-ai"/></div>
        <div className="field"><label htmlFor="product-category">Category / eyebrow</label><input id="product-category" value={draft.eyebrow} onChange={(event) => updateDraft("eyebrow", event.target.value)} placeholder="AI risk intelligence"/></div>
        <div className="field"><label htmlFor="product-status">Product stage</label><select id="product-status" value={draft.status} onChange={(event) => updateDraft("status", event.target.value)}><option>Concept</option><option>In development</option><option>Private beta</option><option>Public beta</option><option>Live platform</option><option>Archived</option></select></div>
        <div className="field full"><label htmlFor="product-description">Short description *</label><textarea id="product-description" required value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="One clear sentence explaining the product and the problem it solves."/></div>
        <div className="field full"><label htmlFor="product-story">Full product story</label><textarea id="product-story" className="product-story-input" value={draft.longDescription} onChange={(event) => updateDraft("longDescription", event.target.value)} placeholder="Explain the user, problem, value, and what makes the product distinct."/></div>
        <div className="field"><label htmlFor="product-platforms">Platforms <small>(one per line)</small></label><textarea id="product-platforms" value={draft.platforms} onChange={(event) => updateDraft("platforms", event.target.value)} placeholder={"Web\nMobile\nAPI"}/></div>
        <div className="field"><label htmlFor="product-gallery">Gallery image URLs <small>(one per line)</small></label><textarea id="product-gallery" value={draft.gallery} onChange={(event) => updateDraft("gallery", event.target.value)} placeholder={"/product-mobile.png\nhttps://..."}/></div>
        <div className="field"><label htmlFor="product-color">Brand color</label><div className="product-color-control"><input id="product-color" type="color" value={draft.color} onChange={(event) => updateDraft("color", event.target.value)}/><input value={draft.color} onChange={(event) => updateDraft("color", event.target.value)} aria-label="Brand color hex value"/></div></div>
        <div className="field"><label htmlFor="product-image">Cover image URL</label><input id="product-image" value={draft.imageUrl} onChange={(event) => updateDraft("imageUrl", event.target.value)} placeholder="/product-cover.png or https://..."/></div>
        <div className="field full"><label htmlFor="product-launch">Launch URL</label><input id="product-launch" type="url" value={draft.launchUrl} onChange={(event) => updateDraft("launchUrl", event.target.value)} placeholder="https://product.example.com"/></div>
        <div className="field full product-toggle-row"><label className="product-toggle"><input type="checkbox" checked={draft.published} onChange={(event) => updateDraft("published", event.target.checked)}/><span><strong>Publish on portfolio</strong><small>Visitors can see this product on the Products page.</small></span></label><label className="product-toggle"><input type="checkbox" checked={draft.featured} onChange={(event) => updateDraft("featured", event.target.checked)}/><span><strong>Feature product</strong><small>Give this product flagship emphasis.</small></span></label></div>
      </div><ProductPreview draft={draft}/></div>
      <div className="form-actions"><button className="button-dark" type="submit" disabled={saving} aria-busy={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create product"}<ArrowUpRight size={15}/></button><button type="button" className="button-small" onClick={() => {setCreating(false); setEditing(null);}}>Cancel</button><p>Review the preview and visibility before publishing.</p></div>
    </form> : null}

    <section className="admin-panel product-library" aria-labelledby="product-library-title"><div className="product-library-head"><div><div className="eyebrow">Portfolio library</div><h2 id="product-library-title">Products</h2></div><span>{visibleItems.length} shown</span></div>{visibleItems.length ? <div className="product-admin-grid">{visibleItems.map((product) => <article className="product-admin-card" key={product.slug}><div className="product-admin-card-swatch" style={{backgroundColor: product.color}}>{product.image ? <img src={product.image} alt="" onError={(event) => {event.currentTarget.hidden = true;}}/> : <span>{product.name.slice(0, 1).toUpperCase()}</span>}<i>{product.published === false ? "DRAFT" : "PUBLIC"}</i></div><div className="product-admin-card-body"><div><span className="product-admin-category">{product.eyebrow}</span><h3>{product.name}</h3><p>{product.description}</p></div><div className="product-admin-card-meta"><span>{product.status}</span><span>{product.platform.join(" · ") || "No platform"}</span></div><div className="product-admin-card-actions"><button className="button-small" onClick={() => startEdit(product)}><Pencil size={13}/> Edit</button><Link className="button-small" href={`/products#${product.slug}`} target="_blank"><Eye size={13}/> Preview</Link><button className="button-small danger" disabled={deleting === product.slug} onClick={() => {void remove(product);}}><Trash2 size={13}/>{deleting === product.slug ? "Deleting…" : "Delete"}</button></div></div></article>)}</div> : <div className="product-admin-empty"><Rocket size={28}/><h3>No products match this view.</h3><p>Create a portfolio entry or adjust your search.</p></div>}</section>
  </>;
}
