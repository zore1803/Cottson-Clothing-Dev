import "server-only";

// Fixed-window limiter. Counts live in Redis when REDIS_URL is set, so limits hold across restarts
// and across several server instances; without Redis (or if it is down) each process counts in
// memory instead, which is fine for local development and fails open rather than blocking sign-ins.
import { getRedis } from "./redis";

const hits = new Map<string, number[]>();

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

const tooMany = (windowMs: number) =>
  Response.json({ error: "Too many requests, please try again shortly" }, { status: 429, headers: { "retry-after": String(Math.ceil(windowMs / 1000)) } });

function memoryLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return false;
}

/** Returns a 429 Response when the caller exceeded `limit` calls within `windowMs`, otherwise null */
export async function rateLimit(req: Request, name: string, limit: number, windowMs: number) {
  const key = `${name}:${clientIp(req)}`;
  const redis = getRedis();
  if (redis) {
    try {
      const k = `rl:${key}`;
      const n = await redis.incr(k);
      if (n === 1) await redis.pexpire(k, windowMs);
      else if (n > limit && (await redis.pttl(k)) < 0) await redis.pexpire(k, windowMs); // never leave a key without an expiry
      return n > limit ? tooMany(windowMs) : null;
    } catch {
      /* Redis unavailable: fall through to the in-memory counter */
    }
  }
  return memoryLimited(key, limit, windowMs) ? tooMany(windowMs) : null;
}

/** Parse a JSON body, returning null on malformed input instead of throwing */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
