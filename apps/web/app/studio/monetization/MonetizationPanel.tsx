"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Plus, AlertTriangle } from "lucide-react";

export interface PanelTier {
  id: string;
  name: string;
  price: string;
  interval: "MONTH" | "YEAR" | "ONE_TIME";
  isActive: boolean;
  activeSubscribers: number;
}

export interface PanelPublication {
  id: string;
  name: string;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  tiers: PanelTier[];
}

const INTERVAL_LABEL = { MONTH: "/ mese", YEAR: "/ anno", ONE_TIME: "una tantum" } as const;

async function postJson(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function StripeCard({ publication, stripeConfigured }: { publication: PanelPublication; stripeConfigured: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setPending(true);
    setError(null);
    const { ok, data } = await postJson("/api/stripe/connect", { publicationId: publication.id });
    if (ok && data.url) {
      window.location.assign(data.url);
      return;
    }
    setError(data.error ?? "Collegamento non riuscito");
    setPending(false);
  };

  const status = publication.stripeChargesEnabled
    ? { label: "Pagamenti attivi", tone: "text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" /> }
    : publication.stripeAccountId
      ? { label: "Configurazione da completare su Stripe", tone: "text-amber-700", icon: <AlertTriangle className="h-4 w-4" /> }
      : { label: "Stripe non collegato", tone: "text-gray-500", icon: <CreditCard className="h-4 w-4" /> };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className={`flex items-center gap-1.5 text-sm font-bold ${status.tone}`}>
          {status.icon} {status.label}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Gli abbonamenti si incassano sul conto Stripe della pubblicazione.
        </p>
        {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      </div>
      {!publication.stripeChargesEnabled && (
        <button
          type="button"
          onClick={connect}
          disabled={pending || !stripeConfigured}
          title={stripeConfigured ? undefined : "La piattaforma non ha ancora le chiavi Stripe"}
          className="shrink-0 rounded-xl bg-ink-600 px-4 py-2 text-sm font-bold text-white hover:bg-ink-700 disabled:opacity-50"
        >
          {pending ? "Apertura di Stripe..." : publication.stripeAccountId ? "Completa su Stripe" : "Collega Stripe"}
        </button>
      )}
    </div>
  );
}

function NewTierForm({ publicationId, onDone }: { publicationId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("5");
  const [billingInterval, setBillingInterval] = useState<PanelTier["interval"]>("MONTH");
  const [benefits, setBenefits] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { ok, data } = await postJson("/api/tiers", {
      publicationId,
      name,
      description,
      priceEur: Number(price.replace(",", ".")),
      interval: billingInterval,
      benefits: benefits.split("\n").map((b) => b.trim()).filter(Boolean)
    });
    setPending(false);
    if (!ok) {
      setError(data.error ?? "Creazione non riuscita");
      return;
    }
    onDone();
  };

  const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
      <label className="text-xs font-semibold text-gray-700">
        Nome
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Abbonato" required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-gray-700">
          Prezzo (€)
          <input className={input} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" required />
        </label>
        <label className="text-xs font-semibold text-gray-700">
          Rinnovo
          <select className={input} value={billingInterval} onChange={(e) => setBillingInterval(e.target.value as PanelTier["interval"])}>
            <option value="MONTH">Mensile</option>
            <option value="YEAR">Annuale</option>
            <option value="ONE_TIME">Una tantum</option>
          </select>
        </label>
      </div>
      <label className="text-xs font-semibold text-gray-700 sm:col-span-2">
        Descrizione
        <input className={input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tutti gli articoli e l'archivio completo" required />
      </label>
      <label className="text-xs font-semibold text-gray-700 sm:col-span-2">
        Vantaggi (uno per riga)
        <textarea className={input} rows={3} value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder={"Articoli completi\nFattura elettronica"} required />
      </label>
      {error && <p className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {pending ? "Salvataggio..." : "Crea livello"}
        </button>
      </div>
    </form>
  );
}

export function MonetizationPanel({ publications, stripeConfigured }: { publications: PanelPublication[]; stripeConfigured: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState<string | null>(null);

  const toggleTier = async (tier: PanelTier) => {
    const { ok } = await postJson(`/api/tiers/${tier.id}`, { isActive: !tier.isActive }, "PATCH");
    if (ok) router.refresh();
  };

  if (publications.length === 0) {
    return <p className="text-sm text-gray-600">Solo chi possiede una pubblicazione può gestirne gli abbonamenti.</p>;
  }

  return (
    <div className="space-y-8">
      {publications.map((publication) => (
        <section key={publication.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="border-b border-gray-100 pb-3 font-display text-lg font-extrabold text-gray-900">{publication.name}</h2>
          <div className="mt-4">
            <StripeCard publication={publication} stripeConfigured={stripeConfigured} />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Livelli di abbonamento</h3>
            <button
              type="button"
              onClick={() => setAdding(adding === publication.id ? null : publication.id)}
              className="flex items-center gap-1 text-xs font-bold text-ink-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Nuovo livello
            </button>
          </div>

          {adding === publication.id && (
            <NewTierForm
              publicationId={publication.id}
              onDone={() => {
                setAdding(null);
                router.refresh();
              }}
            />
          )}

          {publication.tiers.length === 0 ? (
            <p className="mt-4 text-xs text-gray-500">Nessun livello: i lettori possono solo iscriversi gratis.</p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {publication.tiers.map((tier) => (
                <li key={tier.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className={`text-sm font-bold ${tier.isActive ? "text-gray-900" : "text-gray-400 line-through"}`}>{tier.name}</p>
                    <p className="text-xs text-gray-500">
                      {tier.price} {INTERVAL_LABEL[tier.interval]} · {tier.activeSubscribers} abbonati attivi
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTier(tier)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {tier.isActive ? "Ritira dall'offerta" : "Rimetti in offerta"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
