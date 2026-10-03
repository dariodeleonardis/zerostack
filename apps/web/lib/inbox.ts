import { prisma } from "@zerostack/database";
import { isSubscriptionActive } from "@zerostack/shared";

/**
 * Posta del lettore (T3, 3/10/2026): gli articoli delle pubblicazioni che segue, con "letto / da
 * leggere". Segue una pubblicazione chi è iscritto alla newsletter (iscrizione confermata) o ha un
 * abbonamento attivo. Si vedono anche gli articoli riservati: aprendoli, chi non è abbonato trova
 * l'anteprima e il modo di abbonarsi.
 */
export const INBOX_PAGE = 30;

export async function followedPublicationIds(user: { id: string; email: string }): Promise<string[]> {
  const [newsletters, subscriptions] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ where: { email: user.email, status: "ACTIVE" }, select: { publicationId: true } }),
    prisma.subscription.findMany({ where: { userId: user.id }, select: { publicationId: true, status: true, isPaid: true, currentPeriodEnd: true } })
  ]);
  const ids = new Set(newsletters.map((n) => n.publicationId));
  for (const s of subscriptions) if (isSubscriptionActive(s)) ids.add(s.publicationId);
  return Array.from(ids);
}

const postWhere = (publicationIds: string[]) => ({
  publicationId: { in: publicationIds },
  status: "PUBLISHED" as const,
  format: { not: "NOTE" as const },
  publication: { suspendedAt: null }
});

/** Una pagina di Posta, dal più recente; `before` è la data di pubblicazione dell'ultimo visto. */
export async function inboxPage(user: { id: string; email: string }, before?: Date) {
  const publicationIds = await followedPublicationIds(user);
  if (publicationIds.length === 0) return { followed: 0, unread: 0, posts: [], next: null as string | null };
  const where = postWhere(publicationIds);
  const [posts, unread] = await Promise.all([
    prisma.post.findMany({
      where: { ...where, ...(before ? { publishedAt: { lt: before } } : {}) },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: INBOX_PAGE + 1,
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        excerpt: true,
        access: true,
        publishedAt: true,
        publication: { select: { name: true, slug: true, customDomain: true, isDomainVerified: true, primaryColor: true } },
        reads: { where: { userId: user.id }, select: { readAt: true } }
      }
    }),
    prisma.post.count({ where: { ...where, reads: { none: { userId: user.id } } } })
  ]);
  const more = posts.length > INBOX_PAGE;
  const page = posts.slice(0, INBOX_PAGE);
  const last = page[page.length - 1]?.publishedAt;
  return {
    followed: publicationIds.length,
    unread,
    posts: page.map(({ reads, ...p }) => ({ ...p, read: reads.length > 0 })),
    next: more && last ? last.toISOString() : null
  };
}

/** Solo il numero da leggere, per la barra in alto (più leggero della pagina intera). */
export async function unreadCount(user: { id: string; email: string }): Promise<number> {
  const publicationIds = await followedPublicationIds(user);
  if (publicationIds.length === 0) return 0;
  return prisma.post.count({ where: { ...postWhere(publicationIds), reads: { none: { userId: user.id } } } });
}

/** Segna come letti tutti gli articoli della Posta (al massimo gli ultimi 1.000). */
export async function markAllRead(user: { id: string; email: string }): Promise<number> {
  const publicationIds = await followedPublicationIds(user);
  if (publicationIds.length === 0) return 0;
  const unread = await prisma.post.findMany({
    where: { ...postWhere(publicationIds), reads: { none: { userId: user.id } } },
    orderBy: { publishedAt: "desc" },
    take: 1000,
    select: { id: true }
  });
  if (unread.length === 0) return 0;
  const created = await prisma.postRead.createMany({ data: unread.map((p) => ({ userId: user.id, postId: p.id })), skipDuplicates: true });
  return created.count;
}

/** Aperto l'articolo: letto. Non blocca mai la pagina. */
export async function markRead(userId: string, postId: string): Promise<void> {
  await prisma.postRead.createMany({ data: [{ userId, postId }], skipDuplicates: true }).catch(() => undefined);
}
