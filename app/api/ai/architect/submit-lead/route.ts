import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { technicalBriefSchema } from "@/lib/ai";

const payloadSchema = z.object({name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), company: z.string().trim().max(160).optional(), category: z.string().trim().max(120), brief: technicalBriefSchema, consent: z.literal(true)});
export async function POST(request: Request) { try { const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; if (!checkRateLimit(`lead:${ip}`, 3, 24 * 60 * 60 * 1000)) return NextResponse.json({error: "Submission limit reached. Please try again tomorrow."}, {status: 429}); const data = payloadSchema.parse(await request.json()); const supabase = await createSupabaseServerClient(); const {error} = await supabase.from("ai_leads").insert({name: data.name, email: data.email.toLowerCase(), company: data.company || null, project_category: data.category, technical_brief: data.brief, consent: true}); if (error) throw error; return NextResponse.json({ok: true}, {status: 201}); } catch (error) { return NextResponse.json({error: error instanceof Error && error.name === "ZodError" ? "Please review the required fields." : "Unable to submit your brief."}, {status: 400}); } }
