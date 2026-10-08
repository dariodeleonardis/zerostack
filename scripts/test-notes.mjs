// Note (T5), end to end. Stesso ambiente di scripts/run-e2e.sh (EMAIL_LOG_DIR del server).
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
async function register(label, { confirm = true } = {}) {
  const res = await call("POST", "/api/auth/register", { body: { name: `Note ${label}`, email: email(label), handle: `${label}-${run}`, password: `password-${run}-lunga` } });
  if (confirm) await confirmEmail(BASE, MAIL_DIR, email(label));
  return res.cookie;
}
const write = (cookie, body) => call("POST", "/api/notes", { cookie, body });
const count = async (id) => prisma.note.findUnique({ where: { id }, select: { likesCount: true, repliesCount: true } });

console.log(`\n🧪 Note su ${BASE} (giro ${run})\n`);
try {
  const author = await register("autore");
  const pub = (await call("POST", "/api/publications", { cookie: author, body: { name: `Taccuino ${run}`, slug: `taccuino-${run}` } })).json?.publication;
  const other = (await call("POST", "/api/publications", { cookie: author, body: { name: `Altro ${run}`, slug: `altro-taccuino-${run}` } })).json?.publication;
  const reader = await register("lettore");
  const unverified = await register("nonconfermato", { confirm: false });

  // --- Chi scrive una nota
  assert((await write(undefined, { content: "Ciao", publicationId: pub.id })).status === 401, "Senza accesso: 401");
  assert((await write(reader, { content: "Ciao a tutti", publicationId: pub.id })).status === 403, "Un lettore non scrive note a nome della pubblicazione");
  assert((await write(author, { content: "x", publicationId: pub.id })).status === 400, "Nota troppo corta: 400");
  assert((await write(author, { content: "y".repeat(1001), publicationId: pub.id })).status === 400, "Nota oltre i 1000 caratteri: 400");
  assert((await write(author, { content: "Senza pubblicazione" })).status === 400, "Serve la pubblicazione");
  const first = await write(author, { content: `Prima nota ${run}\nsu due righe <b>non html</b>`, publicationId: pub.id });
  assert(first.status === 201, "Il proprietario scrive una nota", first.text);
  const noteId = first.json?.note?.id;
  const second = await write(author, { content: `Nota dell'altra ${run}`, publicationId: other.id });
  assert(second.status === 201, "E una a nome dell'altra pubblicazione");

  // --- Feed e pagina
  const anonFeed = await call("GET", "/notes");
  assert(anonFeed.status === 200 && anonFeed.text.includes(`Prima nota ${run}`), "Chi non è entrato vede tutte le note");
  assert(anonFeed.text.includes("&lt;b&gt;non html&lt;/b&gt;"), "Testo semplice: l'HTML resta testo");
  const readerFeed = await call("GET", "/notes", { cookie: reader });
  assert(readerFeed.text.includes(`Prima nota ${run}`), "Il lettore che non segue nessuno vede tutte le note");
  await prisma.newsletterSubscriber.create({ data: { publicationId: pub.id, email: email("lettore"), status: "ACTIVE", confirmedAt: new Date() } });
  const followed = await call("GET", "/notes", { cookie: reader });
  assert(followed.text.includes(`Prima nota ${run}`) && !followed.text.includes(`Nota dell'altra ${run}`), "Seguite: solo le pubblicazioni seguite");
  assert((await call("GET", "/notes?tutte=1", { cookie: reader })).text.includes(`Nota dell'altra ${run}`), "Tutte: anche le altre");
  const onePub = await call("GET", `/notes?pubblicazione=altro-taccuino-${run}`);
  assert(onePub.text.includes(`Nota dell'altra ${run}`) && !onePub.text.includes(`Prima nota ${run}`), "Filtro per pubblicazione");
  assert((await call("GET", "/notes", { cookie: author })).text.includes("Pubblica la nota"), "Chi può scrivere trova il modulo");
  assert(!followed.text.includes("Pubblica la nota"), "Il lettore no");
  const page = await call("GET", `/notes/${noteId}`);
  assert(page.status === 200 && page.text.includes(`Prima nota ${run}`) && page.text.includes("per rispondere"), "Pagina della nota, con l'invito a entrare per rispondere");
  const pubPage = await call("GET", `/p/taccuino-${run}`);
  assert(pubPage.text.includes(`Prima nota ${run}`) && pubPage.text.includes("Tutte le note"), "Le ultime note sulla pagina della pubblicazione");

  // --- Risposte
  assert((await write(unverified, { content: "Risposta", replyToNoteId: noteId })).status === 403, "Con l'email da confermare non si risponde");
  assert((await write(reader, { content: "Risposta", replyToNoteId: "non-esiste" })).status === 404, "Risposta a una nota inesistente: 404");
  const reply = await write(reader, { content: `Risposta del lettore ${run}`, replyToNoteId: noteId });
  assert(reply.status === 201 && reply.json?.note?.rootId === noteId, "Il lettore risponde", reply.text);
  const nested = await write(author, { content: `Risposta alla risposta ${run}`, replyToNoteId: reply.json?.note?.id });
  assert(nested.json?.note?.rootId === noteId, "Rispondere a una risposta vale come rispondere alla nota");
  assert((await count(noteId)).repliesCount === 2, "Contatore delle risposte: 2");
  const withReplies = await call("GET", `/notes/${noteId}`, { cookie: reader });
  assert(withReplies.text.includes(`Risposta del lettore ${run}`) && withReplies.text.includes("2 risposte"), "Le risposte nella pagina della nota");
  const replyPage = await call("GET", `/notes/${reply.json?.note?.id}`);
  assert(replyPage.status === 307 && (replyPage.location ?? "").includes(`/notes/${noteId}`), "La pagina di una risposta porta alla nota");
  assert(!(await call("GET", "/notes?tutte=1")).text.includes(`Risposta del lettore ${run}`), "Le risposte non stanno nel feed");

  // --- Mi piace
  assert((await call("POST", `/api/notes/${noteId}/like`, { body: {} })).status === 401, "Mi piace senza accesso: 401");
  const likes = await Promise.all([1, 2, 3].map(() => call("POST", `/api/notes/${noteId}/like`, { cookie: reader, body: {} })));
  assert(likes.every((l) => l.status === 200), "Mi piace (tre richieste insieme)");
  assert((await count(noteId)).likesCount === 1, "Contatore a 1, non 3");
  await call("DELETE", `/api/notes/${noteId}/like`, { cookie: reader, body: {} });
  await call("DELETE", `/api/notes/${noteId}/like`, { cookie: reader, body: {} });
  assert((await count(noteId)).likesCount === 0, "Tolto due volte: 0, mai sotto zero");

  // --- Cancellare
  assert((await call("DELETE", `/api/notes/${noteId}`, { cookie: reader })).status === 404, "Il lettore non cancella la nota altrui");
  assert((await call("DELETE", `/api/notes/${reply.json?.note?.id}`, { cookie: reader })).status === 200, "Il lettore cancella la sua risposta");
  assert((await count(noteId)).repliesCount === 1, "Contatore delle risposte: 1");
  assert((await call("DELETE", `/api/notes/${noteId}`, { cookie: author })).status === 200, "L'autore cancella la nota");
  assert((await prisma.note.count({ where: { OR: [{ id: noteId }, { replyToNoteId: noteId }] } })) === 0, "Con la nota se ne vanno le risposte");
  assert((await call("GET", `/notes/${noteId}`)).status === 404, "La sua pagina non c'è più");

  // --- Pubblicazione sospesa
  await prisma.publication.update({ where: { id: other.id }, data: { suspendedAt: new Date() } });
  assert(!(await call("GET", "/notes")).text.includes(`Nota dell'altra ${run}`), "Pubblicazione sospesa: le sue note spariscono");
  assert((await write(author, { content: "Ancora una", publicationId: other.id })).status === 400, "E non se ne scrivono altre a suo nome");
} finally {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@example.it` } } }).catch(() => undefined);
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
