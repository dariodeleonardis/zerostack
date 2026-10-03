"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ItalianFiscalForm } from "../../../components/ItalianFiscalForm";

export function CheckoutForm({ tierId, buttonLabel }: { tierId: string; buttonLabel: string }) {
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [fiscal, setFiscal] = useState<{ data: unknown; valid: boolean }>({ data: null, valid: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (wantsInvoice && !fiscal.valid) {
      setError("Completa i dati per la fattura, oppure togli la spunta");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, fiscalData: wantsInvoice ? fiscal.data : undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "Non è stato possibile avviare il pagamento");
        setPending(false);
        return;
      }
      // Carta, SEPA e gli altri metodi li gestisce la pagina sicura di Stripe.
      window.location.assign(data.url);
    } catch {
      setError("Connessione non riuscita. Riprova.");
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
          <input type="checkbox" checked={wantsInvoice} onChange={(e) => setWantsInvoice(e.target.checked)} />
          Mi serve la fattura (codice fiscale, partita IVA, SDI o PEC)
        </label>
      </div>

      {wantsInvoice && <ItalianFiscalForm onChange={(data, valid) => setFiscal({ data, valid })} />}

      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-ink-700 disabled:opacity-50"
      >
        <ShieldCheck className="h-4 w-4" />
        {pending ? "Apertura del pagamento..." : buttonLabel}
      </button>
      <p className="text-center text-xs text-gray-500">
        Pagamento su Stripe con carta, Apple Pay, Google Pay o addebito SEPA. I dati della carta non passano da ZeroStack.
      </p>
    </form>
  );
}
