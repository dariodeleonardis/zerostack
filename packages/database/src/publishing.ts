import type { PrismaClient } from "@prisma/client";

/**
 * Porta un post a PUBLISHED e, se richiesto, crea la sua campagna email.
 * L'aggiornamento è condizionato allo stato di partenza: se due richieste (o web e worker)
 * pubblicano lo stesso post insieme, solo una vince e la newsletter parte una volta sola.
 */
export async function publishPost(
  prisma: PrismaClient,
  postId: string,
  options: { sendEmail: boolean; from?: Array<"DRAFT" | "SCHEDULED">; now?: Date }
): Promise<{ published: boolean; campaignId: string | null }> {
  const now = options.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.post.updateMany({
      where: { id: postId, status: { in: options.from ?? ["DRAFT", "SCHEDULED"] } },
      data: { status: "PUBLISHED", publishedAt: now, scheduledAt: null }
    });
    if (updated.count === 0) return { published: false, campaignId: null };
    if (!options.sendEmail) return { published: true, campaignId: null };

    const post = await tx.post.findUniqueOrThrow({ where: { id: postId }, select: { publicationId: true, title: true } });
    const campaign = await tx.emailCampaign.create({
      data: { publicationId: post.publicationId, postId, subject: post.title },
      select: { id: true }
    });
    return { published: true, campaignId: campaign.id };
  });
}
