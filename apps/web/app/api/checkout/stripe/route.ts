import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { ItalianBillingSchema, isSubscriptionActive, platformUrlFromEnv } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";
import { ensureStripePrice, isStripeConfigured, stripe } from "../../../../lib/stripe";

/**
 * Crea la sessione di Stripe Checkout sul conto dell'autore e restituisce l'indirizzo a cui
 * mandare il lettore. L'abbonamento diventa attivo solo quando arriva il webhook di Stripe:
 * da qui non si attiva niente.
 */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per abbonarti" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "I pagamenti non sono ancora attivi su questa piattaforma" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const tierId = typeof body?.tierId === "string" ? body.tierId : "";
  const tier = tierId
    ? await prisma.tier.findFirst({
        where: { id: tierId, isActive: true },
        select: { id: true, interval: true, publicationId: true, publication: { select: { id: true, stripeAccountId: true, stripeChargesEnabled: true } } }
      })
    : null;
  if (!tier) {
    return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
  }
  const { publication } = tier;
  if (!publication.stripeAccountId || !publication.stripeChargesEnabled) {
    return NextResponse.json({ error: "Questa pubblicazione non accetta ancora pagamenti" }, { status: 409 });
  }

  const current = await prisma.subscription.findMany({
    where: { userId: user.id, publicationId: publication.id },
    select: { status: true, isPaid: true, currentPeriodEnd: true, stripeCustomerId: true }
  });
  if (current.some((s) => isSubscriptionActive(s))) {
    return NextResponse.json({ error: "Hai già un abbonamento attivo a questa pubblicazione" }, { status: 409 });
  }

  // Dati per la fattura elettronica: facoltativi, ma se ci sono devono essere validi.
  let billingInfoId = "";
  if (body?.fiscalData) {
    const fiscal = ItalianBillingSchema.safeParse(body.fiscalData);
    if (!fiscal.success) {
      return NextResponse.json({ error: fiscal.error.issues[0]?.message ?? "Dati fiscali non validi" }, { status: 400 });
    }
    const f = fiscal.data;
    const saved = await prisma.italianBillingInfo.create({
      data: {
        userId: user.id,
        isCompany: f.isCompany,
        ragioneSociale: f.ragioneSocialeOIntestatario,
        codiceFiscale: f.codiceFiscale.toUpperCase(),
        partitaIva: f.partitaIva || null,
        sdi: f.codiceDestinatarioSDI?.toUpperCase() || null,
        pec: f.pec || null,
        indirizzo: f.indirizzo,
        cap: f.cap,
        citta: f.citta,
        provincia: f.provincia.toUpperCase(),
        paese: f.paese
      },
      select: { id: true }
    });
    billingInfoId = saved.id;
  }

  try {
    const stripeAccount = publication.stripeAccountId;
    const price = await ensureStripePrice(tier.id, stripeAccount);
    const metadata = { userId: user.id, tierId: tier.id, publicationId: publication.id, billingInfoId };
    const knownCustomer = current.find((s) => s.stripeCustomerId)?.stripeCustomerId;
    const platform = platformUrlFromEnv();

    const session = await stripe().checkout.sessions.create(
      {
        mode: tier.interval === "ONE_TIME" ? "payment" : "subscription",
        line_items: [{ price, quantity: 1 }],
        ...(knownCustomer ? { customer: knownCustomer } : { customer_email: user.email }),
        client_reference_id: user.id,
        metadata,
        ...(tier.interval === "ONE_TIME" ? {} : { subscription_data: { metadata } }),
        allow_promotion_codes: true,
        locale: "it",
        success_url: `${platform}/checkout/${tier.id}?esito=ok`,
        cancel_url: `${platform}/checkout/${tier.id}`
      },
      { stripeAccount }
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Stripe non ha risposto. Riprova tra poco." }, { status: 502 });
  }
}
