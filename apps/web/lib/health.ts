import { prisma } from "@zerostack/database";
import { redis } from "./rate-limit";

export type CheckState = "ok" | "fail" | "skipped";

export interface Check {
  state: CheckState;
  /** Secondi dall'ultimo segnale (worker, backup). */
  ageSeconds?: number;
  /** Solo per il pannello admin: il controllo pubblico non lo mostra. */
  detail?: string;
}

export interface Health {
  ok: boolean;
  checks: Record<"database" | "redis" | "worker" | "backup" | "offsite", Check>;
}

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`nessuna risposta in ${ms} ms`)), ms))]);

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

async function database(): Promise<Check> {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    return { state: "ok" };
  } catch (err) {
    return { state: "fail", detail: message(err) };
  }
}

async function cache(): Promise<Check> {
  const client = redis();
  if (!client) return { state: "skipped", detail: "REDIS_URL non impostato" };
  try {
    if (client.status === "wait") await client.connect();
    await withTimeout(client.ping(), 2000);
    return { state: "ok" };
  } catch (err) {
    return { state: "fail", detail: message(err) };
  }
}

/** Un processo in background è sano se ha dato segni di vita da meno di `maxAgeSeconds` e l'ultimo giro è andato bene. */
async function heartbeat(key: string, maxAgeSeconds: number, required: boolean): Promise<Check> {
  try {
    const row = await prisma.systemStatus.findUnique({ where: { key } });
    if (!row) return required ? { state: "fail", detail: "nessun segnale finora" } : { state: "skipped", detail: "non ancora attivo" };
    const ageSeconds = Math.round((Date.now() - row.updatedAt.getTime()) / 1000);
    if (!row.ok) return { state: "fail", ageSeconds, detail: row.detail ?? "ultimo giro non riuscito" };
    if (ageSeconds > maxAgeSeconds) return { state: "fail", ageSeconds, detail: "fermo da troppo tempo" };
    return { state: "ok", ageSeconds, detail: row.detail ?? undefined };
  } catch (err) {
    return { state: "fail", detail: message(err) };
  }
}

export async function checkHealth(): Promise<Health> {
  const [db, redisCheck, worker, backup, offsite] = await Promise.all([
    database(),
    cache(),
    heartbeat("worker", Number(process.env.WORKER_STALE_MINUTES || 10) * 60, true),
    heartbeat("backup", Number(process.env.BACKUP_MAX_AGE_HOURS || 26) * 3600, process.env.HEALTH_REQUIRE_BACKUP === "true"),
    // Copia fuori dal VPS (Google Drive, script vps/backup-esterno): la scrive lo script sul server.
    heartbeat("backup-esterno", 26 * 3600, false)
  ]);
  const checks = { database: db, redis: redisCheck, worker, backup, offsite };
  return { ok: Object.values(checks).every((c) => c.state !== "fail"), checks };
}
