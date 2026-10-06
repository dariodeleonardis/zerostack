"use client";

import React, { useState } from "react";
import { Upload } from "lucide-react";

interface Report {
  subscribersFound: number;
  subscribersImported: number;
  subscribersReactivated: number;
  subscribersKeptUnsubscribed: number;
  subscribersSkippedDisabled: number;
  paidOnSubstack: number;
  postsImported: number;
  postsDrafts: number;
  postsSkippedExisting: number;
  postsWithoutHtml: number;
}

export function ImportForm({ publications }: { publications: { id: string; name: string }[] }) {
  const [publicationId, setPublicationId] = useState(publications[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setPending(true);
    setError(null);
    setReport(null);
    const body = new FormData();
    body.set("publicationId", publicationId);
    body.set("file", file);
    try {
      const res = await fetch("/api/import/substack", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Importazione non riuscita");
      else setReport(data.report);
    } catch {
      setError("Connessione non riuscita. Riprova.");
    } finally {
      setPending(false);
    }
  };

  if (publications.length === 0) {
    return <p className="text-sm text-gray-600">Crea prima una pubblicazione: gli iscritti e gli articoli importati finiscono lì.</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-xs font-semibold text-gray-700">
          Pubblicazione di destinazione
          <select value={publicationId} onChange={(e) => setPublicationId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {publications.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-gray-700">
          Export della tua piattaforma (.zip) oppure CSV degli iscritti
          <input
            type="file"
            accept=".zip,.csv,application/zip,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-gray-700"
          />
        </label>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        <button type="submit" disabled={!file || pending} className="flex items-center gap-2 rounded-xl bg-ink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-ink-700 disabled:opacity-50">
          <Upload className="h-4 w-4" /> {pending ? "Importazione in corso..." : "Importa"}
        </button>
      </form>

      {report && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-950">
          <h2 className="font-bold">Importazione completata</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>{report.subscribersImported} nuovi iscritti attivi (su {report.subscribersFound} nel file)</li>
            {report.subscribersReactivated > 0 && <li>{report.subscribersReactivated} iscritti in attesa di conferma ora attivi</li>}
            {report.subscribersKeptUnsubscribed > 0 && <li>{report.subscribersKeptUnsubscribed} restano disiscritti perché si erano disiscritti qui</li>}
            {report.subscribersSkippedDisabled > 0 && <li>{report.subscribersSkippedDisabled} saltati: sulla vecchia piattaforma non ricevevano più email</li>}
            <li>
              {report.postsImported} articoli pubblicati e {report.postsDrafts} bozze importati
              {report.postsSkippedExisting > 0 && ` (${report.postsSkippedExisting} già presenti, lasciati com'erano)`}
            </li>
            {report.postsWithoutHtml > 0 && <li>{report.postsWithoutHtml} articoli senza file HTML nell&apos;export, non importati</li>}
          </ul>
          {report.paidOnSubstack > 0 && (
            <p className="mt-4 rounded-xl bg-white/70 p-3 text-xs text-emerald-900">
              {report.paidOnSubstack} lettori erano abbonati a pagamento sulla vecchia piattaforma. Sono stati importati come iscritti; il loro
              abbonamento resta lì finché non si abbonano qui: scrivi loro con il link al tuo nuovo piano.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
