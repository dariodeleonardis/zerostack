// Commenti agli articoli (T1), end to end. Stesso ambiente di scripts/run-e2e.sh (EMAIL_LOG_DIR del server).
import { PrismaClient } from "@prisma/client";
import { confirmEmail, findMail } from "./lib/test-auth.mjs";

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

async function call(method, path, { body, cookie, headers = {} } = {}) {
  const h = { ...headers };
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

const email = (label) => `${label}-${run}@example.it`;
async function register(label, { verify = true } = {}) {
  const res = await call("POST", "/api/auth/register", { body: { name: `Commenti ${label}`, email: email(label), handle: `${label}-${run}`, password: `password-${run}-lunga` } });
  if (verify) await confirmEmail(BASE, MAIL_DIR, email(label));
  return res.cookie;
}

console.log(`\n🧪 Commenti su ${BASE} (giro ${run})\n`);
try {
  // --- Preparazione: autrice con una pubblicazione, un articolo libero e uno riservato
  const author = await register("autrice");
  const pub = await call("POST", "/api/publications", { cookie: author, body: { name: `Commenti ${run}`, slug: `commenti-${run}` } });
  const publicationId = pub.json?.publication?.id;
  const free = await call("POST", "/api/posts", { cookie: author, body: { publicationId, title: `Libero ${run}`, contentHtml: "<p>Per tutti</p>", action: "publish", sendEmail: false } });
  const paid = await call("POST", "/api/posts", {
    cookie: author,
    body: { publicationId, title: `Riservato ${run}`, contentHtml: `<p>Inizio</p><hr class="paywall-divider" data-paywall="true"><p>Segreto</p>`, access: "PAID_SUBSCRIBERS", action: "publish", sendEmail: false }
  });
  const freePost = await prisma.post.findFirst({ where: { publicationId, slug: free.json?.post?.slug } });
  const paidPost = await prisma.post.findFirst({ where: { publicationId, slug: paid.json?.post?.slug } });
  assert(Boolean(freePost && paidPost), "Pubblicazione con un articolo libero e uno riservato");
  const freePath = `/p/commenti-${run}/${freePost.slug}`;
  const commentsUrl = `/api/posts/${freePost.id}/comments`;

  const reader = await register("lettrice");
  const unverified = await register("nonconfermata", { verify: false });
  const stranger = await register("estraneo");

  // --- Chi può scrivere
  assert((await call("POST", commentsUrl, { body: { content: "Ciao a tutti" } })).status === 401, "Senza accesso non si commenta (401)");
  const notVerified = await call("POST", commentsUrl, { cookie: unverified, body: { content: "Ciao a tutti" } });
  assert(notVerified.status === 403 && notVerified.json?.code === "email_not_verified", "Con l'email non confermata non si commenta (contro lo spam)");
  assert((await call("POST", `/api/posts/${paidPost.id}/comments`, { cookie: reader, body: { content: "Posso?" } })).status === 404, "Su un articolo riservato commenta solo chi lo legge intero");
  const otherSite = await call("POST", commentsUrl, { cookie: reader, body: { content: "Ciao" }, headers: { origin: "https://altro-sito.example" } });
  assert(otherSite.status === 400, "Richiesta da un altro sito respinta");

  // --- Testo
  assert((await call("POST", commentsUrl, { cookie: reader, body: { content: " a " } })).status === 400, "Commento troppo corto respinto");
  assert((await call("POST", commentsUrl, { cookie: reader, body: { content: "x".repeat(2001) } })).status === 400, "Commento oltre 2.000 caratteri respinto");
  const evil = `<script>alert('${run}')</script> e <b>grassetto</b>`;
  const first = await call("POST", commentsUrl, { cookie: reader, body: { content: `Bel pezzo ${run}!\n${evil}` } });
  assert(first.status === 201 && first.json?.comment?.content.includes("<script>"), "Commento pubblicato, il testo resta com'è scritto");
  const page = await call("GET", freePath);
  assert(page.text.includes(`Bel pezzo ${run}!`) && !page.text.includes(`<script>alert('${run}')`) && page.text.includes("&lt;script&gt;"), "Nella pagina il codice HTML del commento è mostrato come testo, mai eseguito");

  // --- Risposte di un livello
  const reply = await call("POST", commentsUrl, { cookie: author, body: { content: `Grazie ${run}`, parentId: first.json.comment.id } });
  assert(reply.status === 201 && reply.json?.comment?.parentId === first.json.comment.id, "Risposta collegata al commento");
  const replyToReply = await call("POST", commentsUrl, { cookie: stranger, body: { content: "E io aggiungo", parentId: reply.json.comment.id } });
  assert(replyToReply.status === 201 && replyToReply.json?.comment?.parentId === first.json.comment.id, "Rispondere a una risposta resta nello stesso filo (un solo livello)");
  const badParent = await call("POST", commentsUrl, { cookie: reader, body: { content: "Rispondo", parentId: "00000000-0000-0000-0000-000000000000" } });
  assert(badParent.status === 400, "Risposta a un commento inesistente respinta");

  // --- Avviso all'autrice (non per i suoi commenti)
  const mail = await findMail(MAIL_DIR, email("autrice"), new RegExp(`^Nuovo commento su «Libero ${run}»$`));
  assert(Boolean(mail) && mail.text.includes(`Bel pezzo ${run}!`), "L'autrice riceve l'avviso del nuovo commento");

  // --- Moderazione
  const firstId = first.json.comment.id;
  assert((await call("PATCH", `/api/comments/${firstId}`, { cookie: stranger, body: { hidden: true } })).status === 404, "Chi non modera non nasconde (404)");
  const hide = await call("PATCH", `/api/comments/${firstId}`, { cookie: author, body: { hidden: true } });
  assert(hide.status === 200 && hide.json?.comment?.hiddenAt, "L'autrice nasconde un commento");
  const readerView = await call("GET", freePath, { cookie: reader });
  const authorView = await call("GET", freePath, { cookie: author });
  assert(!readerView.text.includes(`Bel pezzo ${run}!`) && authorView.text.includes(`Bel pezzo ${run}!`) && authorView.text.includes("Nascosto ai lettori"), "Nascosto: sparisce per i lettori, resta per chi modera");
  assert((await call("POST", commentsUrl, { cookie: stranger, body: { content: "Rispondo al nascosto", parentId: firstId } })).status === 400, "Non si risponde a un commento nascosto");
  await call("PATCH", `/api/comments/${firstId}`, { cookie: author, body: { hidden: false } });
  assert((await call("GET", freePath)).text.includes(`Bel pezzo ${run}!`), "Rimostrato: torna visibile a tutti");

  // --- Cancellazione
  const strangerOwn = replyToReply.json.comment.id;
  assert((await call("DELETE", `/api/comments/${firstId}`, { cookie: stranger })).status === 404, "Nessuno cancella i commenti degli altri (404)");
  assert((await call("DELETE", `/api/comments/${strangerOwn}`, { cookie: stranger })).status === 200 && !(await prisma.comment.findUnique({ where: { id: strangerOwn } })), "Chi ha scritto un commento lo cancella");
  assert((await call("DELETE", `/api/comments/${firstId}`, { cookie: author })).status === 200, "Chi modera cancella un commento");
  assert((await prisma.comment.count({ where: { postId: freePost.id } })) === 0, "Cancellando un commento se ne vanno anche le risposte");

  // --- Limite di frequenza
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await call("POST", commentsUrl, { cookie: stranger, body: { content: `Commento numero ${i}` } })).status);
  // L'estraneo ha già usato due tentativi (la risposta e quella al commento nascosto): ne restano otto.
  assert(statuses.slice(0, 8).every((s) => s === 201) && statuses.slice(8).every((s) => s === 429), "Oltre 10 commenti in 10 minuti: rallentato (429)", statuses.join(","));

  // --- Mi piace (T2)
  const likeUrl = `/api/posts/${freePost.id}/like`;
  assert((await call("POST", likeUrl, { body: {} })).status === 401, "Mi piace: senza accesso no (401)");
  assert((await call("POST", `/api/posts/${paidPost.id}/like`, { cookie: author, body: {} })).status === 200, "Mi piace: l'autrice può sul suo riservato");
  assert((await call("POST", `/api/posts/${paidPost.id}/like`, { cookie: stranger, body: {} })).status === 404, "Mi piace: su un riservato solo chi lo legge intero");
  const liked = await call("POST", likeUrl, { cookie: author, body: {} });
  assert(liked.status === 200 && liked.json?.liked === true && liked.json?.likesCount === 1, "Mi piace messo: contatore a 1", liked.text);
  assert((await call("POST", likeUrl, { cookie: author, body: {} })).json?.likesCount === 1, "Rimetterlo non lo raddoppia");
  // Tre richieste in contemporanea dallo stesso utente: un solo mi piace, contatore coerente.
  const strangerAuthor = await register("veloce");
  await Promise.all([1, 2, 3].map(() => call("POST", likeUrl, { cookie: strangerAuthor, body: {} })));
  const afterRace = await prisma.post.findUnique({ where: { id: freePost.id }, select: { likesCount: true } });
  const rows = await prisma.like.count({ where: { postId: freePost.id } });
  assert(afterRace?.likesCount === 2 && rows === 2, "Tre mi piace in contemporanea dalla stessa persona: ne conta uno", `(${afterRace?.likesCount} contatore, ${rows} righe)`);
  const likePage = await call("GET", freePath, { cookie: author });
  assert(likePage.text.includes('aria-pressed="true"') && likePage.text.includes("Ti piace (2 mi piace)"), "La pagina mostra il mi piace acceso e il conteggio");
  const unliked = await call("DELETE", likeUrl, { cookie: author, body: {} });
  assert(unliked.json?.liked === false && unliked.json?.likesCount === 1, "Mi piace tolto: contatore a 1");
  assert((await call("DELETE", likeUrl, { cookie: author, body: {} })).json?.likesCount === 1, "Toglierlo due volte non va sotto");

  // --- Sospesi
  await prisma.user.update({ where: { email: email("lettrice") }, data: { suspendedAt: new Date() } });
  assert((await call("POST", commentsUrl, { cookie: reader, body: { content: "Ci sono ancora?" } })).status === 401, "Un account sospeso non commenta");
} finally {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@example.it` } } }).catch(() => undefined);
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
