// Mance (T7), end to end con lo Stripe finto (porta 12111) e i webhook firmati come quelli veri.
// Stesso ambiente di scripts/run-e2e.sh.
import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { startStripeMock } from "./lib/stripe-mock.mjs";
import { confirmEmail } from "./lib/test-auth.mjs";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_zs_test";
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

async function call(method, p, { body, cookie } = {}) {
  const h = {};
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${BASE}${p}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

const email = (label) => `${label}-${run}@example.it`;
async function register(label) {
  const res = await call("POST", "/api/auth/register", { body: { name: `Mance ${label}`, email: email(label), handle: `${label}-${run}`, password: `password-${run}-lunga` } });
  await confirmEmail(BASE, MAIL_DIR, email(label));
  return res.cookie;
}

function webhook(event) {
  const payload = JSON.stringify({ id: `evt_${Math.random().toString(36).slice(2)}`, object: "event", ...event });
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": `t=${t},v1=${v1}`, "content-type": "application/json" }, body: payload });
}
const sessionDone = (acct, id, metadata, amount, extra = {}) =>
  webhook({
    type: "checkout.session.completed",
    account: acct,
    data: { object: { id, object: "checkout.session", mode: "payment", payment_status: "paid", amount_total: amount, currency: "eur", created: Math.floor(Date.now() / 1000), metadata, ...extra } }
  });

console.log(`\n🧪 Mance su ${BASE} (giro ${run})\n`);
try {
  const author = await register("autrice");
  const reader = await register("lettore");
  const slug = `mance-${run}`;
  const pub = (await call("POST", "/api/publications", { cookie: author, body: { name: `Mance ${run}`, slug } })).json?.publication;
  const tip = (body, cookie = reader) => call("POST", "/api/tips/checkout", { cookie, body: { publicationId: pub.id, ...body } });

  // --- Senza Stripe collegato
  assert((await tip({ amountCents: 500 }, null)).status === 401, "Senza accesso: 401");
  assert((await tip({ amountCents: 500 })).status === 409, "Pubblicazione senza Stripe: 409");
  assert(!(await call("GET", `/p/${slug}`)).text.includes("Lascia una mancia"), "Senza Stripe niente pulsante Mancia");
  assert((await call("GET", `/mancia/${slug}`, { cookie: reader })).text.includes("non accetta ancora pagamenti"), "La pagina della mancia lo dice");

  const acct = `acct_mance_${run}`;
  await prisma.publication.update({ where: { id: pub.id }, data: { stripeAccountId: acct, stripeChargesEnabled: true } });

  // --- Importi e messaggio
  assert((await tip({ amountCents: 99 })).status === 400, "Sotto 1 €: 400");
  assert((await tip({ amountCents: 50001 })).status === 400, "Sopra 500 €: 400");
  assert((await tip({ amountCents: 250.5 })).status === 400, "Centesimi non interi: 400");
  assert((await tip({ amountCents: 500, message: "x".repeat(281) })).status === 400, "Messaggio oltre 280 caratteri: 400");
  assert((await call("POST", "/api/tips/checkout", { cookie: reader, body: { publicationId: "non-esiste", amountCents: 500 } })).status === 404, "Pubblicazione inesistente: 404");

  // --- Checkout
  stripe.requests.length = 0;
  const ok = await tip({ amountCents: 1000, message: "Grazie per il pezzo di ieri" });
  assert(ok.status === 200 && ok.json?.url?.startsWith("https://checkout.stripe.test/"), "Checkout creato", ok.text);
  const req = stripe.requests.find((r) => r.path === "/v1/checkout/sessions");
  assert(req?.account === acct, "Sul conto Stripe dell'autore");
  assert(req?.params.mode === "payment" && req.params["line_items[0][price_data][unit_amount]"] === "1000" && req.params["line_items[0][price_data][currency]"] === "eur", "Pagamento una tantum da 10 €");
  assert(req?.params["payment_intent_data[application_fee_amount]"] === "80", "Commissione 8%: 80 centesimi", JSON.stringify(req?.params));
  assert(req?.params["metadata[kind]"] === "tip" && req.params["metadata[message]"] === "Grazie per il pezzo di ieri", "Tipo e messaggio nei metadati");
  assert((req?.params.success_url ?? "").endsWith(`/mancia/${slug}?esito=ok`), "Ritorno alla pagina della mancia");
  assert((await call("GET", `/p/${slug}`)).text.includes("Lascia una mancia"), "Con Stripe attivo compare il pulsante Mancia");

  // --- Webhook
  const reader2 = await prisma.user.findUnique({ where: { email: email("lettore") } });
  const meta = { kind: "tip", userId: reader2.id, publicationId: pub.id, message: "Grazie per il pezzo di ieri" };
  assert((await sessionDone(acct, `cs_tip_${run}`, meta, 1000, { payment_status: "unpaid" })).status === 200, "Pagamento SEPA non ancora arrivato: ricevuto");
  assert((await prisma.payment.count({ where: { publicationId: pub.id } })) === 0, "e niente incasso finché non è pagato");
  await sessionDone(acct, `cs_tip_${run}`, meta, 1000);
  await sessionDone(acct, `cs_tip_${run}`, meta, 1000);
  const payments = await prisma.payment.findMany({ where: { publicationId: pub.id } });
  assert(payments.length === 1 && payments[0].kind === "TIP" && payments[0].amountCents === 1000 && payments[0].message === "Grazie per il pezzo di ieri", "Incasso registrato una volta sola, come mancia, con il messaggio");
  assert((await prisma.subscription.count({ where: { publicationId: pub.id } })) === 0, "La mancia non crea abbonamenti né accessi");
  assert((await prisma.invoice.count({ where: { publicationId: pub.id } })) === 0, "e non genera fatture");
  await sessionDone("acct_di_un_altro", `cs_tip_falso_${run}`, meta, 99999);
  assert((await prisma.payment.count({ where: { publicationId: pub.id } })) === 1, "Un evento da un altro conto Stripe non conta");

  // --- Studio
  const studio = await call("GET", "/studio/monetization", { cookie: author });
  assert(studio.text.includes("Mance ricevute") && studio.text.includes("Grazie per il pezzo di ieri") && studio.text.includes("10,00"), "L'autrice vede la mancia e il messaggio nello Studio");
  const thanks = await call("GET", `/mancia/${slug}?esito=ok`, { cookie: reader });
  assert(thanks.text.includes("Grazie"), "Pagina di ringraziamento al ritorno da Stripe");
} finally {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@example.it` } } }).catch(() => undefined);
  await prisma.$disconnect();
  await stripe.close();
}

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
