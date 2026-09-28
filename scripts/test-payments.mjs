// Test end to end dei pagamenti: Stripe Connect, livelli, checkout, webhook, paywall, disdetta.
// Usa un server Stripe finto (scripts/lib/stripe-mock.mjs). Il server web va avviato con:
//   STRIPE_SECRET_KEY=sk_test_zs STRIPE_API_BASE=http://127.0.0.1:12111 STRIPE_WEBHOOK_SECRET=whsec_zs_test
//   EMAIL_PROVIDER=log EMAIL_LOG_DIR=/tmp/zs-mail APP_URL=http://localhost:3000
// e il test con: ZS_BASE_URL=http://localhost:3000 EMAIL_LOG_DIR=/tmp/zs-mail DATABASE_URL=... node scripts/test-payments.mjs
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { startStripeMock } from "./lib/stripe-mock.mjs";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_zs_test";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

async function call(method, urlPath, { body, cookie, headers = {} } = {}) {
  const h = { ...headers };
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${BASE}${urlPath}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json };
}

async function register(label) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Test ${label}`, email: `${label}-${run}@example.it`, handle: `${label}-${run}`, password: "password-molto-lunga" })
  });
  return res.headers.get("set-cookie")?.split(";")[0];
}

function webhook(event, { secret = WEBHOOK_SECRET } = {}) {
  const payload = JSON.stringify({ id: `evt_${Math.random().toString(36).slice(2)}`, object: "event", ...event });
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": `t=${t},v1=${v1}`, "content-type": "application/json" }, body: payload });
}

async function mailsTo(address) {
  if (!MAIL_DIR) return [];
  const files = await readdir(MAIL_DIR).catch(() => []);
  const out = [];
  for (const f of files) {
    const m = JSON.parse(await readFile(path.join(MAIL_DIR, f), "utf8"));
    if (m.to === address) out.push(m);
  }
  return out;
}

try {
  console.log(`\n🧪 Pagamenti end to end su ${BASE} (giro ${run})\n`);
  if (MAIL_DIR) await rm(MAIL_DIR, { recursive: true, force: true });

  // --- Autore, pubblicazione, livello
  const author = await register("autore");
  const pub = await call("POST", "/api/publications", { cookie: author, body: { name: `Cassa ${run}`, slug: `cassa-${run}` } });
  const publicationId = pub.json?.publication?.id;
  assert(pub.status === 201, "Pubblicazione creata", pub.text);

  const badTier = await call("POST", "/api/tiers", { cookie: author, body: { publicationId, name: "Zero", description: "Gratis?", priceEur: 0, interval: "MONTH", benefits: ["x"] } });
  assert(badTier.status === 400, "Livello a 0€ respinto", String(badTier.status));
  const tierRes = await call("POST", "/api/tiers", {
    cookie: author,
    body: { publicationId, name: "Sostenitore", description: "Tutti gli articoli", priceEur: 6.5, interval: "MONTH", benefits: ["Articoli completi", "Fattura"] }
  });
  assert(tierRes.status === 201 && tierRes.json?.tier?.priceCents === 650, "Livello da 6,50€ al mese creato", tierRes.text);
  const tierId = tierRes.json?.tier?.id;

  const stranger = await register("estraneo");
  const strangerTier = await call("POST", "/api/tiers", { cookie: stranger, body: { publicationId, name: "Mio", description: "Non mio", priceEur: 5, interval: "MONTH", benefits: ["x"] } });
  assert(strangerTier.status === 404, "Chi non possiede la pubblicazione non crea livelli", String(strangerTier.status));
  const strangerConnect = await call("POST", "/api/stripe/connect", { cookie: stranger, body: { publicationId } });
  assert(strangerConnect.status === 404, "Né collega Stripe al posto dell'autore", String(strangerConnect.status));

  const closedPage = await call("GET", `/checkout/${tierId}`);
  assert(closedPage.status === 200 && closedPage.text.includes("non accetta ancora pagamenti"), "Senza Stripe collegato il checkout resta chiuso");

  // --- Stripe Connect
  const connect = await call("POST", "/api/stripe/connect", { cookie: author, body: { publicationId } });
  assert(connect.status === 200 && connect.json?.url?.startsWith("https://connect.stripe.test/onboarding/"), "Collega Stripe apre la procedura di Stripe", connect.text);
  const accountCreate = stripe.requests.find((r) => r.path === "/v1/accounts" && r.params["metadata[publicationId]"] === publicationId);
  assert(accountCreate?.params.type === "express" && accountCreate?.params.country === "IT", "Conto Express italiano creato per la pubblicazione");
  const acct = connect.json?.url?.split("/").pop();
  await call("POST", "/api/stripe/connect", { cookie: author, body: { publicationId } });
  assert(stripe.requests.filter((r) => r.path === "/v1/accounts" && r.params["metadata[publicationId]"] === publicationId).length === 1, "Un secondo clic non crea un secondo conto");

  // Ritorno da Stripe: la pagina rilegge lo stato del conto
  stripe.setChargesEnabled(acct, true);
  await call("GET", `/studio/monetization?pub=${publicationId}&stripe=return`, { cookie: author });
  let enabled = (await prisma.publication.findUnique({ where: { id: publicationId } }))?.stripeChargesEnabled;
  assert(enabled === true, "Al ritorno da Stripe i pagamenti risultano attivi");

  // account.updated disattiva e riattiva
  await webhook({ type: "account.updated", account: acct, data: { object: { id: acct, object: "account", charges_enabled: false } } });
  enabled = (await prisma.publication.findUnique({ where: { id: publicationId } }))?.stripeChargesEnabled;
  assert(enabled === false, "Il webhook account.updated chiude i pagamenti se Stripe li sospende");
  await webhook({ type: "account.updated", account: acct, data: { object: { id: acct, object: "account", charges_enabled: true } } });

  const forged = await webhook({ type: "account.updated", data: { object: { id: acct, charges_enabled: false } } }, { secret: "whsec_sbagliato" });
  assert(forged.status === 400, "Webhook con firma sbagliata respinto", String(forged.status));

  // --- Post a pagamento
  const secret = `RISERVATO-${run}`;
  const post = await call("POST", "/api/posts", {
    cookie: author,
    body: { publicationId, title: `Esclusiva ${run}`, contentHtml: `<p>Inizio ${run}</p><hr class="paywall-divider" data-paywall="true"><p>${secret}</p>`, access: "PAID_SUBSCRIBERS", action: "publish", sendEmail: false }
  });
  const postPath = `/p/cassa-${run}/${post.json?.post?.slug}`;

  // --- Checkout del lettore
  const reader = await register("lettore");
  const readerEmail = `lettore-${run}@example.it`;
  const openPage = await call("GET", `/checkout/${tierId}`, { cookie: reader });
  assert(openPage.text.includes("Abbonati a") && !openPage.text.includes("Numero Carta"), "Checkout aperto, senza campi carta sulla pagina");
  const anonCheckout = await call("POST", "/api/checkout/stripe", { body: { tierId } });
  assert(anonCheckout.status === 401, "Senza account non si paga", String(anonCheckout.status));
  const badFiscal = await call("POST", "/api/checkout/stripe", { cookie: reader, body: { tierId, fiscalData: { codiceFiscale: "SBAGLIATO" } } });
  assert(badFiscal.status === 400, "Dati fiscali non validi respinti", String(badFiscal.status));

  const fiscalData = {
    isCompany: false,
    ragioneSocialeOIntestatario: "Mario Rossi",
    codiceFiscale: "RSSMRA85M01H501Z",
    codiceDestinatarioSDI: "M5UXCR1",
    indirizzo: "Via Roma 1",
    cap: "00100",
    citta: "Roma",
    provincia: "RM",
    paese: "IT"
  };
  const checkout = await call("POST", "/api/checkout/stripe", { cookie: reader, body: { tierId, fiscalData } });
  assert(checkout.status === 200 && checkout.json?.url?.startsWith("https://checkout.stripe.test/"), "Il checkout manda a Stripe", checkout.text);
  const price = stripe.requests.find((r) => r.path === "/v1/prices" && r.params["metadata[tierId]"] === tierId);
  assert(price?.account === acct && price?.params.unit_amount === "650" && price?.params["recurring[interval]"] === "month", "Prezzo creato sul conto dell'autore (650 centesimi, mensile)");
  const session = stripe.requests.filter((r) => r.path === "/v1/checkout/sessions").pop();
  assert(session?.account === acct && session?.params.mode === "subscription" && session?.params.customer_email === readerEmail, "Sessione di checkout sul conto dell'autore, con l'email del lettore");
  assert(session?.params["subscription_data[metadata][tierId]"] === tierId && !("application_fee_percent" in (session?.params ?? {})), "Metadati sull'abbonamento e nessuna commissione della piattaforma");

  const before = await call("GET", postPath, { cookie: reader });
  assert(before.text.includes(`Inizio ${run}`) && !before.text.includes(secret), "Prima del webhook il lettore vede solo l'anteprima");

  // --- Webhook: pagamento completato
  const subId = `sub_${run}`;
  stripe.addSubscription({ id: subId, object: "subscription", status: "active", customer: `cus_${run}`, cancel_at_period_end: false, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, metadata: {} });
  const metadata = {
    userId: session.params["metadata[userId]"],
    tierId: session.params["metadata[tierId]"],
    publicationId: session.params["metadata[publicationId]"],
    billingInfoId: session.params["metadata[billingInfoId]"]
  };
  const completed = await webhook({
    type: "checkout.session.completed",
    account: acct,
    data: { object: { id: "cs_test", object: "checkout.session", mode: "subscription", payment_status: "paid", subscription: subId, customer: `cus_${run}`, metadata } }
  });
  assert(completed.status === 200, "Webhook checkout.session.completed accettato", String(completed.status));
  const again = await webhook({
    type: "checkout.session.completed",
    account: acct,
    data: { object: { id: "cs_test", object: "checkout.session", mode: "subscription", payment_status: "paid", subscription: subId, customer: `cus_${run}`, metadata } }
  });
  const rows = await prisma.subscription.findMany({ where: { stripeSubscriptionId: subId } });
  assert(again.status === 200 && rows.length === 1, "Lo stesso evento ripetuto da Stripe non duplica l'abbonamento");
  const billing = await prisma.italianBillingInfo.findFirst({ where: { subscriptionId: rows[0]?.id } });
  assert(billing?.codiceFiscale === "RSSMRA85M01H501Z" && billing?.sdi === "M5UXCR1", "Dati per la fattura collegati all'abbonamento");

  const after = await call("GET", postPath, { cookie: reader });
  assert(after.text.includes(secret), "Dopo il pagamento l'articolo è completo");
  const account = await call("GET", "/account/subscriptions", { cookie: reader });
  assert(account.text.includes(`Cassa ${run}`) && account.text.includes("Si rinnova il"), "L'abbonamento compare in I miei abbonamenti");
  const twice = await call("POST", "/api/checkout/stripe", { cookie: reader, body: { tierId } });
  assert(twice.status === 409, "Un secondo abbonamento alla stessa pubblicazione non parte", String(twice.status));

  // --- Chi paga riceve la newsletter completa
  if (MAIL_DIR) {
    const letter = await call("POST", "/api/posts", {
      cookie: author,
      body: { publicationId, title: `Lettera ${run}`, contentHtml: `<p>Per tutti</p><hr class="paywall-divider" data-paywall="true"><p>SOLO-ABBONATI-${run}</p>`, access: "PAID_SUBSCRIBERS", action: "publish", sendEmail: true }
    });
    execFileSync(path.join(ROOT, "node_modules/.bin/tsx"), [path.join(ROOT, "apps/worker/src/index.ts"), "--once"], { env: { ...process.env, EMAIL_PROVIDER: "log", EMAIL_RATE_PER_SECOND: "0" }, stdio: "pipe" });
    const mail = (await mailsTo(readerEmail)).find((m) => m.subject === `Lettera ${run}`);
    assert(letter.status === 201 && mail?.html.includes(`SOLO-ABBONATI-${run}`), "L'abbonato è iscritto alla newsletter e la riceve completa");
  }

  // --- Evento da un altro conto: ignorato
  await webhook({ type: "customer.subscription.deleted", account: "acct_altro", data: { object: { ...stripe.getSubscription(subId), status: "canceled" } } });
  const stillThere = await call("GET", postPath, { cookie: reader });
  assert(stillThere.text.includes(secret), "Un evento di un altro conto Stripe non tocca l'abbonamento");

  // --- Disdetta e ripensamento
  const localSub = rows[0].id;
  const intruder = await call("POST", `/api/subscriptions/${localSub}`, { cookie: stranger, body: { action: "cancel" } });
  assert(intruder.status === 404, "Nessuno può disdire l'abbonamento di un altro", String(intruder.status));
  const cancel = await call("POST", `/api/subscriptions/${localSub}`, { cookie: reader, body: { action: "cancel" } });
  assert(cancel.status === 200 && stripe.getSubscription(subId).cancel_at_period_end === true, "Disdetta inviata a Stripe (a fine periodo)", cancel.text);
  const cancelled = await call("GET", "/account/subscriptions", { cookie: reader });
  assert(cancelled.text.includes("Disdetto: accesso fino al") && (await call("GET", postPath, { cookie: reader })).text.includes(secret), "Dopo la disdetta si legge fino a fine periodo");
  const resume = await call("POST", `/api/subscriptions/${localSub}`, { cookie: reader, body: { action: "resume" } });
  assert(resume.status === 200 && stripe.getSubscription(subId).cancel_at_period_end === false, "Il rinnovo si riattiva");

  // --- Fine dell'abbonamento
  await webhook({ type: "customer.subscription.deleted", account: acct, data: { object: { ...stripe.getSubscription(subId), status: "canceled" } } });
  const ended = await call("GET", postPath, { cookie: reader });
  assert(!ended.text.includes(secret), "Ad abbonamento terminato torna il paywall");
  const endedAccount = await call("GET", "/account/subscriptions", { cookie: reader });
  assert(endedAccount.text.includes("Terminato"), "E in I miei abbonamenti risulta terminato");

  // --- Pagamento non riuscito
  const subId2 = `sub2_${run}`;
  await webhook({
    type: "customer.subscription.updated",
    account: acct,
    data: { object: { id: subId2, object: "subscription", status: "past_due", customer: `cus_${run}`, cancel_at_period_end: false, current_period_end: Math.floor(Date.now() / 1000) + 86400, metadata } }
  });
  const pastDue = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId2 } });
  assert(pastDue?.status === "PAST_DUE" && !(await call("GET", postPath, { cookie: reader })).text.includes(secret), "Un pagamento non riuscito (past_due) non apre il paywall");
} finally {
  await stripe.close();
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati\n`);
if (failed > 0) process.exit(1);
