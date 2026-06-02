/**
 * Rate limiter with shared-storage (Upstash Redis) primary and in-memory
 * fallback.
 *
 * Production: when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are
 * set, every limit decision is enforced against a Redis fixed-window
 * counter. That counter is shared across all serverless instances, so the
 * limit is correct under cold starts and parallel traffic.
 *
 * Dev / no Redis configured: falls back to the previous in-memory Map.
 * That is per-process and resets on cold start, which is fine for local
 * dev but documented as such. If Redis is configured but unreachable on
 * a given call, we fail-open to the in-memory limiter so a Redis outage
 * doesn't take the whole API down.
 *
 * The API is async because Redis I/O is async; all callers should await.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function pruneBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
  if (buckets.size <= MAX_BUCKETS) return;
  const overflow = buckets.size - MAX_BUCKETS;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

function rateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  pruneBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    return { ok: true, remaining: limit - 1, resetAt: next.resetAt };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

function upstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Atomic fixed-window counter via Upstash REST `pipeline`:
 *   INCR <key> ; PEXPIRE <key> <windowMs> NX
 *
 * Returns the new counter value. Fails on transport errors so the caller
 * can fall back to the in-memory limiter.
 */
async function rateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const fullKey = `rl:${key}`;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", fullKey],
      ["PEXPIRE", fullKey, String(windowMs), "NX"],
      ["PTTL", fullKey],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out = await res.json() as Array<{ result?: number; error?: string }>;
  const count = typeof out[0]?.result === "number" ? out[0].result : NaN;
  const pttl  = typeof out[2]?.result === "number" ? out[2].result : windowMs;
  if (!Number.isFinite(count)) throw new Error("upstash bad incr");

  const resetAt = Date.now() + (pttl > 0 ? pttl : windowMs);
  if (count > limit) {
    return { ok: false, remaining: 0, resetAt };
  }
  return { ok: true, remaining: Math.max(0, limit - count), resetAt };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  if (upstashConfigured()) {
    try {
      return await rateLimitUpstash(key, limit, windowMs);
    } catch (err) {
      // Fail open to in-memory so a Redis blip doesn't 503 every limited
      // endpoint. Logged once per failure so production breakage shows up.
      console.warn("[rate-limit] upstash unreachable; falling back to in-memory:", (err as Error).message);
    }
  }
  return rateLimitInMemory(key, limit, windowMs);
}

/**
 * Resolve the client IP from a request behind Vercel.
 *
 * Trust order:
 *   1. `x-vercel-forwarded-for` — Vercel-only header; Vercel strips any
 *      client-supplied version.
 *   2. `x-forwarded-for` — first hop (Vercel sets this with the real client
 *      IP at index 0).
 *   3. `x-real-ip` — Vercel sets this on most runtimes.
 *
 * `cf-connecting-ip` is NOT trusted: the app is not behind Cloudflare,
 * so a client could trivially set this header to bypass IP-keyed limits.
 */
export function getClientIp(request: Request): string {
  const vercelFwd = request.headers.get("x-vercel-forwarded-for");
  if (vercelFwd) return vercelFwd.split(",")[0].trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}