// Test end to end dell'import da Substack: costruisce un export ZIP come quello di Substack
// (iscritti, posts.csv, posts/<id>.html) e lo carica da /api/import/substack.
//   ZS_BASE_URL=http://localhost:3000 DATABASE_URL=... node scripts/test-import.mjs
import { strToU8, zipSync } from "fflate";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
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

async function register(label) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Test ${label}`, email: `${label}-${run}@example.it`, handle: `${label}-${run}`, password: "password-molto-lunga" })
  });
  return res.headers.get("set-cookie")?.split(";")[0];
}

async function upload(cookie, publicationId, bytes, filename, platform = "substack") {
  const form = new FormData();
  form.set("publicationId", publicationId);
  form.set("file", new Blob([bytes]), filename);
  const res = await fetch(`${BASE}/api/import/${platform}`, { method: "POST", headers: cookie ? { cookie } : {}, body: form });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const e = (name) => `${name}-${run}@example.it`;
const subscribersCsv = [
  "email,active_subscription,expiry,plan,email_disabled,created_at",
  `${e("anna")},false,,free,false,2024-01-01`,
  `${e("bruno")},true,2026-12-01,paid,false,2024-02-01`,
  `${e("carla")},false,,free,true,2024-03-01`,
  `${e("dario")},false,,free,false,2024-04-01`,
  `"${e("elena").toUpperCase()}",false,,free,false,2024-05-01`,
  "non-una-email,false,,free,false,2024-06-01"
].join("\n");

const postsCsv = [
  "post_id,post_date,is_published,email_sent_at,inbox_sent_at,type,audience,title,subtitle,podcast_url",
  `101.primo-numero,2024-03-01T08:00:00.000Z,true,2024-03-01T08:00:00.000Z,,newsletter,everyone,"Primo numero, finalmente",Il sottotitolo,`,
  `102.solo-per-voi,2024-04-01T08:00:00.000Z,true,,,newsletter,only_paid,"Solo per voi",,`,
  `103.bozza,2024-05-01T08:00:00.000Z,false,,,newsletter,everyone,"Una bozza
su due righe",,`,
  `104.discussione,2024-05-02T08:00:00.000Z,true,,,thread,everyone,Discussione,,`,
  `105.senza-file,2024-05-03T08:00:00.000Z,true,,,newsletter,everyone,Manca il file,,`
].join("\n");

const zip = zipSync({
  [`email_list.lettere-${run}.csv`]: strToU8(subscribersCsv),
  "posts.csv": strToU8(postsCsv),
  "posts/101.primo-numero.html": strToU8(`<p>Testo del primo numero ${run}</p><script>alert(1)</script>`),
  "posts/102.solo-per-voi.html": strToU8(`<p>Anteprima ${run}</p><div class="paywall-jump" data-component-name="PaywallToDOM"></div><p>RISERVATO-${run}</p>`),
  "posts/103.bozza.html": strToU8("<p>Bozza</p>"),
  "posts/104.discussione.html": strToU8("<p>Thread</p>"),
  "__MACOSX/posts/._101.primo-numero.html": strToU8("spazzatura")
});

try {
  console.log(`\n🧪 Import da Substack su ${BASE} (giro ${run})\n`);
  const author = await register("autore");
  const pubRes = await fetch(`${BASE}/api/publications`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: author },
    body: JSON.stringify({ name: `Lettere ${run}`, slug: `lettere-${run}` })
  });
  const publicationId = (await pubRes.json()).publication.id;

  // Situazione di partenza su ZeroStack: dario si era disiscritto, elena era in attesa di conferma
  await prisma.newsletterSubscriber.create({ data: { publicationId, email: e("dario"), status: "UNSUBSCRIBED" } });
  await prisma.newsletterSubscriber.create({ data: { publicationId, email: e("elena"), status: "PENDING" } });

  const stranger = await register("estraneo");
  const hijack = await upload(stranger, publicationId, zip, "export.zip");
  assert(hijack.status === 404, "Chi non possiede la pubblicazione non importa", String(hijack.status));
  const junk = await upload(author, publicationId, strToU8("solo testo, niente email"), "note.csv");
  assert(junk.status === 422, "Un file senza iscritti né articoli viene respinto", String(junk.status));

  const first = await upload(author, publicationId, zip, "export.zip");
  const r = first.json?.report ?? {};
  assert(first.status === 200, "Export importato", JSON.stringify(first.json));
  assert(r.subscribersFound === 5 && r.subscribersImported === 2, "5 indirizzi validi nel file (quello non valido scartato), 2 nuovi: anna e bruno", JSON.stringify(r));
  assert(r.subscribersSkippedDisabled === 1, "Chi su Substack non riceveva più email (carla) non viene importato");
  assert(r.subscribersKeptUnsubscribed === 1 && r.subscribersReactivated === 1, "Il disiscritto resta fuori, quello in attesa diventa attivo");
  assert(r.paidElsewhere === 1, "Segnalato l'abbonato a pagamento di Substack");
  assert(r.postsImported === 2 && r.postsDrafts === 1 && r.postsWithoutHtml === 1, "2 articoli pubblicati, 1 bozza, 1 senza file; thread ignorato", JSON.stringify(r));

  const statuses = Object.fromEntries(
    (await prisma.newsletterSubscriber.findMany({ where: { publicationId }, select: { email: true, status: true, source: true } })).map((s) => [s.email.split("-")[0], s])
  );
  assert(statuses.anna?.status === "ACTIVE" && statuses.anna?.source === "IMPORT_SUBSTACK", "Gli importati sono attivi, senza nuova email di conferma");
  assert(statuses.dario?.status === "UNSUBSCRIBED" && statuses.elena?.status === "ACTIVE" && !statuses.carla, "Stati finali rispettati (dario fuori, elena attiva, carla assente)");

  const posts = await prisma.post.findMany({ where: { publicationId }, select: { slug: true, title: true, status: true, access: true, publishedAt: true, contentHtml: true } });
  const bySlug = Object.fromEntries(posts.map((p) => [p.slug, p]));
  assert(bySlug["primo-numero"]?.title === "Primo numero, finalmente" && bySlug["primo-numero"]?.publishedAt?.toISOString() === "2024-03-01T08:00:00.000Z", "Titolo con virgola e data originale conservati");
  assert(!/<script/i.test(bySlug["primo-numero"]?.contentHtml ?? ""), "L'HTML importato è ripulito");
  assert(bySlug["solo-per-voi"]?.access === "PAID_SUBSCRIBERS" && bySlug["solo-per-voi"]?.contentHtml.includes('data-paywall="true"'), "Il paywall di Substack diventa il divisore di ZeroStack");
  assert(bySlug["bozza"]?.status === "DRAFT" && bySlug["bozza"]?.title.includes("\n"), "La bozza (titolo su due righe) resta bozza");
  const campaigns = await prisma.emailCampaign.count({ where: { publicationId } });
  assert(campaigns === 0, "L'import non spedisce nessuna newsletter");

  const paidPage = await fetch(`${BASE}/p/lettere-${run}/solo-per-voi`).then((res) => res.text());
  assert(paidPage.includes(`Anteprima ${run}`) && !paidPage.includes(`RISERVATO-${run}`), "Sul sito l'articolo a pagamento importato mostra solo l'anteprima");

  const second = await upload(author, publicationId, zip, "export.zip");
  const r2 = second.json?.report ?? {};
  assert(r2.subscribersImported === 0 && r2.postsImported === 0 && r2.postsSkippedExisting === 3, "Ripetere l'import non crea doppioni", JSON.stringify(r2));

  const csvOnly = await upload(author, publicationId, strToU8(`email\n${e("franco")}\n`), "subscribers.csv");
  assert(csvOnly.status === 200 && csvOnly.json?.report?.subscribersImported === 1, "Anche un CSV di soli iscritti funziona");

  const unknown = await upload(author, publicationId, strToU8("email\nx@y.it\n"), "x.csv", "myspace");
  assert(unknown.status === 404, "Una piattaforma che non esiste viene respinta", String(unknown.status));
  const wxr = `<rss><channel><item><title>Dal blog ${run}</title><content:encoded><![CDATA[Testo ${run}

<script>alert(1)</script>]]></content:encoded><wp:post_name><![CDATA[dal-blog]]></wp:post_name><wp:status><![CDATA[publish]]></wp:status><wp:post_type><![CDATA[post]]></wp:post_type><wp:post_date_gmt><![CDATA[2023-06-01 10:00:00]]></wp:post_date_gmt></item></channel></rss>`;
  const fromWp = await upload(author, publicationId, strToU8(wxr), "blog.xml", "wordpress");
  const wpPost = await prisma.post.findFirst({ where: { publicationId, slug: "dal-blog" }, select: { status: true, contentHtml: true, publishedAt: true } });
  assert(fromWp.status === 200 && fromWp.json?.report?.postsImported === 1, "Import da WordPress", JSON.stringify(fromWp.json));
  assert(
    wpPost?.status === "PUBLISHED" && wpPost.publishedAt?.toISOString() === "2023-06-01T10:00:00.000Z" && wpPost.contentHtml.includes(`<p>Testo ${run}</p>`) && !/<script/i.test(wpPost.contentHtml),
    "L'articolo di WordPress arriva pubblicato, con la sua data e l'HTML ripulito",
    JSON.stringify(wpPost)
  );
  const wpCampaigns = await prisma.emailCampaign.count({ where: { publicationId } });
  assert(wpCampaigns === 0, "Neanche l'import da WordPress spedisce newsletter");
} finally {
  await prisma.$disconnect();
}

console.log(`\n📊 ${passed}/${passed + failed} superati\n`);
if (failed > 0) process.exit(1);
