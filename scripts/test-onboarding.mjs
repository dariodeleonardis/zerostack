// Test end to end del percorso "nuovo autore -> newsletter su slug.zerostack.it".
// Serve un'istanza vera con il database (per esempio lo stack docker-compose.coolify.yml):
//   ZS_BASE_URL=http://zerostack-web:3000 node scripts/test-onboarding.mjs
// Crea due utenti e due pubblicazioni con nomi casuali; non cancella niente.
import http from "node:http";

const BASE = new URL(process.env.ZS_BASE_URL || "http://localhost:3000");
const ROOT = process.env.ZS_ROOT_DOMAIN || "zerostack.it";
const run = Math.random().toString(36).slice(2, 8);

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

// node:http e non fetch: serve impostare l'header Host per simulare i sottodomini.
function request(method, path, { body, cookie, host, headers = {} } = {}) {
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
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers
        }
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          const setCookie = res.headers["set-cookie"] ?? [];
          resolve({ status: res.statusCode, text, json, setCookie });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sessionCookie(res) {
  const line = res.setCookie.find((c) => c.startsWith("zs_session="));
  return line ? line.split(";")[0] : null;
}

const slug = `prova-${run}`;
const password = `password-sicura-${run}`;
const email = `autore-${run}@example.it`;

console.log(`\n🧪 Onboarding end to end su ${BASE.href} (giro ${run})\n`);

// 1. Registrazione
const reg = await request("POST", "/api/auth/register", { body: { name: "Autore Prova", email, handle: slug, password } });
assert(reg.status === 201, "Registrazione riuscita", `(${reg.status} ${reg.text})`);
const cookie = sessionCookie(reg);
assert(Boolean(cookie), "La registrazione apre una sessione (cookie zs_session)");
assert(reg.setCookie.some((c) => /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)), "Cookie di sessione HttpOnly e SameSite=Lax");

const dup = await request("POST", "/api/auth/register", { body: { name: "Altro", email, handle: `altro-${run}`, password } });
assert(dup.status === 409, "Seconda registrazione con la stessa email respinta (409)", `(${dup.status})`);

const reserved = await request("POST", "/api/auth/register", { body: { name: "Altro", email: `x-${run}@example.it`, handle: "admin", password } });
assert(reserved.status === 400, "Nome utente riservato respinto (400)", `(${reserved.status})`);

// 2. Utente corrente
const me = await request("GET", "/api/auth/me", { cookie });
assert(me.status === 200 && me.json?.user?.handle === slug, "/api/auth/me riconosce l'utente", `(${me.status} ${me.text})`);
const anon = await request("GET", "/api/auth/me");
assert(anon.status === 401, "/api/auth/me senza sessione risponde 401", `(${anon.status})`);

// 3. Disponibilità dello slug
const free = await request("GET", `/api/publications/slug-check?slug=${slug}`, { cookie });
assert(free.json?.available === true, "Il proprio nome utente è disponibile come slug", free.text);
assert(free.json?.url === `https://${slug}.${ROOT}`, "L'indirizzo proposto è slug.dominio", free.json?.url);
const freeForOthers = await request("GET", `/api/publications/slug-check?slug=${slug}`);
assert(freeForOthers.json?.available === false && freeForOthers.json?.reason === "taken", "Il nome utente di un altro non è disponibile", freeForOthers.text);
const www = await request("GET", "/api/publications/slug-check?slug=www");
assert(www.json?.reason === "reserved", "www è riservato", www.text);

// 4. Creazione della pubblicazione
const noAuth = await request("POST", "/api/publications", { body: { name: "Senza accesso", slug: `anon-${run}` } });
assert(noAuth.status === 401, "Creazione senza accesso respinta (401)", `(${noAuth.status})`);

const crossSite = await request("POST", "/api/publications", {
  body: { name: "Da altro sito", slug: `csrf-${run}` },
  cookie,
  headers: { Origin: "https://sito-malevolo.example" }
});
assert(crossSite.status === 400, "Creazione da un'altra origine respinta (CSRF)", `(${crossSite.status})`);

const created = await request("POST", "/api/publications", {
  body: { name: `Newsletter di Prova ${run}`, slug, description: "Una newsletter di prova", primaryColor: "#059669" },
  cookie
});
assert(created.status === 201, "Pubblicazione creata (201)", `(${created.status} ${created.text})`);
assert(created.json?.publication?.url === `https://${slug}.${ROOT}`, "La risposta dà l'indirizzo del sottodominio", created.text);

const again = await request("POST", "/api/publications", { body: { name: "Doppione", slug }, cookie });
assert(again.status === 409, "Slug già usato respinto (409)", `(${again.status})`);

const reservedPub = await request("POST", "/api/publications", { body: { name: "Riservata", slug: "coolify" }, cookie });
assert(reservedPub.status === 400, "Slug riservato respinto (400)", `(${reservedPub.status})`);

const platformDomain = await request("POST", "/api/publications", { body: { name: "Furba", slug: `furba-${run}`, customDomain: `altro.${ROOT}` }, cookie });
assert(platformDomain.status === 400, "Dominio personalizzato della piattaforma respinto", `(${platformDomain.status})`);

// 5. Certificato e pagina sul sottodominio
const cert = await request("GET", `/api/domains/check?domain=${slug}.${ROOT}`);
assert(cert.status === 200, "Caddy può emettere il certificato per il nuovo sottodominio", `(${cert.status})`);
const noCert = await request("GET", `/api/domains/check?domain=inesistente-${run}.${ROOT}`);
assert(noCert.status === 403, "Nessun certificato per un sottodominio senza pubblicazione", `(${noCert.status})`);

const page = await request("GET", "/", { host: `${slug}.${ROOT}` });
assert(page.status === 200, "La home del sottodominio risponde 200", `(${page.status})`);
assert(page.text.includes(`Newsletter di Prova ${run}`), "La home del sottodominio mostra il nome vero della pubblicazione");
assert(page.text.includes("Una newsletter di prova"), "La home del sottodominio mostra la descrizione vera");
assert(!page.text.includes("1420"), "Nessun numero di iscritti inventato");

const missing = await request("GET", "/", { host: `inesistente-${run}.${ROOT}` });
assert(missing.status === 404, "Sottodominio senza pubblicazione: 404", `(${missing.status})`);

// 6. Logout e login
const out = await request("POST", "/api/auth/logout", { body: {}, cookie });
assert(out.status === 200, "Logout riuscito", `(${out.status})`);
const afterLogout = await request("GET", "/api/auth/me", { cookie });
assert(afterLogout.status === 401, "Dopo il logout il vecchio cookie non vale più", `(${afterLogout.status})`);

const wrong = await request("POST", "/api/auth/login", { body: { email, password: "password-sbagliata" } });
assert(wrong.status === 401, "Password sbagliata respinta (401)", `(${wrong.status})`);
const unknown = await request("POST", "/api/auth/login", { body: { email: `nessuno-${run}@example.it`, password } });
assert(unknown.status === 401 && unknown.json?.error === wrong.json?.error, "Email inesistente: stessa risposta della password sbagliata");

const login = await request("POST", "/api/auth/login", { body: { email: email.toUpperCase(), password } });
assert(login.status === 200 && Boolean(sessionCookie(login)), "Login riuscito (email senza distinzione di maiuscole)", `(${login.status} ${login.text})`);

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
