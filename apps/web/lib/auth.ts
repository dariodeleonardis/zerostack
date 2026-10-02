import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@zerostack/database";
import { rootDomainFromEnv } from "@zerostack/shared";

// Password con scrypt della libreria standard di Node: niente dipendenze native da compilare su Alpine.
const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export const SESSION_COOKIE = "zs_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  // Formato sconosciuto (per esempio le password finte del seed): nessun accesso.
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  if (expected.length !== SCRYPT.keylen) return false;
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p)
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Hash calcolato una volta: il login con un'email inesistente impiega lo stesso tempo di uno vero,
// così dai tempi di risposta non si capisce quali email sono registrate.
let dummyHash: Promise<string> | null = null;
export function passwordHashForTiming(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Dominio del cookie di sessione: `.zerostack.it` quando si accede dalla piattaforma, così la sessione
 * vale anche su slug.zerostack.it e un abbonato vede gli articoli completi sul sottodominio.
 * Su localhost o su un dominio personalizzato il cookie resta legato all'host.
 */
export function sessionCookieDomain(host: string | null, rootDomain: string): string | undefined {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  if (!rootDomain.includes(".") || rootDomain === "localhost") return undefined;
  if (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`)) return `.${rootDomain}`;
  return undefined;
}

function cookieDomain(): string | undefined {
  return sessionCookieDomain(headers().get("host"), rootDomainFromEnv());
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    expires: expiresAt
  });
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, name: true, email: true, handle: true, role: true, emailVerified: true, suspendedAt: true } } }
  });
  if (!session || session.expiresAt < new Date()) return null;
  // Un account sospeso dall'amministrazione non ha più sessioni valide.
  if (session.user.suspendedAt) return null;
  return session.user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Per layout e pagine server: senza sessione si va al login, poi si torna a `nextPath`. */
export async function requireUser(nextPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export function isPlatformAdmin(user: { role: string }): boolean {
  return user.role === "ADMIN" || user.role === "SUPERADMIN";
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  // Next tiene un solo Set-Cookie per nome: si cancella la versione con cui il cookie è stato creato.
  // Un eventuale cookie vecchio legato all'host resta, ma la sessione nel database non esiste più.
  const domain = cookieDomain();
  if (domain) cookies().set(SESSION_COOKIE, "", { path: "/", domain, maxAge: 0 });
  else cookies().delete(SESSION_COOKIE);
}

/**
 * Difesa CSRF per le API che cambiano dati: solo JSON e, se il browser dichiara l'origine,
 * deve essere lo stesso host. Un form di un altro sito non può inviare JSON senza preflight CORS,
 * e il cookie SameSite=Lax non parte con le POST da altri siti.
 */
export function isSameOriginJson(req: Request): boolean {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string {
  // Dietro Caddy l'IP vero arriva in X-Forwarded-For. Si prende l'ULTIMO valore, quello scritto dal
  // nostro proxy: i primi li può scrivere chiunque nella richiesta (audit A2). Oggi Caddy non si fida
  // degli X-Forwarded-For in arrivo e li sostituisce, quindi primo e ultimo coincidono; se un giorno
  // ci sarà un CDN davanti, va configurato trusted_proxies in Caddy, non cambiato questo.
  const hops = (req.headers.get("x-forwarded-for") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  return hops[hops.length - 1] || req.headers.get("x-real-ip") || "sconosciuto";
}
