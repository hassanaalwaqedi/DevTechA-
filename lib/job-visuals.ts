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
  "human-resources",
  "marketing",
  "sales",
  "finance",
  "product",
  "design",
  "operations",
  "customer-success",
  "default",
  "disabled",
] as const satisfies readonly JobVisualCategory[];

export const jobVisualCategoryLabels: Record<JobVisualCategory, string> = {
  "audio-ai": "Audio AI",
  "computer-vision": "Computer Vision",
  "machine-learning": "Machine Learning",
  llm: "LLM",
  backend: "Backend",
  infrastructure: "Infrastructure",
  security: "Security",
  talent: "Talent Acquisition",
  "human-resources": "Human Resources",
  marketing: "Marketing",
  sales: "Sales",
  finance: "Finance",
  product: "Product",
  design: "Design",
  operations: "Operations",
  "customer-success": "Customer Success",
  default: "Default",
  disabled: "Disabled",
};

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
  "people-ops",
  "campaign-orbit",
  "revenue-funnel",
  "finance-ledger",
  "product-roadmap",
  "design-system",
  "operations-flow",
  "customer-journey",
  "geometric",
  "disabled",
] as const;

export type JobVisualVariant = (typeof jobVisualVariants)[number];

export const jobVisualVariantsByCategory: Record<JobVisualCategory, readonly JobVisualVariant[]> = {
  "audio-ai": ["waveform", "spectrogram"],
  "computer-vision": ["detection", "tracking"],
  "machine-learning": ["neural-network", "training-graph"],
  llm: ["token-flow", "transformer"],
  backend: ["api-flow", "distributed-data"],
  infrastructure: ["deployment-pipeline", "distributed-data"],
  security: ["network-security"],
  talent: ["talent-network"],
  "human-resources": ["people-ops"],
  marketing: ["campaign-orbit"],
  sales: ["revenue-funnel"],
  finance: ["finance-ledger"],
  product: ["product-roadmap"],
  design: ["design-system"],
  operations: ["operations-flow"],
  "customer-success": ["customer-journey"],
  default: ["geometric"],
  disabled: ["disabled"],
};

export function visualVariantsForCategory(category: JobVisualCategory) {
  return jobVisualVariantsByCategory[category];
}

export function defaultVisualVariant(category: JobVisualCategory): JobVisualVariant {
  return jobVisualVariantsByCategory[category][0];
}

export function normalizeVisualVariantForCategory(category: JobVisualCategory, value: unknown): JobVisualVariant {
  const variants = jobVisualVariantsByCategory[category];
  return includes(variants, value) ? value : variants[0];
}

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

export function isMissingJobVisualColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {code?: unknown; message?: unknown};
  const message = String(candidate.message || "").toLowerCase();
  const mentionsVisualField = ["visual_category", "visual_variant", "accent_color", "visual_keywords"].some((field) => message.includes(field));
  return mentionsVisualField && (candidate.code === "42703" || candidate.code === "PGRST204" || message.includes("does not exist") || message.includes("schema cache"));
}
