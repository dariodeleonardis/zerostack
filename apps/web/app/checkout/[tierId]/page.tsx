"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ItalianFiscalForm } from "../../../components/ItalianFiscalForm";
import { ShieldCheck, CreditCard, Landmark, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function CheckoutPage({ params }: { params: { tierId: string } }) {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "sepa">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fiscalData, setFiscalData] = useState<any>(null);

  const tier = {
    name: "Abbonato Premium",
    publication: "Tech & Futuro Italia",
    price: 7.00,
    interval: "al mese",
    benefits: [
      "Accesso completo ad articoli e archivio storico",
      "Podcast privato e puntate speciali",
      "Fattura elettronica valida per deduzione fiscale in Italia"
    ]
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: params.tierId,
          paymentMethod,
          fiscalData
        })
      });

      if (res.ok) {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error(err);
      alert("Errore durante l'elaborazione del pagamento.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-gray-900">Abbonamento Attivato con Successo!</h1>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Grazie per aver sostenuto <strong>{tier.publication}</strong>. Abbiamo inviato la conferma alla tua email. Se hai inserito dati aziendali, la fattura elettronica verrà recapitata al tuo codice SDI o PEC.
        </p>
        <div className="mt-6">
          <Link
            href="/p/tech-italia/alternativa-italiana-a-substack"
            className="inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700"
          >
            Torna all'articolo completo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/p/tech-italia/alternativa-italiana-a-substack"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Torna all'articolo
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Riepilogo Piano & Vantaggi */}
        <div className="md:col-span-5 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Riepilogo Ordine</span>
            <h2 className="mt-2 text-xl font-black text-gray-900">{tier.publication}</h2>
            <p className="text-sm font-semibold text-gray-500">{tier.name}</p>

            <div className="mt-6 flex items-baseline justify-between border-y border-gray-100 py-4">
              <span className="text-sm text-gray-600">Totale addebito:</span>
              <div className="text-right">
                <span className="text-2xl font-black text-gray-900">{tier.price.toFixed(2)}€</span>
                <span className="text-xs text-gray-500"> {tier.interval}</span>
              </div>
            </div>

            <ul className="mt-6 space-y-2.5 text-xs text-gray-600">
              {tier.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl bg-blue-50/60 p-3 text-center text-xs text-blue-900">
              🛡️ Nessun vincolo. Disdici in 1 clic dal tuo account in qualsiasi momento.
            </div>
          </div>
        </div>

        {/* Modulo Checkout & Dati Fiscali */}
        <div className="md:col-span-7 space-y-6">
          <form onSubmit={handleCheckout} className="space-y-6">
            {/* Selezione Metodo di Pagamento */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-sm text-gray-900 mb-4">Metodo di Pagamento</h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition ${
                    paymentMethod === "card"
                      ? "border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-sm"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <CreditCard className="h-5 w-5 mb-1 text-blue-600" />
                  <span className="text-xs">Carta di Credito / Debito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("sepa")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition ${
                    paymentMethod === "sepa"
                      ? "border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-sm"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Landmark className="h-5 w-5 mb-1 text-blue-600" />
                  <span className="text-xs">Addebito Diretto SEPA</span>
                </button>
              </div>

              {/* Dati Carta Fittizi per anteprima */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Numero Carta</label>
                  <input
                    type="text"
                    placeholder="4242 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Scadenza</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">CVC</label>
                    <input
                      type="text"
                      placeholder="123"
                      maxLength={4}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dati Fiscali Italiani (CF / P.IVA / SDI / PEC) */}
            <ItalianFiscalForm onChange={(data) => setFiscalData(data)} />

            {/* Pulsante Conferma Ordine */}
            <button
              type="submit"
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {isProcessing ? "Elaborazione transazione..." : `Abbonati Subito a ${tier.price.toFixed(2)}€/mese`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
