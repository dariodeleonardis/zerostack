import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@zerostack/database";
import { normalizeSlugInput, platformUrlFromEnv, slugProblem } from "@zerostack/shared";
import { hashPassword } from "./auth";

/**
 * Accesso con Google (OAuth 2.0 "authorization code" con PKCE, senza librerie esterne).
 * Le chiavi GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET si creano nella Google Cloud Console
 * (credenziali OAuth, applicazione web) con l'indirizzo di ritorno
 *   https://<dominio della piattaforma>/api/auth/google/callback
 * Senza le chiavi il pulsante non compare. GOOGLE_OAUTH_BASE serve solo ai test (server finto).
 */
export const OAUTH_COOKIE = "zs_oauth";
export const OAUTH_COOKIE_PATH = "/api/auth/google";

export function isGoogleConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function endpoints() {
  const base = process.env.GOOGLE_OAUTH_BASE?.replace(/\/$/, "");
  return {
    auth: base ? `${base}/o/oauth2/v2/auth` : "https://accounts.google.com/o/oauth2/v2/auth",
    token: base ? `${base}/token` : "https://oauth2.googleapis.com/token",
    userinfo: base ? `${base}/v1/userinfo` : "https://openidconnect.googleapis.com/v1/userinfo"
  };
}

export function redirectUri(): string {
  return `${platformUrlFromEnv()}/api/auth/google/callback`;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

/** Stato e verificatore PKCE: viaggiano in un cookie HttpOnly di 10 minuti, legato al browser. */
export function startAuthorization(next: string) {
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const url = new URL(endpoints().auth);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account"
  }).toString();
  const cookie = b64url(Buffer.from(JSON.stringify({ state, verifier, next })));
  return { url: url.toString(), cookie };
}

export function readOAuthCookie(value: string | undefined): { state: string; verifier: string; next: string } | null {
  if (!value) return null;
  try {
    const data = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof data?.state === "string" && typeof data?.verifier === "string" && typeof data?.next === "string") return data;
  } catch {}
  return null;
}

export function sameState(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

/** Scambia il codice con un token e legge il profilo. Accetta solo email verificate da Google. */
export async function fetchGoogleProfile(code: string, verifier: string): Promise<GoogleProfile> {
  const { token, userinfo } = endpoints();
  const tokenRes = await fetch(token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier
    }),
    cache: "no-store"
  });
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || typeof tokens.access_token !== "string") throw new Error(`token Google rifiutato (${tokenRes.status})`);

  const infoRes = await fetch(userinfo, { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
  const info = await infoRes.json().catch(() => ({}));
  if (!infoRes.ok || typeof info.sub !== "string" || typeof info.email !== "string") throw new Error(`profilo Google non leggibile (${infoRes.status})`);
  if (info.email_verified !== true) throw new UnverifiedGoogleEmailError();
  return { sub: info.sub, email: info.email.trim().toLowerCase(), name: (typeof info.name === "string" && info.name.trim()) || info.email.split("@")[0] };
}

export class UnverifiedGoogleEmailError extends Error {
  constructor() {
    super("email Google non verificata");
  }
}

/** Primo nome utente libero partendo dall'email o dal nome (stesse regole dei sottodomini). */
export async function availableHandle(email: string, name: string): Promise<string> {
  const candidates = [email.split("@")[0], name].map((v) => normalizeSlugInput(v).replace(/-+/g, "-").replace(/-$/, "").slice(0, 30));
  for (const root of candidates) {
    if (root.length < 3) continue;
    for (let i = 0; i < 30; i++) {
      const handle = i === 0 ? root : `${root}-${i + 1}`;
      if (slugProblem(handle)) continue;
      const [user, publication] = await Promise.all([
        prisma.user.findUnique({ where: { handle }, select: { id: true } }),
        prisma.publication.findUnique({ where: { slug: handle }, select: { id: true } })
      ]);
      if (!user && !publication) return handle;
    }
  }
  return `autore-${randomBytes(4).toString("hex")}`;
}

/**
 * L'utente che corrisponde al profilo Google: già collegato, oppure con la stessa email (Google l'ha
 * verificata, quindi si collega e si dà l'email per confermata), oppure nuovo.
 */
export async function userFromGoogle(profile: GoogleProfile): Promise<{ id: string; suspendedAt: Date | null; created: boolean }> {
  const linked = await prisma.user.findUnique({ where: { googleId: profile.sub }, select: { id: true, suspendedAt: true } });
  if (linked) return { ...linked, created: false };

  const byEmail = await prisma.user.findUnique({ where: { email: profile.email }, select: { id: true, suspendedAt: true, emailVerified: true } });
  if (byEmail) {
    await prisma.user.update({ where: { id: byEmail.id }, data: { googleId: profile.sub, emailVerified: byEmail.emailVerified ?? new Date() } });
    return { id: byEmail.id, suspendedAt: byEmail.suspendedAt, created: false };
  }

  const user = await prisma.user.create({
    data: {
      name: profile.name.slice(0, 80),
      email: profile.email,
      handle: await availableHandle(profile.email, profile.name),
      passwordHash: await hashPassword(b64url(randomBytes(32))),
      googleId: profile.sub,
      emailVerified: new Date()
    },
    select: { id: true, suspendedAt: true }
  });
  return { ...user, created: true };
}
