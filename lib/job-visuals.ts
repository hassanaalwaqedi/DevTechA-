import type { JobAccent, JobVisualCategory } from "@/lib/data";

export const jobVisualCategories = [
  "audio-ai",
  "computer-vision",
  "machine-learning",
  "llm",
  "backend",
  "infrastructure",
  "security",
  "talent",
  "default",
  "disabled",
] as const satisfies readonly JobVisualCategory[];

export const jobVisualAccents = ["lime", "violet", "copper", "sage", "blue"] as const satisfies readonly JobAccent[];

export const jobVisualVariants = [
  "waveform",
  "spectrogram",
  "detection",
  "tracking",
  "neural-network",
  "training-graph",
  "token-flow",
  "transformer",
  "api-flow",
  "distributed-data",
  "deployment-pipeline",
  "network-security",
  "talent-network",
  "geometric",
  "disabled",
] as const;

export type JobVisualVariant = (typeof jobVisualVariants)[number];

const includes = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && values.includes(value as T);

export function normalizeVisualCategory(value: unknown): JobVisualCategory {
  return includes(jobVisualCategories, value) ? value : "default";
}

export function normalizeVisualAccent(value: unknown): JobAccent {
  return includes(jobVisualAccents, value) ? value : "violet";
}

export function normalizeVisualVariant(value: unknown): JobVisualVariant {
  return includes(jobVisualVariants, value) ? value : "geometric";
}

export function normalizeVisualKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 6);
}
