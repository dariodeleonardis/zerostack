// Accesso con Google, end to end contro un Google finto (scripts/lib/google-mock.mjs).
// Stesso ambiente di scripts/run-e2e.sh: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_OAUTH_BASE
// devono essere quelli con cui è partito il server.
import { PrismaClient } from "@prisma/client";
import { startGoogleMock } from "./lib/google-mock.mjs";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const run = Math.random().toString(36).slice(2, 8);
const prisma = new PrismaClient();
const google = await startGoogleMock(Number(new URL(process.env.GOOGLE_OAUTH_BASE || "http://127.0.0.1:12113").port), {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

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

const cookieValue = (res, name) => (res.headers.getSetCookie?.() ?? []).find((c) => c.startsWith(`${name}=`))?.split(";")[0];
const get = (path, cookie) => fetch(`${BASE}${path}`, { redirect: "manual", headers: cookie ? { cookie } : {} });

/** Avvio: restituisce il cookie di stato e i parametri mandati a Google. */
async function start(next) {
  const res = await get(`/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const location = new URL(res.headers.get("location") ?? "http://x/");
  return { res, location, params: location.searchParams, oauth: cookieValue(res, "zs_oauth") };
}

/** Giro completo con il profilo dato; restituisce la risposta del ritorno e il cookie di sessione. */
async function loginAs(profile, next) {
  const s = await start(next);
  const code = google.issueCode(s.params.get("code_challenge"), profile);
  const res = await get(`/api/auth/google/callback?code=${code}&state=${s.params.get("state")}`, s.oauth);
  return { res, location: res.headers.get("location") ?? "", session: cookieValue(res, "zs_session") };
}

const profile = (label, extra = {}) => ({ sub: `google-${label}-${run}`, email: `${label}-${run}@gmail.com`, email_verified: true, name: `Prova ${label}`, ...extra });

console.log(`\n🧪 Accesso con Google su ${BASE} (giro ${run})\n`);
try {
  // --- Avvio
  const s = await start("/studio/appearance");
  assert(s.res.status === 307 && s.location.origin === new URL(process.env.GOOGLE_OAUTH_BASE).origin, "L'avvio manda da Google", `(${s.res.status} ${s.location})`);
  assert(
    s.params.get("client_id") === process.env.GOOGLE_CLIENT_ID && s.params.get("redirect_uri") === `${BASE}/api/auth/google/callback` && s.params.get("scope") === "openid email profile",
    "Chiave, indirizzo di ritorno e permessi minimi (solo nome ed email)"
  );
  assert(s.params.get("code_challenge_method") === "S256" && (s.params.get("state") ?? "").length >= 30 && Boolean(s.oauth), "PKCE e stato casuale in un cookie HttpOnly");
  const outside = await start("https://altro-sito.example/");
  const outsideNext = outside.oauth ? JSON.parse(Buffer.from(outside.oauth.slice("zs_oauth=".length), "base64url").toString()).next : null;
  assert(outsideNext === "", "Una destinazione esterna dopo l'accesso viene scartata", String(outsideNext));

  // --- Nuovo utente
  const nuovo = profile("nuova");
  const first = await loginAs(nuovo, "/studio/appearance");
  assert(first.res.status === 307 && first.location === `${BASE}/studio/appearance` && Boolean(first.session), "Ritorno da Google: sessione aperta e destinazione rispettata", `(${first.res.status} ${first.location})`);
  const me = await (await get("/api/auth/me", first.session)).json();
  const created = await prisma.user.findUnique({ where: { email: nuovo.email } });
  assert(me.user?.handle === created?.handle && created?.googleId === nuovo.sub && created?.emailVerified, "Account creato, collegato a Google, email già confermata");
  assert(/^nuova-[a-z0-9]+$/.test(created?.handle ?? ""), "Nome utente ricavato dall'email", created?.handle);
  const again = await loginAs(nuovo);
  assert(again.location === `${BASE}/studio` && (await prisma.user.count({ where: { email: nuovo.email } })) === 1, "Secondo accesso: stesso account, nessun doppione");
  const fresh = await loginAs(profile("altra"));
  assert(fresh.location === `${BASE}/studio/publications/new`, "Chi arriva per la prima volta va a creare la pubblicazione");

  // --- Account già esistente con la stessa email (registrato con password)
  const existingEmail = `esistente-${run}@gmail.com`;
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Esistente", email: existingEmail, handle: `esistente-${run}`, password: `password-${run}-lunga` })
  });
  const linked = await loginAs(profile("esistente", { email: existingEmail, sub: `google-link-${run}` }));
  const linkedUser = await prisma.user.findUnique({ where: { email: existingEmail } });
  assert(reg.status === 201 && Boolean(linked.session) && linkedUser?.googleId === `google-link-${run}` && linkedUser?.emailVerified, "Stessa email: l'account esistente viene collegato, non duplicato");
  const pwLogin = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: existingEmail, password: `password-${run}-lunga` }) });
  assert(pwLogin.status === 200, "Dopo il collegamento la password continua a funzionare");

  // --- Rifiuti
  const unverified = await loginAs(profile("nonverificata", { email_verified: false }));
  assert(unverified.location.endsWith("/login?errore=google-email-non-verificata") && !unverified.session && !(await prisma.user.findFirst({ where: { email: `nonverificata-${run}@gmail.com` } })), "Email non verificata da Google: nessun account, nessuna sessione");

  const s2 = await start();
  const code2 = google.issueCode(s2.params.get("code_challenge"), profile("stato"));
  const wrongState = await get(`/api/auth/google/callback?code=${code2}&state=sbagliato`, s2.oauth);
  const noCookie = await get(`/api/auth/google/callback?code=${code2}&state=${s2.params.get("state")}`);
  assert(
    (wrongState.headers.get("location") ?? "").endsWith("errore=google-scaduto") && (noCookie.headers.get("location") ?? "").endsWith("errore=google-scaduto") && !cookieValue(wrongState, "zs_session"),
    "Stato sbagliato o cookie assente: rifiutato (protezione dalla falsificazione)"
  );
  const s3 = await start();
  const reused = await get(`/api/auth/google/callback?code=${code2}&state=${s3.params.get("state")}`, s3.oauth);
  assert((reused.headers.get("location") ?? "").endsWith("errore=google-errore") && !cookieValue(reused, "zs_session"), "Codice di un altro avvio (PKCE diverso): Google lo rifiuta, nessuna sessione");
  const cancelled = await get(`/api/auth/google/callback?error=access_denied&state=x`, s3.oauth);
  assert((cancelled.headers.get("location") ?? "").endsWith("errore=google-annullato"), "Annullato su Google: si torna all'accesso con un messaggio");

  await prisma.user.update({ where: { email: nuovo.email }, data: { suspendedAt: new Date() } });
  const suspended = await loginAs(nuovo);
  assert(suspended.location.endsWith("errore=sospeso") && !suspended.session, "Account sospeso: niente accesso nemmeno con Google");

  // --- Pagine
  const loginPage = await (await get("/login?errore=sospeso")).text();
  assert(loginPage.includes("Continua con Google") && loginPage.includes("Questo account è sospeso"), "La pagina di accesso mostra il pulsante e il motivo del rifiuto");
  assert((await (await get("/register")).text()).includes("Registrati con Google"), "Anche la registrazione ha il pulsante");
  const secretLeak = google.requests.some((r) => r.path === "/v1/userinfo" && !r.auth?.startsWith("Bearer tok_"));
  assert(!secretLeak, "Il profilo si legge solo con il token appena ottenuto");
} finally {
  await prisma.user.deleteMany({ where: { email: { contains: `-${run}@gmail.com` } } }).catch(() => undefined);
  await google.close();
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
