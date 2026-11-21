import { KHAIR_URL, khairProduct, type Application, type ApplicantStatus, type CandidateSource, type Job, type JobStatus, type Product } from "@/lib/data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { normalizeVisualAccent, normalizeVisualKeywords, normalizeVisualVariantForCategory, resolveVisualCategory } from "@/lib/job-visuals";
import { isMissingExtendedProductColumns } from "@/lib/product-admin";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export function databaseReady() { return isSupabaseConfigured(); }

function publicBrandText(value: string): string {
  return value
    .replace(/\b(?:DevTech AI|DevTechA|DevTech)\b/gi, "HIRZEXA")
    .replace(/ديف تك(?: إيه آي)?/g, "HIRZEXA")
    .replaceAll("hello@devtech.ai", CONTACT_EMAIL)
    .replaceAll("https://devtecha.onrender.com", SITE_URL);
}

function publicJob(job: Job): Job {
  return {
    ...job,
    title: publicBrandText(job.title),
    department: publicBrandText(job.department),
    description: publicBrandText(job.description),
    responsibilities: job.responsibilities.map(publicBrandText),
    requirements: job.requirements.map(publicBrandText),
    niceToHave: job.niceToHave.map(publicBrandText),
    compensationText: publicBrandText(job.compensationText),
  };
}

function publicProduct(product: Product): Product {
  return {
    ...product,
    name: publicBrandText(product.name),
    eyebrow: publicBrandText(product.eyebrow),
    description: publicBrandText(product.description),
    longDescription: publicBrandText(product.longDescription),
  };
}

function mapJob(row: Record<string, unknown>): Job {
  const visualCategory = resolveVisualCategory(row.visual_category, String(row.title), String(row.department));
  return {id: String(row.id), title: String(row.title), slug: String(row.slug), department: String(row.department), description: String(row.description), responsibilities: (row.responsibilities as string[]) || [], requirements: (row.requirements as string[]) || [], niceToHave: (row.nice_to_have as string[]) || [], location: String(row.location), workMode: String(row.work_mode), employmentType: String(row.employment_type), duration: String(row.duration), compensationType: String(row.compensation_type), compensationText: String(row.compensation_text), skills: (row.skills as string[]) || [], publishedAt: String(row.published_at || ""), deadline: row.deadline ? String(row.deadline) : undefined, status: row.status as JobStatus, visualCategory, visualVariant: normalizeVisualVariantForCategory(visualCategory, row.visual_variant), accentColor: normalizeVisualAccent(row.accent_color), visualKeywords: normalizeVisualKeywords(row.visual_keywords)};
}
function mapProduct(row: Record<string, unknown>): Product { const isKhair = String(row.slug) === khairProduct.slug; return {name: String(row.name), slug: String(row.slug), eyebrow: String(row.eyebrow), description: String(row.description), longDescription: String(row.long_description), status: String(row.status), platform: (row.platforms as string[]) || [], color: String(row.color), image: row.image_url ? String(row.image_url) : isKhair ? khairProduct.image : undefined, gallery: Array.isArray(row.gallery_urls) && row.gallery_urls.length ? row.gallery_urls as string[] : isKhair ? khairProduct.gallery : [], launchUrl: row.launch_url ? String(row.launch_url) : isKhair ? KHAIR_URL : undefined, featured: Boolean(row.featured), published: row.is_published === undefined ? true : Boolean(row.is_published)}; }
const VALID_SOURCES: CandidateSource[] = ["website", "linkedin", "email", "referral", "other"];

function mapApplication(row: Record<string, unknown>): Application {
  const notes = Array.isArray(row.application_notes) ? (row.application_notes as Array<{ note?: string }>) : [];
  const rawSource = typeof row.candidate_source === "string" ? row.candidate_source : "website";
  const source: CandidateSource = VALID_SOURCES.includes(rawSource as CandidateSource)
    ? (rawSource as CandidateSource)
    : "website";
  const rawCvPath = row.cv_path ? String(row.cv_path).trim() : "";
  const linkedJobTitle = (row.jobs as { title?: string } | null)?.title;
  const customPositionTitle = row.custom_position_title ? String(row.custom_position_title).trim() : "";
  const isExternalProspect = Boolean(row.is_external_prospect) || (!row.job_id && !linkedJobTitle);
  const resolvedNote =
    notes[0]?.note ||
    (row.internal_notes ? String(row.internal_notes) : undefined);

  return {
    id: String(row.reference_id),
    dbId: row.id ? String(row.id) : undefined,
    name: String(row.full_name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    country: row.country ? String(row.country) : "",
    location: row.current_location ? String(row.current_location) : "",
    linkedin: row.linkedin_url ? String(row.linkedin_url) : undefined,
    github: row.github_url ? String(row.github_url) : undefined,
    portfolio: row.portfolio_url ? String(row.portfolio_url) : undefined,
    role: row.current_role ? String(row.current_role) : "",
    experience: row.experience ? String(row.experience) : "",
    education: row.education ? String(row.education) : undefined,
    technologies: row.technologies ? String(row.technologies) : "",
    workAuthorization: row.work_authorization ? String(row.work_authorization) : undefined,
    sponsorshipRequired: Boolean(row.sponsorship_required),
    salaryExpectation: row.salary_expectation ? String(row.salary_expectation) : undefined,
    noticePeriod: row.notice_period ? String(row.notice_period) : undefined,
    remotePreference: row.remote_preference ? String(row.remote_preference) : undefined,
    whyJoin: row.why_join ? String(row.why_join) : "",
    whyFit: row.why_fit ? String(row.why_fit) : "",
    availability: row.availability ? String(row.availability) : "",
    startDate: row.expected_start_date ? String(row.expected_start_date) : "",
    additionalMessage: row.additional_message ? String(row.additional_message) : undefined,
    coverLetterText: row.cover_letter_text ? String(row.cover_letter_text) : undefined,
    cvName: rawCvPath ? rawCvPath.split("/").pop() || "CV" : "",
    hasCv: Boolean(rawCvPath),
    coverLetterName: row.cover_letter_path ? String(row.cover_letter_path).split("/").pop() : undefined,
    jobId: row.job_id ? String(row.job_id) : "",
    jobTitle: linkedJobTitle || customPositionTitle || "External Prospect (General Talent Pool)",
    status: row.status as ApplicantStatus,
    createdAt: String(row.created_at).slice(0, 10),
    note: resolvedNote,
    source,
    isExternalProspect,
    createdByEmail: row.created_by_email ? String(row.created_by_email) : undefined,
    emailOptOut: Boolean(row.email_opt_out),
  };
}

function isBeforeOrToday(value?: string) { return !value || value >= new Date().toISOString().slice(0, 10); }
export async function getPublishedJobsResult(): Promise<{jobs: Job[]; available: boolean}> { if (!databaseReady()) return {jobs: [], available: false}; try { const supabase = await createSupabaseServerClient(); const {data, error} = await supabase.from("jobs").select("*").eq("status", "open").order("published_at", {ascending: false}); if (error) throw error; return {jobs: (data || []).map(mapJob).filter((job) => isBeforeOrToday(job.deadline)).map(publicJob), available: true}; } catch { return {jobs: [], available: false}; } }
export async function getPublishedJobs() { return (await getPublishedJobsResult()).jobs; }
export async function getJobBySlug(slug: string) { if (!databaseReady()) return null; try { const supabase = await createSupabaseServerClient(); const {data, error} = await supabase.from("jobs").select("*").eq("slug", slug).eq("status", "open").maybeSingle(); if (error) throw error; const job = data ? mapJob(data) : null; return job && isBeforeOrToday(job.deadline) ? publicJob(job) : null; } catch { return null; } }
export async function getAdminJobs() { const supabase = await createSupabaseServerClient(); const {data, error} = await supabase.from("jobs").select("*").order("created_at", {ascending: false}); if (error) throw error; return (data || []).map(mapJob); }
export async function getProductsResult(): Promise<{products: Product[]; available: boolean}> { if (!databaseReady()) return {products: [], available: false}; try { const supabase = await createSupabaseServerClient(); let {data, error} = await supabase.from("products").select("*").eq("is_published", true).order("created_at", {ascending: false}); if (isMissingExtendedProductColumns(error)) ({data, error} = await supabase.from("products").select("*").order("created_at", {ascending: false})); if (error) throw error; return {products: (data || []).map(mapProduct).filter((product) => product.published !== false && !product.slug.startsWith("__hirzexa_")).map(publicProduct), available: true}; } catch { return {products: [], available: false}; } }
export async function getProducts() { return (await getProductsResult()).products; }
export async function getAdminProducts() { const supabase = await createSupabaseServerClient(); const {data, error} = await supabase.from("products").select("*").order("created_at", {ascending: false}); if (error) throw error; return (data || []).map(mapProduct).filter((product) => !product.slug.startsWith("__hirzexa_")); }
export async function getApplications(filters?: { status?: string; query?: string; source?: string }) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("job_applications")
    .select("*, jobs(title), application_notes(note)")
    .order("created_at", { ascending: false });
  if (filters?.status && filters.status !== "All statuses" && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.query) {
    const q = filters.query.replace(/[,%()]/g, "").trim();
    if (q) {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,reference_id.ilike.%${q}%`);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  let mapped = (data || []).map(mapApplication);
  if (filters?.source && filters.source !== "all") {
    mapped = mapped.filter((item) => (item.source || "website") === filters.source);
  }
  return mapped;
}
export async function getMetrics() {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{count: total}, {count: todayCount}, {count: activeJobs}, {count: closedJobs}, {data: statuses}] = await Promise.all([
    supabase.from("job_applications").select("id", {count: "exact", head: true}),
    supabase.from("job_applications").select("id", {count: "exact", head: true}).gte("created_at", `${today}T00:00:00Z`),
    supabase.from("jobs").select("id", {count: "exact", head: true}).eq("status", "open"),
    supabase.from("jobs").select("id", {count: "exact", head: true}).eq("status", "closed"),
    supabase.from("job_applications").select("status"),
  ]);
  const counts = (statuses || []).reduce<Record<string, number>>((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
  const hiringMetrics = {
    totalApplications: total || 0,
    applicationsToday: todayCount || 0,
    activeJobs: activeJobs || 0,
    closedJobs: closedJobs || 0,
    newApplications: counts.new || 0,
    reviewing: counts.reviewing || 0,
    shortlisted: counts.shortlisted || 0,
    interviews: counts.interview || 0,
    accepted: counts.accepted || 0,
    rejected: counts.rejected || 0,
  };

  const [{data: events, error: eventsError}, {data: jobs}] = await Promise.all([
    supabase.from("visitor_events").select("visitor_id, path, job_slug, created_at").order("created_at", {ascending: false}),
    supabase.from("jobs").select("slug, title"),
  ]);
  if (eventsError) {
    console.error("[metrics] visitor analytics unavailable", eventsError);
    return {...hiringMetrics, analyticsAvailable: false, totalVisitors: 0, visitorsToday: 0, jobPageViews: 0, jobVisitors: 0, topJobs: []};
  }

  const visitorEvents = (events || []).filter(
    (event) => !String(event.path || "").startsWith("/__crm_lead__/")
  );
  const jobTitles = new Map((jobs || []).map((job) => [job.slug, job.title]));
  const todayStart = new Date(`${today}T00:00:00Z`).getTime();
  const visitors = new Set<string>();
  const visitorsToday = new Set<string>();
  const jobVisitors = new Set<string>();
  const jobStats = new Map<string, {views: number; visitors: Set<string>}>();
  for (const event of visitorEvents) {
    visitors.add(event.visitor_id);
    if (new Date(event.created_at).getTime() >= todayStart) visitorsToday.add(event.visitor_id);
    if (!event.job_slug) continue;
    jobVisitors.add(event.visitor_id);
    const stat = jobStats.get(event.job_slug) || {views: 0, visitors: new Set<string>()};
    stat.views += 1;
    stat.visitors.add(event.visitor_id);
    jobStats.set(event.job_slug, stat);
  }
  const topJobs = Array.from(jobStats.entries())
    .sort(([, first], [, second]) => second.views - first.views)
    .slice(0, 5)
    .map(([slug, stat]) => ({slug, title: jobTitles.get(slug) || slug, views: stat.views, uniqueVisitors: stat.visitors.size}));
  return {...hiringMetrics, analyticsAvailable: true, totalVisitors: visitors.size, visitorsToday: visitorsToday.size, jobPageViews: visitorEvents.filter((event) => Boolean(event.job_slug)).length, jobVisitors: jobVisitors.size, topJobs};
}
