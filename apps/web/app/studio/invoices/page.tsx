import React from "react";
import { prisma } from "@zerostack/database";
import { requireUser } from "../../../lib/auth";
import { InvoicesPanel, type InvoicePublication } from "./InvoicesPanel";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const user = await requireUser("/studio/invoices");
  const owned = await prisma.publicationMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    orderBy: { publication: { createdAt: "asc" } },
    select: {
      publication: {
        select: {
          id: true,
          name: true,
          fiscalProfile: true,
          invoices: {
            orderBy: [{ year: "desc" }, { number: "desc" }],
            take: 100,
            select: { id: true, label: true, fileName: true, totalCents: true, taxCents: true, buyerName: true, status: true, createdAt: true, payment: { select: { paidAt: true } } }
          }
        }
      }
    }
  });

  const publications: InvoicePublication[] = owned.map(({ publication: p }) => ({
    id: p.id,
    name: p.name,
    profile: p.fiscalProfile
      ? {
          enabled: p.fiscalProfile.enabled,
          kind: p.fiscalProfile.kind === "COMPANY" ? "COMPANY" : "PERSON",
          denominazione: p.fiscalProfile.denominazione ?? "",
          nome: p.fiscalProfile.nome ?? "",
          cognome: p.fiscalProfile.cognome ?? "",
          partitaIva: p.fiscalProfile.partitaIva,
          codiceFiscale: p.fiscalProfile.codiceFiscale,
          regimeFiscale: p.fiscalProfile.regimeFiscale === "RF01" ? "RF01" : "RF19",
          aliquotaIva: p.fiscalProfile.aliquotaIva === 4 ? 4 : 22,
          indirizzo: p.fiscalProfile.indirizzo,
          numeroCivico: p.fiscalProfile.numeroCivico ?? "",
          cap: p.fiscalProfile.cap,
          comune: p.fiscalProfile.comune,
          provincia: p.fiscalProfile.provincia,
          email: p.fiscalProfile.email ?? ""
        }
      : null,
    invoices: p.invoices.map((i) => ({
      id: i.id,
      label: i.label,
      fileName: i.fileName,
      totalCents: i.totalCents,
      taxCents: i.taxCents,
      buyerName: i.buyerName,
      status: i.status,
      date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(i.payment.paidAt)
    }))
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Fatture elettroniche</h1>
        <p className="mt-1 text-sm text-gray-600">
          Quando un lettore chiede la fattura al checkout, ZeroStack la prepara a tuo nome in formato FatturaPA a ogni pagamento, rinnovi compresi.
          Tu la trasmetti allo SdI dal tuo gestionale o dal portale Fatture e Corrispettivi dell'Agenzia delle Entrate.
        </p>
      </div>
      {publications.length === 0 ? (
        <p className="text-sm text-gray-600">Non hai ancora pubblicazioni.</p>
      ) : (
        <InvoicesPanel publications={publications} />
      )}
    </div>
  );
}
