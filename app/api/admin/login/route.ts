import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return NextResponse.json({error: "Supabase is not configured."}, {status: 503});
  const body = await request.json().catch(() => ({}));
  const response = NextResponse.json({ok: true});
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {cookies: {getAll: () => request.headers.get("cookie")?.split("; ").map((value) => { const [name, ...rest] = value.split("="); return {name, value: rest.join("=")}; }) || [], setAll: (cookiesToSet) => cookiesToSet.forEach(({name, value, options}) => response.cookies.set(name, value, options))}});
  const {error} = await supabase.auth.signInWithPassword({email: body.email, password: body.password});
  if (error) return NextResponse.json({error: "Invalid credentials."}, {status: 401});
  return response;
}
