import Stripe from "stripe";
import { prisma, Prisma } from "@zerostack/database";
import { mapStripeSubscriptionStatus } from "@zerostack/shared";

let client: Stripe | null = null;

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Pagamenti non configurati: manca STRIPE_SECRET_KEY");
  }
}

/**
 * Client Stripe della piattaforma. Ogni pubblicazione ha il proprio conto collegato (Connect Express):
 * le chiamate per conto dell'autore passano `{ stripeAccount }`, così l'incasso va direttamente
 * sul suo conto; la piattaforma trattiene solo la sua commissione (application_fee, vedi
 * platformFeePercent in packages/shared/src/billing.ts).
 * STRIPE_API_BASE (solo test) punta il client a un server finto compatibile.
 */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();
  if (!client) {
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
    client = new Stripe(key, {
      appInfo: { name: "ZeroStack" },
      maxNetworkRetries: 2,
      ...(base
        ? { host: base.hostname, port: Number(base.port || (base.protocol === "https:" ? 443 : 80)), protocol: base.protocol.replace(":", "") as "http" | "https" }
        : {})
    });
  }
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Legge dal conto collegato se può incassare e aggiorna la pubblicazione. */
export async function syncStripeAccount(publicationId: string): Promise<boolean> {
  const publication = await prisma.publication.findUnique({ where: { id: publicationId }, select: { stripeAccountId: true } });
  if (!publication?.stripeAccountId) return false;
  const account = await stripe().accounts.retrieve(publication.stripeAccountId);
  const enabled = Boolean(account.charges_enabled);
  await prisma.publication.update({ where: { id: publicationId }, data: { stripeChargesEnabled: enabled } });
  return enabled;
}

/**
 * Prezzo Stripe di un livello, creato sul conto dell'autore alla prima vendita.
 * Il prezzo di un livello non cambia: per un prezzo nuovo si crea un livello nuovo.
 */
export async function ensureStripePrice(tierId: string, stripeAccount: string): Promise<string> {
  const tier = await prisma.tier.findUniqueOrThrow({
    where: { id: tierId },
    select: { id: true, name: true, description: true, priceCents: true, currency: true, interval: true, stripePriceId: true, publication: { select: { name: true } } }
  });
  if (tier.stripePriceId) return tier.stripePriceId;

  const api = stripe();
  const product = await api.products.create(
    { name: `${tier.publication.name} – ${tier.name}`, description: tier.description, metadata: { tierId: tier.id } },
    { stripeAccount, idempotencyKey: `zs-product-${tier.id}` }
  );
  const price = await api.prices.create(
    {
      product: product.id,
      currency: tier.currency.toLowerCase(),
      unit_amount: tier.priceCents,
      ...(tier.interval === "ONE_TIME" ? {} : { recurring: { interval: tier.interval === "YEAR" ? "year" : "month" } }),
      metadata: { tierId: tier.id }
    },
    { stripeAccount, idempotencyKey: `zs-price-${tier.id}` }
  );
  await prisma.tier.update({ where: { id: tier.id }, data: { stripePriceId: price.id } });
  return price.id;
}

/** Copia lo stato di un abbonamento Stripe nella riga locale (crea la riga se manca). */
export async function upsertSubscriptionFromStripe(
  sub: Stripe.Subscription,
  context: { publicationId: string; userId: string; tierId: string | null }
): Promise<string> {
  const data = {
    status: mapStripeSubscriptionStatus(sub.status),
    isPaid: true,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id
  };
  // stripeSubscriptionId è unico: se due webhook arrivano insieme, uno crea e l'altro trova il vincolo
  // (P2002) e aggiorna la riga appena creata. Mai due abbonamenti per lo stesso abbonamento Stripe.
  const create = { ...data, stripeSubscriptionId: sub.id, publicationId: context.publicationId, userId: context.userId, tierId: context.tierId };
  try {
    const row = await prisma.subscription.upsert({ where: { stripeSubscriptionId: sub.id }, update: data, create, select: { id: true } });
    return row.id;
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    const row = await prisma.subscription.update({ where: { stripeSubscriptionId: sub.id }, data, select: { id: true } });
    return row.id;
  }
}

/**
 * Chi paga riceve anche la newsletter: se non è iscritto lo diventa (attivo, ha appena dato
 * la sua email per abbonarsi). Chi si era disiscritto resta disiscritto.
 */
export async function ensurePaidReaderSubscribed(publicationId: string, email: string, name: string | null) {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { publicationId_email: { publicationId, email } },
    select: { id: true, status: true }
  });
  if (!existing) {
    await prisma.newsletterSubscriber.create({
      data: { publicationId, email, name, status: "ACTIVE", source: "PAID", confirmedAt: new Date() }
    });
  } else if (existing.status === "PENDING") {
    await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", confirmedAt: new Date(), confirmTokenHash: null }
    });
  }
}
