import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@zerostack/database";
import { verifyStripeSignature } from "../../../../lib/stripe-signature";
import { ensurePaidReaderSubscribed, stripe, upsertSubscriptionFromStripe } from "../../../../lib/stripe";

// Due endpoint possibili su Stripe (eventi della piattaforma e dei conti collegati): ognuno ha il suo segreto.
function webhookSecrets(): string[] {
  return [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter((s): s is string => Boolean(s));
}

type Metadata = { userId?: string; tierId?: string; publicationId?: string; billingInfoId?: string };

/**
 * I metadati li scriviamo noi alla creazione del checkout, ma vanno comunque confrontati con il conto
 * che ha generato l'evento: la pubblicazione indicata deve avere proprio quel conto collegato,
 * altrimenti un autore potrebbe attivare abbonamenti su una pubblicazione altrui.
 */
async function trustedContext(meta: Metadata | null | undefined, account: string) {
  if (!meta?.userId || !meta.publicationId || !account) return null;
  const publication = await prisma.publication.findUnique({ where: { id: meta.publicationId }, select: { id: true, stripeAccountId: true } });
  if (!publication || publication.stripeAccountId !== account) return null;
  const user = await prisma.user.findUnique({ where: { id: meta.userId }, select: { id: true, email: true, name: true } });
  if (!user) return null;
  const tier = meta.tierId
    ? await prisma.tier.findFirst({ where: { id: meta.tierId, publicationId: publication.id }, select: { id: true } })
    : null;
  return { publicationId: publication.id, user, tierId: tier?.id ?? null, billingInfoId: meta.billingInfoId || null };
}

async function linkBillingInfo(billingInfoId: string | null, userId: string, subscriptionId: string) {
  if (!billingInfoId) return;
  await prisma.italianBillingInfo.updateMany({ where: { id: billingInfoId, userId, subscriptionId: null }, data: { subscriptionId } });
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session, account: string) {
  // Con SEPA il pagamento arriva giorni dopo: si attiva con checkout.session.async_payment_succeeded.
  if (session.payment_status === "unpaid") return;
  const ctx = await trustedContext(session.metadata as Metadata, account);
  if (!ctx) return;

  let subscriptionId: string;
  if (session.mode === "subscription" && session.subscription) {
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    const sub = await stripe().subscriptions.retrieve(subId, { stripeAccount: account });
    subscriptionId = await upsertSubscriptionFromStripe(sub, { publicationId: ctx.publicationId, userId: ctx.user.id, tierId: ctx.tierId });
  } else {
    // Pagamento una tantum: accesso senza scadenza. Una sola riga anche se Stripe ripete l'evento.
    const existing = await prisma.subscription.findFirst({
      where: { userId: ctx.user.id, publicationId: ctx.publicationId, tierId: ctx.tierId, stripeSubscriptionId: null, isPaid: true },
      select: { id: true }
    });
    subscriptionId =
      existing?.id ??
      (
        await prisma.subscription.create({
          data: {
            userId: ctx.user.id,
            publicationId: ctx.publicationId,
            tierId: ctx.tierId,
            status: "ACTIVE",
            isPaid: true,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
          },
          select: { id: true }
        })
      ).id;
  }

  await linkBillingInfo(ctx.billingInfoId, ctx.user.id, subscriptionId);
  await ensurePaidReaderSubscribed(ctx.publicationId, ctx.user.email, ctx.user.name);
}

async function onSubscriptionChanged(sub: Stripe.Subscription, account: string) {
  if (!account) return;
  const existing = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: sub.id, publication: { stripeAccountId: account } },
    select: { userId: true, tierId: true, publicationId: true }
  });
  if (existing) {
    await upsertSubscriptionFromStripe(sub, existing);
    return;
  }
  // L'evento può arrivare prima di checkout.session.completed: si crea dai metadati.
  const ctx = await trustedContext(sub.metadata as Metadata, account);
  if (ctx) await upsertSubscriptionFromStripe(sub, { publicationId: ctx.publicationId, userId: ctx.user.id, tierId: ctx.tierId });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Senza verifica chiunque potrebbe inventarsi un "checkout.session.completed".
  const secrets = webhookSecrets();
  if (secrets.length === 0) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET assente: evento rifiutato");
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 503 });
  }
  if (!secrets.some((secret) => verifyStripeSignature(rawBody, sig, secret))) {
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corpo non valido" }, { status: 400 });
  }

  try {
    const account = event.account ?? "";
    switch (event.type) {
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        await prisma.publication.updateMany({ where: { stripeAccountId: acct.id }, data: { stripeChargesEnabled: Boolean(acct.charges_enabled) } });
        break;
      }
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session, account);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await onSubscriptionChanged(event.data.object as Stripe.Subscription, account);
        break;
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    // 500: Stripe ritenta l'evento più tardi, e tutti i gestori sono idempotenti.
    console.error(`[stripe/webhook] ${event.type} non elaborato:`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Elaborazione non riuscita" }, { status: 500 });
  }
}
