/**
 * Fediverso (T6, 3/10/2026): il necessario per far seguire una pubblicazione da Mastodon e simili.
 * Solo lato server (usa node:crypto e il DNS): web e worker lo importano da "@zerostack/shared/src/fediverse",
 * non dall'indice del pacchetto, che finisce anche nel browser.
 *
 * - firme HTTP "cavage" (rsa-sha256) come le usa Mastodon: (request-target) host date digest;
 * - letture verso server altrui solo in https e mai verso indirizzi privati (niente SSRF), salvo
 *   AP_ALLOW_PRIVATE_HOSTS=1, che esiste solo per i test end to end;
 * - gli oggetti che spediamo sono Note con testo e link: è il formato che tutti mostrano bene.
 */
import { createHash, createSign, createVerify, generateKeyPairSync } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const AP_CONTEXT = ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"];
export const AP_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
export const AP_CONTENT_TYPE = "application/activity+json";
export const AP_ACCEPT = 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
/** Quanto può essere vecchia (o avanti) la data di una richiesta firmata: oltre, è un replay. */
export const AP_MAX_CLOCK_SKEW_MS = 12 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

export function generateActorKeys(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/** Indirizzi dell'attore di una pubblicazione (sempre sul dominio della piattaforma). */
export function actorUrls(platformUrl: string, publicationId: string) {
  const id = `${platformUrl}/api/ap/p/${publicationId}`;
  return { id, keyId: `${id}#main-key`, inbox: `${id}/inbox`, outbox: `${id}/outbox`, followers: `${id}/followers` };
}

export const isActivityJsonAccept = (accept: string | null) => /application\/(activity\+json|ld\+json)/i.test(accept ?? "");

export function digestHeader(body: string): string {
  return `SHA-256=${createHash("sha256").update(body).digest("base64")}`;
}

/** Intestazioni firmate per una richiesta verso un server del Fediverso (GET senza corpo, POST con). */
export function signedHeaders(input: { method: "GET" | "POST"; url: string; body?: string; keyId: string; privateKeyPem: string; date?: Date }): Record<string, string> {
  const url = new URL(input.url);
  const date = (input.date ?? new Date()).toUTCString();
  const headers: Record<string, string> = { host: url.host, date };
  if (input.body !== undefined) headers.digest = digestHeader(input.body);
  const names = ["(request-target)", "host", "date", ...(input.body !== undefined ? ["digest"] : [])];
  const signingString = names
    .map((n) => (n === "(request-target)" ? `(request-target): ${input.method.toLowerCase()} ${url.pathname}${url.search}` : `${n}: ${headers[n]}`))
    .join("\n");
  const signature = createSign("sha256").update(signingString).sign(input.privateKeyPem, "base64");
  return {
    Host: headers.host,
    Date: headers.date,
    ...(headers.digest ? { Digest: headers.digest, "Content-Type": AP_CONTENT_TYPE } : {}),
    Accept: AP_ACCEPT,
    Signature: `keyId="${input.keyId}",algorithm="rsa-sha256",headers="${names.join(" ")}",signature="${signature}"`
  };
}

export interface ParsedSignature {
  keyId: string;
  algorithm: string;
  headers: string[];
  signature: string;
}

export function parseSignatureHeader(value: string | null): ParsedSignature | null {
  if (!value) return null;
  const fields: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  for (let m = re.exec(value); m; m = re.exec(value)) fields[m[1]] = m[2];
  if (!fields.keyId || !fields.signature) return null;
  return {
    keyId: fields.keyId,
    algorithm: fields.algorithm ?? "rsa-sha256",
    headers: (fields.headers ?? "date").toLowerCase().split(/\s+/).filter(Boolean),
    signature: fields.signature
  };
}

/**
 * Verifica la firma di una richiesta in arrivo. Per un POST pretende che siano firmati
 * (request-target), host, date e digest, che il digest sia quello del corpo e che la data sia recente.
 */
export function verifySignedRequest(input: {
  method: string;
  path: string;
  header: (name: string) => string | null;
  body?: string;
  signature: ParsedSignature;
  publicKeyPem: string;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  const sig = input.signature;
  if (!["rsa-sha256", "hs2019"].includes(sig.algorithm.toLowerCase())) return { ok: false, reason: "algoritmo non supportato" };
  const required = ["(request-target)", "host", "date", ...(input.body !== undefined ? ["digest"] : [])];
  if (!required.every((h) => sig.headers.includes(h))) return { ok: false, reason: "intestazioni firmate insufficienti" };
  const date = Date.parse(input.header("date") ?? "");
  const now = (input.now ?? new Date()).getTime();
  if (!Number.isFinite(date) || Math.abs(now - date) > AP_MAX_CLOCK_SKEW_MS) return { ok: false, reason: "data assente o fuori tempo" };
  if (input.body !== undefined) {
    const digest = input.header("digest") ?? "";
    const expected = digestHeader(input.body);
    // Il digest può elencarne più d'uno ("SHA-256=...,SHA-512=..."): basta che ci sia quello giusto.
    if (!digest.split(",").some((d) => d.trim() === expected)) return { ok: false, reason: "digest diverso dal corpo" };
  }
  const lines: string[] = [];
  for (const name of sig.headers) {
    if (name === "(request-target)") lines.push(`(request-target): ${input.method.toLowerCase()} ${input.path}`);
    else {
      const value = input.header(name);
      if (value === null) return { ok: false, reason: `manca l'intestazione ${name}` };
      lines.push(`${name}: ${value}`);
    }
  }
  try {
    const ok = createVerify("sha256").update(lines.join("\n")).verify(input.publicKeyPem, sig.signature, "base64");
    return ok ? { ok: true } : { ok: false, reason: "firma non valida" };
  } catch {
    return { ok: false, reason: "chiave pubblica illeggibile" };
  }
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v6);
}

export const allowPrivateHosts = (env: NodeJS.ProcessEnv = process.env) => env.AP_ALLOW_PRIVATE_HOSTS === "1";

/** Un indirizzo che possiamo contattare: https e host pubblico (http e host privati solo nei test). */
export async function assertFetchableUrl(raw: string, env: NodeJS.ProcessEnv = process.env): Promise<URL> {
  const url = new URL(raw);
  const relaxed = allowPrivateHosts(env);
  if (url.protocol !== "https:" && !(relaxed && url.protocol === "http:")) throw new Error("solo indirizzi https");
  if (url.username || url.password) throw new Error("indirizzo con credenziali");
  if (!relaxed) {
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error("host non raggiungibile da qui");
  }
  return url;
}

/** fetch verso il Fediverso: indirizzo controllato, niente redirect, tempo massimo, corpo limitato. */
export async function apFetch(raw: string, init: RequestInit, env: NodeJS.ProcessEnv = process.env): Promise<{ status: number; text: string }> {
  const url = await assertFetchableUrl(raw, env);
  const res = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new Error("risposta troppo grande");
  const text = await res.text();
  if (text.length > MAX_BODY_BYTES) throw new Error("risposta troppo grande");
  return { status: res.status, text };
}

export interface RemoteActor {
  id: string;
  inbox: string;
  sharedInbox: string | null;
  preferredUsername: string | null;
  publicKeyPem: string;
}

/** Legge un attore remoto (GET firmata: alcuni server la pretendono) e ne controlla la coerenza. */
export async function fetchRemoteActor(
  actorId: string,
  signer: { keyId: string; privateKeyPem: string },
  env: NodeJS.ProcessEnv = process.env
): Promise<RemoteActor> {
  const res = await apFetch(actorId, { headers: signedHeaders({ method: "GET", url: actorId, ...signer }) }, env);
  if (res.status !== 200) throw new Error(`attore non disponibile (${res.status})`);
  const doc = JSON.parse(res.text);
  const key = doc?.publicKey;
  if (doc?.id !== actorId) throw new Error("l'attore dichiara un altro indirizzo");
  if (typeof doc.inbox !== "string" || typeof key?.publicKeyPem !== "string" || key.owner !== actorId) throw new Error("attore incompleto");
  await assertFetchableUrl(doc.inbox, env);
  const shared = typeof doc.endpoints?.sharedInbox === "string" ? doc.endpoints.sharedInbox : null;
  if (shared) await assertFetchableUrl(shared, env);
  return {
    id: doc.id,
    inbox: doc.inbox,
    sharedInbox: shared,
    preferredUsername: typeof doc.preferredUsername === "string" ? doc.preferredUsername.slice(0, 100) : null,
    publicKeyPem: key.publicKeyPem
  };
}

/** Spedisce un'attività firmata alla casella di un altro server. */
export async function deliverActivity(
  inbox: string,
  activity: object,
  signer: { keyId: string; privateKeyPem: string },
  env: NodeJS.ProcessEnv = process.env
): Promise<number> {
  const body = JSON.stringify(activity);
  const res = await apFetch(inbox, { method: "POST", body, headers: signedHeaders({ method: "POST", url: inbox, body, ...signer }) }, env);
  return res.status;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Un articolo come Note: titolo, estratto e link all'articolo (anche riservato: l'anteprima è pubblica). */
export function articleObject(actor: { id: string; followers: string }, post: { id: string; title: string; excerpt: string | null; url: string; publishedAt: Date }) {
  const parts = [`<p><strong>${escapeHtml(post.title)}</strong></p>`];
  if (post.excerpt) parts.push(`<p>${escapeHtml(post.excerpt)}</p>`);
  parts.push(`<p><a href="${escapeHtml(post.url)}">${escapeHtml(post.url)}</a></p>`);
  return {
    id: `${actor.id}/posts/${post.id}`,
    type: "Note",
    attributedTo: actor.id,
    content: parts.join(""),
    url: post.url,
    published: post.publishedAt.toISOString(),
    to: [AP_PUBLIC],
    cc: [actor.followers]
  };
}

/** Una nota breve (T5) come Note, testo semplice con gli a capo. */
export function shortNoteObject(actor: { id: string; followers: string }, note: { id: string; content: string; url: string; createdAt: Date }) {
  const html = note.content
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return {
    id: `${actor.id}/notes/${note.id}`,
    type: "Note",
    attributedTo: actor.id,
    content: html,
    url: note.url,
    published: note.createdAt.toISOString(),
    to: [AP_PUBLIC],
    cc: [actor.followers]
  };
}

export function createActivity(actor: { id: string; followers: string }, object: { id: string; published: string }) {
  return { "@context": AP_CONTEXT, id: `${object.id}/activity`, type: "Create", actor: actor.id, published: object.published, to: [AP_PUBLIC], cc: [actor.followers], object };
}
