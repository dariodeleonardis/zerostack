// Test end to end del giro "scrivi -> iscriviti -> conferma -> pubblica -> email -> disiscriviti".
// Serve il server web e il database, entrambi con le email su file:
//   EMAIL_PROVIDER=log EMAIL_LOG_DIR=/tmp/zs-mail APP_URL=http://localhost:3000 (server web)
//   ZS_BASE_URL=http://localhost:3000 EMAIL_LOG_DIR=/tmp/zs-mail DATABASE_URL=... node scripts/test-newsletter.mjs
// Il worker lo lancia il test stesso, un giro alla volta (--once), con le stesse variabili.
import { readdir, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { confirmEmail } from "./lib/test-auth.mjs";
import { fileURLToPath } from "node:url";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
if (!MAIL_DIR) {
  console.error("Imposta EMAIL_LOG_DIR (la stessa cartella del server web)");
  process.exit(1);
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

async function call(method, urlPath, { body, cookie, form, redirect = "manual" } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let payload;
  if (form !== undefined) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    payload = form;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(urlPath.startsWith("http") ? urlPath : `${BASE}${urlPath}`, { method, headers, body: payload, redirect });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json };
}

async function register(label) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Test ${label}`, email: `${label}-${run}@example.it`, handle: `${label}-${run}`, password: "password-molto-lunga" })
  });
  // Chi invia newsletter o collega Stripe deve aver confermato l'email.
  if (process.env.EMAIL_LOG_DIR) await confirmEmail(BASE, process.env.EMAIL_LOG_DIR, `${label}-${run}@example.it`);
  return res.headers.get("set-cookie")?.split(";")[0];
}

async function mailsTo(address) {
  const files = await readdir(MAIL_DIR).catch(() => []);
  const mails = [];
  for (const file of files) {
    const mail = JSON.parse(await readFile(path.join(MAIL_DIR, file), "utf8"));
    if (mail.to === address) mails.push(mail);
  }
  return mails.sort((a, b) => a.messageId.localeCompare(b.messageId));
}

function runWorker() {
  execFileSync(path.join(ROOT, "node_modules/.bin/tsx"), [path.join(ROOT, "apps/worker/src/index.ts"), "--once"], {
    env: { ...process.env, EMAIL_PROVIDER: "log", EMAIL_RATE_PER_SECOND: "0" },
    stdio: "pipe"
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`\n🧪 Newsletter end to end su ${BASE} (giro ${run})\n`);
await rm(MAIL_DIR, { recursive: true, force: true });

// --- Autore e pubblicazione
const author = await register("autore");
const created = await call("POST", "/api/publications", { cookie: author, body: { name: `Lettere ${run}`, slug: `lettere-${run}` } });
assert(created.status === 201, "L'autore crea la pubblicazione", created.text);
const publicationId = created.json?.publication?.id;
const pubSlug = `lettere-${run}`;

// --- Iscrizione con doppia conferma
const reader = `lettore-${run}@example.it`;
const pending = `indeciso-${run}@example.it`;
const sub = await call("POST", "/api/subscribe", { body: { publicationId, email: reader } });
assert(sub.status === 200 && sub.json?.ok, "Iscrizione accettata", sub.text);
await call("POST", "/api/subscribe", { body: { publicationId, email: pending } });

const [confirmation] = await mailsTo(reader);
assert(confirmation && /Conferma la tua iscrizione/.test(confirmation.subject), "Arriva l'email di conferma", JSON.stringify(confirmation?.subject));
const confirmUrl = confirmation?.text.match(/https?:\/\/\S+\/api\/subscribe\/confirm\?token=[\w-]+/)?.[0];
assert(Boolean(confirmUrl), "L'email contiene il link di conferma");

const confirmed = await call("GET", confirmUrl);
assert(confirmed.status === 303 && /iscrizione=confermata/.test(confirmed.headers.get("location") ?? ""), "Il link conferma e rimanda alla pubblicazione", `${confirmed.status} ${confirmed.headers.get("location")}`);
const reused = await call("GET", confirmUrl);
assert(reused.status === 400, "Lo stesso link non vale una seconda volta", String(reused.status));

const again = await call("POST", "/api/subscribe", { body: { publicationId, email: reader } });
assert(again.status === 200 && (await mailsTo(reader)).length === 1, "Iscriversi di nuovo da attivi non rimanda email e non rivela nulla");

// Anche l'autore si iscrive: è della redazione, quindi riceverà il testo completo.
const authorEmail = `autore-${run}@example.it`;
await call("POST", "/api/subscribe", { body: { publicationId, email: authorEmail } });
const authorConfirm = (await mailsTo(authorEmail)).find((m) => /iscrizione/.test(m.subject))?.text.match(/https?:\/\/\S+\/api\/subscribe\/confirm\?token=[\w-]+/)?.[0];
await call("GET", authorConfirm);

const badEmail = await call("POST", "/api/subscribe", { body: { publicationId, email: "non-una-email" } });
assert(badEmail.status === 400, "Email non valida respinta", String(badEmail.status));

// --- Pubblicazione con invio: post a pagamento con divisore
const secret = `SEGRETO-${run}`;
const content = `<p>Anteprima per tutti ${run}</p><hr class="paywall-divider" data-paywall="true"><p>${secret}</p><script>alert(1)</script><img src="x" onerror="alert(1)">`;
const published = await call("POST", "/api/posts", {
  cookie: author,
  body: { publicationId, title: `Primo numero ${run}`, contentHtml: content, access: "PAID_SUBSCRIBERS", action: "publish", sendEmail: true }
});
assert(published.status === 201 && published.json?.post?.status === "PUBLISHED" && published.json?.campaignId, "Il post esce e crea la campagna", published.text);
const postId = published.json?.post?.id;
const postSlug = published.json?.post?.slug;

const republish = await call("PATCH", `/api/posts/${postId}`, {
  cookie: author,
  body: { publicationId, title: `Primo numero ${run}`, contentHtml: content, access: "PAID_SUBSCRIBERS", action: "publish", sendEmail: true }
});
assert(republish.status === 200 && republish.json?.campaignId === null, "Aggiornare un post uscito non rimanda la newsletter", republish.text);

runWorker();
const issues = (await mailsTo(reader)).filter((m) => m.subject === `Primo numero ${run}`);
assert(issues.length === 1, "Il worker consegna una copia al lettore confermato", `copie: ${issues.length}`);
const issue = issues[0];
assert(issue?.html.includes(`Anteprima per tutti ${run}`) && !issue?.html.includes(secret), "Chi non paga riceve solo l'anteprima, non il testo riservato");
const authorIssue = (await mailsTo(authorEmail)).find((m) => m.subject === `Primo numero ${run}`);
assert(authorIssue?.html.includes(secret), "La redazione (come chi paga) riceve il testo completo");
assert(!/<script|onerror/i.test(issue?.html ?? ""), "L'HTML salvato è ripulito da script e gestori di eventi");
assert(/^<https?:\/\/.+\/api\/unsubscribe\?token=/.test(issue?.headers?.["List-Unsubscribe"] ?? "") && issue?.headers?.["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click", "Header di disiscrizione a un clic (RFC 8058) presenti");
assert((await mailsTo(pending)).length === 1, "Chi non ha confermato non riceve la newsletter");

runWorker();
assert((await mailsTo(reader)).filter((m) => m.subject === `Primo numero ${run}`).length === 1, "Un secondo giro del worker non manda doppioni");

const page = await call("GET", `/p/${pubSlug}/${postSlug}`);
assert(page.status === 200 && page.text.includes(`Anteprima per tutti ${run}`) && !page.text.includes(secret), "La pagina web applica lo stesso paywall", String(page.status));

// --- Permessi
const stranger = await register("estraneo");
const hijack = await call("PATCH", `/api/posts/${postId}`, {
  cookie: stranger,
  body: { publicationId, title: "Rubato", contentHtml: "<p>x</p>", action: "publish", sendEmail: false }
});
assert(hijack.status === 404, "Chi non è della redazione non può modificare il post", String(hijack.status));
const anonymous = await call("POST", "/api/posts", { body: { publicationId, title: "x", contentHtml: "<p>x</p>", action: "draft" } });
assert(anonymous.status === 401, "Senza sessione non si scrive", String(anonymous.status));

// --- Bozza e programmazione
const draft = await call("POST", "/api/posts", { cookie: author, body: { publicationId, title: `Numero due ${run}`, contentHtml: "", action: "draft" } });
assert(draft.status === 201 && draft.json?.post?.status === "DRAFT", "Bozza vuota salvata", draft.text);
const draftId = draft.json?.post?.id;
const past = await call("PATCH", `/api/posts/${draftId}`, {
  cookie: author,
  body: { publicationId, title: `Numero due ${run}`, contentHtml: "<p>Testo</p>", action: "schedule", scheduledAt: new Date(Date.now() - 60_000).toISOString() }
});
assert(past.status === 400, "Programmazione nel passato respinta", String(past.status));
const scheduled = await call("PATCH", `/api/posts/${draftId}`, {
  cookie: author,
  body: { publicationId, title: `Numero due ${run}`, contentHtml: `<p>Testo gratuito ${run}</p>`, action: "schedule", sendEmail: true, scheduledAt: new Date(Date.now() + 2000).toISOString() }
});
assert(scheduled.status === 200 && scheduled.json?.post?.status === "SCHEDULED", "Post programmato", scheduled.text);
const early = await call("GET", `/p/${pubSlug}/${scheduled.json?.post?.slug}`);
assert(early.status === 404, "Prima dell'ora il post programmato non si vede", String(early.status));
await sleep(2500);
runWorker();
const late = await call("GET", `/p/${pubSlug}/${scheduled.json?.post?.slug}`);
assert(late.status === 200, "All'ora stabilita il worker lo pubblica", String(late.status));
const second = (await mailsTo(reader)).filter((m) => m.subject === `Numero due ${run}`);
assert(second.length === 1 && second[0].html.includes(`Testo gratuito ${run}`), "E spedisce la newsletter programmata, completa perché gratuita");

// --- Disiscrizione
const unsubscribeUrl = issue?.headers?.["List-Unsubscribe"]?.slice(1, -1);
const unsubscribePage = await call("GET", unsubscribeUrl);
assert(unsubscribePage.status === 200 && unsubscribePage.text.includes("<form method=\"post\""), "Il link apre una conferma (una GET non disiscrive)");
const oneClick = await call("POST", unsubscribeUrl, { form: "List-Unsubscribe=One-Click" });
assert(oneClick.status === 200, "La disiscrizione a un clic funziona", String(oneClick.status));

const third = await call("POST", "/api/posts", {
  cookie: author,
  body: { publicationId, title: `Numero tre ${run}`, contentHtml: "<p>Tre</p>", action: "publish", sendEmail: true }
});
assert(third.status === 201, "Terzo post pubblicato", third.text);
runWorker();
assert((await mailsTo(reader)).filter((m) => m.subject === `Numero tre ${run}`).length === 0, "Dopo la disiscrizione non arriva più nulla");

const badToken = await call("GET", "/api/unsubscribe?token=non-valido");
assert(badToken.status === 404, "Token di disiscrizione non valido respinto", String(badToken.status));

console.log(`\n📊 ${passed}/${passed + failed} superati\n`);
if (failed > 0) process.exit(1);
