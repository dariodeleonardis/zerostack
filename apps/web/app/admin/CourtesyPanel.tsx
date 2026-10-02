"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Riquadro del pannello: accende o spegne la pagina di cortesia e ne cambia il messaggio. */
export function CourtesyPanel({
  enabled,
  customMessage,
  defaultMessage,
  maxLength
}: {
  enabled: boolean;
  customMessage: string;
  defaultMessage: string;
  maxLength: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(customMessage);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const save = async (nextEnabled: boolean) => {
    if (!nextEnabled && !window.confirm("Spegnere la pagina di cortesia? Il sito tornerà visibile a tutti.")) return;
    setPending(true);
    setNotice(null);
    const res = await fetch("/api/admin/courtesy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled, message })
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    setNotice(res.ok ? data.message : data.error ?? "Salvataggio non riuscito");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pagina di cortesia</h2>
          <p className="mt-1 text-xs text-gray-500">
            Accesa, chi visita il sito (anche i sottodomini delle pubblicazioni) vede solo un messaggio. Tu e gli altri
            amministratori, con l&apos;accesso fatto, vedete e usate tutto.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
        >
          {enabled ? "Accesa: sito chiuso ai visitatori" : "Spenta: sito aperto a tutti"}
        </span>
      </div>

      <label htmlFor="courtesy-message" className="mt-5 block text-xs font-bold text-gray-700">
        Messaggio per i visitatori
      </label>
      <textarea
        id="courtesy-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={maxLength}
        rows={3}
        placeholder={defaultMessage}
        className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base focus:border-ink focus:outline-none"
      />
      <p className="mt-1 text-[11px] text-gray-400">Vuoto = messaggio predefinito. Massimo {maxLength} caratteri.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {enabled ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => save(true)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Salva il messaggio
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => save(false)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Apri il sito a tutti
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => save(true)}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Accendi la pagina di cortesia
          </button>
        )}
        <a href="/cortesia" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-ink-600 hover:text-ink-700">
          Anteprima
        </a>
      </div>
      {notice && (
        <p role="status" className="mt-3 text-xs font-semibold text-gray-700">
          {notice}
        </p>
      )}
    </section>
  );
}
