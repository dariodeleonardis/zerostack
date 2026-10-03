import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";
import { stripe, upsertSubscriptionFromStripe } from "../../../../lib/stripe";

/**
 * Disdetta ("cancel") o ripensamento ("resume") di un abbonamento del lettore.
 * La disdetta vale a fine periodo: si continua a leggere fino al giorno già pagato.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per gestire i tuoi abbonamenti" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "cancel" && body?.action !== "resume") {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, tierId: true, publicationId: true, stripeSubscriptionId: true, publication: { select: { stripeAccountId: true } } }
  });
  if (!subscription) {
    return NextResponse.json({ error: "Abbonamento non trovato" }, { status: 404 });
  }
  if (!subscription.stripeSubscriptionId || !subscription.publication.stripeAccountId) {
    return NextResponse.json({ error: "Questo acquisto non ha rinnovi da disdire" }, { status: 400 });
  }

  try {
    const updated = await stripe().subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: body.action === "cancel" },
      { stripeAccount: subscription.publication.stripeAccountId }
    );
    await upsertSubscriptionFromStripe(updated, { publicationId: subscription.publicationId, userId: user.id, tierId: subscription.tierId });
    return NextResponse.json({ ok: true, cancelAtPeriodEnd: updated.cancel_at_period_end });
  } catch (err) {
    console.error("[subscriptions]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Stripe non ha risposto. Riprova tra poco." }, { status: 502 });
  }
}
