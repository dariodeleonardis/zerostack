"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, DollarSign, Mail, Save, Check } from "lucide-react";

export default function AdminSettingsPage() {
  const [platformFeePercent, setPlatformFeePercent] = useState(0);
  const [stripeClientId, setStripeClientId] = useState("ca_1234567890abcdef");
  const [defaultEmailProvider, setDefaultEmailProvider] = useState("BREVO");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Impostazioni Piattaforma & Stripe Connect</h1>
          <p className="text-xs text-gray-500">Configura i parametri globali del server ZeroStack e i pagamenti Stripe.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Stripe Connect Configuration */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">Configurazione Stripe Connect (Multi-Creator)</h2>
          </div>

          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700">Stripe Connect Client ID</label>
              <input
                type="text"
                value={stripeClientId}
                onChange={(e) => setStripeClientId(e.target.value)}
                placeholder="ca_..."
                className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-xs shadow-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-gray-400">Necessario per permettere ai creator di collegare il proprio conto con Stripe Express.</p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700">Commissione Trattenuta dalla Piattaforma (%)</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={platformFeePercent}
                  onChange={(e) => setPlatformFeePercent(Number(e.target.value))}
                  className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none"
                />
                <span className="font-bold text-emerald-600">
                  {platformFeePercent === 0 ? "✓ 0% (Modello Sovrano ZeroStack)" : `${platformFeePercent}% trattenuto`}
                </span>
              </div>
              <p className="mt-1 text-gray-400">
                Impostando 0%, il creator incassa il 100% dell'abbonamento al netto delle sole commissioni bancarie Stripe.
              </p>
            </div>
          </div>
        </div>

        {/* Email Provider Predefinito */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Mail className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Provider Email Piattaforma di Default</h2>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <label className="block font-semibold text-gray-700">Seleziona provider per i nuovi creator</label>
            <select
              value={defaultEmailProvider}
              onChange={(e) => setDefaultEmailProvider(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:outline-none"
            >
              <option value="BREVO">Brevo (Server UE - Conforme GDPR con IP dedicati)</option>
              <option value="RESEND">Resend (API veloce)</option>
              <option value="SMTP">SMTP Linux VPS Locale</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isSaved ? "Configurazioni Salvate!" : "Salva Impostazioni"}
          </button>
        </div>
      </form>
    </div>
  );
}
