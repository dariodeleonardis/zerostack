import Redis from "ioredis";

let client: Redis | null = null;

export function redis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  client ??= new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false
  });
  return client;
}

// Ripiego quando Redis manca o non risponde: lo stesso conteggio in memoria, per processo.
// Con un solo container web basta; con più repliche ognuna conta per sé (limite più largo, non assente).
const memory = new Map<string, { count: number; resetAt: number }>();
const MEMORY_MAX_KEYS = 50_000;

export function allowAttemptInMemory(key: string, limit: number, windowSeconds: number, now = Date.now()): boolean {
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    if (memory.size >= MEMORY_MAX_KEYS) {
      memory.forEach((v, k) => {
        if (v.resetAt <= now) memory.delete(k);
      });
      if (memory.size >= MEMORY_MAX_KEYS) memory.clear();
    }
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return limit >= 1;
  }
  entry.count += 1;
  return entry.count <= limit;
}

/**
 * Finestra fissa su Redis: al massimo `limit` tentativi ogni `windowSeconds` per chiave.
 * Se Redis non c'è o non risponde si conta in memoria (audit A3, 2/10): il limite resta, e un
 * guasto della cache non blocca tutti gli accessi. Il passaggio al ripiego si scrive nel log.
 */
export async function allowAttempt(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const r = redis();
  if (!r) {
    console.warn(`[rate-limit] REDIS_URL assente: limite contato in memoria per ${key}`);
    return allowAttemptInMemory(key, limit, windowSeconds);
  }
  try {
    if (r.status === "wait") await r.connect();
    const redisKey = `ratelimit:${key}`;
    const count = await r.incr(redisKey);
    if (count === 1) await r.expire(redisKey, windowSeconds);
    return count <= limit;
  } catch (err) {
    console.warn(`[rate-limit] Redis non raggiungibile, limite contato in memoria per ${key}:`, err instanceof Error ? err.message : err);
    return allowAttemptInMemory(key, limit, windowSeconds);
  }
}
