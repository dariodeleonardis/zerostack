import Redis from "ioredis";

let client: Redis | null = null;

function redis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  client ??= new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false
  });
  return client;
}

/**
 * Finestra fissa su Redis: al massimo `limit` tentativi ogni `windowSeconds` per chiave.
 * Se Redis non c'è o non risponde il tentativo passa, ma lo scrive nel log: bloccare
 * tutti i login perché è caduta la cache sarebbe peggio.
 */
export async function allowAttempt(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const r = redis();
  if (!r) {
    console.warn(`[rate-limit] REDIS_URL assente: limite non applicato a ${key}`);
    return true;
  }
  try {
    if (r.status === "wait") await r.connect();
    const redisKey = `ratelimit:${key}`;
    const count = await r.incr(redisKey);
    if (count === 1) await r.expire(redisKey, windowSeconds);
    return count <= limit;
  } catch (err) {
    console.warn(`[rate-limit] Redis non raggiungibile, limite non applicato a ${key}:`, err instanceof Error ? err.message : err);
    return true;
  }
}
