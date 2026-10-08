import { prisma } from "@zerostack/database";
import { sanitizePostHtml } from "./posts";
import { excerptFrom } from "./post-save";
import { parseExport, type ImportedPost, type ImportedSubscriber } from "./import-parsers";
import type { ImportPlatformId } from "./import-platforms";

export { readExport } from "./import-parsers";

export interface ImportReport {
  subscribersFound: number;
  subscribersImported: number;
  subscribersReactivated: number;
  subscribersKeptUnsubscribed: number;
  subscribersSkippedDisabled: number;
  /** Abbonati a pagamento sulla vecchia piattaforma: arrivano come iscritti, l'abbonamento resta là. */
  paidElsewhere: number;
  postsImported: number;
  postsDrafts: number;
  postsSkippedExisting: number;
  postsWithoutHtml: number;
}

async function importSubscribers(publicationId: string, source: string, subscribers: ImportedSubscriber[], report: ImportReport) {
  report.paidElsewhere += subscribers.filter((s) => s.paid).length;
  const list = subscribers.map((s) => s.email);

  for (let i = 0; i < list.length; i += 1000) {
    const chunk = list.slice(i, i + 1000);
    const existing = await prisma.newsletterSubscriber.findMany({
      where: { publicationId, email: { in: chunk } },
      select: { email: true, status: true }
    });
    const byEmail = new Map(existing.map((e) => [e.email, e.status]));
    const fresh = chunk.filter((e) => !byEmail.has(e));
    // Hanno già confermato sulla vecchia piattaforma: arrivano attivi, senza una nuova email di conferma.
    const created = await prisma.newsletterSubscriber.createMany({
      data: fresh.map((email) => ({ publicationId, email, status: "ACTIVE", source, confirmedAt: new Date() })),
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
    // Chi si è disiscritto da ZeroStack resta fuori anche se altrove risultava iscritto.
    report.subscribersKeptUnsubscribed += chunk.filter((e) => byEmail.get(e) === "UNSUBSCRIBED" || byEmail.get(e) === "BOUNCED").length;
  }
}

async function importPosts(publicationId: string, authorId: string, posts: ImportedPost[], report: ImportReport) {
  for (const post of posts) {
    const exists = await prisma.post.findFirst({ where: { publicationId, slug: post.slug }, select: { id: true } });
    if (exists) {
      report.postsSkippedExisting++;
      continue;
    }
    const contentHtml = sanitizePostHtml(post.html);
    await prisma.post.create({
      data: {
        publicationId,
        authorId,
        title: post.title.slice(0, 200),
        subtitle: post.subtitle ? post.subtitle.slice(0, 300) : null,
        slug: post.slug,
        contentHtml,
        excerpt: excerptFrom(contentHtml),
        access: post.access,
        format: "ARTICLE",
        // Mai una campagna: questi numeri i lettori li hanno già ricevuti.
        status: post.published ? "PUBLISHED" : "DRAFT",
        publishedAt: post.published ? (post.date ?? new Date()) : null
      }
    });
    if (post.published) report.postsImported++;
    else report.postsDrafts++;
  }
}

/** Importa iscritti e articoli dall'export di un'altra piattaforma. Si può ripetere: niente doppioni. */
export async function runImport(input: {
  platform: ImportPlatformId;
  publicationId: string;
  authorId: string;
  files: Map<string, string>;
}): Promise<ImportReport> {
  const parsed = parseExport(input.platform, input.files);
  const report: ImportReport = {
    subscribersFound: parsed.subscribersFound,
    subscribersImported: 0,
    subscribersReactivated: 0,
    subscribersKeptUnsubscribed: 0,
    subscribersSkippedDisabled: parsed.subscribersSkippedDisabled,
    paidElsewhere: 0,
    postsImported: 0,
    postsDrafts: 0,
    postsSkippedExisting: 0,
    postsWithoutHtml: parsed.postsWithoutHtml
  };
  await importSubscribers(input.publicationId, `IMPORT_${input.platform.toUpperCase()}`, parsed.subscribers, report);
  await importPosts(input.publicationId, input.authorId, parsed.posts, report);
  return report;
}
