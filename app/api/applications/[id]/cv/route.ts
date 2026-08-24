import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) { try { const {supabase} = await requireAdminApi(); const {id} = await params; const {data: app, error: appError} = await supabase.from("job_applications").select("cv_path").eq("reference_id", id).single(); if (appError) throw appError; const {data, error} = await supabase.storage.from("cvs").createSignedUrl(app.cv_path, 300); if (error) throw error; return NextResponse.redirect(data.signedUrl); } catch (error) { return NextResponse.json({error: error instanceof Error ? error.message : "Unable to access CV."}, {status: 400}); } }
