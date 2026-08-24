import { NextRequest, NextResponse } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = { matcher: ["/admin/:path*"] };
