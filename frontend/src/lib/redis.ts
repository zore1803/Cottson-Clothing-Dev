import "server-only";
import Redis from "ioredis";

// One shared Redis connection (rate limits, and anything else that must be visible to every server
// instance). Null when REDIS_URL is not set; callers then fall back to per-process memory.
const g = globalThis as unknown as { redis?: Redis | null };

export function getRedis(): Redis | null {
  if (g.redis !== undefined) return g.redis;
  const url = process.env.REDIS_URL;
  if (!url) return (g.redis = null);
  const client = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false });
  client.on("error", () => {}); // outages are handled per call; don't crash on unhandled error events
  return (g.redis = client);
}
