// Test end to end delle fondamenta: recupero password, dominio personalizzato, feed, webhook dei rimbalzi.
// Il server web va avviato con:
//   EMAIL_PROVIDER=log EMAIL_LOG_DIR=<dir> APP_URL=http://localhost:3000 APP_DOMAIN=zerostack.it
//   EMAIL_WEBHOOK_TOKEN=zs_email_test RESEND_WEBHOOK_SECRET=whsec_dGVzdC1zZWdyZXRvLXJlc2VuZA== ZS_FAKE_DNS_FILE=<file>
// e il test con le stesse EMAIL_LOG_DIR e ZS_FAKE_DNS_FILE, più ZS_BASE_URL e DATABASE_URL.
import { createHmac } from "node:crypto";
import http from "node:http";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
const DNS_FILE = process.env.ZS_FAKE_DNS_FILE;
const EMAIL_WEBHOOK_TOKEN = process.env.EMAIL_WEBHOOK_TOKEN || "zs_email_test";
const RESEND_SECRET = process.env.RESEND_WEBHOOK_SECRET || "whsec_dGVzdC1zZWdyZXRvLXJlc2VuZA==";
if (!MAIL_DIR || !DNS_FILE) {
  console.error("Imposta EMAIL_LOG_DIR e ZS_FAKE_DNS_FILE (gli stessi del server web)");
  process.exit(1);
}
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

async function call(method, urlPath, { body, cookie, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${BASE}${urlPath}`, { method, headers: h, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

// fetch non permette di impostare l'header Host: serve per simulare il dominio personalizzato.
function getWithHost(urlPath, host) {
  const url = new URL(BASE);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: url.hostname, port: url.port || 80, path: urlPath, headers: { host } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, text: data }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function mailsTo(address) {
  const files = await readdir(MAIL_DIR).catch(() => []);
  const out = [];
  for (const f of files) {
    const m = JSON.parse(await readFile(path.join(MAIL_DIR, f), "utf8"));
    if (m.to === address) out.push(m);
  }
  return out;
}

const email = (label) => `${label}-${run}@example.it`;
const password = "password-molto-lunga";

try {
  console.log(`\n🧪 Fondamenta end to end su ${BASE} (giro ${run})\n`);
  await rm(MAIL_DIR, { recursive: true, force: true });
  await writeFile(DNS_FILE, "{}");

  // ------------------------------------------------------------------ recupero password
  const reg = await call("POST", "/api/auth/register", { body: { name: "Autrice", email: email("autrice"), handle: `autrice-${run}`, password } });
  const oldSession = reg.cookie;
  assert(reg.status === 201, "Account creato");

  const unknown = await call("POST", "/api/auth/password/forgot", { body: { email: email("nessuno") } });
  const known = await call("POST", "/api/auth/password/forgot", { body: { email: email("autrice").toUpperCase() } });
  assert(unknown.status === 404 && unknown.json?.code === "not_found", "Email sconosciuta: lo dice (decisione del 3/10)", unknown.text);
  assert(known.status === 200 && (known.json?.message ?? "").includes(email("autrice")), "Email registrata: conferma l'invio e l'indirizzo", known.text);
  assert((await mailsTo(email("nessuno"))).length === 0, "A un indirizzo sconosciuto non parte nulla");

  const resetMail = (await mailsTo(email("autrice"))).find((m) => m.subject === "Imposta una nuova password");
  const resetUrl = resetMail?.text.match(/https?:\/\/\S+\/reset-password\?token=[\w-]+/)?.[0];
  assert(Boolean(resetUrl) && resetMail.subject === "Imposta una nuova password", "Arriva l'email con il link di recupero");
  const token = resetUrl ? new URL(resetUrl).searchParams.get("token") : "";

  const short = await call("POST", "/api/auth/password/reset", { body: { token, password: "corta" } });
  assert(short.status === 400, "Password troppo corta respinta");
  const reset = await call("POST", "/api/auth/password/reset", { body: { token, password: "nuova-password-sicura" } });
  assert(reset.status === 200 && Boolean(reset.cookie), "Password cambiata, e si entra subito", reset.text);
  const reused = await call("POST", "/api/auth/password/reset", { body: { token, password: "altra-password-ancora" } });
  assert(reused.status === 400, "Lo stesso link non vale due volte");

  const oldMe = await call("GET", "/api/auth/me", { cookie: oldSession });
  assert(oldMe.status === 401, "Le sessioni aperte prima del cambio sono chiuse");
  const oldLogin = await call("POST", "/api/auth/login", { body: { email: email("autrice"), password } });
  const newLogin = await call("POST", "/api/auth/login", { body: { email: email("autrice"), password: "nuova-password-sicura" } });
  assert(oldLogin.status === 401 && newLogin.status === 200, "Vecchia password rifiutata, nuova accettata");
  const author = newLogin.cookie;

  const bogus = await call("POST", "/api/auth/password/reset", { body: { token: "token-inventato-lungo-abbastanza", password: "nuova-password-sicura" } });
  assert(bogus.status === 400, "Token inventato respinto");

  // ------------------------------------------------------------------ dominio personalizzato
  const pub = await call("POST", "/api/publications", { cookie: author, body: { name: `Diario ${run}`, slug: `diario-${run}` } });
  const publicationId = pub.json?.publication?.id;
  const domain = `news-${run}.esempio.it`;

  const platformDomain = await call("PUT", `/api/publications/${publicationId}/domain`, { cookie: author, body: { customDomain: `altro.zerostack.it` } });
  assert(platformDomain.status === 400, "Un indirizzo della piattaforma non vale come dominio personalizzato");
  const setDomain = await call("PUT", `/api/publications/${publicationId}/domain`, { cookie: author, body: { customDomain: `https://${domain.toUpperCase()}/` } });
  const verifyToken = setDomain.json?.verifyToken;
  assert(setDomain.status === 200 && setDomain.json?.customDomain === domain && setDomain.json?.isDomainVerified === false, "Dominio salvato (normalizzato) e non ancora verificato", setDomain.text);

  const stranger = (await call("POST", "/api/auth/register", { body: { name: "Altro", email: email("altro"), handle: `altro-${run}`, password } })).cookie;
  const hijack = await call("PUT", `/api/publications/${publicationId}/domain`, { cookie: stranger, body: { customDomain: "mio.esempio.it" } });
  assert(hijack.status === 404, "Nessun altro può cambiare il dominio");
  const otherPub = await call("POST", "/api/publications", { cookie: stranger, body: { name: `Altra ${run}`, slug: `altra-${run}` } });
  const clash = await call("PUT", `/api/publications/${otherPub.json?.publication?.id}/domain`, { cookie: stranger, body: { customDomain: domain } });
  assert(clash.status === 409, "Un dominio già collegato a un'altra pubblicazione è rifiutato", String(clash.status));

  const beforeCheck = await call("GET", `/api/domains/check?domain=${domain}`);
  assert(beforeCheck.status === 403, "Prima della verifica Caddy non emette il certificato");
  const notYet = await call("POST", `/api/publications/${publicationId}/domain/verify`, { cookie: author, body: {} });
  assert(notYet.status === 200 && notYet.json?.verified === false && notYet.json?.message?.includes(`_zerostack.${domain}`), "Senza record TXT la verifica spiega cosa aggiungere");

  await writeFile(DNS_FILE, JSON.stringify({ [`_zerostack.${domain}`]: ["zerostack-verify=sbagliato"] }));
  const wrong = await call("POST", `/api/publications/${publicationId}/domain/verify`, { cookie: author, body: {} });
  assert(wrong.json?.verified === false, "Un record TXT con il valore sbagliato non basta");

  await writeFile(DNS_FILE, JSON.stringify({ [`_zerostack.${domain}`]: ["v=spf1 -all", `zerostack-verify=${verifyToken}`] }));
  const ok = await call("POST", `/api/publications/${publicationId}/domain/verify`, { cookie: author, body: {} });
  assert(ok.json?.verified === true, "Con il record giusto il dominio è verificato", ok.text);
  const afterCheck = await call("GET", `/api/domains/check?domain=${domain}`);
  assert(afterCheck.status === 200, "Dopo la verifica Caddy può emettere il certificato");
  const home = await getWithHost("/", domain);
  assert(home.status === 200 && home.text.includes(`Diario ${run}`), "Il dominio personalizzato mostra la pubblicazione", String(home.status));

  const changed = await call("PUT", `/api/publications/${publicationId}/domain`, { cookie: author, body: { customDomain: `nuovo-${domain}` } });
  assert(changed.json?.isDomainVerified === false && changed.json?.verifyToken !== verifyToken, "Cambiare dominio riparte da capo con un token nuovo");
  const oldCheck = await call("GET", `/api/domains/check?domain=${domain}`);
  assert(oldCheck.status === 403, "Il vecchio dominio non ha più il certificato");

  // ------------------------------------------------------------------ feed
  const secret = `RISERVATO-${run}`;
  await call("POST", "/api/posts", { cookie: author, body: { publicationId, title: `Aperto ${run}`, contentHtml: `<p>Per tutti ${run}</p>`, action: "publish", sendEmail: false } });
  await call("POST", "/api/posts", {
    cookie: author,
    body: { publicationId, title: `Chiuso ${run}`, contentHtml: `<p>Inizio ${run}</p><hr class="paywall-divider" data-paywall="true"><p>${secret}</p>`, access: "PAID_SUBSCRIBERS", action: "publish", sendEmail: false }
  });
  await call("POST", "/api/posts", { cookie: author, body: { publicationId, title: `Bozza ${run}`, contentHtml: "<p>Non ancora</p>", action: "draft" } });
  const rss = await call("GET", `/api/feed/diario-${run}/rss`);
  assert(rss.status === 200 && rss.text.includes(`Aperto ${run}`) && rss.text.includes(`Per tutti ${run}`), "RSS con gli articoli veri");
  assert(rss.text.includes(`Inizio ${run}`) && !rss.text.includes(secret) && rss.text.includes("riservato agli abbonati"), "Nel feed dei post a pagamento esce solo l'anteprima");
  assert(!rss.text.includes(`Bozza ${run}`), "Le bozze non finiscono nel feed");
  const noFeed = await call("GET", `/api/feed/inesistente-${run}/rss`);
  assert(noFeed.status === 404, "Feed di una pubblicazione inesistente: 404");
  const podcast = await call("GET", "/api/feed/tech-italia/podcast");
  assert(podcast.status === 200 && podcast.text.includes("<itunes:duration>372</itunes:duration>") && podcast.text.includes("<enclosure "), "Feed podcast con gli episodi veri");
  const emptyPodcast = await call("GET", `/api/feed/diario-${run}/podcast`);
  assert(emptyPodcast.status === 200 && !emptyPodcast.text.includes("<item>"), "Feed podcast valido anche senza episodi");

  // ------------------------------------------------------------------ webhook di rimbalzi e spam
  const addSubscriber = (pubId, address) => prisma.newsletterSubscriber.create({ data: { publicationId: pubId, email: address, status: "ACTIVE" } });
  const otherPublicationId = otherPub.json?.publication?.id;
  await addSubscriber(publicationId, email("rimbalza"));
  await addSubscriber(otherPublicationId, email("rimbalza"));
  await addSubscriber(publicationId, email("spam"));
  await addSubscriber(otherPublicationId, email("spam"));
  await addSubscriber(publicationId, email("resend"));
  await addSubscriber(publicationId, email("temporaneo"));
  const status = async (address, pubId) => (await prisma.newsletterSubscriber.findUnique({ where: { publicationId_email: { publicationId: pubId, email: address } } }))?.status;

  const noToken = await call("POST", "/api/email/webhook/brevo?token=sbagliato", { body: { event: "hard_bounce", email: email("rimbalza") } });
  assert(noToken.status === 401, "Webhook Brevo con token sbagliato respinto");
  await call("POST", `/api/email/webhook/brevo?token=${EMAIL_WEBHOOK_TOKEN}`, { body: { event: "hard_bounce", email: email("rimbalza") } });
  assert((await status(email("rimbalza"), publicationId)) === "BOUNCED" && (await status(email("rimbalza"), otherPublicationId)) === "BOUNCED", "Rimbalzo definitivo: indirizzo fermato su tutte le pubblicazioni");
  await call("POST", `/api/email/webhook/brevo?token=${EMAIL_WEBHOOK_TOKEN}`, { body: [{ event: "spam", email: email("spam"), tags: [`publication:${publicationId}`] }, { event: "soft_bounce", email: email("temporaneo") }] });
  assert((await status(email("spam"), publicationId)) === "UNSUBSCRIBED" && (await status(email("spam"), otherPublicationId)) === "ACTIVE", "Segnalazione di spam: disiscritto solo dalla pubblicazione segnalata");
  assert((await status(email("temporaneo"), publicationId)) === "ACTIVE", "Un rimbalzo temporaneo non cambia nulla");

  const svix = (payload, { secret: s = RESEND_SECRET } = {}) => {
    const id = `msg_${run}_${Math.random().toString(36).slice(2)}`;
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac("sha256", Buffer.from(s.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${payload}`).digest("base64");
    return { "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}`, "content-type": "application/json" };
  };
  const transient = JSON.stringify({ type: "email.bounced", data: { to: [email("resend")], bounce: { type: "Transient" } } });
  await call("POST", "/api/email/webhook/resend", { raw: transient, headers: svix(transient) });
  assert((await status(email("resend"), publicationId)) === "ACTIVE", "Resend: rimbalzo temporaneo ignorato");
  const permanent = JSON.stringify({ type: "email.bounced", data: { to: [email("resend")], bounce: { type: "Permanent" } } });
  const forged = await call("POST", "/api/email/webhook/resend", { raw: permanent, headers: svix(permanent, { secret: "whsec_c2JhZ2xpYXRv" }) });
  assert(forged.status === 400, "Resend: firma sbagliata respinta");
  await call("POST", "/api/email/webhook/resend", { raw: permanent, headers: svix(permanent) });
  assert((await status(email("resend"), publicationId)) === "BOUNCED", "Resend: rimbalzo definitivo registrato");

  // ------------------------------------------------------------------ webhook turboSMTP
  await addSubscriber(publicationId, email("turbo-bounce"));
  await addSubscriber(otherPublicationId, email("turbo-bounce"));
  await addSubscriber(publicationId, email("turbo-spam"));
  await addSubscriber(otherPublicationId, email("turbo-spam"));
  const turboBad = await call("POST", "/api/email/webhook/turbosmtp?token=sbagliato", { body: { status: "BOUNCED", email: email("turbo-bounce") } });
  assert(turboBad.status === 401, "turboSMTP: webhook con token sbagliato respinto");
  const turboBounce = await call("POST", `/api/email/webhook/turbosmtp?token=${EMAIL_WEBHOOK_TOKEN}`, {
    body: { id: "1", mid: "5520650288", status: "BOUNCED", email: email("turbo-bounce"), subject: "x", timestamp: 1576711314, reason: { 0: "550", response: "550 5.1.1 User unknown" } }
  });
  assert(turboBounce.status === 200 && (await status(email("turbo-bounce"), publicationId)) === "BOUNCED" && (await status(email("turbo-bounce"), otherPublicationId)) === "BOUNCED", "turboSMTP: BOUNCED ferma l'indirizzo ovunque");
  await call("POST", `/api/email/webhook/turbosmtp?token=${EMAIL_WEBHOOK_TOKEN}`, {
    body: [{ status: "REPORT", email: email("turbo-spam"), reference_id: `publication:${publicationId}` }, { status: "DEFERRED", email: email("turbo-spam"), reason: "400 try again later", attempt: 2 }]
  });
  assert((await status(email("turbo-spam"), publicationId)) === "UNSUBSCRIBED" && (await status(email("turbo-spam"), otherPublicationId)) === "ACTIVE", "turboSMTP: REPORT disiscrive solo dalla pubblicazione in reference_id, DEFERRED ignorato");
} finally {
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati\n`);
if (failed > 0) process.exit(1);
