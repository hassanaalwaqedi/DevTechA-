import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentAdmin() {
  const supabase = await createSupabaseServerClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return null;
  const {data: admin} = await supabase.from("admin_users").select("id, role").eq("id", user.id).maybeSingle();
  return admin ? {user, admin, supabase} : null;
}

export async function requireAdmin() {
  const current = await getCurrentAdmin();
  if (!current) redirect("/admin/login");
  return current;
}

export async function requireAdminApi() {
  const current = await getCurrentAdmin();
  if (!current) throw new Error("UNAUTHORIZED");
  return current;
}
