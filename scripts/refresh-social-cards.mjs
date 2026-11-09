import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const base = process.argv[2] || "http://localhost:3100";
const pages = ["home", "technology", "products", "applications", "engineering", "about", "careers", "contact", "ai-architect"];

for (const page of pages) {
  const route = page === "home" ? "/" : `/${page}`;
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
  const html = await response.text();
  const match = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (!match) throw new Error(`${route}: no Open Graph image`);
  const remote = new URL(match[1].replaceAll("&amp;", "&"));
  const image = await fetch(new URL(remote.pathname + remote.search, base), { signal: AbortSignal.timeout(30_000) });
  if (!image.ok || !image.headers.get("content-type")?.includes("image/jpeg")) {
    throw new Error(`${route}: Open Graph image HTTP ${image.status}`);
  }
  await writeFile(join(process.cwd(), "public", "og", `${page}.jpg`), Buffer.from(await image.arrayBuffer()));
  console.log(`Refreshed ${page}.jpg`);
}
