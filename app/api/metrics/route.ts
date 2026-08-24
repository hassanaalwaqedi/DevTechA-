import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getMetrics } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() { try { await requireAdminApi(); return NextResponse.json(await getMetrics()); } catch (error) { return NextResponse.json({error: error instanceof Error ? error.message : "Request failed."}, {status: 401}); } }
