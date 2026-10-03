// Squadra della pubblicazione (T4), end to end. Stesso ambiente di scripts/run-e2e.sh (EMAIL_LOG_DIR del server).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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
  const res = await call("POST", "/api/auth/register", { body: { name: `Squadra ${label}`, email: email(label), handle: `${label}-${run}`, password: `password-${run}-lunga` } });
  if (confirm) await confirmEmail(BASE, MAIL_DIR, email(label));
  return res.cookie;
}

/** Il token dell'ultimo invito arrivato a questo indirizzo, aspettando che ne arrivi uno nuovo. */
async function inviteMails(address) {
  const files = (await readdir(MAIL_DIR).catch(() => [])).sort();
  const out = [];
  for (const f of files) {
    const m = JSON.parse(await readFile(path.join(MAIL_DIR, f), "utf8"));
    if (m.to === address && /ti invita nella squadra/.test(m.subject)) out.push(m);
  }
  return out;
}
async function nextInviteToken(address, before) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const mails = await inviteMails(address);
    if (mails.length > before) return mails.at(-1).text.match(/\/invito\?token=([\w-]+)/)?.[1] ?? null;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

const team = (cookie, pubId, body) => call("POST", `/api/publications/${pubId}/team`, { cookie, body });
const accept = (cookie, token) => call("POST", "/api/team/accept", { cookie, body: { token } });

console.log(`\n🧪 Squadra su ${BASE} (giro ${run})\n`);
try {
  const owner = await register("titolare");
  const pub = (await call("POST", "/api/publications", { cookie: owner, body: { name: `Redazione ${run}`, slug: `redazione-${run}` } })).json?.publication;
  const editor = await register("editor");
  const contributor = await register("collab");
  const stranger = await register("estraneo");

  // --- Chi può gestire la squadra
  assert((await team(undefined, pub.id, { action: "invite", email: email("editor"), role: "EDITOR" })).status === 401, "Senza accesso: 401");
  assert((await team(stranger, pub.id, { action: "invite", email: email("editor"), role: "EDITOR" })).status === 404, "Chi non ne fa parte: la pubblicazione non esiste");
  assert((await team(owner, pub.id, { action: "invite", email: "non-una-email", role: "EDITOR" })).status === 400, "Indirizzo non valido: 400");
  assert((await team(owner, pub.id, { action: "invite", email: email("editor"), role: "OWNER" })).status === 400, "Non si invita come proprietario");
  assert((await team(owner, pub.id, { action: "invite", email: email("titolare"), role: "EDITOR" })).status === 409, "Chi è già in squadra non si invita");

  // --- Invito all'editor (scritto in maiuscolo: conta l'indirizzo, non le lettere)
  const inv = await team(owner, pub.id, { action: "invite", email: email("editor").toUpperCase(), role: "EDITOR" });
  assert(inv.status === 201, "Invito spedito", inv.text);
  const editorToken = await nextInviteToken(email("editor"), 0);
  assert(Boolean(editorToken), "L'email d'invito arriva con il link");
  const row = await prisma.publicationInvite.findFirst({ where: { publicationId: pub.id, email: email("editor") } });
  assert(row && row.tokenHash !== editorToken && row.tokenHash.length === 64, "Nel database solo l'hash del token");

  // --- Pagina dell'invito
  const anonPage = await call("GET", `/invito?token=${editorToken}`);
  assert(anonPage.status === 200 && anonPage.text.includes(`Redazione ${run}`) && anonPage.text.includes("Crea un account"), "Senza accesso: invito leggibile, con Entra e Crea un account");
  assert((await call("GET", `/invito?token=${editorToken}`, { cookie: stranger })).text.includes("per un altro indirizzo"), "Con un altro account: lo dice");
  const wrong = await accept(stranger, editorToken);
  assert(wrong.status === 403, "Un altro account non può accettarlo", wrong.text);
  assert((await call("GET", `/invito?token=${editorToken}`, { cookie: editor })).text.includes("Accetta l"), "Con l'account giusto: pulsante Accetta");
  const ok = await accept(editor, editorToken);
  assert(ok.status === 200 && ok.json?.publicationId === pub.id, "L'editor accetta", ok.text);
  const editorUser = await prisma.user.findUnique({ where: { email: email("editor") } });
  const editorMember = await prisma.publicationMember.findUnique({ where: { publicationId_userId: { publicationId: pub.id, userId: editorUser.id } } });
  assert(editorMember?.role === "EDITOR", "Entra in squadra come editor");
  assert((await prisma.publicationInvite.count({ where: { publicationId: pub.id } })) === 0, "L'invito accettato sparisce");
  assert((await accept(editor, editorToken)).status === 404, "Lo stesso link non vale una seconda volta");
  assert((await call("GET", `/invito?token=${editorToken}`)).text.includes("non più valido"), "La pagina lo dice");

  // --- Collaboratore: rinnovo dell'invito, poi accetta il link nuovo
  const before = (await inviteMails(email("collab"))).length;
  await team(owner, pub.id, { action: "invite", email: email("collab"), role: "CONTRIBUTOR" });
  const firstToken = await nextInviteToken(email("collab"), before);
  const renewed = await team(owner, pub.id, { action: "invite", email: email("collab"), role: "CONTRIBUTOR" });
  assert(renewed.status === 200, "Rispedire l'invito lo rinnova", renewed.text);
  const secondToken = await nextInviteToken(email("collab"), before + 1);
  assert((await accept(contributor, firstToken)).status === 404, "Il link vecchio non vale più");
  assert((await accept(contributor, secondToken)).status === 200, "Il collaboratore accetta il link nuovo");

  // --- Cosa può fare il collaboratore
  const draft = await call("POST", "/api/posts", { cookie: contributor, body: { publicationId: pub.id, title: `Bozza collab ${run}`, contentHtml: "<p>bozza</p>", action: "draft" } });
  assert(draft.status === 201, "Il collaboratore salva una bozza", draft.text);
  const tryPublish = await call("PATCH", `/api/posts/${draft.json?.post?.id}`, { cookie: contributor, body: { publicationId: pub.id, title: `Bozza collab ${run}`, contentHtml: "<p>bozza</p>", action: "publish", sendEmail: false } });
  assert(tryPublish.status === 403, "Ma non la pubblica");
  const byEditor = await call("POST", "/api/posts", { cookie: editor, body: { publicationId: pub.id, title: `Pezzo editor ${run}`, contentHtml: "<p>editor</p>", action: "publish", sendEmail: false } });
  assert(byEditor.status === 201, "L'editor pubblica", byEditor.text);
  const editorDraft = await call("POST", "/api/posts", { cookie: editor, body: { publicationId: pub.id, title: `Bozza editor ${run}`, contentHtml: "<p>e</p>", action: "draft" } });
  const touch = await call("PATCH", `/api/posts/${editorDraft.json?.post?.id}`, { cookie: contributor, body: { publicationId: pub.id, title: "Cambiato", contentHtml: "<p>x</p>", action: "draft" } });
  assert(touch.status === 404, "Il collaboratore non tocca le bozze altrui");
  assert((await call("GET", `/studio/posts/${editorDraft.json?.post?.id}`, { cookie: contributor })).status === 404, "E non le apre nell'editor");
  const editorOpens = await call("GET", `/studio/posts/${draft.json?.post?.id}`, { cookie: editor });
  assert(editorOpens.status === 200, "L'editor apre la bozza del collaboratore");
  const publishedByEditor = await call("PATCH", `/api/posts/${draft.json?.post?.id}`, { cookie: editor, body: { publicationId: pub.id, title: `Bozza collab ${run}`, contentHtml: "<p>bozza</p>", action: "publish", sendEmail: false } });
  assert(publishedByEditor.status === 200, "E la pubblica", publishedByEditor.text);

  // --- Solo il proprietario gestisce la squadra
  assert((await team(editor, pub.id, { action: "invite", email: email("altro"), role: "EDITOR" })).status === 403, "L'editor non invita");
  const contributorUser = await prisma.user.findUnique({ where: { email: email("collab") } });
  const cMember = await prisma.publicationMember.findUnique({ where: { publicationId_userId: { publicationId: pub.id, userId: contributorUser.id } } });
  const ownerMember = await prisma.publicationMember.findFirst({ where: { publicationId: pub.id, role: "OWNER" } });
  assert((await team(editor, pub.id, { action: "remove", memberId: cMember.id })).status === 403, "L'editor non toglie nessuno");
  assert((await team(owner, pub.id, { action: "role", memberId: ownerMember.id, role: "EDITOR" })).status === 400, "Il ruolo del proprietario non cambia");
  assert((await team(owner, pub.id, { action: "role", memberId: cMember.id, role: "EDITOR" })).status === 200, "Il proprietario promuove il collaboratore");
  assert((await prisma.publicationMember.findUnique({ where: { id: cMember.id } }))?.role === "EDITOR", "Ruolo cambiato");
  assert((await team(owner, pub.id, { action: "remove", memberId: cMember.id })).status === 200, "Il proprietario lo toglie");
  assert((await call("GET", `/studio/posts/${draft.json?.post?.id}`, { cookie: contributor })).status === 404, "Tolto, non vede più i pezzi della pubblicazione");

  // --- Annullare un invito
  const beforeOther = (await inviteMails(email("altro"))).length;
  await team(owner, pub.id, { action: "invite", email: email("altro"), role: "CONTRIBUTOR" });
  const otherToken = await nextInviteToken(email("altro"), beforeOther);
  const pendingInvite = await prisma.publicationInvite.findFirst({ where: { publicationId: pub.id, email: email("altro") } });
  assert((await team(owner, pub.id, { action: "revoke", inviteId: pendingInvite.id })).status === 200, "Il proprietario annulla un invito");
  assert((await call("GET", `/invito?token=${otherToken}`)).text.includes("non più valido"), "Annullato, il link non vale più");

  // --- Pagina Squadra
  const ownerPage = await call("GET", "/studio/team", { cookie: owner });
  assert(ownerPage.status === 200 && ownerPage.text.includes(`Squadra editor`) && ownerPage.text.includes("Invita per email"), "Il proprietario vede la squadra e il modulo");
  const editorPage = await call("GET", "/studio/team", { cookie: editor });
  assert(editorPage.text.includes("Esci dalla squadra") && !editorPage.text.includes("Invita per email"), "L'editor vede solo il suo ruolo e l'uscita");

  // --- Uscire
  assert((await team(owner, pub.id, { action: "leave" })).status === 400, "Il proprietario non esce dalla sua pubblicazione");
  assert((await team(editor, pub.id, { action: "leave" })).status === 200, "L'editor esce da sé");
  assert(!(await prisma.publicationMember.findUnique({ where: { publicationId_userId: { publicationId: pub.id, userId: editorUser.id } } })), "Non è più in squadra");

  // --- Proprietario con l'email da confermare
  const unverified = await register("nonconfermato", { confirm: false });
  const pub2 = (await call("POST", "/api/publications", { cookie: unverified, body: { name: `Nuova ${run}`, slug: `nuova-${run}` } })).json?.publication;
  if (pub2) {
    const res = await team(unverified, pub2.id, { action: "invite", email: email("editor"), role: "EDITOR" });
    assert(res.status === 403 && res.json?.code === "email_not_verified", "Con l'email da confermare non si invita", res.text);
  } else {
    assert(true, "Con l'email da confermare non si crea nemmeno la pubblicazione");
  }
} finally {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@example.it` } } }).catch(() => undefined);
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati`);
process.exit(failed === 0 ? 0 : 1);
