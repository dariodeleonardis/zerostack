// Pagina di cortesia: accesa dal pannello admin, i visitatori vedono solo il messaggio, gli amministratori
// tutto; login, pagine legali e API restano raggiungibili. Gira dentro scripts/run-e2e.sh (serve il server
// avviato e il database). Alla fine la pagina resta SPENTA, qualunque cosa succeda.
import http from "node:http";
import { PrismaClient } from "@prisma/client";

const BASE = new URL(process.env.ZS_BASE_URL || "http://localhost:3000");
const ROOT = "zerostack.it";
const run = Math.random().toString(36).slice(2, 8);
const prisma = new PrismaClient();
const MESSAGE = `Prova cortesia ${run}`;
// Il middleware rilegge lo stato al massimo ogni 15 secondi.
const CACHE_WAIT_MS = 16_000;

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

function request(method, path, { body, cookie, host } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(
      {
        hostname: BASE.hostname,
        port: BASE.port || 80,
        method,
        path,
        headers: {
          Host: host || ROOT,
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(cookie ? { Cookie: cookie } : {})
        }
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, text, json, setCookie: res.headers["set-cookie"] ?? [] });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
const cookieOf = (res) => (res.setCookie.find((c) => c.startsWith("zs_session=")) || "").split(";")[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isCourtesy = (res) => res.text.includes("ZeroStack sta arrivando");

async function register(prefix) {
  const res = await request("POST", "/api/auth/register", {
    body: { name: `Cortesia ${prefix}`, email: `${prefix}-${run}@example.it`, handle: `${prefix}-${run}`, password: `password-${run}-lunga` }
  });
  return { res, cookie: cookieOf(res) };
}

console.log(`\n🧪 Pagina di cortesia su ${BASE.href} (giro ${run})\n`);
try {
  const admin = await register("admin");
  const reader = await register("lettore");
  assert(admin.res.status === 201 && reader.res.status === 201, "Due utenti registrati", `(${admin.res.status} ${reader.res.status})`);
  await prisma.user.update({ where: { handle: `admin-${run}` }, data: { role: "ADMIN" } });

  // Spenta: il sito è normale
  await prisma.systemStatus.deleteMany({ where: { key: "pagina-cortesia" } });
  await sleep(CACHE_WAIT_MS);
  assert(!isCourtesy(await request("GET", "/")), "Spenta: la home è quella normale");

  // Solo gli amministratori la cambiano
  const denied = await request("POST", "/api/admin/courtesy", { body: { enabled: true, message: MESSAGE }, cookie: reader.cookie });
  assert(denied.status === 404, "Un utente normale non può accenderla (404)", `(${denied.status})`);
  const anonymous = await request("POST", "/api/admin/courtesy", { body: { enabled: true, message: MESSAGE } });
  assert(anonymous.status === 404, "Senza accesso non si può accenderla (404)", `(${anonymous.status})`);
  const bad = await request("POST", "/api/admin/courtesy", { body: { message: MESSAGE }, cookie: admin.cookie });
  assert(bad.status === 400, "Senza enabled la richiesta è respinta (400)", `(${bad.status})`);

  const on = await request("POST", "/api/admin/courtesy", { body: { enabled: true, message: MESSAGE }, cookie: admin.cookie });
  assert(on.status === 200 && on.json?.enabled === true, "L'amministratore la accende", `(${on.status} ${on.text})`);
  await sleep(CACHE_WAIT_MS);

  // Visitatori
  const home = await request("GET", "/");
  assert(isCourtesy(home) && home.text.includes(MESSAGE), "Accesa: un visitatore vede la pagina di cortesia con il messaggio");
  assert(String(home.headers["x-robots-tag"] || "").includes("noindex"), "La pagina di cortesia non si fa indicizzare", JSON.stringify(home.headers["x-robots-tag"]));
  assert(isCourtesy(await request("GET", "/register")), "Accesa: la registrazione è chiusa ai visitatori");
  assert(isCourtesy(await request("GET", "/studio")), "Accesa: lo Studio è chiuso ai visitatori");
  const late = await register("tardivo");
  assert(late.res.status === 403 && !late.cookie, "Accesa: anche l'API di registrazione è chiusa (403)", `(${late.res.status})`);
  const www = await request("GET", "/login?next=%2Fstudio", { host: `www.${ROOT}` });
  assert(www.status === 308 && www.headers.location === `https://${ROOT}/login?next=%2Fstudio`, "www rimanda al dominio senza www", `(${www.status} ${www.headers.location})`);
  assert(isCourtesy(await request("GET", "/", { host: `qualcosa-${run}.${ROOT}` })), "Accesa: anche i sottodomini mostrano la pagina di cortesia");
  assert(isCourtesy(await request("GET", "/", { cookie: reader.cookie })), "Accesa: un utente non amministratore vede la pagina di cortesia");

  // Quello che deve restare raggiungibile
  const login = await request("GET", "/login");
  assert(login.status === 200 && !isCourtesy(login), "Accesa: la pagina di accesso resta raggiungibile");
  assert(!isCourtesy(await request("GET", "/privacy")), "Accesa: la privacy resta raggiungibile");
  const font = await request("GET", "/fonts/archivo.woff2");
  assert(font.status === 200 && String(font.headers["content-type"]).includes("font/woff2"), "Accesa: i caratteri di /fonts/ arrivano come file, non come pagina", `(${font.status} ${font.headers["content-type"]})`);
  const live = await request("GET", "/api/health/live");
  assert(live.status === 200 && live.json?.status === "ok", "Accesa: le API non si fermano (/api/health/live)", `(${live.status})`);
  const check = await request("GET", `/api/domains/check?domain=${ROOT}`);
  assert(check.status === 200, "Accesa: il controllo dei certificati per Caddy risponde", `(${check.status})`);

  // Amministratore
  const adminHome = await request("GET", "/", { cookie: admin.cookie });
  assert(adminHome.status === 200 && !isCourtesy(adminHome), "Accesa: l'amministratore vede il sito vero");
  const panel = await request("GET", "/admin", { cookie: admin.cookie });
  assert(panel.status === 200 && panel.text.includes("Pagina di cortesia") && panel.text.includes(MESSAGE), "Il pannello mostra lo stato e il messaggio");
  const me = await request("GET", "/api/auth/me", { cookie: admin.cookie });
  assert(me.json?.courtesy === true, "/api/auth/me avvisa l'amministratore che il sito è chiuso", me.text);
  const meReader = await request("GET", "/api/auth/me", { cookie: reader.cookie });
  assert(meReader.json?.courtesy === undefined, "A un utente normale lo stato non viene detto", meReader.text);

  // Spenta di nuovo
  const off = await request("POST", "/api/admin/courtesy", { body: { enabled: false, message: MESSAGE }, cookie: admin.cookie });
  assert(off.status === 200 && off.json?.enabled === false, "L'amministratore la spegne", `(${off.status})`);
  await sleep(CACHE_WAIT_MS);
  assert(!isCourtesy(await request("GET", "/")), "Spenta: un visitatore vede di nuovo il sito");
  assert(!isCourtesy(await request("GET", "/register")), "Spenta: la registrazione è di nuovo aperta");
} finally {
  // Mai lasciare il sito chiuso, nemmeno se un passaggio è fallito.
  await prisma.systemStatus.deleteMany({ where: { key: "pagina-cortesia" } }).catch(() => undefined);
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
