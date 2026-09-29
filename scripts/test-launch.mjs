// Test end to end del blocco "pronti al lancio": caricamento file, copertina e podcast, verifica dell'email,
// profilo, esportazione e cancellazione dei dati, pagine legali, amministrazione e sospensioni.
// Stesso ambiente di scripts/run-e2e.sh (EMAIL_LOG_DIR, DATABASE_URL, server con Stripe finto su 12111).
import http from "node:http";
import { PrismaClient } from "@prisma/client";
import { startStripeMock } from "./lib/stripe-mock.mjs";
import { confirmEmail, findMail } from "./lib/test-auth.mjs";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
if (!MAIL_DIR) {
  console.error("Imposta EMAIL_LOG_DIR (la stessa del server web)");
  process.exit(1);
}
const run = Math.random().toString(36).slice(2, 8);
const prisma = new PrismaClient();
const stripe = await startStripeMock(Number(process.env.STRIPE_MOCK_PORT || 12111));

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

async function call(method, urlPath, { body, cookie, headers = {}, form } = {}) {
  const h = { ...headers };
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${BASE}${urlPath}`, { method, headers: h, body: form ?? (body === undefined ? undefined : JSON.stringify(body)), redirect: "manual" });
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString("utf8");
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json, buf, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

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

const email = (label) => `${label}-${run}@example.it`;
const password = "password-molto-lunga";
async function register(label) {
  const res = await call("POST", "/api/auth/register", { body: { name: `Test ${label}`, email: email(label), handle: `${label}-${run}`, password } });
  return res.cookie;
}
const upload = (cookie, bytes, name, kind) => {
  const form = new FormData();
  form.set("file", new Blob([bytes]), name);
  if (kind) form.set("kind", kind);
  return call("POST", "/api/uploads", { cookie, form });
};

// Un PNG 1x1 valido e un "MP3" con intestazione ID3 (il server guarda solo i primi byte).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const MP3 = Buffer.concat([Buffer.from("ID3"), Buffer.from([4, 0, 0, 0, 0, 0, 0]), Buffer.alloc(4000, 7)]);

try {
  console.log(`\n🧪 Blocco lancio end to end su ${BASE} (giro ${run})\n`);

  // ------------------------------------------------------------------ verifica dell'email
  const author = await register("autrice");
  const pub = await call("POST", "/api/publications", { cookie: author, body: { name: `Lancio ${run}`, slug: `lancio-${run}` } });
  const publicationId = pub.json?.publication?.id;
  assert(pub.status === 201, "Senza email confermata si crea comunque la pubblicazione");

  const blockedSend = await call("POST", "/api/posts", { cookie: author, body: { publicationId, title: `Primo ${run}`, contentHtml: "<p>Ciao</p>", action: "publish", sendEmail: true } });
  assert(blockedSend.status === 403 && blockedSend.json?.code === "email_not_verified", "Senza conferma non si inviano newsletter", blockedSend.text);
  const blockedStripe = await call("POST", "/api/stripe/connect", { cookie: author, body: { publicationId } });
  assert(blockedStripe.status === 403, "Senza conferma non si collega Stripe", String(blockedStripe.status));
  const noEmailPublish = await call("POST", "/api/posts", { cookie: author, body: { publicationId, title: `Senza email ${run}`, contentHtml: "<p>Solo sul sito</p>", action: "publish", sendEmail: false } });
  assert(noEmailPublish.status === 201, "Pubblicare sul sito senza inviare email è permesso");
  const studio = await call("GET", "/studio", { cookie: author });
  assert(studio.text.includes("Rimanda l"), "Lo studio mostra l'avviso con il pulsante per rimandare l'email");

  const verifyMail = await findMail(MAIL_DIR, email("autrice"), /^Conferma il tuo indirizzo email$/);
  assert(Boolean(verifyMail), "Alla registrazione arriva l'email di conferma");
  assert((await confirmEmail(BASE, MAIL_DIR, email("autrice"))) === 200, "Il link conferma l'indirizzo");
  const link = verifyMail?.text.match(/\/api\/auth\/verify-email\?token=[\w-]+/)?.[0];
  assert((await call("GET", link)).status === 400, "Lo stesso link non vale due volte");
  const allowedSend = await call("POST", "/api/posts", { cookie: author, body: { publicationId, title: `Primo ${run}`, contentHtml: "<p>Ciao</p>", action: "publish", sendEmail: true } });
  assert(allowedSend.status === 201 && allowedSend.json?.campaignId, "Dopo la conferma la newsletter parte");
  const alreadyVerified = await call("POST", "/api/auth/verify-email/resend", { cookie: author, body: {} });
  assert(alreadyVerified.json?.alreadyVerified === true, "Chiedere di nuovo la conferma a indirizzo già confermato non manda nulla");

  // ------------------------------------------------------------------ caricamento dei file
  const anonUpload = await upload(undefined, PNG, "a.png");
  assert(anonUpload.status === 401, "Senza sessione non si carica niente");
  const image = await upload(author, PNG, "foto.png", "image");
  assert(image.status === 201 && /\/api\/media\/image\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/.test(image.json?.media?.url ?? ""), "Immagine caricata, con un nome casuale", image.text);
  const imageUrl = new URL(image.json?.media?.url);
  const served = await call("GET", imageUrl.pathname);
  assert(served.status === 200 && served.headers.get("content-type") === "image/png" && served.headers.get("x-content-type-options") === "nosniff" && served.buf.equals(PNG), "L'immagine si scarica identica, con il tipo giusto e nosniff");

  const svg = await upload(author, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "x.svg");
  const html = await upload(author, Buffer.from("<html><script>alert(1)</script></html>"), "finto.png");
  assert(svg.status === 415 && html.status === 415, "SVG e HTML travestiti da immagine vengono rifiutati");
  const wrongKind = await upload(author, PNG, "a.png", "audio");
  assert(wrongKind.status === 415, "Un'immagine dove serve un audio viene rifiutata");

  const audio = await upload(author, MP3, "puntata.mp3", "audio");
  const audioPath = new URL(audio.json?.media?.url ?? BASE).pathname;
  assert(audio.status === 201 && audio.json?.media?.contentType === "audio/mpeg", "Audio MP3 caricato");
  const ranged = await call("GET", audioPath, { headers: { range: "bytes=10-19" } });
  assert(ranged.status === 206 && ranged.headers.get("content-range") === `bytes 10-19/${MP3.length}` && ranged.buf.length === 10, "Richieste a intervalli (Range) per i lettori podcast");
  const traversal = await call("GET", "/api/media/image/../../../../etc/passwd");
  const unknown = await call("GET", "/api/media/image/2026/09/00000000-0000-0000-0000-000000000000.png");
  assert(traversal.status === 404 && unknown.status === 404, "Percorsi inventati o file inesistenti: 404");

  // ------------------------------------------------------------------ copertina e podcast
  const podcastPost = await call("POST", "/api/posts", {
    cookie: author,
    body: { publicationId, title: `Puntata ${run}`, contentHtml: "<p>Note della puntata</p>", action: "publish", sendEmail: false, coverImageUrl: image.json.media.url, podcast: { audioUrl: audio.json.media.url, durationSeconds: 754 } }
  });
  assert(podcastPost.status === 201, "Post con copertina e audio salvato", podcastPost.text);
  const podcastPage = await call("GET", `/p/lancio-${run}/${podcastPost.json?.post?.slug}`);
  assert(podcastPage.text.includes(imageUrl.pathname) && podcastPage.text.includes("<audio"), "La pagina mostra copertina e lettore audio");
  const feed = await call("GET", `/api/feed/lancio-${run}/podcast`);
  assert(feed.text.includes(`<enclosure url="${audio.json.media.url}"`) && feed.text.includes("<itunes:duration>754</itunes:duration>"), "L'episodio caricato finisce nel feed podcast");
  const removed = await call("PATCH", `/api/posts/${podcastPost.json?.post?.id}`, {
    cookie: author,
    body: { publicationId, title: `Puntata ${run}`, contentHtml: "<p>Note della puntata</p>", action: "publish", sendEmail: false, podcast: null, coverImageUrl: null }
  });
  const feedAfter = await call("GET", `/api/feed/lancio-${run}/podcast`);
  assert(removed.status === 200 && !feedAfter.text.includes("<item>"), "Togliendo l'audio l'episodio esce dal feed");

  // ------------------------------------------------------------------ profilo e password
  const profile = await call("PATCH", "/api/account/profile", { cookie: author, body: { name: "Autrice Nuova", bio: "Scrivo di cose", avatarUrl: image.json.media.url } });
  assert(profile.status === 200 && profile.json?.user?.name === "Autrice Nuova", "Profilo aggiornato");
  const otherDevice = (await call("POST", "/api/auth/login", { body: { email: email("autrice"), password } })).cookie;
  const wrongCurrent = await call("POST", "/api/account/password", { cookie: author, body: { currentPassword: "sbagliata", newPassword: "nuova-password-lunga" } });
  assert(wrongCurrent.status === 400, "Cambio password con la password attuale sbagliata respinto");
  const changed = await call("POST", "/api/account/password", { cookie: author, body: { currentPassword: password, newPassword: "nuova-password-lunga" } });
  const meHere = await call("GET", "/api/auth/me", { cookie: author });
  const meThere = await call("GET", "/api/auth/me", { cookie: otherDevice });
  assert(changed.status === 200 && meHere.status === 200 && meThere.status === 401, "Password cambiata: questa sessione resta, le altre si chiudono");

  // ------------------------------------------------------------------ esportazione
  const exported = await call("GET", "/api/account/export", { cookie: author });
  assert(
    exported.status === 200 && /attachment/.test(exported.headers.get("content-disposition") ?? "") && exported.json?.account?.email === email("autrice") && exported.json?.publications?.length === 1 && exported.json?.posts?.length >= 3,
    "Esportazione JSON con account, pubblicazioni e articoli"
  );

  // ------------------------------------------------------------------ pagine legali
  const privacy = await call("GET", "/privacy");
  assert(privacy.status === 200 && privacy.text.includes("Informativa sulla privacy") && privacy.text.includes("responsabile del trattamento"), "Pagina privacy");
  assert((await call("GET", "/termini")).status === 200 && (await call("GET", "/cookie")).text.includes("zs_session"), "Pagine termini e cookie");
  const onSubdomain = await getWithHost("/privacy", `lancio-${run}.zerostack.it`);
  assert(onSubdomain.status === 200 && onSubdomain.text.includes("Informativa sulla privacy"), "Le pagine legali si aprono anche dai sottodomini");

  // ------------------------------------------------------------------ amministrazione
  const reader = await register("lettore");
  const notAdmin = await call("POST", `/api/admin/users/${(await prisma.user.findUnique({ where: { email: email("autrice") } })).id}`, { cookie: reader, body: { action: "suspend" } });
  assert(notAdmin.status === 404 && (await call("GET", "/admin", { cookie: reader })).status === 404, "Chi non è amministratore non vede né pannello né API");

  const adminCookie = await register("admin");
  await prisma.user.update({ where: { email: email("admin") }, data: { role: "ADMIN" } });
  const readerId = (await prisma.user.findUnique({ where: { email: email("lettore") } })).id;
  const adminHome = await call("GET", "/admin", { cookie: adminCookie });
  assert(adminHome.status === 200 && adminHome.text.includes("Configurazione"), "Il pannello admin mostra numeri e configurazione");
  const usersPage = await call("GET", `/admin/users?q=${run}`, { cookie: adminCookie });
  assert(usersPage.text.includes(email("lettore")), "Ricerca degli utenti");

  await call("POST", `/api/admin/users/${readerId}`, { cookie: adminCookie, body: { action: "suspend" } });
  const suspendedMe = await call("GET", "/api/auth/me", { cookie: reader });
  const suspendedLogin = await call("POST", "/api/auth/login", { body: { email: email("lettore"), password } });
  assert(suspendedMe.status === 401 && suspendedLogin.status === 403, "Utente sospeso: sessione chiusa e accesso negato");
  await call("POST", `/api/admin/users/${readerId}`, { cookie: adminCookie, body: { action: "unsuspend" } });
  assert((await call("POST", "/api/auth/login", { body: { email: email("lettore"), password } })).status === 200, "Riattivato, rientra");
  const roleByAdmin = await call("POST", `/api/admin/users/${readerId}`, { cookie: adminCookie, body: { action: "role", role: "ADMIN" } });
  assert(roleByAdmin.status === 403, "Un ADMIN non può promuovere altri amministratori (serve un SUPERADMIN)");

  await call("POST", `/api/admin/publications/${publicationId}`, { cookie: adminCookie, body: { action: "suspend" } });
  const offPage = await call("GET", `/p/lancio-${run}`);
  const offFeed = await call("GET", `/api/feed/lancio-${run}/rss`);
  const offCert = await call("GET", `/api/domains/check?domain=lancio-${run}.zerostack.it`);
  const offSubscribe = await call("POST", "/api/subscribe", { body: { publicationId, email: email("iscritto") } });
  assert(offPage.status === 404 && offFeed.status === 404 && offCert.status === 403 && offSubscribe.status === 404, "Pubblicazione sospesa: pagina, feed, certificato e iscrizioni fermi");
  await call("POST", `/api/admin/publications/${publicationId}`, { cookie: adminCookie, body: { action: "unsuspend" } });
  assert((await call("GET", `/p/lancio-${run}`)).status === 200, "Riattivata, torna online");

  // ------------------------------------------------------------------ cancellazione dell'account
  const readerCookie = (await call("POST", "/api/auth/login", { body: { email: email("lettore"), password } })).cookie;
  const subId = `sub_del_${run}`;
  stripe.addSubscription({ id: subId, object: "subscription", status: "active", customer: "cus_x", cancel_at_period_end: false, current_period_end: Math.floor(Date.now() / 1000) + 86400, metadata: {} });
  await prisma.publication.update({ where: { id: publicationId }, data: { stripeAccountId: `acct_del_${run}` } });
  await prisma.subscription.create({ data: { publicationId, userId: readerId, status: "ACTIVE", isPaid: true, stripeSubscriptionId: subId } });
  await prisma.newsletterSubscriber.create({ data: { publicationId, email: email("lettore"), status: "ACTIVE" } });

  const authorBlocked = await call("POST", "/api/account/delete", { cookie: author, body: { password: "nuova-password-lunga", confirm: "ELIMINA" } });
  assert(authorBlocked.status === 409, "Chi ha abbonati paganti non può cancellarsi finché non li gestisce", authorBlocked.text);
  const noConfirm = await call("POST", "/api/account/delete", { cookie: readerCookie, body: { password, confirm: "elimina" } });
  const badPassword = await call("POST", "/api/account/delete", { cookie: readerCookie, body: { password: "sbagliata", confirm: "ELIMINA" } });
  assert(noConfirm.status === 400 && badPassword.status === 400, "Serve scrivere ELIMINA e la password giusta");

  const readerUpload = await upload(readerCookie, PNG, "mia.png", "image");
  const readerFile = new URL(readerUpload.json.media.url).pathname;
  const deleted = await call("POST", "/api/account/delete", { cookie: readerCookie, body: { password, confirm: "ELIMINA" } });
  assert(deleted.status === 200, "Account cancellato", deleted.text);
  assert(stripe.getSubscription(subId)?.status === "canceled" && stripe.requests.some((r) => r.method === "DELETE" && r.path === `/v1/subscriptions/${subId}` && r.account === `acct_del_${run}`), "Prima della cancellazione l'abbonamento Stripe viene chiuso sul conto dell'autore");
  assert(!(await prisma.user.findUnique({ where: { email: email("lettore") } })) && (await prisma.newsletterSubscriber.count({ where: { email: email("lettore") } })) === 0, "Spariti account e iscrizioni alle newsletter");
  assert((await call("GET", readerFile)).status === 404, "Spariti anche i file caricati");
  assert((await call("POST", "/api/auth/login", { body: { email: email("lettore"), password } })).status === 401, "Non si può più accedere");
} finally {
  await stripe.close();
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati\n`);
if (failed > 0) process.exit(1);
