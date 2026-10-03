"use client";

import React, { useState } from "react";
import { TIP_MAX_CENTS, TIP_MESSAGE_MAX, TIP_MIN_CENTS, TIP_PRESETS_CENTS, euroToCents, formatEuro } from "../../../lib/tips";

export function TipForm({ publicationId }: { publicationId: string }) {
  const [preset, setPreset] = useState<number | null>(TIP_PRESETS_CENTS[1]);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = preset ?? euroToCents(custom);
  const valid = amount !== null && amount >= TIP_MIN_CENTS && amount <= TIP_MAX_CENTS;

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setPending(true);
        setError(null);
        const res = await fetch("/api/tips/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicationId, amountCents: amount, message })
        }).catch(() => null);
        const data = await res?.json().catch(() => null);
        if (res?.ok && data?.url) {
          window.location.assign(data.url);
          return;
        }
        setPending(false);
        setError(data?.error ?? "Connessione assente: riprova");
      }}
    >
      <fieldset>
        <legend className="text-sm font-bold">Quanto</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIP_PRESETS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              aria-pressed={preset === cents}
              onClick={() => {
                setPreset(cents);
                setCustom("");
              }}
              className={`rounded-full border-2 border-ink px-5 py-2 text-base font-bold transition ${preset === cents ? "bg-ink text-paper" : "hover:bg-ink hover:text-paper"}`}
            >
              {formatEuro(cents)}
            </button>
          ))}
          <label className="flex items-center gap-2 rounded-full border-2 border-ink px-4 py-1.5">
            <span className="text-sm font-bold">Altro</span>
            <input
              inputMode="decimal"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setPreset(null);
              }}
              placeholder="15,00"
              aria-label="Importo in euro"
              className="w-20 bg-transparent text-base outline-none"
            />
            <span aria-hidden>€</span>
          </label>
        </div>
        {preset === null && custom && !valid && (
          <p className="mt-2 text-sm text-red-700">
            Da {formatEuro(TIP_MIN_CENTS)} a {formatEuro(TIP_MAX_CENTS)}.
          </p>
        )}
      </fieldset>

      <label className="block">
        <span className="text-sm font-bold">Un messaggio per l&apos;autore (facoltativo)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={TIP_MESSAGE_MAX}
          rows={3}
          className="mt-2 w-full rounded-xl border-2 border-ink bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-saffron"
        />
        <span className="text-xs text-gray-500">{message.length}/{TIP_MESSAGE_MAX}</span>
      </label>

      <button type="submit" disabled={!valid || pending} className="rounded-full bg-saffron px-6 py-3 text-base font-bold text-ink transition hover:bg-ink hover:text-paper disabled:opacity-50">
        {pending ? "Un momento…" : valid ? `Lascia ${formatEuro(amount!)} con Stripe` : "Scegli l'importo"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
