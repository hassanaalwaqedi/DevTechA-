import { khairProduct, type Application, type ApplicantStatus, type Job, type JobStatus, type Product } from "@/lib/data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export function databaseReady() { return isSupabaseConfigured(); }

function mapJob(row: Record<string, unknown>): Job { return {id: String(row.id), title: String(row.title), slug: String(row.slug), department: String(row.department), description: String(row.description), responsibilities: (row.responsibilities as string[]) || [], requirements: (row.requirements as string[]) || [], niceToHave: (row.nice_to_have as string[]) || [], location: String(row.location), workMode: String(row.work_mode), employmentType: String(row.employment_type), duration: String(row.duration), compensationType: String(row.compensation_type), compensationText: String(row.compensation_text), skills: (row.skills as string[]) || [], publishedAt: String(row.published_at || ""), deadline: row.deadline ? String(row.deadline) : undefined, status: row.status as JobStatus}; }
function mapProduct(row: Record<string, unknown>): Product { const isKhair = String(row.slug) === khairProduct.slug; if (isKhair) return khairProduct; return {name: String(row.name), slug: String(row.slug), eyebrow: String(row.eyebrow), description: String(row.description), longDescription: String(row.long_description), status: String(row.status), platform: (row.platforms as string[]) || [], color: String(row.color), image: row.image_url ? String(row.image_url) : undefined, featured: Boolean(row.featured)}; }
function mapApplication(row: Record<string, unknown>): Application { const notes = Array.isArray(row.application_notes) ? row.application_notes as Array<{note?: string}> : []; return {id: String(row.reference_id), name: String(row.full_name), email: String(row.email), phone: row.phone ? String(row.phone) : undefined, country: String(row.country), location: String(row.current_location), linkedin: row.linkedin_url ? String(row.linkedin_url) : undefined, github: row.github_url ? String(row.github_url) : undefined, portfolio: row.portfolio_url ? String(row.portfolio_url) : undefined, role: String(row.current_role), experience: String(row.experience), education: row.education ? String(row.education) : undefined, technologies: String(row.technologies), workAuthorization: row.work_authorization ? String(row.work_authorization) : undefined, sponsorshipRequired: Boolean(row.sponsorship_required), salaryExpectation: row.salary_expectation ? String(row.salary_expectation) : undefined, noticePeriod: row.notice_period ? String(row.notice_period) : undefined, remotePreference: row.remote_preference ? String(row.remote_preference) : undefined, whyJoin: String(row.why_join), whyFit: String(row.why_fit), availability: String(row.availability), startDate: String(row.expected_start_date), additionalMessage: row.additional_message ? String(row.additional_message) : undefined, coverLetterText: row.cover_letter_text ? String(row.cover_letter_text) : undefined, cvName: String(row.cv_path).split("/").pop() || "CV", coverLetterName: row.cover_letter_path ? String(row.cover_letter_path).split("/").pop() : undefined, jobId: String(row.job_id), jobTitle: String((row.jobs as {title?: string} | null)?.title || "Position"), status: row.status as ApplicantStatus, createdAt: String(row.created_at).slice(0, 10), note: notes[0]?.note}; }

function isBeforeOrToday(value?: string) { return !value || value >= new Date().toISOString().slice(0, 10); }
export async function getPublishedJobs() { if (!databaseReady()) return []; const supabase = await createSupabaseServerClient(); const {data, error} = await supabase.from("jobs").select("*").eq("status", "open").order("published_at", {ascending: false}); if (error) throw error; return (data || []).map(mapJob).filter((job) => isBeforeOrToday(job.deadline)); }
export async function getJobBySlug(slug: string) { if (!databaseReady()) return null; const supabase = await createSupabaseServerClient(); const {data, error} = await supabase.from("jobs").select("*").eq("slug", slug).eq("status", "open").maybeSingle(); if (error) throw error; const job = data ? mapJob(data) : null; return job && isBeforeOrToday(job.deadline) ? job : null; }
export async function getAdminJobs() { const supabase = await createSupabaseServerClient(); const {data, error} = await supabase.from("jobs").select("*").order("created_at", {ascending: false}); if (error) throw error; return (data || []).map(mapJob); }
export async function getProducts() { if (!databaseReady()) return []; const supabase = await createSupabaseServerClient(); const {data, error} = await supabase.from("products").select("*").order("created_at", {ascending: false}); if (error) throw error; return (data || []).map(mapProduct); }
export async function getApplications(filters?: {status?: string; query?: string}) { const supabase = await createSupabaseServerClient(); let query = supabase.from("job_applications").select("*, jobs(title), application_notes(note)").order("created_at", {ascending: false}); if (filters?.status && filters.status !== "All statuses") query = query.eq("status", filters.status); if (filters?.query) query = query.or(`full_name.ilike.%${filters.query}%,email.ilike.%${filters.query}%`); const {data, error} = await query; if (error) throw error; return (data || []).map(mapApplication); }
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

  const visitorEvents = events || [];
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
