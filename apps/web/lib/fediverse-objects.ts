import { prisma } from "@zerostack/database";
import { platformUrlFromEnv, publicationBaseUrl } from "@zerostack/shared";
import { articleObject, createActivity, shortNoteObject } from "@zerostack/shared/src/fediverse";
import { actorFor } from "./fediverse";

/** Gli articoli e le note di una pubblicazione come oggetti ActivityPub (outbox e indirizzi degli oggetti). */
const postWhere = { status: "PUBLISHED" as const, format: { not: "NOTE" as const } };

export async function articleFor(publicationId: string, postId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, publicationId, ...postWhere },
    select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true, publication: { select: { slug: true, customDomain: true, isDomainVerified: true } } }
  });
  if (!post?.publishedAt) return null;
  return articleObject(actorFor(publicationId), { id: post.id, title: post.title, excerpt: post.excerpt, url: `${publicationBaseUrl(post.publication)}/${post.slug}`, publishedAt: post.publishedAt });
}

export async function noteFor(publicationId: string, noteId: string) {
  const note = await prisma.note.findFirst({ where: { id: noteId, publicationId, replyToNoteId: null }, select: { id: true, content: true, createdAt: true } });
  if (!note) return null;
  return shortNoteObject(actorFor(publicationId), { ...note, url: `${platformUrlFromEnv()}/notes/${note.id}` });
}

/** Le ultime 20 uscite (articoli e note), dalla più recente, come attività Create. */
export async function outboxItems(publicationId: string) {
  const actor = actorFor(publicationId);
  const [posts, notes, totalPosts, totalNotes] = await Promise.all([
    prisma.post.findMany({
      where: { publicationId, ...postWhere },
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true, publication: { select: { slug: true, customDomain: true, isDomainVerified: true } } }
    }),
    prisma.note.findMany({ where: { publicationId, replyToNoteId: null }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, content: true, createdAt: true } }),
    prisma.post.count({ where: { publicationId, ...postWhere } }),
    prisma.note.count({ where: { publicationId, replyToNoteId: null } })
  ]);
  const objects = [
    ...posts
      .filter((p) => p.publishedAt)
      .map((p) => articleObject(actor, { id: p.id, title: p.title, excerpt: p.excerpt, url: `${publicationBaseUrl(p.publication)}/${p.slug}`, publishedAt: p.publishedAt! })),
    ...notes.map((n) => shortNoteObject(actor, { ...n, url: `${platformUrlFromEnv()}/notes/${n.id}` }))
  ]
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, 20);
  return { totalItems: totalPosts + totalNotes, items: objects.map((o) => createActivity(actor, o)) };
}
