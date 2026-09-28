import React from "react";
import { prisma } from "@zerostack/database";
import { isSubscriptionActive, publicationBaseUrl } from "@zerostack/shared";
import { requireUser } from "../../../lib/auth";
import { SubscriptionActions } from "./SubscriptionActions";

export const dynamic = "force-dynamic";

const INTERVAL_LABEL = { MONTH: "al mese", YEAR: "all'anno", ONE_TIME: "una tantum" } as const;

export default async function AccountSubscriptionsPage() {
  const user = await requireUser("/account/subscriptions");
  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.id, isPaid: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      isPaid: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripeSubscriptionId: true,
      tier: { select: { name: true, priceCents: true, currency: true, interval: true } },
      publication: { select: { name: true, slug: true, customDomain: true, isDomainVerified: true } }
    }
  });
  const date = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black text-gray-900">I miei abbonamenti</h1>
      <p className="mt-1 text-sm text-gray-500">Le ricevute di pagamento arrivano via email da Stripe a ogni addebito.</p>

      {subscriptions.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Non hai abbonamenti a pagamento.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {subscriptions.map((sub) => {
            const active = isSubscriptionActive(sub);
            const price = sub.tier
              ? `${new Intl.NumberFormat("it-IT", { style: "currency", currency: sub.tier.currency }).format(sub.tier.priceCents / 100)} ${INTERVAL_LABEL[sub.tier.interval]}`
              : "";
            const detail = !active
              ? sub.status === "PAST_DUE"
                ? "Pagamento non riuscito: aggiorna il metodo di pagamento dal link nell'email di Stripe"
                : "Terminato"
              : !sub.stripeSubscriptionId
                ? "Acquisto una tantum, senza scadenza"
                : sub.cancelAtPeriodEnd && sub.currentPeriodEnd
                  ? `Disdetto: accesso fino al ${date.format(sub.currentPeriodEnd)}`
                  : sub.currentPeriodEnd
                    ? `Si rinnova il ${date.format(sub.currentPeriodEnd)}`
                    : "Attivo";
            return (
              <li key={sub.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <a href={publicationBaseUrl(sub.publication)} className="font-bold text-gray-900 hover:underline">
                    {sub.publication.name}
                  </a>
                  <p className="text-xs text-gray-500">
                    {sub.tier?.name} {price && `· ${price}`}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${active ? "text-emerald-700" : "text-gray-500"}`}>{detail}</p>
                </div>
                {active && sub.stripeSubscriptionId && <SubscriptionActions id={sub.id} cancelAtPeriodEnd={sub.cancelAtPeriodEnd} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
