const buckets = new Map<string, {count: number; resetAt: number}>();
const MAX_BUCKETS = 10_000;
let lastSweepAt = 0;

function sweepExpiredBuckets(now: number) {
  if (now - lastSweepAt < 60_000 && buckets.size < MAX_BUCKETS) return;
  lastSweepAt = now;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

export function getClientIp(headersLike: { get(name: string): string | null }): string {
  const cfIp = headersLike.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  const realIp = headersLike.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  const xff = headersLike.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff.slice(0, 64);

  return "unknown";
}

export function checkRateLimit(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  sweepExpiredBuckets(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {count: 1, resetAt: now + windowMs});
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
