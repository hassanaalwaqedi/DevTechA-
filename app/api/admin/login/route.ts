import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return NextResponse.json({error: "Supabase is not configured."}, {status: 503});
  const body = await request.json().catch(() => ({}));
  const response = NextResponse.json({ok: true});
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {cookies: {getAll: () => request.headers.get("cookie")?.split("; ").map((value) => { const [name, ...rest] = value.split("="); return {name, value: rest.join("=")}; }) || [], setAll: (cookiesToSet) => cookiesToSet.forEach(({name, value, options}) => response.cookies.set(name, value, options))}});
  const {data: authData, error} = await supabase.auth.signInWithPassword({email: String(body.email || "").trim(), password: String(body.password || "")});
  if (error || !authData.user) return NextResponse.json({error: "Invalid credentials."}, {status: 401});
  const {data: admin, error: adminError} = await supabase.from("admin_users").select("id").eq("id", authData.user.id).maybeSingle();
  if (adminError) return NextResponse.json({error: "Unable to verify admin access. Confirm the admin_users table is configured."}, {status: 503});
  if (!admin) return NextResponse.json({error: "This account is not configured as an admin."}, {status: 403});
  return response;
}
