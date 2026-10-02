import React from "react";
import { prisma } from "@zerostack/database";
import { SUBSTACK_FEE_PERCENT, formatPercent, platformFeePercent } from "@zerostack/shared";
import { requireUser } from "../../../lib/auth";
import { isStripeConfigured, syncStripeAccount } from "../../../lib/stripe";
import { MonetizationPanel } from "./MonetizationPanel";

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Monetizzazione</h1>
        <p className="text-xs text-gray-500">Collega Stripe e decidi i livelli di abbonamento delle tue pubblicazioni.</p>
        <p className="mt-2 text-sm text-gray-700">
          Su ogni abbonamento pagato ZeroStack trattiene il {formatPercent(platformFeePercent())} (Substack il {formatPercent(SUBSTACK_FEE_PERCENT)}); Stripe applica le sue commissioni sui pagamenti. Su ciò che pubblichi gratis non tratteniamo niente.
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
    </div>
  );
}
