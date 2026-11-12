const base = process.argv[2] || "http://localhost:3100";
const publicRoutes = [
  "/", "/technology", "/products", "/applications", "/engineering",
  "/about", "/careers", "/contact", "/partnerships", "/investors",
  "/billing", "/privacy", "/legal", "/ai-architect", "/expertise",
  "/solutions", "/work", "/services",
];

async function request(path, options) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(30_000),
    ...options,
  });
  return { response, body: await response.text() };
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const route of publicRoutes) {
  const { response, body } = await request(route);
  check(response.status === 200, `${route}: HTTP ${response.status}`);
  check(body.includes("HIRZEXA"), `${route}: missing HIRZEXA branding`);
  check(!/DevTech|DEVTECH|devtecha\.onrender/i.test(body), `${route}: old branding in HTML`);
  check(!body.includes("hassan@hirzexa.com"), `${route}: internal admin mailbox exposed publicly`);
  check(!body.includes("hello@hirzexa.com"), `${route}: unverified placeholder email present`);
  check(body.includes("https://hirzexa.com"), `${route}: missing official canonical domain`);
  console.log(`OK ${route}`);
}

const { body: home } = await request("/");
check(home.includes("Intelligence that sees the world."), "Homepage tagline missing");
check(home.includes("Explore Our Technology"), "Technology CTA missing");
check(home.includes("Discover Our Vision Products"), "Products CTA missing");
check(
  home.includes("contact@hirzexa.com") &&
    home.includes("business@hirzexa.com") &&
    home.includes("support@hirzexa.com") &&
    home.includes("careers@hirzexa.com"),
  "Footer missing one of the four required official emails"
);
const title = home.match(/<title>(.*?)<\/title>/)?.[1];
check(title === "HIRZEXA | Computer Vision &amp; Edge AI Technologies", `Browser title incorrect: ${title}`);
check(home.includes('<link rel="canonical" href="https://hirzexa.com"'), "Homepage canonical incorrect");
check(home.includes("/brand/favicon-32.png"), "Favicon link missing");
const ogUrl = home.match(/<meta property="og:image" content="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
check(Boolean(ogUrl), "Open Graph image missing");
const og = await fetch(new URL(new URL(ogUrl).pathname + new URL(ogUrl).search, base), { signal: AbortSignal.timeout(30_000) });
check(og.status === 200 && og.headers.get("content-type")?.includes("image/jpeg"), "Open Graph image failed");
console.log("OK homepage title, CTA, favicon, and social image");

for (const path of ["/brand/favicon-32.png", "/brand/icon-192.png", "/brand/icon-512.png", "/manifest.webmanifest"]) {
  const response = await fetch(new URL(path, base));
  check(response.status === 200, `${path}: HTTP ${response.status}`);
}
const { body: sitemap } = await request("/sitemap.xml");
const { body: robots } = await request("/robots.txt");
check(sitemap.includes("https://hirzexa.com/careers"), "Sitemap domain incorrect");
check(robots.includes("https://hirzexa.com/sitemap.xml"), "Robots domain incorrect");
console.log("OK icons, manifest, sitemap, robots");

const { response: arabicResponse, body: arabic } = await request("/", { headers: { Cookie: "devtech_locale=ar" } });
check(arabicResponse.status === 200 && arabic.includes('lang="ar"') && arabic.includes('dir="rtl"'), "Arabic RTL page failed");
check(arabic.includes("الرؤية الحاسوبية") && arabic.includes("HIRZEXA"), "Arabic specialization or brand missing");
console.log("OK Arabic homepage and RTL metadata");

const { body: careers } = await request("/careers");
check(careers.includes("Build the future of"), "Careers headline missing");
check(careers.includes('id="open-roles"'), "Careers listings section missing");
const { body: contact } = await request("/contact");
check(contact.includes("contact@hirzexa.com") && contact.includes('name="overview"'), "Contact form or email missing");
const badContact = await fetch(new URL("/api/contact", base), {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "", email: "bad", overview: "short" }),
});
check(badContact.status === 400, `Contact validation: HTTP ${badContact.status}`);
console.log("OK careers section and contact form validation");

const { response: jobsResponse, body: jobsBody } = await request("/api/jobs");
check(jobsResponse.status === 200, `Jobs API: HTTP ${jobsResponse.status}`);
const jobs = JSON.parse(jobsBody).jobs;
if (jobs.length > 0) {
  check(!/DevTech|DEVTECH|ديف تك/i.test(jobsBody), "Old branding in public jobs API");
  const job = jobs[0];
  const { response: jobResponse, body: jobPage } = await request(`/careers/${job.slug}`);
  const { response: applyResponse, body: applyPage } = await request(`/careers/${job.slug}/apply`);
  check(jobResponse.status === 200 && jobPage.includes("HIRZEXA"), "Real job detail failed");
  check(applyResponse.status === 200 && applyPage.includes("HIRZEXA") && applyPage.includes("<form"), "Real application form failed");
  const card = await fetch(new URL(`/og/jobs/${job.slug}.jpg`, base), { signal: AbortSignal.timeout(30_000) });
  check(card.status === 200 && card.headers.get("content-type")?.includes("image/jpeg"), "Real job social card failed");
  const invalidApplication = await fetch(new URL("/api/applications", base), { method: "POST", body: new FormData() });
  check(invalidApplication.status === 400, `Application validation: HTTP ${invalidApplication.status}`);
  console.log(`OK ${jobs.length} real jobs, detail, application form validation, and job social card`);
} else {
  console.log("SKIP real job flow: no jobs available from local data source");
}
