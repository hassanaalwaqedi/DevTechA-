const extendedProductColumns = ["gallery_urls", "launch_url", "is_published"];

export function productErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Request failed.";
}

export function isMissingExtendedProductColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {code?: unknown; message?: unknown};
  const message = String(candidate.message || "").toLowerCase();
  const mentionsExtendedColumn = extendedProductColumns.some((column) => message.includes(column));
  return mentionsExtendedColumn && (candidate.code === "42703" || candidate.code === "PGRST204" || message.includes("does not exist") || message.includes("schema cache"));
}

export function isProductPolicyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {code?: unknown; message?: unknown};
  const message = String(candidate.message || "").toLowerCase();
  return candidate.code === "42501" || message.includes("row-level security") || message.includes("permission denied");
}

export function sanitizeStringList(value: unknown, limit = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, limit);
}

export function sanitizeColor(value: unknown): string {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#d1c4ff";
}

export function sanitizeOptionalUrl(value: unknown, allowRelative = false): string | null {
  const candidate = String(value || "").trim();
  if (!candidate) return null;
  if (allowRelative && candidate.startsWith("/") && !candidate.startsWith("//")) return candidate.slice(0, 500);
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}
