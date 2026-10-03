import { strFromU8, unzipSync } from "fflate";
import { prisma } from "@zerostack/database";
import { parseCsvRecords, slugify } from "@zerostack/shared";
import { sanitizePostHtml } from "./posts";
import { excerptFrom } from "./post-save";

export interface ImportReport {
  subscribersFound: number;
  subscribersImported: number;
  subscribersReactivated: number;
  subscribersKeptUnsubscribed: number;
  subscribersSkippedDisabled: number;
  paidOnSubstack: number;
  postsImported: number;
  postsDrafts: number;
  postsSkippedExisting: number;
  postsWithoutHtml: number;
}

const MAX_SUBSCRIBERS = 200_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** File dell'export: lo ZIP di Substack (iscritti, posts.csv, posts/*.html) oppure un CSV solo iscritti. */
export function readExport(data: Uint8Array, filename: string): Map<string, string> {
  const isZip = data[0] === 0x50 && data[1] === 0x4b; // "PK"
  if (!isZip) return new Map([[filename || "subscribers.csv", strFromU8(data)]]);
  const files = unzipSync(data, {
    // Solo quello che serve: CSV e HTML degli articoli (niente immagini, niente cartelle di sistema di macOS).
    filter: (f) => !f.name.startsWith("__MACOSX/") && /\.(csv|html)$/i.test(f.name)
  });
  return new Map(Object.entries(files).map(([name, bytes]) => [name, strFromU8(bytes)]));
}

const truthy = (v: string | undefined) => /^(true|1|yes|t)$/i.test((v ?? "").trim());

/**
 * Substack segna il punto del paywall con un blocco vuoto (classe o componente "paywall"):
 * lo si converte nel divisore di ZeroStack prima della pulizia dell'HTML.
 */
export function convertSubstackPaywall(html: string): string {
  return html.replace(
    /<div\b[^>]*(?:class="[^"]*paywall[^"]*"|data-component-name="[^"]*paywall[^"]*")[^>]*>\s*<\/div>/i,
    '<hr class="paywall-divider" data-paywall="true">'
  );
}

async function importSubscribers(publicationId: string, rows: Record<string, string>[], report: ImportReport) {
  const emails = new Set<string>();
  for (const row of rows.slice(0, MAX_SUBSCRIBERS)) {
    const email = (row.email ?? "").toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) continue;
    report.subscribersFound++;
    // Indirizzi che su Substack non ricevevano più email (rimbalzi, spam): non si importano.
    if (truthy(row.email_disabled)) {
      report.subscribersSkippedDisabled++;
      continue;
    }
    const plan = (row.plan ?? "").toLowerCase();
    if (truthy(row.active_subscription) || (plan && plan !== "free")) report.paidOnSubstack++;
    emails.add(email);
  }
  const list = Array.from(emails);

  for (let i = 0; i < list.length; i += 1000) {
    const chunk = list.slice(i, i + 1000);
    const existing = await prisma.newsletterSubscriber.findMany({
      where: { publicationId, email: { in: chunk } },
      select: { email: true, status: true }
    });
    const byEmail = new Map(existing.map((e) => [e.email, e.status]));
    const fresh = chunk.filter((e) => !byEmail.has(e));
    // Hanno già confermato su Substack: arrivano attivi, senza una nuova email di conferma.
    const created = await prisma.newsletterSubscriber.createMany({
      data: fresh.map((email) => ({ publicationId, email, status: "ACTIVE", source: "IMPORT_SUBSTACK", confirmedAt: new Date() })),
      skipDuplicates: true
    });
    report.subscribersImported += created.count;
    const pending = chunk.filter((e) => byEmail.get(e) === "PENDING");
    if (pending.length > 0) {
      const updated = await prisma.newsletterSubscriber.updateMany({
        where: { publicationId, email: { in: pending }, status: "PENDING" },
        data: { status: "ACTIVE", confirmedAt: new Date(), confirmTokenHash: null }
      });
      report.subscribersReactivated += updated.count;
    }
    // Chi si è disiscritto da ZeroStack resta fuori anche se su Substack risultava iscritto.
    report.subscribersKeptUnsubscribed += chunk.filter((e) => byEmail.get(e) === "UNSUBSCRIBED" || byEmail.get(e) === "BOUNCED").length;
  }
}

async function importPosts(
  publicationId: string,
  authorId: string,
  rows: Record<string, string>[],
  files: Map<string, string>,
  report: ImportReport
) {
  const htmlByPostId = new Map<string, string>();
  for (const [name, content] of Array.from(files)) {
    const match = /(?:^|\/)posts\/([^/]+)\.html$/i.exec(name);
    if (match) htmlByPostId.set(match[1], content);
  }

  for (const row of rows) {
    const postId = row.post_id ?? "";
    const title = (row.title ?? "").trim();
    if (!postId || !title) continue;
    const type = (row.type ?? "newsletter").toLowerCase();
    if (type === "thread") continue; // le discussioni di Substack non sono articoli

    const html = htmlByPostId.get(postId);
    if (!html) {
      report.postsWithoutHtml++;
      continue;
    }
    // post_id di Substack: "123456.titolo-del-post". Si tiene lo stesso slug: i vecchi link restano simili.
    const slug = slugify(postId.includes(".") ? postId.slice(postId.indexOf(".") + 1) : title) || slugify(title) || `post-${postId}`;
    const exists = await prisma.post.findFirst({ where: { publicationId, slug }, select: { id: true } });
    if (exists) {
      report.postsSkippedExisting++;
      continue;
    }

    const contentHtml = sanitizePostHtml(convertSubstackPaywall(html));
    const audience = (row.audience ?? "everyone").toLowerCase();
    const published = truthy(row.is_published);
    const date = new Date(row.post_date || row.email_sent_at || Date.now());
    await prisma.post.create({
      data: {
        publicationId,
        authorId,
        title: title.slice(0, 200),
        subtitle: row.subtitle ? row.subtitle.slice(0, 300) : null,
        slug,
        contentHtml,
        excerpt: excerptFrom(contentHtml),
        access: audience === "only_paid" || audience === "founding" ? "PAID_SUBSCRIBERS" : "FREE",
        format: "ARTICLE",
        // Mai una campagna: questi numeri i lettori li hanno già ricevuti da Substack.
        status: published ? "PUBLISHED" : "DRAFT",
        publishedAt: published && !Number.isNaN(date.getTime()) ? date : null
      }
    });
    if (published) report.postsImported++;
    else report.postsDrafts++;
  }
}

/** Importa iscritti e articoli dall'export di Substack. Si può ripetere: niente doppioni. */
export async function importSubstackExport(input: { publicationId: string; authorId: string; files: Map<string, string> }): Promise<ImportReport> {
  const report: ImportReport = {
    subscribersFound: 0,
    subscribersImported: 0,
    subscribersReactivated: 0,
    subscribersKeptUnsubscribed: 0,
    subscribersSkippedDisabled: 0,
    paidOnSubstack: 0,
    postsImported: 0,
    postsDrafts: 0,
    postsSkippedExisting: 0,
    postsWithoutHtml: 0
  };

  for (const [name, content] of Array.from(input.files)) {
    if (!/\.csv$/i.test(name)) continue;
    const rows = parseCsvRecords(content);
    const keys = new Set(Object.keys(rows[0] ?? {}));
    if (keys.has("post_id")) await importPosts(input.publicationId, input.authorId, rows, input.files, report);
    else if (keys.has("email")) await importSubscribers(input.publicationId, rows, report);
  }
  return report;
}
