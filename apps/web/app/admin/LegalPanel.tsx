"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Field = "name" | "vat" | "address" | "email";

const LABELS: Record<Field, { label: string; hint: string }> = {
  name: { label: "Titolare", hint: "Come compare nei testi, per esempio «absolutezero.agency di Dario De Leonardis»." },
  vat: { label: "Partita IVA", hint: "" },
  address: { label: "Sede", hint: "Indirizzo completo." },
  email: { label: "Email per privacy e contatti", hint: "" }
};

/** Riquadro del pannello: dati del titolare nelle pagine Privacy, Termini e Cookie. Valgono subito. */
export function LegalPanel({ initial, updatedAt, limits }: { initial: Record<Field, string>; updatedAt: string; limits: Record<Field, number> }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setNotice(null);
    const res = await fetch("/api/admin/legal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    setErrors(res.ok ? {} : data.fields ?? {});
    setNotice(res.ok ? data.message : data.error ?? "Salvataggio non riuscito");
    if (res.ok) router.refresh();
  };

  return (
    <form onSubmit={save} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Dati legali</h2>
      <p className="mt-1 text-xs text-gray-500">
        Compaiono nelle pagine <a href="/privacy" target="_blank" className="underline">Privacy</a>, <a href="/termini" target="_blank" className="underline">Termini</a> e{" "}
        <a href="/cookie" target="_blank" className="underline">Cookie</a> appena salvi, senza deploy. Se cambi qualcosa, la data «Aggiornato al» passa a oggi (ora: {updatedAt}).
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(Object.keys(LABELS) as Field[]).map((f) => (
          <div key={f} className={f === "name" || f === "address" ? "sm:col-span-2" : ""}>
            <label htmlFor={`legal-${f}`} className="block text-sm font-semibold text-ink">{LABELS[f].label}</label>
            <input
              id={`legal-${f}`}
              type={f === "email" ? "email" : "text"}
              value={values[f]}
              maxLength={limits[f]}
              aria-invalid={Boolean(errors[f])}
              onChange={(e) => {
                setValues({ ...values, [f]: e.target.value });
                setErrors({ ...errors, [f]: undefined });
              }}
              className={`mt-1 block w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${errors[f] ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-ink"}`}
            />
            {errors[f] ? <p className="mt-1 text-[11px] font-semibold text-red-600">{errors[f]}</p> : LABELS[f].hint && <p className="mt-1 text-[11px] text-gray-400">{LABELS[f].hint}</p>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-700 disabled:opacity-50">
          Salva i dati legali
        </button>
        {notice && <p role="status" className="text-xs font-semibold text-gray-700">{notice}</p>}
      </div>
    </form>
  );
}
