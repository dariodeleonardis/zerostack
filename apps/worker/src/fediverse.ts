import type { PrismaClient } from "@zerostack/database";
import { platformUrlFromEnv, publicationBaseUrl } from "@zerostack/shared";
import { actorUrls, articleObject, createActivity, deliverActivity, shortNoteObject } from "@zerostack/shared/src/fediverse";
import type { WorkerOptions } from "./campaigns";

/**
 * Consegna al Fediverso (T6): ogni articolo e ogni nota principale appena usciti vanno, una volta
 * sola, alle caselle dei seguaci (una per server quando c'è la casella condivisa). Prima si segna
 * l'uscita come consegnata, poi si spedisce: con due worker accesi nessuno riceve doppioni, e un
 * server che non risponde perde quell'uscita, non blocca le altre.
 */
const BATCH = 20;

async function deliverToFollowers(
  prisma: PrismaClient,
  options: WorkerOptions,
  publication: { id: string; apPrivateKeyPem: string | null },
  object: { id: string; published: string },
  label: string
): Promise<void> {
  if (!publication.apPrivateKeyPem) return;
  const followers = await prisma.apFollower.findMany({ where: { publicationId: publication.id }, select: { inboxUrl: true, sharedInboxUrl: true } });
  const inboxes = Array.from(new Set(followers.map((f) => f.sharedInboxUrl ?? f.inboxUrl)));
  if (inboxes.length === 0) return;
  const actor = actorUrls(platformUrlFromEnv(options.env), publication.id);
  const activity = createActivity(actor, object);
  const signer = { keyId: actor.keyId, privateKeyPem: publication.apPrivateKeyPem };
  let ok = 0;
  for (const inbox of inboxes) {
    try {
      const status = await deliverActivity(inbox, activity, signer, options.env);
      if (status < 300) ok++;
      else options.log(`fediverso: ${inbox} ha risposto ${status} per ${label}`);
    } catch (err) {
      options.log(`fediverso: ${inbox} non raggiungibile per ${label} (${err instanceof Error ? err.message : err})`);
    }
  }
  options.log(`fediverso: ${label} consegnato a ${ok}/${inboxes.length} server`);
}

export async function deliverFediverse(prisma: PrismaClient, options: WorkerOptions): Promise<number> {
  const platform = platformUrlFromEnv(options.env);
  let delivered = 0;

  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", apDeliveredAt: null, format: { not: "NOTE" }, publication: { suspendedAt: null } },
    orderBy: { publishedAt: "asc" },
    take: BATCH,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      publication: { select: { id: true, slug: true, customDomain: true, isDomainVerified: true, apPrivateKeyPem: true } }
    }
  });
  for (const post of posts) {
    const claimed = await prisma.post.updateMany({ where: { id: post.id, apDeliveredAt: null }, data: { apDeliveredAt: new Date() } });
    if (claimed.count === 0 || !post.publishedAt) continue;
    const actor = actorUrls(platform, post.publication.id);
    const object = articleObject(actor, {
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      url: `${publicationBaseUrl(post.publication, options.env)}/${post.slug}`,
      publishedAt: post.publishedAt
    });
    await deliverToFollowers(prisma, options, post.publication, object, `"${post.title}"`);
    delivered++;
  }

  const notes = await prisma.note.findMany({
    where: { apDeliveredAt: null, replyToNoteId: null, publicationId: { not: null }, publication: { suspendedAt: null } },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, content: true, createdAt: true, publication: { select: { id: true, apPrivateKeyPem: true } } }
  });
  for (const note of notes) {
    if (!note.publication) continue;
    const claimed = await prisma.note.updateMany({ where: { id: note.id, apDeliveredAt: null }, data: { apDeliveredAt: new Date() } });
    if (claimed.count === 0) continue;
    const object = shortNoteObject(actorUrls(platform, note.publication.id), { id: note.id, content: note.content, url: `${platform}/notes/${note.id}`, createdAt: note.createdAt });
    await deliverToFollowers(prisma, options, note.publication, object, `la nota ${note.id}`);
    delivered++;
  }
  return delivered;
}
