"use client";

import React from "react";
import Link from "next/link";
import { Lock, CheckCircle2, ShieldCheck } from "lucide-react";

interface PaywallGateProps {
  publicationName: string;
  tierName?: string;
  monthlyPriceEur?: number;
  tierId: string;
  benefits?: string[];
}

export const PaywallGate: React.FC<PaywallGateProps> = ({
  publicationName = "Tech & Futuro Italia",
  tierName = "Abbonato Premium",
  monthlyPriceEur = 7,
  tierId = "demo-tier",
  benefits = [
    "Accesso completo a tutti gli articoli e archivi",
    "Podcast privato riservato agli abbonati",
    "Commenti ed interazione diretta con la redazione",
    "Fattura elettronica valida per deduzione fiscale"
  ]
}) => {
  return (
    <div className="relative my-10 overflow-hidden rounded-2xl border-2 border-blue-500/20 bg-gradient-to-b from-blue-50/50 to-white p-6 sm:p-10 shadow-lg">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <Lock className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-2xl font-black tracking-tight text-gray-900">
          Questo contenuto è riservato agli abbonati
        </h3>

        <p className="mt-2 text-sm text-gray-600">
          Sostieni il giornalismo indipendente di <strong>{publicationName}</strong> per continuare a leggere questa analisi approfondita.
        </p>

        {/* Card Vantaggi & Prezzo */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm">
          <div className="flex items-baseline justify-between border-b border-gray-100 pb-4">
            <div>
              <h4 className="font-bold text-gray-900">{tierName}</h4>
              <p className="text-xs text-gray-500">Accesso immediato senza vincoli</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-gray-900">{monthlyPriceEur}€</span>
              <span className="text-xs text-gray-500"> / mese</span>
            </div>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            {benefits.map((b, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Link
              href={`/checkout/${tierId}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
            >
              Abbonati ora a {monthlyPriceEur}€/mese
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Pagamento sicuro Stripe & SEPA
          </span>
          <span>&bull;</span>
          <span>Disdici con 1 clic</span>
          <span>&bull;</span>
          <span>Dati fiscali per fattura</span>
        </div>
      </div>
    </div>
  );
};
