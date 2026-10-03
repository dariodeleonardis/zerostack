/**
 * Segnalazione degli errori a Sentry o GlitchTip (stesso protocollo; GlitchTip si può ospitare in UE).
 * Niente SDK: una richiesta HTTP per errore, con un tetto per non inondare il servizio.
 * Si attiva con ERROR_REPORTING_DSN (o SENTRY_DSN); senza, non fa nulla.
 *
 * Solo lato server: si importa da "@zerostack/shared/src/monitoring", non dall'indice del pacchetto.
 */

interface Dsn {
  endpoint: string;
  publicKey: string;
  raw: string;
}

export function parseDsn(dsn: string | undefined): Dsn | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "").split("/").pop();
    if (!url.username || !projectId) return null;
    const prefix = url.pathname.replace(/\/?[^/]*\/?$/, "");
    return {
      endpoint: `${url.protocol}//${url.host}${prefix}/api/${projectId}/envelope/`,
      publicKey: decodeURIComponent(url.username),
      raw: dsn
    };
  } catch {
    return null;
  }
}

interface Frame {
  function?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  in_app?: boolean;
}

/** Riga dello stack di V8 → frame nel formato di Sentry (dal più vecchio al più recente). */
export function parseStack(stack: string | undefined): Frame[] {
  if (!stack) return [];
  const frames: Frame[] = [];
  for (const line of stack.split("\n").slice(1, 60)) {
    const m = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line);
    if (!m) continue;
    const filename = m[2];
    frames.push({
      function: m[1] || "?",
      filename,
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !filename.includes("node_modules") && !filename.startsWith("node:")
    });
  }
  return frames.reverse();
}

export interface ReportContext {
  /** Etichette ricercabili (per esempio route, publication). */
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: "error" | "warning" | "fatal";
}

const MAX_PER_MINUTE = 30;
let windowStart = 0;
let sentInWindow = 0;
const recent = new Map<string, number>();

function randomHex32(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "");
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === "string" ? value : JSON.stringify(value));
}

let service = "zerostack";

/** Manda l'errore al servizio configurato. Non lancia mai: un errore nel segnalare non deve farne altri. */
export async function captureException(value: unknown, context: ReportContext = {}): Promise<boolean> {
  const dsn = parseDsn(process.env.ERROR_REPORTING_DSN || process.env.SENTRY_DSN);
  if (!dsn) return false;
  try {
    const err = toError(value);
    const now = Date.now();
    // Lo stesso errore ripetuto in un minuto (un ciclo che fallisce) conta una volta sola.
    const fingerprint = `${err.name}:${err.message}:${err.stack?.split("\n")[1] ?? ""}`;
    if ((recent.get(fingerprint) ?? 0) > now - 60_000) return false;
    if (now - windowStart > 60_000) {
      windowStart = now;
      sentInWindow = 0;
      recent.clear();
    }
    if (sentInWindow >= MAX_PER_MINUTE) return false;
    sentInWindow++;
    recent.set(fingerprint, now);

    const eventId = randomHex32();
    const event = {
      event_id: eventId,
      timestamp: now / 1000,
      platform: "node",
      level: context.level ?? "error",
      logger: service,
      server_name: service,
      environment: process.env.NODE_ENV || "development",
      release: process.env.APP_RELEASE || undefined,
      tags: { service, ...context.tags },
      extra: context.extra,
      exception: {
        values: [{ type: err.name, value: err.message.slice(0, 2000), stacktrace: { frames: parseStack(err.stack) } }]
      }
    };
    const body = [
      JSON.stringify({ event_id: eventId, sent_at: new Date(now).toISOString(), dsn: dsn.raw }),
      JSON.stringify({ type: "event" }),
      JSON.stringify(event)
    ].join("\n");
    const res = await fetch(dsn.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-sentry-envelope",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=zerostack/1.0`
      },
      body,
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

let installed = false;

/**
 * Cattura gli errori non gestiti e quelli scritti con console.error(..., err):
 * è lì che finiscono sia gli errori delle route di Next sia quelli che il codice registra.
 */
export function installErrorReporting(serviceName: string): void {
  service = serviceName;
  if (installed || !parseDsn(process.env.ERROR_REPORTING_DSN || process.env.SENTRY_DSN)) return;
  installed = true;

  process.on("unhandledRejection", (reason) => {
    void captureException(reason, { tags: { source: "unhandledRejection" } });
  });
  process.on("uncaughtExceptionMonitor", (err) => {
    void captureException(err, { level: "fatal", tags: { source: "uncaughtException" } });
  });

  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    const err = args.find((a): a is Error => a instanceof Error);
    if (!err) return;
    const message = args.filter((a) => typeof a === "string").join(" ").slice(0, 500);
    void captureException(err, { tags: { source: "console.error" }, extra: message ? { message } : undefined });
  };
}
