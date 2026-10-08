import React from "react";
import { prisma } from "@zerostack/database";
import { SUBSTACK_FEE_PERCENT, percentWithArticle, platformFeePercent } from "@zerostack/shared";
import { requireUser } from "../../../lib/auth";
import { isStripeConfigured, syncStripeAccount } from "../../../lib/stripe";
import { MonetizationPanel } from "./MonetizationPanel";
import { formatEuro } from "../../../lib/tips";

export const dynamic = "force-dynamic";

export default async function MonetizationPage({ searchParams }: { searchParams: { stripe?: string; pub?: string } }) {
  const user = await requireUser("/studio/monetization");
  const owned = await prisma.publicationMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    orderBy: { publication: { createdAt: "asc" } },
    select: { publicationId: true }
  });
  const ownedIds = owned.map((o) => o.publicationId);

  // Di ritorno dalla procedura di Stripe: si rilegge subito lo stato del conto senza aspettare il webhook.
  if (searchParams.stripe === "return" && searchParams.pub && ownedIds.includes(searchParams.pub) && isStripeConfigured()) {
    await syncStripeAccount(searchParams.pub).catch((err) => console.error("[monetization] sync Stripe:", err instanceof Error ? err.message : err));
  }

  const publications = await prisma.publication.findMany({
    where: { id: { in: ownedIds } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      tiers: {
        orderBy: [{ isActive: "desc" }, { priceCents: "asc" }],
        select: {
          id: true,
          name: true,
          priceCents: true,
          currency: true,
          interval: true,
          isActive: true,
          _count: { select: { subscriptions: { where: { isPaid: true, status: { in: ["ACTIVE", "TRIALING"] } } } } }
        }
      }
    }
  });

  // Mance (T7): le ultime ricevute, con il messaggio del lettore.
  const tips = await prisma.payment.findMany({
    where: { publicationId: { in: ownedIds }, kind: "TIP" },
    orderBy: { paidAt: "desc" },
    take: 20,
    select: { id: true, amountCents: true, paidAt: true, message: true, publication: { select: { name: true } } }
  });
  const tipsTotal = await prisma.payment.aggregate({ where: { publicationId: { in: ownedIds }, kind: "TIP" }, _sum: { amountCents: true }, _count: true });
  const tipDate = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Monetizzazione</h1>
        <p className="text-xs text-gray-500">Collega Stripe e decidi i livelli di abbonamento delle tue pubblicazioni.</p>
        <p className="mt-2 text-sm text-gray-700">
          Su ogni abbonamento pagato ZeroStack trattiene {percentWithArticle(platformFeePercent(), "il")} (le piattaforme più note {percentWithArticle(SUBSTACK_FEE_PERCENT, "il")}); Stripe applica le sue commissioni sui pagamenti. Su ciò che pubblichi gratis non tratteniamo niente.
        </p>
      </div>
      <MonetizationPanel
        stripeConfigured={isStripeConfigured()}
        publications={publications.map((p) => ({
          id: p.id,
          name: p.name,
          stripeAccountId: p.stripeAccountId,
          stripeChargesEnabled: p.stripeChargesEnabled,
          tiers: p.tiers.map((t) => ({
            id: t.id,
            name: t.name,
            price: new Intl.NumberFormat("it-IT", { style: "currency", currency: t.currency }).format(t.priceCents / 100),
            interval: t.interval,
            isActive: t.isActive,
            activeSubscribers: t._count.subscriptions
          }))
        }))}
      />

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold">Mance ricevute</h2>
          {tipsTotal._count > 0 && (
            <p className="text-sm text-gray-600">
              {tipsTotal._count} in tutto, {formatEuro(tipsTotal._sum.amountCents ?? 0)} lordi
            </p>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Con Stripe collegato, i lettori possono lasciarti una mancia una tantum dal pulsante «Mancia» della tua pubblicazione. Le mance non generano una fattura automatica: se ti serve, emettila tu.
        </p>
        {tips.length === 0 ? (
          <p className="mt-4 text-base italic text-gray-600">Ancora nessuna mancia.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
            {tips.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">
                    {tipDate.format(t.paidAt)}
                    {publications.length > 1 ? ` · ${t.publication.name}` : ""}
                  </p>
                  {t.message && <p className="mt-1 whitespace-pre-line break-words text-base">«{t.message}»</p>}
                </div>
                <span className="font-display text-xl font-extrabold">{formatEuro(t.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
