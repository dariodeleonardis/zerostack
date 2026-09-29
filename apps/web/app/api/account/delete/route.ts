import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { destroySession, getCurrentUser, isSameOriginJson, verifyPassword } from "../../../../lib/auth";
import { isStripeConfigured, stripe } from "../../../../lib/stripe";
import { getStorage } from "../../../../lib/storage";

/**
 * Cancellazione dell'account (art. 17 GDPR). Prima si fermano gli addebiti su Stripe: un abbonamento
 * rimasto attivo continuerebbe a prelevare da una persona che non ha più un account.
 * Chi possiede pubblicazioni con abbonati paganti attivi deve prima occuparsene (non si cancellano per lui).
 */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "ELIMINA") {
    return NextResponse.json({ error: "Scrivi ELIMINA per confermare" }, { status: 400 });
  }
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (typeof body?.password !== "string" || !(await verifyPassword(body.password, row.passwordHash))) {
    return NextResponse.json({ error: "Password non corretta" }, { status: 400 });
  }

  const paidReaders = await prisma.subscription.count({
    where: { publication: { ownerId: user.id }, isPaid: true, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, userId: { not: user.id } }
  });
  if (paidReaders > 0) {
    return NextResponse.json(
      { error: `Le tue pubblicazioni hanno ${paidReaders} abbonati paganti attivi: disattiva i livelli e attendi la fine degli abbonamenti (o scrivici) prima di cancellare l'account.` },
      { status: 409 }
    );
  }

  // I propri abbonamenti Stripe si chiudono subito; se Stripe non risponde non si cancella niente.
  const own = await prisma.subscription.findMany({
    where: { userId: user.id, stripeSubscriptionId: { not: null }, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    select: { stripeSubscriptionId: true, publication: { select: { stripeAccountId: true } } }
  });
  if (own.length > 0) {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Non riusciamo a chiudere i tuoi abbonamenti ora. Riprova più tardi." }, { status: 503 });
    }
    try {
      for (const sub of own) {
        await stripe().subscriptions.cancel(sub.stripeSubscriptionId!, {}, { stripeAccount: sub.publication.stripeAccountId ?? undefined });
      }
    } catch (err) {
      console.error("[account/delete] Stripe:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Non riusciamo a chiudere i tuoi abbonamenti su Stripe. Riprova tra poco." }, { status: 502 });
    }
  }

  const media = await prisma.media.findMany({ where: { ownerId: user.id }, select: { key: true } });
  await prisma.$transaction([
    // Anche le iscrizioni alle newsletter fatte con questo indirizzo.
    prisma.newsletterSubscriber.deleteMany({ where: { email: user.email } }),
    // Il resto (pubblicazioni possedute, articoli, sessioni, file registrati) segue per cascata.
    prisma.user.delete({ where: { id: user.id } })
  ]);
  // I file si cancellano dopo: se qualcosa va storto restano orfani, non si perde la cancellazione.
  const storage = getStorage();
  await Promise.allSettled(media.map((m) => storage.remove(m.key)));

  await destroySession();
  return NextResponse.json({ ok: true });
}
