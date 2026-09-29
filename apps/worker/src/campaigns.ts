import { publishPost, type PrismaClient } from "@zerostack/database";
import { buildNewsletterEmail, EmailSendError, type EmailTransport } from "@zerostack/email";
import { isSubscriptionActive, platformUrlFromEnv, publicationBaseUrl, splitAtPaywall } from "@zerostack/shared";

export interface WorkerOptions {
  /** Email al secondo verso il provider (Brevo e Resend hanno limiti per piano). */
  ratePerSecond: number;
  batchSize: number;
  /** Tentativi per un errore temporaneo (rete, 429, 5xx) prima di arrendersi su un destinatario. */
  maxAttempts: number;
  /** Dopo tanti errori di fila la campagna si ferma: di solito è la chiave API, non i destinatari. */
  maxConsecutiveFailures: number;
  /** Una campagna PROCESSING senza segni di vita da così tanto si considera abbandonata. */
  staleAfterMs: number;
  env: NodeJS.ProcessEnv;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
}

export const defaultOptions = (env: NodeJS.ProcessEnv = process.env): WorkerOptions => ({
  ratePerSecond: Number(env.EMAIL_RATE_PER_SECOND || 10),
  batchSize: 200,
  maxAttempts: 3,
  maxConsecutiveFailures: 20,
  staleAfterMs: 10 * 60 * 1000,
  env,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log: (message) => console.log(`[worker] ${message}`)
});

/** Pubblica i post programmati arrivati alla loro ora (e ne crea la campagna, se chiesto). */
export async function publishDueScheduledPosts(prisma: PrismaClient, options: WorkerOptions, now = new Date()): Promise<number> {
  const due = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now }, publication: { suspendedAt: null } },
    select: { id: true, title: true, emailOnPublish: true },
    take: 50
  });
  let published = 0;
  for (const post of due) {
    const result = await publishPost(prisma, post.id, { sendEmail: post.emailOnPublish, from: ["SCHEDULED"], now });
    if (result.published) {
      published++;
      options.log(`pubblicato il post programmato "${post.title}"${result.campaignId ? " con invio email" : ""}`);
    }
  }
  return published;
}

/** Prende in carico una campagna in attesa (o abbandonata da un worker caduto). Una sola vince. */
export async function claimNextCampaign(prisma: PrismaClient, options: WorkerOptions): Promise<string | null> {
  const staleBefore = new Date(Date.now() - options.staleAfterMs);
  const candidates = await prisma.emailCampaign.findMany({
    where: {
      OR: [{ status: "PENDING" }, { status: "PROCESSING", startedAt: { lt: staleBefore } }],
      // Le pubblicazioni sospese non spediscono: la campagna resta in coda finché non vengono riattivate.
      publication: { suspendedAt: null }
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true, startedAt: true },
    take: 5
  });
  for (const candidate of candidates) {
    const claimed = await prisma.emailCampaign.updateMany({
      where: { id: candidate.id, status: candidate.status, startedAt: candidate.startedAt },
      data: { status: "PROCESSING", startedAt: new Date() }
    });
    if (claimed.count === 1) return candidate.id;
  }
  return null;
}

async function paidReaderEmails(prisma: PrismaClient, publicationId: string): Promise<Set<string>> {
  const [subscriptions, members] = await Promise.all([
    prisma.subscription.findMany({
      where: { publicationId, isPaid: true, status: { in: ["ACTIVE", "TRIALING"] } },
      select: { status: true, isPaid: true, currentPeriodEnd: true, user: { select: { email: true } } }
    }),
    prisma.publicationMember.findMany({ where: { publicationId }, select: { user: { select: { email: true } } } })
  ]);
  const emails = new Set<string>();
  for (const sub of subscriptions) if (isSubscriptionActive(sub)) emails.add(sub.user.email.toLowerCase());
  for (const member of members) emails.add(member.user.email.toLowerCase());
  return emails;
}

async function sendWithRetry(transport: EmailTransport, message: Parameters<EmailTransport["send"]>[0], options: WorkerOptions) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await transport.send(message);
    } catch (err) {
      const permanent = err instanceof EmailSendError && err.permanent;
      if (permanent || attempt >= options.maxAttempts) throw err;
      await options.sleep(1000 * 2 ** (attempt - 1));
    }
  }
}

export interface CampaignResult {
  status: "SENT" | "FAILED";
  sent: number;
  failed: number;
}

/**
 * Spedisce una campagna a tutti gli iscritti attivi. Ogni destinatario viene prima "prenotato"
 * con una riga EmailDelivery (vincolo unico campagna+iscritto) e poi servito: se il worker cade
 * a metà, al riavvio riparte da chi non ha ancora una riga e nessuno riceve due copie.
 */
export async function processCampaign(
  prisma: PrismaClient,
  transport: EmailTransport,
  campaignId: string,
  options: WorkerOptions
): Promise<CampaignResult> {
  const campaign = await prisma.emailCampaign.findUniqueOrThrow({
    where: { id: campaignId },
    select: {
      id: true,
      publicationId: true,
      post: {
        select: {
          slug: true,
          title: true,
          subtitle: true,
          contentHtml: true,
          access: true,
          publishedAt: true,
          author: { select: { name: true } }
        }
      },
      publication: {
        select: { name: true, slug: true, customDomain: true, isDomainVerified: true, primaryColor: true, logoUrl: true, fromEmail: true }
      }
    }
  });
  const { post, publication } = campaign;

  const { preview, rest, hasDivider } = splitAtPaywall(post.contentHtml);
  const fullHtml = `${preview}${rest}`;
  const isPaid = post.access !== "FREE";
  const paidEmails = isPaid ? await paidReaderEmails(prisma, campaign.publicationId) : new Set<string>();
  // Post a pagamento senza divisore: a chi non paga arriva solo l'invito ad abbonarsi.
  const teaserHtml = hasDivider ? preview : "";

  const postUrl = `${publicationBaseUrl(publication, options.env)}/${post.slug}`;
  const platformUrl = platformUrlFromEnv(options.env);
  const pubInfo = { name: publication.name, primaryColor: publication.primaryColor, logoUrl: publication.logoUrl, replyTo: publication.fromEmail };

  const recipientsCount = await prisma.newsletterSubscriber.count({ where: { publicationId: campaign.publicationId, status: "ACTIVE" } });
  await prisma.emailCampaign.update({ where: { id: campaignId }, data: { recipientsCount } });
  options.log(`campagna "${post.title}": ${recipientsCount} destinatari`);

  const pause = options.ratePerSecond > 0 ? 1000 / options.ratePerSecond : 0;
  let consecutiveFailures = 0;
  let abortReason: string | null = null;

  while (!abortReason) {
    const batch = await prisma.newsletterSubscriber.findMany({
      where: { publicationId: campaign.publicationId, status: "ACTIVE", deliveries: { none: { campaignId } } },
      orderBy: { id: "asc" },
      take: options.batchSize,
      select: { id: true, email: true, unsubscribeToken: true }
    });
    if (batch.length === 0) break;

    for (const subscriber of batch) {
      // Prenotazione: se un altro worker l'ha già preso, il vincolo unico lo dice e si passa oltre.
      const reserved = await prisma.emailDelivery
        .create({ data: { campaignId, subscriberId: subscriber.id, status: "SENDING" }, select: { id: true } })
        .catch(() => null);
      if (!reserved) continue;

      const fullAccess = !isPaid || paidEmails.has(subscriber.email.toLowerCase());
      const unsubscribeUrl = `${platformUrl}/api/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;
      const message = buildNewsletterEmail({
        to: subscriber.email,
        publicationId: campaign.publicationId,
        publication: pubInfo,
        post: { title: post.title, subtitle: post.subtitle, authorName: post.author.name, publishedAt: post.publishedAt ?? new Date() },
        contentHtml: fullAccess ? fullHtml : teaserHtml,
        hasPaywall: !fullAccess,
        postUrl,
        unsubscribeUrl,
        oneClickUrl: unsubscribeUrl
      });

      try {
        await sendWithRetry(transport, message, options);
        await prisma.emailDelivery.update({ where: { id: reserved.id }, data: { status: "SENT" } });
        consecutiveFailures = 0;
      } catch (err) {
        const reason = (err instanceof Error ? err.message : String(err)).slice(0, 500);
        await prisma.emailDelivery.update({ where: { id: reserved.id }, data: { status: "FAILED", error: reason } });
        consecutiveFailures++;
        if (consecutiveFailures >= options.maxConsecutiveFailures) {
          abortReason = `Invio interrotto dopo ${consecutiveFailures} errori consecutivi. Ultimo: ${reason}`;
          break;
        }
      }
      if (pause) await options.sleep(pause);
    }
    // Segno di vita: una campagna lunga non deve sembrare abbandonata.
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { startedAt: new Date() } });
  }

  const counts = await prisma.emailDelivery.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });
  const sent = counts.find((c) => c.status === "SENT")?._count._all ?? 0;
  const failed = counts.find((c) => c.status === "FAILED")?._count._all ?? 0;
  const status = abortReason ? "FAILED" : "SENT";
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status, sentCount: sent, failedCount: failed, lastError: abortReason, sentAt: abortReason ? null : new Date() }
  });
  options.log(`campagna "${post.title}": ${status}, ${sent} inviate, ${failed} non riuscite`);
  return { status, sent, failed };
}

/** Un giro completo: post programmati, poi tutte le campagne in attesa. */
export async function runOnce(prisma: PrismaClient, transport: EmailTransport, options: WorkerOptions): Promise<number> {
  await publishDueScheduledPosts(prisma, options);
  let processed = 0;
  for (let id = await claimNextCampaign(prisma, options); id; id = await claimNextCampaign(prisma, options)) {
    await processCampaign(prisma, transport, id, options);
    processed++;
  }
  return processed;
}
