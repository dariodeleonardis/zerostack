// Fediverso (T6), end to end: un finto server Mastodon segue una pubblicazione, riceve l'Accept e
// poi gli articoli e le note, tutto con firme HTTP verificate da entrambe le parti.
// Il server web va avviato con AP_ALLOW_PRIVATE_HOSTS=1 (il finto Mastodon sta su 127.0.0.1).
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createHash, createSign, createVerify, generateKeyPairSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { confirmEmail } from "./lib/test-auth.mjs";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOCK_PORT = 12114;
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
const run = Math.random().toString(36).slice(2, 8);
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
function assert(condition, name, details = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name} ${details}`);
  }
}

// --- Finto Mastodon: un attore (alice) con la sua chiave e una casella che registra ciò che arriva.
const alice = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
const aliceId = `${MOCK}/users/alice-${run}`;
const received = [];
const mock = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = new URL(req.url, MOCK);
    if (req.method === "GET" && url.pathname === `/users/alice-${run}`) {
      res.writeHead(200, { "content-type": "application/activity+json" });
      return res.end(
        JSON.stringify({
          "@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
          id: aliceId,
          type: "Person",
          preferredUsername: "alice",
          inbox: `${aliceId}/inbox`,
          publicKey: { id: `${aliceId}#main-key`, owner: aliceId, publicKeyPem: alice.publicKey }
        })
      );
    }
    if (req.method === "POST" && url.pathname === `/users/alice-${run}/inbox`) {
      received.push({ path: url.pathname, headers: req.headers, body });
      res.writeHead(202);
      return res.end();
    }
    res.writeHead(404);
    res.end();
  });
});
await new Promise((r) => mock.listen(MOCK_PORT, "127.0.0.1", r));

const digest = (body) => `SHA-256=${createHash("sha256").update(body).digest("base64")}`;

/** POST firmata come la manda Mastodon. `tamper` permette di rompere apposta un pezzo. */
async function signedPost(url, activity, { key = alice.privateKey, keyId = `${aliceId}#main-key`, date = new Date(), bodyOverride } = {}) {
  const body = JSON.stringify(activity);
  const u = new URL(url);
  const headers = { host: u.host, date: date.toUTCString(), digest: digest(body) };
  const signingString = `(request-target): post ${u.pathname}\nhost: ${headers.host}\ndate: ${headers.date}\ndigest: ${headers.digest}`;
  const signature = createSign("sha256").update(signingString).sign(key, "base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      date: headers.date,
      digest: headers.digest,
      "content-type": "application/activity+json",
      signature: `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`
    },
    body: bodyOverride ?? body
  });
  return res.status;
}

/** La firma di una consegna arrivata al finto Mastodon è valida per la chiave della pubblicazione? */
function verifyDelivery(entry, publicKeyPem) {
  const sig = Object.fromEntries([...entry.headers.signature.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const lines = sig.headers.split(" ").map((h) => (h === "(request-target)" ? `(request-target): post ${entry.path}` : `${h}: ${entry.headers[h]}`));
  const signed = createVerify("sha256").update(lines.join("\n")).verify(publicKeyPem, sig.signature, "base64");
  return signed && entry.headers.digest === digest(entry.body) && sig.headers.includes("digest");
}

async function call(method, p, { body, cookie, accept } = {}) {
  const h = {};
  if (cookie) h.cookie = cookie;
  if (accept) h.accept = accept;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${BASE}${p}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, type: res.headers.get("content-type") ?? "", location: res.headers.get("location"), cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

async function runWorker() {
  await promisify(execFile)(path.join(ROOT, "node_modules/.bin/tsx"), [path.join(ROOT, "apps/worker/src/index.ts"), "--once"], {
    env: { ...process.env, EMAIL_PROVIDER: "log", EMAIL_RATE_PER_SECOND: "0", AP_ALLOW_PRIVATE_HOSTS: "1" }
  });
}

const AP = "application/activity+json";
const email = (label) => `${label}-${run}@example.it`;

console.log(`\n🧪 Fediverso su ${BASE} (giro ${run})\n`);
try {
  const reg = await call("POST", "/api/auth/register", { body: { name: "Fedi autrice", email: email("fedi"), handle: `fedi-${run}`, password: `password-${run}-lunga` } });
  await confirmEmail(BASE, MAIL_DIR, email("fedi"));
  const author = reg.cookie;
  const slug = `fedi-${run}`;
  const pub = (await call("POST", "/api/publications", { cookie: author, body: { name: `Fedi ${run}`, slug, description: "Note <dal> Fediverso" } })).json?.publication;
  const host = new URL(BASE).host;

  // --- WebFinger
  const wf = await call("GET", `/.well-known/webfinger?resource=acct:${slug}@${host}`);
  const actorId = wf.json?.links?.find((l) => l.rel === "self")?.href;
  assert(wf.status === 200 && wf.type.includes("jrd+json") && wf.json?.subject === `acct:${slug}@${host}`, "WebFinger risponde con il nome canonico", wf.text);
  assert(actorId === `${BASE}/api/ap/p/${pub.id}`, "e porta all'attore della pubblicazione");
  assert((await call("GET", `/.well-known/webfinger?resource=acct:${slug}@${slug}.zerostack.it`)).status === 200, "Vale anche il sottodominio della pubblicazione");
  assert((await call("GET", `/.well-known/webfinger?resource=acct:${slug}@altro.example`)).status === 404, "Un altro dominio: 404");
  assert((await call("GET", "/.well-known/webfinger?resource=mailto:x@y.it")).status === 400, "Risorsa malformata: 400");

  // --- Attore
  const actor = await call("GET", `/api/ap/p/${pub.id}`, { accept: AP });
  const pem = actor.json?.publicKey?.publicKeyPem ?? "";
  assert(actor.status === 200 && actor.type.includes("activity+json"), "L'attore risponde in activity+json");
  assert(actor.json?.preferredUsername === slug && actor.json?.inbox === `${actorId}/inbox` && pem.includes("BEGIN PUBLIC KEY"), "Con nome, casella e chiave pubblica");
  assert(actor.json?.summary === "<p>Note &lt;dal&gt; Fediverso</p>", "La descrizione è testo, non HTML");
  const again = await call("GET", `/api/ap/p/${pub.id}`, { accept: AP });
  assert(again.json?.publicKey?.publicKeyPem === pem, "La chiave non cambia fra una richiesta e l'altra");
  const html = await call("GET", `/api/ap/p/${pub.id}`, { accept: "text/html" });
  assert(html.status === 302 && (html.location ?? "").includes(slug), "Dal browser porta alla pagina della pubblicazione");
  assert((await call("GET", `/p/${slug}`)).text.includes(`@${slug}@${host}`), "La pagina della pubblicazione mostra il nome da seguire");

  // --- Casella: firme
  const inbox = `${BASE}/api/ap/p/${pub.id}/inbox`;
  const follow = { "@context": "https://www.w3.org/ns/activitystreams", id: `${aliceId}#follow-1`, type: "Follow", actor: aliceId, object: actorId };
  const unsigned = await fetch(inbox, { method: "POST", headers: { "content-type": AP }, body: JSON.stringify(follow) });
  assert(unsigned.status === 401, "Senza firma: 401");
  const wrongKey = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  assert((await signedPost(inbox, follow, { key: wrongKey.privateKey })) === 401, "Firmata con un'altra chiave: 401");
  assert((await signedPost(inbox, follow, { bodyOverride: JSON.stringify({ ...follow, id: "cambiato" }) })) === 401, "Corpo cambiato dopo la firma: 401");
  assert((await signedPost(inbox, follow, { date: new Date(Date.now() - 13 * 3600_000) })) === 401, "Firma di 13 ore fa: 401");
  assert((await signedPost(inbox, { ...follow, actor: `${MOCK}/users/mallory` })) === 401, "Attore diverso da chi firma: 401");
  assert((await prisma.apFollower.count({ where: { publicationId: pub.id } })) === 0, "Nessun seguace dalle richieste rifiutate");

  // --- Follow vero
  assert((await signedPost(inbox, follow)) === 202, "Follow firmato: 202");
  const follower = await prisma.apFollower.findFirst({ where: { publicationId: pub.id } });
  assert(follower?.actorUrl === aliceId && follower.inboxUrl === `${aliceId}/inbox` && follower.handle === `alice@127.0.0.1:${MOCK_PORT}`, "Seguace salvato con casella e nome");
  const accept = received.find((r) => JSON.parse(r.body).type === "Accept");
  assert(Boolean(accept) && JSON.parse(accept.body).object?.id === follow.id, "Alice riceve l'Accept del suo Follow");
  assert(accept && verifyDelivery(accept, pem), "L'Accept è firmato con la chiave della pubblicazione");
  assert((await signedPost(inbox, follow)) === 202 && (await prisma.apFollower.count({ where: { publicationId: pub.id } })) === 1, "Un secondo Follow non crea doppioni");
  assert((await call("GET", `/api/ap/p/${pub.id}/followers`)).json?.totalItems === 1, "La raccolta dei seguaci dice 1, senza elenco");

  // --- Un articolo e una nota arrivano ad alice, una volta sola
  received.length = 0;
  const post = await call("POST", "/api/posts", { cookie: author, body: { publicationId: pub.id, title: `Uscita fedi ${run}`, contentHtml: "<p>Testo dell'uscita</p>", action: "publish", sendEmail: false } });
  const note = await call("POST", "/api/notes", { cookie: author, body: { publicationId: pub.id, content: `Nota fedi ${run}\ncon a capo` } });
  await runWorker();
  const creates = received.map((r) => ({ r, a: JSON.parse(r.body) })).filter(({ a }) => a.type === "Create");
  const article = creates.find(({ a }) => a.object?.content?.includes(`Uscita fedi ${run}`));
  const shortNote = creates.find(({ a }) => a.object?.content?.includes(`Nota fedi ${run}`));
  assert(Boolean(article) && article.a.object.url.includes(post.json?.post?.slug ?? "?"), "L'articolo arriva con il link", JSON.stringify(creates.map((c) => c.a.object?.content)));
  assert(Boolean(shortNote) && shortNote.a.object.content.includes("<br>"), "La nota arriva con gli a capo");
  assert(creates.every(({ r }) => verifyDelivery(r, pem)), "Consegne firmate con la chiave della pubblicazione");
  assert(article?.a.to?.includes("https://www.w3.org/ns/activitystreams#Public") && article.a.actor === actorId, "Pubblico, a nome dell'attore");
  const count = received.length;
  await runWorker();
  assert(received.length === count, "Un secondo giro del worker non rispedisce");

  // --- Outbox e oggetti
  const outbox = await call("GET", `/api/ap/p/${pub.id}/outbox`, { accept: AP });
  assert(outbox.json?.totalItems === 2 && outbox.json?.orderedItems?.length === 2, "L'outbox elenca l'articolo e la nota", outbox.text.slice(0, 300));
  const objectId = article?.a.object?.id ?? "";
  const object = await call("GET", new URL(objectId).pathname, { accept: AP });
  assert(object.status === 200 && object.json?.id === objectId, "L'articolo si ritrova al suo indirizzo");
  void note;

  // --- Undo: alice smette di seguire
  assert((await signedPost(inbox, { id: `${aliceId}#undo-1`, type: "Undo", actor: aliceId, object: follow })) === 202, "Undo firmato: 202");
  assert((await prisma.apFollower.count({ where: { publicationId: pub.id } })) === 0, "Alice non segue più");

  // --- Pubblicazione sospesa: l'attore sparisce
  await prisma.publication.update({ where: { id: pub.id }, data: { suspendedAt: new Date() } });
  assert((await call("GET", `/api/ap/p/${pub.id}`, { accept: AP })).status === 404, "Sospesa: l'attore non c'è più");
  assert((await call("GET", `/.well-known/webfinger?resource=acct:${slug}@${host}`)).status === 404, "E WebFinger non la trova");
} finally {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@example.it` } } }).catch(() => undefined);
  await prisma.$disconnect();
  mock.close();
}

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
