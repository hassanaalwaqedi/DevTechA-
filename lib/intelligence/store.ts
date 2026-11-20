import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const STORE_DIR = join(process.cwd(), ".data", "intelligence");

/**
 * Local JSON/in-memory storage (.data/intelligence/*.json) is NEVER used as an
 * authoritative production fallback when Supabase is configured. It is enabled
 * only when Supabase credentials are unconfigured or when
 * HIRZEXA_ALLOW_LOCAL_FALLBACK=true is explicitly passed in isolated offline tests.
 */
export function isLocalFallbackAllowed(): boolean {
  if (process.env.HIRZEXA_ALLOW_LOCAL_FALLBACK === "true") return true;
  if (isSupabaseConfigured()) return false;
  return true;
}

export async function readLocalCollection<T>(name: string): Promise<T[]> {
  if (!isLocalFallbackAllowed()) return [];
  try {
    const raw = await readFile(join(STORE_DIR, `${name}.json`), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function writeLocalCollection<T>(name: string, items: T[]): Promise<void> {
  if (!isLocalFallbackAllowed()) return;
  try {
    await mkdir(STORE_DIR, { recursive: true });
    await writeFile(join(STORE_DIR, `${name}.json`), JSON.stringify(items, null, 2), "utf8");
  } catch {
    // Ephemeral / read-only filesystem fallback
  }
}
