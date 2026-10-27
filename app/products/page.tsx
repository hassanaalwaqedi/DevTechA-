import { ArrowUpRight } from "lucide-react";
import { getProductsResult } from "@/lib/db";
import { khairProduct } from "@/lib/data";
import { getLocale } from "@/lib/locale";
import { ArrowLink } from "@/components/arrow-link";

export default async function ProductsPage() {
  const [result, locale] = await Promise.all([getProductsResult(), getLocale()]);
  const ar = locale === "ar";
  const products = result.available ? result.products : [khairProduct];
  const featured = products.find((product) => product.featured) || products[0];

  return <main>
    <section className="page-hero products-hero animate-on-scroll"><div className="container"><div className="eyebrow">{ar ? "استوديو منتجات DEVTECH AI" : "The DevTech AI product studio"}</div><h1>{ar ? "منتجات لعالم لا يتوقف عن التغيّر." : "Products for a world that keeps changing."}</h1><p>{ar ? "نبني وندعم منتجات تجمع بين البرمجيات والذكاء والسلوك البشري. كل منتج يبدأ من حاجة حقيقية." : "We build and back products where software, intelligence, and human behavior meet. Each one starts with a real need."}</p>{featured ? <div className="products-hero-note"><span className="status-dot"/>{ar ? "المنتج المميز الآن:" : "Featured now:"} <strong>{featured.name}</strong></div> : null}</div></section>
    <section className="section animate-on-scroll delay-1"><div className="container"><div className="product-list">{products.map((product) => <article id={product.slug} className={`product-detail${product.image ? " has-product-image" : ""}`} key={product.slug}>
      <div className="visual" style={{background: product.color}}>
        {product.image ? <img className="product-detail-image" src={product.image} alt={`${product.name} platform visual`}/> : null}
        {product.gallery?.length ? <div className="product-gallery-float" aria-label={`${product.name} interface screenshots`}>{product.gallery.map((image, index) => <img key={image} className={`product-gallery-image gallery-image-${index + 1}`} src={image} alt="" width={index === 0 ? 165 : 250} height={index === 0 ? 338 : 165}/>)}</div> : null}
        <div className="product-detail-content"><div className="eyebrow">{product.eyebrow}</div><h2>{product.name}</h2><span className="product-detail-index">{product.featured ? "01 / FLAGSHIP" : "DEVTECH AI"}</span></div>
      </div>
      <div className="details"><div><div className="product-status">{product.status}</div><p dir="auto">{product.longDescription}</p></div><div><div className="detail-row"><span>{ar ? "متاح على" : "Available on"}</span><span>{product.platform.join(" · ") || (ar ? "التفاصيل قريباً" : "Details coming soon")}</span></div><div className="detail-row"><span>{ar ? "بُني بواسطة" : "Built by"}</span><span>DevTech AI</span></div>{product.launchUrl ? <a className="product-launch-link" href={product.launchUrl} target="_blank" rel="noreferrer">{ar ? `زيارة ${product.name}` : `Visit ${product.name}`}<ArrowUpRight size={15}/></a> : null}</div></div>
    </article>)}</div></div></section>
    <section className="statement animate-on-scroll delay-1"><div className="container"><div className="eyebrow" style={{color: "#9bc9b4"}}>{ar ? "محفظة تنمو باستمرار" : "A growing portfolio"}</div><h2>{ar ? <>منتجات أخرى تتشكل داخل الاستوديو. <span>سنشاركها عندما تصبح جاهزة.</span></> : <>More products are taking shape in the studio. <span>We’ll share them when they’re ready.</span></>}</h2><ArrowLink href="/contact">{ar ? "اعمل معنا" : "Work with us"}</ArrowLink></div></section>
  </main>;
}
