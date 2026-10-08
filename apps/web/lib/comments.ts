import { prisma } from "@zerostack/database";
import { platformSender } from "@zerostack/email";
import { publicationBaseUrl } from "@zerostack/shared";
import { canReadFullPost, isSubscriptionActive } from "./posts";
import { emailTransport } from "./email";

/**
 * Commenti agli articoli (T1, 3/10/2026). Regole:
 * - scrive chi ha l'accesso e l'email confermata (contro lo spam), e legge l'articolo intero;
 * - le risposte sono di un solo livello;
 * - modera chi è proprietario o editor della pubblicazione: nasconde (reversibile) o cancella;
 * - chi ha scritto un commento lo può cancellare;
 * - testo semplice, mai HTML: lo si mostra così com'è e React lo protegge.
 */
export const COMMENT_MIN = 2;
export const COMMENT_MAX = 2000;

export async function readerAccess(userId: string | undefined, publicationId: string) {
  if (!userId) return { isMember: false, hasPaidSubscription: false };
  const [member, subscriptions] = await Promise.all([
    prisma.publicationMember.findUnique({ where: { publicationId_userId: { publicationId, userId } }, select: { id: true } }),
    prisma.subscription.findMany({ where: { publicationId, userId }, select: { status: true, isPaid: true, currentPeriodEnd: true } })
  ]);
  return { isMember: Boolean(member), hasPaidSubscription: subscriptions.some((s) => isSubscriptionActive(s)) };
}

/** Proprietario o editor della pubblicazione: può nascondere e cancellare i commenti. */
export async function canModerate(userId: string | undefined, publicationId: string): Promise<boolean> {
  if (!userId) return false;
  const member = await prisma.publicationMember.findUnique({
    where: { publicationId_userId: { publicationId, userId } },
    select: { role: true }
  });
  return member?.role === "OWNER" || member?.role === "EDITOR";
}

/** Articolo commentabile: pubblicato, non una nota, pubblicazione non sospesa. */
export function findCommentablePost(postId: string) {
  return prisma.post.findFirst({
    where: { id: postId, status: "PUBLISHED", format: { not: "NOTE" }, publication: { suspendedAt: null } },
    select: {
      id: true,
      title: true,
      slug: true,
      access: true,
      publicationId: true,
      publication: { select: { name: true, slug: true, customDomain: true, isDomainVerified: true, owner: { select: { id: true, email: true, name: true } } } }
    }
  });
}

export type CommentablePost = NonNullable<Awaited<ReturnType<typeof findCommentablePost>>>;

export async function canReadComments(userId: string | undefined, post: Pick<CommentablePost, "access" | "publicationId">): Promise<boolean> {
  return canReadFullPost(post.access, await readerAccess(userId, post.publicationId));
}

/** Problema del testo, o null se va bene. */
export function commentProblem(content: unknown): string | null {
  if (typeof content !== "string") return "Scrivi il commento";
  const text = content.trim();
  if (text.length < COMMENT_MIN) return "Il commento è troppo corto";
  if (text.length > COMMENT_MAX) return `Il commento è troppo lungo (massimo ${COMMENT_MAX} caratteri)`;
  return null;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Avviso all'autore della pubblicazione (non per i suoi stessi commenti). Un invio fallito non blocca il commento. */
export async function notifyOwner(post: CommentablePost, commenter: { id: string; name: string }, content: string): Promise<void> {
  const owner = post.publication.owner;
  if (owner.id === commenter.id) return;
  const url = `${publicationBaseUrl(post.publication)}/${post.slug}#commenti`;
  const excerpt = content.length > 400 ? `${content.slice(0, 400)}…` : content;
  try {
    await emailTransport().send({
      from: platformSender("ZeroStack"),
      to: owner.email,
      subject: `Nuovo commento su «${post.title}»`,
      text: `${commenter.name} ha commentato «${post.title}»:\n\n${excerpt}\n\nRispondi o modera: ${url}`,
      html: `<p><strong>${escapeHtml(commenter.name)}</strong> ha commentato «${escapeHtml(post.title)}»:</p><blockquote style="white-space:pre-line">${escapeHtml(excerpt)}</blockquote><p><a href="${escapeHtml(url)}">Rispondi o modera</a></p>`
    });
  } catch (err) {
    console.error("[commenti] avviso all'autore non inviato:", err instanceof Error ? err.message : err);
  }
}
