import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@zerostack/database";
import { formatPercent, platformFeePercent, publicationBaseUrl } from "@zerostack/shared";
import { getCurrentUser } from "../../../lib/auth";
import { isStripeConfigured } from "../../../lib/stripe";
import { TipForm } from "./TipForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mancia | ZeroStack", robots: { index: false } };

export default async function TipPage({ params, searchParams }: { params: { slug: string }; searchParams: { esito?: string } }) {
  const publication = await prisma.publication.findFirst({
    where: { slug: params.slug, suspendedAt: null },
    select: { id: true, name: true, slug: true, customDomain: true, isDomainVerified: true, stripeAccountId: true, stripeChargesEnabled: true, owner: { select: { name: true } } }
  });
  if (!publication) notFound();
  const user = await getCurrentUser();
  const open = isStripeConfigured() && Boolean(publication.stripeAccountId) && publication.stripeChargesEnabled;
  const back = publicationBaseUrl(publication);
  const here = `/mancia/${publication.slug}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <p className="kicker text-saffron-800">Mancia</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">{publication.name}</h1>
      {searchParams.esito === "ok" ? (
        <div className="mt-6 space-y-4 text-lg">
          <p>Grazie. Il pagamento è in corso di conferma da Stripe: appena arriva, {publication.owner.name} lo trova nel suo Studio insieme al tuo messaggio.</p>
          <a href={back} className="inline-block font-bold underline underline-offset-4">Torna a {publication.name}</a>
        </div>
      ) : !open ? (
        <p className="mt-6 text-lg">Questa pubblicazione non accetta ancora pagamenti. <a href={back} className="font-bold underline underline-offset-4">Torna alla pubblicazione</a></p>
      ) : !user ? (
        <div className="mt-6 space-y-5 text-lg">
          <p>Una mancia è un grazie una tantum a {publication.owner.name}: non è un abbonamento e non si rinnova.</p>
          <Link href={`/login?next=${encodeURIComponent(here)}`} className="inline-block rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper hover:bg-ink-700">
            Entra per lasciare una mancia
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-4 text-lg text-gray-700">
            Un grazie una tantum a {publication.owner.name}: non è un abbonamento e non si rinnova. Paghi con Stripe; ZeroStack trattiene il {formatPercent(platformFeePercent())}, il resto va all&apos;autore.
          </p>
          <div className="mt-8">
            <TipForm publicationId={publication.id} />
          </div>
        </>
      )}
    </div>
  );
}
