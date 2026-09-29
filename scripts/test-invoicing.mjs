// Test end to end delle fatture elettroniche: dati fiscali dell'autore, incassi da Stripe
// (prima rata, rinnovi, una tantum), numerazione, XML FatturaPA valido sullo schema, download e ZIP.
// Stesso ambiente di scripts/run-e2e.sh (Stripe finto su 12111, EMAIL_LOG_DIR).
import { createHmac } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { unzipSync, strFromU8 } from "fflate";
import { PrismaClient } from "@prisma/client";
import { startStripeMock } from "./lib/stripe-mock.mjs";
import { confirmEmail } from "./lib/test-auth.mjs";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_zs_test";
const XSD = path.resolve("scripts/fixtures/fatturapa/Schema_FPR12.xsd");
const run = Math.random().toString(36).slice(2, 8);
const prisma = new PrismaClient();
const stripe = await startStripeMock(Number(process.env.STRIPE_MOCK_PORT || 12111));
const work = await mkdtemp(path.join(os.tmpdir(), "zs-fatture-"));

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

async function call(method, urlPath, { body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${urlPath}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString("utf8");
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json, buf };
}

async function register(label) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Test ${label}`, email: `${label}-${run}@example.it`, handle: `${label}-${run}`, password: "password-molto-lunga" })
  });
  if (MAIL_DIR) await confirmEmail(BASE, MAIL_DIR, `${label}-${run}@example.it`);
  return res.headers.get("set-cookie")?.split(";")[0];
}

function webhook(event) {
  const payload = JSON.stringify({ id: `evt_${Math.random().toString(36).slice(2)}`, object: "event", ...event });
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": `t=${t},v1=${v1}`, "content-type": "application/json" }, body: payload });
}

async function xsdErrors(xml) {
  const file = path.join(work, `f-${Math.random().toString(36).slice(2)}.xml`);
  await writeFile(file, xml);
  return promisify(execFile)("xmllint", ["--noout", "--schema", XSD, file]).then(
    () => "",
    (e) => String(e.stderr).slice(0, 400)
  );
}

const now = Math.floor(Date.now() / 1000);
const DAY = 86400;
const invoicePaid = (acct, { id, sub, amount, start = now, end = now + 30 * DAY, paidAt = now }) =>
  webhook({
    type: "invoice.paid",
    account: acct,
    data: {
      object: {
        id,
        object: "invoice",
        subscription: sub,
        amount_paid: amount,
        currency: "eur",
        created: paidAt,
        status_transitions: { paid_at: paidAt },
        lines: { object: "list", data: [{ period: { start, end } }] }
      }
    }
  });

const fiscalProfile = {
  enabled: true,
  kind: "PERSON",
  nome: "Giulia",
  cognome: "Autrice",
  partitaIva: "01234567890",
  codiceFiscale: "TRCGLI80A41H501Z",
  regimeFiscale: "RF19",
  aliquotaIva: 22,
  indirizzo: "Via dei Fori Imperiali",
  numeroCivico: "1",
  cap: "00186",
  comune: "Roma",
  provincia: "rm",
  email: "giulia@example.it"
};

async function setupPublication(cookie, slug, tiers) {
  const pub = await call("POST", "/api/publications", { cookie, body: { name: `Fatture ${slug}`, slug } });
  const publicationId = pub.json?.publication?.id;
  const ids = [];
  for (const t of tiers) {
    const r = await call("POST", "/api/tiers", { cookie, body: { publicationId, name: t.name, description: "Tutti gli articoli", priceEur: t.price, interval: t.interval, benefits: ["Articoli"] } });
    ids.push(r.json?.tier?.id);
  }
  const connect = await call("POST", "/api/stripe/connect", { cookie, body: { publicationId } });
  const acct = connect.json?.url?.split("/").pop();
  stripe.setChargesEnabled(acct, true);
  await webhook({ type: "account.updated", account: acct, data: { object: { id: acct, object: "account", charges_enabled: true } } });
  return { publicationId, tierIds: ids, acct };
}

/** Checkout del lettore; restituisce i metadati che Stripe rimanderebbe nei webhook. */
async function checkout(cookie, tierId, fiscalData) {
  const res = await call("POST", "/api/checkout/stripe", { cookie, body: fiscalData ? { tierId, fiscalData } : { tierId } });
  const session = stripe.requests.filter((r) => r.path === "/v1/checkout/sessions").pop();
  return {
    status: res.status,
    metadata: {
      userId: session.params["metadata[userId]"],
      tierId: session.params["metadata[tierId]"],
      publicationId: session.params["metadata[publicationId]"],
      billingInfoId: session.params["metadata[billingInfoId]"]
    }
  };
}

const billingPrivato = {
  isCompany: false,
  ragioneSocialeOIntestatario: "Mario Rossi",
  codiceFiscale: "RSSMRA85M01H501Z",
  pec: "mario.rossi@pec.it",
  indirizzo: "Via Roma 1",
  cap: "20121",
  citta: "Milano",
  provincia: "MI",
  paese: "IT"
};

try {
  console.log(`\n🧪 Fatture elettroniche end to end su ${BASE} (giro ${run})\n`);
  const year = new Date().getFullYear();

  // ------------------------------------------------------------------ dati fiscali
  const author = await register("autrice");
  const { publicationId, tierIds, acct } = await setupPublication(author, `fatture-${run}`, [
    { name: "Mensile", price: 6.5, interval: "MONTH" },
    { name: "Sostenitore", price: 120, interval: "ONE_TIME" }
  ]);
  const [monthlyTier, oneTimeTier] = tierIds;
  assert(Boolean(publicationId && monthlyTier && oneTimeTier && acct), "Pubblicazione con due livelli e Stripe collegato");

  const stranger = await register("estraneo");
  assert((await call("PUT", `/api/publications/${publicationId}/fiscal-profile`, { cookie: stranger, body: fiscalProfile })).status === 404, "Nessun altro può impostare i dati fiscali dell'autrice");
  const bad = await call("PUT", `/api/publications/${publicationId}/fiscal-profile`, { cookie: author, body: { ...fiscalProfile, partitaIva: "123" } });
  assert(bad.status === 400 && bad.json?.error?.includes("11 cifre"), "Partita IVA sbagliata respinta con un messaggio chiaro");
  const noName = await call("PUT", `/api/publications/${publicationId}/fiscal-profile`, { cookie: author, body: { ...fiscalProfile, nome: "" } });
  assert(noName.status === 400, "Persona fisica senza nome respinta");
  const saved = await call("PUT", `/api/publications/${publicationId}/fiscal-profile`, { cookie: author, body: fiscalProfile });
  const profile = await prisma.fiscalProfile.findUnique({ where: { publicationId } });
  assert(saved.status === 200 && profile?.enabled && profile.provincia === "RM" && profile.regimeFiscale === "RF19", "Dati fiscali salvati (forfettario)");

  // ------------------------------------------------------------------ prima rata e rinnovi
  const reader = await register("lettore");
  const c1 = await checkout(reader, monthlyTier, billingPrivato);
  assert(c1.status === 200 && c1.metadata.billingInfoId, "Checkout con richiesta di fattura");
  const subId = `sub_fatt_${run}`;
  stripe.addSubscription({ id: subId, object: "subscription", status: "active", customer: `cus_${run}`, cancel_at_period_end: false, current_period_end: now + 30 * DAY, metadata: c1.metadata });

  // La rata può arrivare prima del checkout: incasso registrato, fattura quando arrivano i dati fiscali.
  await invoicePaid(acct, { id: `in_1_${run}`, sub: subId, amount: 650 });
  let payments = await prisma.payment.findMany({ where: { publicationId }, include: { invoice: true } });
  assert(payments.length === 1 && payments[0].amountCents === 650 && !payments[0].invoice, "Rata arrivata prima del checkout: incasso registrato, fattura in attesa dei dati");

  await webhook({
    type: "checkout.session.completed",
    account: acct,
    data: { object: { id: `cs_${run}`, object: "checkout.session", mode: "subscription", payment_status: "paid", subscription: subId, customer: `cus_${run}`, metadata: c1.metadata } }
  });
  let invoices = await prisma.invoice.findMany({ where: { publicationId }, orderBy: { number: "asc" } });
  assert(invoices.length === 1 && invoices[0].label === `1/${year}` && invoices[0].buyerName === "Mario Rossi", "Col checkout arriva la fattura n. 1 dell'anno");
  const first = invoices[0]?.xml ?? "";
  assert(first.includes("<Nome>Giulia</Nome><Cognome>Autrice</Cognome>") && first.includes("<RegimeFiscale>RF19</RegimeFiscale>"), "Emessa a nome dell'autrice, in forfettario");
  assert(first.includes("<CodiceFiscale>RSSMRA85M01H501Z</CodiceFiscale>") && first.includes("<CodiceDestinatario>0000000</CodiceDestinatario>") && first.includes("<PECDestinatario>mario.rossi@pec.it</PECDestinatario>"), "Cliente privato: codice fiscale, 0000000 e PEC");
  assert(first.includes("<Natura>N2.2</Natura>") && first.includes("<ImportoTotaleDocumento>6.50</ImportoTotaleDocumento>") && !first.includes("DatiBollo"), "6,50 € senza IVA e senza bollo");
  assert(first.includes("<DataInizioPeriodo>") && first.includes("Abbonamento mensile"), "Descrizione e periodo dell'abbonamento");
  assert((await xsdErrors(first)) === "", "XML valido sullo schema FatturaPA", await xsdErrors(first));
  assert(invoices[0]?.fileName === `IT${fiscalProfile.codiceFiscale}_${invoices[0]?.progressivo}.xml`, "Nome del file secondo le regole dello SdI");

  await invoicePaid(acct, { id: `in_1_${run}`, sub: subId, amount: 650 });
  await webhook({
    type: "checkout.session.completed",
    account: acct,
    data: { object: { id: `cs_${run}`, object: "checkout.session", mode: "subscription", payment_status: "paid", subscription: subId, customer: `cus_${run}`, metadata: c1.metadata } }
  });
  assert((await prisma.invoice.count({ where: { publicationId } })) === 1 && (await prisma.payment.count({ where: { publicationId } })) === 1, "Eventi ripetuti da Stripe: nessun doppione");

  await invoicePaid(acct, { id: `in_2_${run}`, sub: subId, amount: 650, start: now + 30 * DAY, end: now + 60 * DAY, paidAt: now + 60 });
  await Promise.all([
    invoicePaid(acct, { id: `in_3_${run}`, sub: subId, amount: 650, paidAt: now + 120 }),
    invoicePaid(acct, { id: `in_4_${run}`, sub: subId, amount: 650, paidAt: now + 180 })
  ]);
  invoices = await prisma.invoice.findMany({ where: { publicationId }, orderBy: { number: "asc" } });
  assert(invoices.map((i) => i.number).join(",") === "1,2,3,4", "Rinnovi: numerazione progressiva senza buchi né doppioni, anche in parallelo", invoices.map((i) => i.number).join(","));
  assert(new Set(invoices.map((i) => i.progressivo)).size === 4, "Progressivo di invio diverso per ogni fattura");

  await invoicePaid(acct, { id: `in_trial_${run}`, sub: subId, amount: 0 });
  assert((await prisma.payment.count({ where: { stripeObjectId: `in_trial_${run}` } })) === 0, "Le rate a 0 € (prova gratuita) non si registrano");

  // ------------------------------------------------------------------ una tantum sopra 77,47 €
  const reader2 = await register("sostenitrice");
  const azienda = { isCompany: true, ragioneSocialeOIntestatario: "Bianchi & Co. S.r.l.", codiceFiscale: "09876543210", partitaIva: "09876543210", codiceDestinatarioSDI: "m5uxcr1", indirizzo: "Corso Italia 5", cap: "00198", citta: "Roma", provincia: "RM", paese: "IT" };
  const c2 = await checkout(reader2, oneTimeTier, azienda);
  await webhook({
    type: "checkout.session.completed",
    account: acct,
    data: { object: { id: `cs_once_${run}`, object: "checkout.session", mode: "payment", payment_status: "paid", amount_total: 12000, currency: "eur", created: now, customer: `cus2_${run}`, metadata: c2.metadata } }
  });
  const once = await prisma.invoice.findFirst({ where: { publicationId, buyerName: { contains: "Bianchi" } } });
  assert(once?.number === 5 && once.xml.includes("<IdCodice>09876543210</IdCodice>") && once.xml.includes("<CodiceDestinatario>M5UXCR1</CodiceDestinatario>"), "Una tantum a un'azienda: partita IVA e codice destinatario");
  assert(once?.xml.includes("<BolloVirtuale>SI</BolloVirtuale>") && once.xml.includes("Accesso alla pubblicazione digitale"), "Sopra 77,47 € in forfettario c'è il bollo virtuale");
  assert((await xsdErrors(once?.xml ?? "")) === "", "Anche questa valida sullo schema", await xsdErrors(once?.xml ?? ""));

  // ------------------------------------------------------------------ senza richiesta di fattura
  const reader3 = await register("senzafattura");
  const c3 = await checkout(reader3, monthlyTier, null);
  const sub3 = `sub_nofatt_${run}`;
  stripe.addSubscription({ id: sub3, object: "subscription", status: "active", customer: `cus3_${run}`, cancel_at_period_end: false, current_period_end: now + 30 * DAY, metadata: c3.metadata });
  await webhook({ type: "checkout.session.completed", account: acct, data: { object: { id: `cs3_${run}`, object: "checkout.session", mode: "subscription", payment_status: "paid", subscription: sub3, customer: `cus3_${run}`, metadata: c3.metadata } } });
  await invoicePaid(acct, { id: `in_nofatt_${run}`, sub: sub3, amount: 650 });
  const noInvoice = await prisma.payment.findUnique({ where: { stripeObjectId: `in_nofatt_${run}` }, include: { invoice: true } });
  assert(noInvoice && !noInvoice.invoice, "Chi non chiede la fattura: incasso registrato, nessuna fattura");

  // ------------------------------------------------------------------ regime ordinario
  await call("PUT", `/api/publications/${publicationId}/fiscal-profile`, { cookie: author, body: { ...fiscalProfile, regimeFiscale: "RF01", aliquotaIva: 22 } });
  await invoicePaid(acct, { id: `in_5_${run}`, sub: subId, amount: 650, paidAt: now + 240 });
  const ordinaria = await prisma.invoice.findFirst({ where: { publicationId, number: 6 } });
  assert(ordinaria?.xml.includes("<AliquotaIVA>22.00</AliquotaIVA>") && ordinaria.xml.includes("<ImponibileImporto>5.33</ImponibileImporto>") && ordinaria.xml.includes("<Imposta>1.17</Imposta>") && ordinaria.taxCents === 117, "Passata all'ordinario: IVA 22% scorporata");
  assert((await xsdErrors(ordinaria?.xml ?? "")) === "", "Fattura con IVA valida sullo schema", await xsdErrors(ordinaria?.xml ?? ""));

  // ------------------------------------------------------------------ download e ZIP
  const inv1 = invoices[0];
  const dl = await call("GET", `/api/invoices/${inv1.id}`, { cookie: author });
  assert(dl.status === 200 && dl.headers.get("content-type")?.includes("xml") && dl.headers.get("content-disposition")?.includes(inv1.fileName) && dl.text === inv1.xml, "L'autrice scarica l'XML con il nome giusto");
  assert((await call("GET", `/api/invoices/${inv1.id}`, { cookie: reader })).status === 404 && (await call("GET", `/api/invoices/${inv1.id}`, { cookie: stranger })).status === 404, "Nessun altro scarica le fatture");

  const month = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date()).slice(0, 7);
  const zipRes = await call("GET", `/api/publications/${publicationId}/invoices?mese=${month}`, { cookie: author });
  const entries = zipRes.status === 200 ? unzipSync(new Uint8Array(zipRes.buf)) : {};
  assert(zipRes.status === 200 && Object.keys(entries).length === 6 && strFromU8(entries[inv1.fileName]) === inv1.xml, "ZIP del mese con tutte le fatture", `${zipRes.status} ${Object.keys(entries).length}`);

  await call("POST", `/api/invoices/${inv1.id}`, { cookie: author, body: { action: "mark-sent" } });
  const onlyReady = await call("GET", `/api/publications/${publicationId}/invoices?mese=${month}&stato=READY`, { cookie: author });
  assert(Object.keys(unzipSync(new Uint8Array(onlyReady.buf))).length === 5 && (await prisma.invoice.findUnique({ where: { id: inv1.id } }))?.status === "SENT", "Segnate come trasmesse, escono dallo ZIP delle fatture da inviare");
  assert((await call("GET", `/api/publications/${publicationId}/invoices?mese=2001-01`, { cookie: author })).status === 404, "Mese senza fatture: 404");

  const studio = await call("GET", "/studio/invoices", { cookie: author });
  assert(studio.status === 200 && studio.text.includes("Fatture elettroniche") && studio.text.includes(`1/${year}`) && studio.text.includes("Trasmessa"), "Pagina Fatture nello Studio con elenco e stato");

  // ------------------------------------------------------------------ attivazione dopo gli incassi
  // Stesso IP per tutto il test: si riusano account già registrati (il limite di registrazioni è per IP).
  const author2 = stranger;
  const p2 = await setupPublication(author2, `tardi-${run}`, [{ name: "Mensile", price: 5, interval: "MONTH" }]);
  const reader4 = reader3;
  const c4 = await checkout(reader4, p2.tierIds[0], billingPrivato);
  const sub4 = `sub_tardi_${run}`;
  stripe.addSubscription({ id: sub4, object: "subscription", status: "active", customer: `cus4_${run}`, cancel_at_period_end: false, current_period_end: now + 30 * DAY, metadata: c4.metadata });
  await webhook({ type: "checkout.session.completed", account: p2.acct, data: { object: { id: `cs4_${run}`, object: "checkout.session", mode: "subscription", payment_status: "paid", subscription: sub4, customer: `cus4_${run}`, metadata: c4.metadata } } });
  await invoicePaid(p2.acct, { id: `in_tardi_${run}`, sub: sub4, amount: 500 });
  assert((await prisma.invoice.count({ where: { publicationId: p2.publicationId } })) === 0, "Senza dati fiscali attivi non si emette nulla");
  const late = await call("PUT", `/api/publications/${p2.publicationId}/fiscal-profile`, { cookie: author2, body: { ...fiscalProfile, kind: "COMPANY", denominazione: "Ritardi S.r.l.", nome: "", cognome: "", codiceFiscale: "01234567890" } });
  assert(late.json?.caughtUp === 1 && (await prisma.invoice.count({ where: { publicationId: p2.publicationId } })) === 1, "Attivando la fatturazione si recuperano gli incassi degli ultimi giorni");

  // ------------------------------------------------------------------ dati personali
  const exported = await call("GET", "/api/account/export", { cookie: author });
  assert(exported.json?.publications?.[0]?.invoices?.length === 6, "L'esportazione dei dati dell'autrice contiene le fatture");
  const readerExport = await call("GET", "/api/account/export", { cookie: reader });
  assert(readerExport.json?.payments?.length === 5, "Il lettore trova i suoi pagamenti nell'esportazione");
  const del = await call("POST", "/api/account/delete", { cookie: reader, body: { password: "password-molto-lunga", confirm: "ELIMINA" } });
  const kept = await prisma.invoice.count({ where: { publicationId } });
  const anon = await prisma.payment.count({ where: { publicationId, userId: null } });
  assert(del.status === 200 && kept === 6 && anon >= 5, "Il lettore cancella l'account: le fatture restano all'autrice, i pagamenti senza legame con lui", `${del.status} ${del.text.slice(0, 120)}`);
} catch (err) {
  failed++;
  console.error("  ❌ Errore inatteso:", err);
} finally {
  await stripe.close?.();
  await prisma.$disconnect();
  await rm(work, { recursive: true, force: true });
}

console.log(`\n📊 ${passed}/${passed + failed} superati\n`);
process.exit(failed === 0 ? 0 : 1);
