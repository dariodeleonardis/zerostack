"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CreditCard, ShieldCheck, CheckCircle2, XCircle, ArrowLeft, Download, AlertCircle } from "lucide-react";

interface UserSubscription {
  id: string;
  publicationName: string;
  publicationSlug: string;
  tierName: string;
  priceFormatted: string;
  interval: string;
  nextRenewal: string;
  status: "ATTIVO" | "DISDETTO";
  fiscalReceiptAvailable: boolean;
}

const mockUserSubscriptions: UserSubscription[] = [
  {
    id: "sub-101",
    publicationName: "Tech & Futuro Italia",
    publicationSlug: "tech-italia",
    tierName: "Abbonato Premium",
    priceFormatted: "7,00 €",
    interval: "al mese",
    nextRenewal: "25 Ottobre 2026",
    status: "ATTIVO",
    fiscalReceiptAvailable: true
  },
  {
    id: "sub-102",
    publicationName: "Caffè Finanziario",
    publicationSlug: "caffe-finanza",
    tierName: "Sostenitore Mensile",
    priceFormatted: "5,00 €",
    interval: "al mese",
    nextRenewal: "18 Ottobre 2026",
    status: "ATTIVO",
    fiscalReceiptAvailable: true
  }
];

export default function SubscriptionsManagerPage() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>(mockUserSubscriptions);

  const handleCancelSubscription = (id: string) => {
    if (confirm("Vuoi davvero disdire questo abbonamento? Manterrai l'accesso fino alla fine del periodo già pagato.")) {
      setSubscriptions(
        subscriptions.map((s) => (s.id === id ? { ...s, status: "DISDETTO" } : s))
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">I Tuoi Abbonamenti & Fatture</h1>
          <p className="text-xs text-gray-500">
            Gestisci le tue iscrizioni a pagamento, scarica le ricevute e controlla i dati fiscali italiani.
          </p>
        </div>
        <Link href="/account/profile" className="text-xs font-semibold text-gray-500 hover:text-gray-900">
          Modifica Profilo &rarr;
        </Link>
      </div>

      <div className="space-y-4">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{sub.publicationName}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    sub.status === "ATTIVO"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {sub.status === "ATTIVO" ? "Attivo" : "Disdetto (fino a scadenza)"}
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-600 mt-1">
                Piano: {sub.tierName} &bull; <span className="font-bold text-gray-900">{sub.priceFormatted}</span> {sub.interval}
              </p>

              <p className="text-[11px] text-gray-400 mt-1">
                {sub.status === "ATTIVO" ? `Prossimo rinnovo: ${sub.nextRenewal}` : `Accesso valido fino al: ${sub.nextRenewal}`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {sub.fiscalReceiptAvailable && (
                <button
                  onClick={() => alert("Download ricevuta fiscale conforme Agenzia delle Entrate avviato.")}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  title="Ricevuta con Codice Fiscale / SDI"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" /> Ricevuta Fiscale
                </button>
              )}

              {sub.status === "ATTIVO" ? (
                <button
                  onClick={() => handleCancelSubscription(sub.id)}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                >
                  Disdici con 1 clic
                </button>
              ) : (
                <span className="text-xs text-gray-400 italic">Disdetto</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
