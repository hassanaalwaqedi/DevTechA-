import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Checks whether privileged server-side Supabase credentials are configured.
 * Strictly server-only — NEVER prefix SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_.
 */
export function isServiceRoleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Returns a non-persisted server-only Supabase service_role client.
 * Callers MUST perform explicit authentication, RBAC, cryptographic signature
 * verification, rate limiting, and input validation BEFORE invoking this client.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Phased rollout helper for server-verified operations (verified webhooks,
 * validated public CV uploads, and authorized HR signed-URL downloads).
 * Uses service_role when provisioned in deployment secrets, otherwise falls back
 * to the standard SSR client so zero existing workflows break prior to SQL Phase 2 lock.
 */
export async function createPrivilegedOrServerSupabaseClient(): Promise<SupabaseClient> {
  const serviceClient = createSupabaseServiceRoleClient();
  if (serviceClient) return serviceClient;
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}
