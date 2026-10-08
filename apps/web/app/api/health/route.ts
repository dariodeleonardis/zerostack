import { NextResponse } from "next/server";
import { checkHealth } from "../../../lib/health";

export const dynamic = "force-dynamic";

/**
 * Controllo completo per il monitoraggio esterno (Uptime Kuma, Better Stack, UptimeRobot):
 * 200 se database, Redis, worker e backup stanno bene, 503 altrimenti. Niente messaggi d'errore
 * nella risposta pubblica: i dettagli sono nel pannello admin.
 */
export async function GET() {
  const health = await checkHealth();
  const checks = Object.fromEntries(
    Object.entries(health.checks).map(([name, c]) => [name, c.ageSeconds === undefined ? { state: c.state } : { state: c.state, ageSeconds: c.ageSeconds }])
  );
  return NextResponse.json(
    { status: health.ok ? "ok" : "degraded", checks },
    { status: health.ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
