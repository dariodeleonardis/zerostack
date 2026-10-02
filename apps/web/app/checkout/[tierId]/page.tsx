import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { prisma } from "@zerostack/database";
import { isSubscriptionActive, publicationBaseUrl } from "@zerostack/shared";
import { getCurrentUser } from "../../../lib/auth";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";

const INTERVAL_LABEL = { MONTH: "al mese", YEAR: "all'anno", ONE_TIME: "una tantum" } as const;

export default async function CheckoutPage({ params, searchParams }: { params: { tierId: string }; searchParams: { esito?: string } }) {
  const tier = await prisma.tier.findUnique({
    where: { id: params.tierId },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      currency: true,
      interval: true,
      benefits: true,
      isActive: true,
      publication: { select: { id: true, name: true, slug: true, customDomain: true, isDomainVerified: true, stripeChargesEnabled: true } }
    }
  });
  if (!tier) notFound();

  const publication = tier.publication;
  const publicationUrl = publicationBaseUrl(publication);
  const price = new Intl.NumberFormat("it-IT", { style: "currency", currency: tier.currency }).format(tier.priceCents / 100);
  const user = await getCurrentUser();
  const hasActive = user
    ? (
        await prisma.subscription.findMany({
          where: { userId: user.id, publicationId: publication.id },
          select: { status: true, isPaid: true, currentPeriodEnd: true }
        })
      ).some((s) => isSubscriptionActive(s))
    : false;

  // Ritorno da Stripe: l'attivazione arriva con il webhook, di solito in pochi secondi.
  if (searchParams.esito === "ok") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-gray-900">{hasActive ? "Abbonamento attivo" : "Pagamento ricevuto"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Grazie per sostenere <strong>{publication.name}</strong>.{" "}
          {hasActive
            ? "Da adesso leggi tutti gli articoli riservati."
            : "Stiamo attivando l'abbonamento: ci vuole qualche secondo (con l'addebito SEPA qualche giorno). Riceverai una conferma."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a href={publicationUrl} className="rounded-xl bg-ink-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-ink-700">
            Vai a {publication.name}
          </a>
          <Link href="/account/subscriptions" className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
            I miei abbonamenti
          </Link>
        </div>
      </div>
    );
  }

  let action: React.ReactNode;
  if (!tier.isActive) {
    action = <Notice>Questo piano non è più disponibile. Guarda le altre opzioni sulla pagina della pubblicazione.</Notice>;
  } else if (!publication.stripeChargesEnabled) {
    action = <Notice>{publication.name} non accetta ancora pagamenti: l&apos;autore sta completando la configurazione.</Notice>;
  } else if (!user) {
    const next = encodeURIComponent(`/checkout/${tier.id}`);
    action = (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-700">Per abbonarti serve un account: così ritrovi l&apos;abbonamento su ogni dispositivo.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href={`/register?next=${next}`} className="rounded-xl bg-ink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-ink-700">
            Crea l&apos;account
          </Link>
          <Link href={`/login?next=${next}`} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
            Accedi
          </Link>
        </div>
      </div>
    );
  } else if (hasActive) {
    action = <Notice>Hai già un abbonamento attivo a {publication.name}. Lo gestisci da &quot;I miei abbonamenti&quot;.</Notice>;
  } else {
    action = <CheckoutForm tierId={tier.id} buttonLabel={`Abbonati a ${price} ${INTERVAL_LABEL[tier.interval]}`} />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <a href={publicationUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Torna a {publication.name}
        </a>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-600">Riepilogo</span>
            <h1 className="mt-2 font-display text-xl font-extrabold text-gray-900">{publication.name}</h1>
            <p className="text-sm font-semibold text-gray-500">{tier.name}</p>
            <p className="mt-2 text-sm text-gray-600">{tier.description}</p>

            <div className="mt-6 flex items-baseline justify-between border-y border-gray-100 py-4">
              <span className="text-sm text-gray-600">Totale:</span>
              <div className="text-right">
                <span className="font-display text-4xl font-extrabold tracking-tight text-ink">{price}</span>
                <span className="text-xs text-gray-500"> {INTERVAL_LABEL[tier.interval]}</span>
              </div>
            </div>

            <ul className="mt-6 space-y-2.5 text-xs text-gray-600">
              {tier.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {tier.interval !== "ONE_TIME" && (
              <div className="mt-6 rounded-xl bg-saffron-50/60 p-3 text-center text-xs text-ink-900">
                Nessun vincolo: disdici quando vuoi e continui a leggere fino alla fine del periodo pagato.
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-7">{action}</div>
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">{children}</div>;
}
