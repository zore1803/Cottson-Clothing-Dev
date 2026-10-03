import "server-only";
import { timingSafeEqual } from "node:crypto";

// In-memory sliding-window limiter. Good enough for a single instance; swap for Redis
// (Upstash etc.) if the site is ever scaled to several instances.
const hits = new Map<string, number[]>();

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Returns a 429 Response when `key` exceeded `limit` calls within `windowMs`, otherwise null */
export function rateLimit(req: Request, name: string, limit: number, windowMs: number) {
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return Response.json({ error: "Too many requests, please try again shortly" }, { status: 429, headers: { "retry-after": String(Math.ceil(windowMs / 1000)) } });
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return null;
}

/** Admin endpoints are guarded by the ADMIN_API_KEY env var, sent as `x-admin-key`. Returns a Response on failure. */
export function requireAdmin(req: Request) {
  const expected = process.env.ADMIN_API_KEY;
  const given = req.headers.get("x-admin-key") ?? "";
  const ok = !!expected && expected.length >= 16 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return ok ? null : Response.json({ error: "Unauthorized" }, { status: 401 });
}

export const isAdmin = (req: Request) => requireAdmin(req) === null;

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
