import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createDefaultDemoConfig,
  demoConfigSchema,
  type InteractiveDemoConfig,
  type StoredDemoConfigEnvelope,
} from "@/lib/demo-config-types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const CONFIG_KEY = "homepage_interactive_demo_v1";
const RESERVED_PRODUCT_SLUG = "__hirzexa_demo_config__";
const localStoreDir = join(process.cwd(), ".data");
const localStoreFile = join(localStoreDir, "demo-config.json");

let memoryEnvelope: StoredDemoConfigEnvelope | null = null;

function createDefaultEnvelope(): StoredDemoConfigEnvelope {
  const def = createDefaultDemoConfig();
  return {
    draft: def,
    published: def,
    lastPublishedAt: def.updatedAt,
  };
}

function validateConfigSafe(raw: unknown): InteractiveDemoConfig | null {
  const parsed = demoConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function parseEnvelopeSafe(raw: unknown): StoredDemoConfigEnvelope | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  const draft = validateConfigSafe(candidate.draft);
  const published = validateConfigSafe(candidate.published);
  if (!draft || !published) return null;
  return {
    draft,
    published,
    lastPublishedAt:
      typeof candidate.lastPublishedAt === "string"
        ? candidate.lastPublishedAt
        : published.updatedAt,
  };
}

async function readLocalEnvelope(): Promise<StoredDemoConfigEnvelope | null> {
  try {
    const raw = await readFile(localStoreFile, "utf8");
    return parseEnvelopeSafe(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeLocalEnvelope(envelope: StoredDemoConfigEnvelope): Promise<void> {
  try {
    await mkdir(localStoreDir, { recursive: true });
    await writeFile(localStoreFile, JSON.stringify(envelope, null, 2), "utf8");
  } catch {}
}

async function readSupabaseEnvelope(): Promise<StoredDemoConfigEnvelope | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Try dedicated table if migrated
    const { data: dedicated, error: dedicatedErr } = await supabase
      .from("interactive_demo_configs")
      .select("draft_config, published_config, last_published_at")
      .eq("key", CONFIG_KEY)
      .maybeSingle();

    if (!dedicatedErr && dedicated) {
      const parsed = parseEnvelopeSafe({
        draft: dedicated.draft_config,
        published: dedicated.published_config,
        lastPublishedAt: dedicated.last_published_at,
      });
      if (parsed) return parsed;
    }

    // 2. Fallback to live Supabase products store (`slug = '__hirzexa_demo_config__'`)
    const { data: productRow, error: productErr } = await supabase
      .from("products")
      .select("long_description")
      .eq("slug", RESERVED_PRODUCT_SLUG)
      .maybeSingle();

    if (!productErr && productRow?.long_description) {
      const parsed = parseEnvelopeSafe(JSON.parse(String(productRow.long_description)));
      if (parsed) return parsed;
    }
  } catch {}
  return null;
}

async function persistSupabaseEnvelope(envelope: StoredDemoConfigEnvelope): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  let persisted = false;
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Try dedicated table if migrated
    const { error: dedicatedErr } = await supabase
      .from("interactive_demo_configs")
      .upsert(
        {
          key: CONFIG_KEY,
          draft_config: envelope.draft,
          published_config: envelope.published,
          last_published_at: envelope.lastPublishedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (!dedicatedErr) persisted = true;

    // 2. Always mirror into the existing live products table so public visitors immediately see updates
    const serialized = JSON.stringify(envelope);
    const { error: productErr } = await supabase.from("products").upsert(
      {
        name: "HIRZEXA Interactive Demo Config",
        slug: RESERVED_PRODUCT_SLUG,
        eyebrow: "System Configuration",
        description: "Internal interactive demonstration configuration store.",
        long_description: serialized,
        status: "system-config",
        platforms: ["internal"],
        color: "#080D21",
        is_published: true,
        featured: false,
      },
      { onConflict: "slug" }
    );
    if (!productErr) persisted = true;
  } catch {}
  return persisted;
}

export async function getDemoConfigEnvelope(): Promise<StoredDemoConfigEnvelope> {
  const fromSupabase = await readSupabaseEnvelope();
  if (fromSupabase) {
    memoryEnvelope = fromSupabase;
    return fromSupabase;
  }

  const fromDisk = await readLocalEnvelope();
  if (fromDisk) {
    memoryEnvelope = fromDisk;
    return fromDisk;
  }

  if (memoryEnvelope) return memoryEnvelope;

  const fallback = createDefaultEnvelope();
  memoryEnvelope = fallback;
  return fallback;
}

export async function getPublishedDemoConfig(): Promise<InteractiveDemoConfig> {
  const envelope = await getDemoConfigEnvelope();
  return envelope.published;
}

export async function saveDemoConfigDraft(
  candidate: unknown,
  actorEmail = "Admin"
): Promise<{ envelope: StoredDemoConfigEnvelope; persistedToDatabase: boolean }> {
  const current = await getDemoConfigEnvelope();
  const validated = demoConfigSchema.parse({
    ...(candidate as Record<string, unknown>),
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
  });

  const nextEnvelope: StoredDemoConfigEnvelope = {
    draft: validated,
    published: current.published,
    lastPublishedAt: current.lastPublishedAt,
  };

  memoryEnvelope = nextEnvelope;
  await writeLocalEnvelope(nextEnvelope);
  const persistedToDatabase = await persistSupabaseEnvelope(nextEnvelope);
  return { envelope: nextEnvelope, persistedToDatabase };
}

export async function publishDemoConfig(
  candidate: unknown,
  actorEmail = "Admin"
): Promise<{ envelope: StoredDemoConfigEnvelope; persistedToDatabase: boolean }> {
  const nowIso = new Date().toISOString();
  const validated = demoConfigSchema.parse({
    ...(candidate as Record<string, unknown>),
    version: 1,
    updatedAt: nowIso,
    updatedBy: actorEmail,
  });

  const nextEnvelope: StoredDemoConfigEnvelope = {
    draft: validated,
    published: validated,
    lastPublishedAt: nowIso,
  };

  memoryEnvelope = nextEnvelope;
  await writeLocalEnvelope(nextEnvelope);
  const persistedToDatabase = await persistSupabaseEnvelope(nextEnvelope);
  return { envelope: nextEnvelope, persistedToDatabase };
}

export async function resetDemoConfigToDefaults(
  publishImmediately = true,
  actorEmail = "Admin"
): Promise<{ envelope: StoredDemoConfigEnvelope; persistedToDatabase: boolean }> {
  const nowIso = new Date().toISOString();
  const def: InteractiveDemoConfig = {
    ...createDefaultDemoConfig(),
    updatedAt: nowIso,
    updatedBy: actorEmail,
  };
  const current = await getDemoConfigEnvelope();
  const nextEnvelope: StoredDemoConfigEnvelope = {
    draft: def,
    published: publishImmediately ? def : current.published,
    lastPublishedAt: publishImmediately ? nowIso : current.lastPublishedAt,
  };

  memoryEnvelope = nextEnvelope;
  await writeLocalEnvelope(nextEnvelope);
  const persistedToDatabase = await persistSupabaseEnvelope(nextEnvelope);
  return { envelope: nextEnvelope, persistedToDatabase };
}
