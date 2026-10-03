// Posta del lettore (T3), end to end. Stesso ambiente di scripts/run-e2e.sh.
import { PrismaClient } from "@prisma/client";
import { confirmEmail } from "./lib/test-auth.mjs";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
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

async function call(method, path, { body, cookie } = {}) {
  const h = {};
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, location: res.headers.get("location"), cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

const email = (label) => `${label}-${run}@example.it`;
async function register(label) {
  const res = await call("POST", "/api/auth/register", { body: { name: `Posta ${label}`, email: email(label), handle: `${label}-${run}`, password: `password-${run}-lunga` } });
  await confirmEmail(BASE, MAIL_DIR, email(label));
  return res.cookie;
}
async function publish(cookie, publicationId, title, extra = {}) {
  const res = await call("POST", "/api/posts", { cookie, body: { publicationId, title, contentHtml: `<p>${title}</p>`, action: "publish", sendEmail: false, ...extra } });
  return prisma.post.findFirst({ where: { publicationId, slug: res.json?.post?.slug } });
}

console.log(`\n🧪 Posta del lettore su ${BASE} (giro ${run})\n`);
try {
  const author = await register("autrice");
  const pubA = (await call("POST", "/api/publications", { cookie: author, body: { name: `Seguita ${run}`, slug: `seguita-${run}` } })).json?.publication;
  const pubB = (await call("POST", "/api/publications", { cookie: author, body: { name: `Altra ${run}`, slug: `altra-${run}` } })).json?.publication;
  const first = await publish(author, pubA.id, `Primo ${run}`);
  const second = await publish(author, pubA.id, `Secondo ${run}`, { access: "PAID_SUBSCRIBERS", contentHtml: `<p>Inizio</p><hr class="paywall-divider" data-paywall="true"><p>Segreto</p>` });
  const other = await publish(author, pubB.id, `Non seguita ${run}`);
  await call("POST", "/api/posts", { cookie: author, body: { publicationId: pubA.id, title: `Bozza ${run}`, contentHtml: "<p>bozza</p>", action: "draft" } });

  const reader = await register("lettore");

  // --- Accesso e stato vuoto
  const anon = await call("GET", "/inbox");
  assert(anon.status === 307 && (anon.location ?? "").includes("/login?next="), "Senza accesso la Posta rimanda al login");
  const empty = await call("GET", "/inbox", { cookie: reader });
  assert(empty.status === 200 && empty.text.includes("Non segui ancora nessuna pubblicazione"), "Senza iscrizioni: invito a seguire una pubblicazione");

  // --- Iscrizione confermata alla pubblicazione A (una in attesa di conferma alla B non conta)
  await prisma.newsletterSubscriber.create({ data: { publicationId: pubA.id, email: email("lettore"), status: "ACTIVE", confirmedAt: new Date() } });
  await prisma.newsletterSubscriber.create({ data: { publicationId: pubB.id, email: email("lettore"), status: "PENDING" } });
  const inbox = await call("GET", "/inbox", { cookie: reader });
  assert(inbox.text.includes(`Primo ${run}`) && inbox.text.includes(`Secondo ${run}`), "Arrivano gli articoli della pubblicazione seguita, riservati compresi");
  assert(!inbox.text.includes(`Non seguita ${run}`) && !inbox.text.includes(`Bozza ${run}`), "Niente articoli di pubblicazioni non confermate né bozze");
  assert(inbox.text.includes("2 da leggere") && inbox.text.includes("Per gli abbonati"), "Conteggio da leggere e segno dei riservati");
  const order = inbox.text.indexOf(`Secondo ${run}`) < inbox.text.indexOf(`Primo ${run}`);
  assert(order, "Dal più recente");
  const me = await call("GET", "/api/auth/me", { cookie: reader });
  assert(me.json?.unread === 2, "La barra riceve il numero da leggere", me.text);

  // --- Letto aprendo l'articolo (il riservato senza abbonamento resta da leggere)
  await call("GET", `/p/seguita-${run}/${first.slug}`, { cookie: reader });
  await call("GET", `/p/seguita-${run}/${second.slug}`, { cookie: reader });
  const afterOpen = await call("GET", "/api/auth/me", { cookie: reader });
  assert(afterOpen.json?.unread === 1, "Aperto l'articolo libero: letto; l'anteprima del riservato non conta", afterOpen.text);
  assert((await prisma.postRead.count({ where: { postId: first.id } })) === 1, "Lettura registrata una volta sola");
  await call("GET", `/p/seguita-${run}/${first.slug}`, { cookie: reader });
  assert((await prisma.postRead.count({ where: { postId: first.id } })) === 1, "Riaprirlo non la duplica");

  // --- Segna tutto come letto
  assert((await call("POST", "/api/inbox/read-all", { body: {} })).status === 401, "Segna tutto: senza accesso no");
  const all = await call("POST", "/api/inbox/read-all", { cookie: reader, body: {} });
  assert(all.status === 200 && all.json?.marked === 1, "Segna tutto come letto", all.text);
  assert((await call("GET", "/inbox", { cookie: reader })).text.includes("Tutto letto"), "Poi la Posta dice «Tutto letto»");
  await publish(author, pubA.id, `Terzo ${run}`);
  assert((await call("GET", "/api/auth/me", { cookie: reader })).json?.unread === 1, "Un articolo nuovo torna da leggere");

  // --- Abbonamento attivo alla B: ora segue anche quella
  await prisma.subscription.create({ data: { userId: (await prisma.user.findUnique({ where: { email: email("lettore") } })).id, publicationId: pubB.id, status: "ACTIVE", isPaid: true, currentPeriodEnd: new Date(Date.now() + 30 * 86400_000) } });
  assert((await call("GET", "/inbox", { cookie: reader })).text.includes(`Non seguita ${run}`), "Con un abbonamento attivo arrivano anche quegli articoli");

  // --- Disiscritto o pubblicazione sospesa: sparisce
  await prisma.newsletterSubscriber.update({ where: { publicationId_email: { publicationId: pubA.id, email: email("lettore") } }, data: { status: "UNSUBSCRIBED" } });
  const afterUnsub = await call("GET", "/inbox", { cookie: reader });
  assert(!afterUnsub.text.includes(`Terzo ${run}`) && afterUnsub.text.includes(`Non seguita ${run}`), "Disiscritto dalla A: i suoi articoli spariscono");
  await prisma.publication.update({ where: { id: pubB.id }, data: { suspendedAt: new Date() } });
  assert(!(await call("GET", "/inbox", { cookie: reader })).text.includes(`Non seguita ${run}`), "Pubblicazione sospesa: i suoi articoli spariscono");
  void other;
} finally {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@example.it` } } }).catch(() => undefined);
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
