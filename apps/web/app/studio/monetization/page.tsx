"use client";

import React, { useState } from "react";
import { DollarSign, ShieldCheck, CheckCircle2, Plus, ArrowUpRight, Check } from "lucide-react";

interface MonetizationTier {
  id: string;
  name: string;
  priceEur: number;
  interval: "MONTH" | "YEAR";
  benefits: string[];
}

const initialTiers: MonetizationTier[] = [
  {
    id: "t-1",
    name: "Abbonato Premium",
    priceEur: 7.0,
    interval: "MONTH",
    benefits: [
      "Accesso a tutti gli articoli completi",
      "Podcast privato Dietro le Quinte",
      "Fattura elettronica con SDI / PEC valida in Italia"
    ]
  },
  {
    id: "t-2",
    name: "Membro Fondatore",
    priceEur: 120.0,
    interval: "YEAR",
    benefits: [
      "Tutti i vantaggi Premium per un anno",
      "Ringraziamento speciale in ogni edizione",
      "Canale diretto con l'autore"
    ]
  }
];

export default function MonetizationPage() {
  const [stripeConnected, setStripeConnected] = useState(true);
  const [tiers, setTiers] = useState<MonetizationTier[]>(initialTiers);
  const [newTierName, setNewTierName] = useState("");
  const [newTierPrice, setNewTierPrice] = useState(10);
  const [newTierInterval, setNewTierInterval] = useState<"MONTH" | "YEAR">("MONTH");
  const [showAddTierModal, setShowAddTierModal] = useState(false);

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName.trim()) return;

    const newTier: MonetizationTier = {
      id: "t-" + Date.now(),
      name: newTierName,
      priceEur: newTierPrice,
      interval: newTierInterval,
      benefits: ["Accesso esclusivo riservato a questo livello"]
    };

    setTiers([...tiers, newTier]);
    setNewTierName("");
    setShowAddTierModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Monetizzazione & Stripe Connect</h1>
          <p className="text-xs text-gray-500">
            Collega il tuo conto Stripe per ricevere gli abbonamenti dei tuoi lettori direttamente sul tuo IBAN.
          </p>
        </div>
      </div>

      {/* Stripe Connect Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 font-black text-indigo-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Stripe Connect Express</h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" /> Connesso (acct_1N9x...92)
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                I bonifici degli abbonamenti vengono accreditati direttamente sul tuo conto corrente bancario.
              </p>
            </div>
          </div>

          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Apri Dashboard Stripe <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-4 rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-900 border border-emerald-200/60">
          <strong>💡 Regola 0% Fee di ZeroStack:</strong> A differenza di Substack che trattiene il 10% di ogni abbonato, ZeroStack preleva lo 0,00% sui tuoi guadagni. Paghi solo le tariffe standard di transazione Stripe.
        </div>
      </div>

      {/* Piani & Tiers di Abbonamento */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Livelli di Abbonamento (Tiers)</h2>
            <p className="text-xs text-gray-500">Definisci i piani mensili o annuali per i tuoi lettori sostenitori.</p>
          </div>
          <button
            onClick={() => setShowAddTierModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Aggiungi Livello
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tiers.map((tier) => (
            <div key={tier.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold text-sm text-gray-900">{tier.name}</h3>
                <span className="text-lg font-black text-gray-900">
                  {tier.priceEur.toFixed(2)}€ <span className="text-xs font-normal text-gray-500">/{tier.interval === "MONTH" ? "mese" : "anno"}</span>
                </span>
              </div>

              <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
                {tier.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Aggiungi Tier */}
      {showAddTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleAddTier} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gray-900">Crea Nuovo Livello di Abbonamento</h3>
            
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700">Nome del Livello</label>
                <input
                  type="text"
                  placeholder="Es. Sostenitore VIP"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700">Prezzo (€)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(Number(e.target.value))}
                    className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700">Frequenza</label>
                  <select
                    value={newTierInterval}
                    onChange={(e) => setNewTierInterval(e.target.value as any)}
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="MONTH">Mensile</option>
                    <option value="YEAR">Annuale</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddTierModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Crea Livello
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
