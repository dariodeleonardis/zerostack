"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface FiscalForm {
  enabled: boolean;
  kind: "PERSON" | "COMPANY";
  denominazione: string;
  nome: string;
  cognome: string;
  partitaIva: string;
  codiceFiscale: string;
  regimeFiscale: "RF01" | "RF19";
  aliquotaIva: 22 | 4;
  indirizzo: string;
  numeroCivico: string;
  cap: string;
  comune: string;
  provincia: string;
  email: string;
}

export interface InvoiceRow {
  id: string;
  label: string;
  fileName: string;
  totalCents: number;
  taxCents: number;
  buyerName: string;
  status: "READY" | "SENT" | "ERROR";
  date: string;
}

export interface InvoicePublication {
  id: string;
  name: string;
  profile: FiscalForm | null;
  invoices: InvoiceRow[];
}

const EMPTY: FiscalForm = {
  enabled: false,
  kind: "PERSON",
  denominazione: "",
  nome: "",
  cognome: "",
  partitaIva: "",
  codiceFiscale: "",
  regimeFiscale: "RF19",
  aliquotaIva: 22,
  indirizzo: "",
  numeroCivico: "",
  cap: "",
  comune: "",
  provincia: "",
  email: ""
};

const euro = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-600">
      {label}
      {children}
    </label>
  );
}

function PublicationInvoices({ publication }: { publication: InvoicePublication }) {
  const router = useRouter();
  const [form, setForm] = useState<FiscalForm>(publication.profile ?? EMPTY);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const set = <K extends keyof FiscalForm>(key: K, value: FiscalForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await fetch(`/api/publications/${publication.id}/fiscal-profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) setMessage({ ok: false, text: data.error ?? "Salvataggio non riuscito" });
    else {
      setMessage({ ok: true, text: data.caughtUp ? `Dati salvati. Emesse ${data.caughtUp} fatture per i pagamenti degli ultimi giorni.` : "Dati salvati." });
      router.refresh();
    }
  };

  const mark = async (id: string, action: "mark-sent" | "mark-ready") => {
    await fetch(`/api/invoices/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    router.refresh();
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="border-b border-gray-100 pb-3 text-lg font-black text-gray-900">{publication.name}</h2>

      <form onSubmit={save} className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
          Emetti le fatture elettroniche a mio nome
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Chi incassa">
            <select className={input} value={form.kind} onChange={(e) => set("kind", e.target.value as FiscalForm["kind"])}>
              <option value="PERSON">Persona fisica con partita IVA</option>
              <option value="COMPANY">Società</option>
            </select>
          </Field>
          <Field label="Regime fiscale">
            <select className={input} value={form.regimeFiscale} onChange={(e) => set("regimeFiscale", e.target.value as FiscalForm["regimeFiscale"])}>
              <option value="RF19">Forfettario (senza IVA)</option>
              <option value="RF01">Ordinario</option>
            </select>
          </Field>
          {form.kind === "COMPANY" ? (
            <Field label="Ragione sociale">
              <input className={input} value={form.denominazione} onChange={(e) => set("denominazione", e.target.value)} />
            </Field>
          ) : (
            <>
              <Field label="Nome">
                <input className={input} value={form.nome} onChange={(e) => set("nome", e.target.value)} />
              </Field>
              <Field label="Cognome">
                <input className={input} value={form.cognome} onChange={(e) => set("cognome", e.target.value)} />
              </Field>
            </>
          )}
          <Field label="Partita IVA">
            <input className={input} value={form.partitaIva} onChange={(e) => set("partitaIva", e.target.value.trim())} inputMode="numeric" maxLength={11} />
          </Field>
          <Field label="Codice fiscale">
            <input className={input} value={form.codiceFiscale} onChange={(e) => set("codiceFiscale", e.target.value.trim().toUpperCase())} maxLength={16} />
          </Field>
          {form.regimeFiscale === "RF01" && (
            <Field label="Aliquota IVA (prezzi IVA inclusa)">
              <select className={input} value={form.aliquotaIva} onChange={(e) => set("aliquotaIva", Number(e.target.value) === 4 ? 4 : 22)}>
                <option value={22}>22%</option>
                <option value={4}>4% (testata registrata con ISSN)</option>
              </select>
            </Field>
          )}
          <Field label="Indirizzo">
            <input className={input} value={form.indirizzo} onChange={(e) => set("indirizzo", e.target.value)} />
          </Field>
          <Field label="Numero civico">
            <input className={input} value={form.numeroCivico} onChange={(e) => set("numeroCivico", e.target.value)} maxLength={8} />
          </Field>
          <Field label="CAP">
            <input className={input} value={form.cap} onChange={(e) => set("cap", e.target.value.trim())} inputMode="numeric" maxLength={5} />
          </Field>
          <Field label="Comune">
            <input className={input} value={form.comune} onChange={(e) => set("comune", e.target.value)} />
          </Field>
          <Field label="Provincia">
            <input className={input} value={form.provincia} onChange={(e) => set("provincia", e.target.value.trim().toUpperCase())} maxLength={2} />
          </Field>
          <Field label="Email in fattura (facoltativa)">
            <input className={input} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        {form.regimeFiscale === "RF19" && (
          <p className="text-xs text-gray-500">In forfettario le fatture sono senza IVA (natura N2.2); sopra 77,47 € è indicato il bollo virtuale da 2 €, che versi tu.</p>
        )}
        {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-rose-700"}`}>{message.text}</p>}
        <button type="submit" disabled={pending} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Salvataggio..." : "Salva dati fiscali"}
        </button>
      </form>

      <div className="border-t border-gray-100 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">Fatture emesse</h3>
          <div className="flex items-end gap-2">
            <Field label="Mese">
              <input type="month" className={input} value={month} onChange={(e) => setMonth(e.target.value)} />
            </Field>
            <a className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50" href={`/api/publications/${publication.id}/invoices?mese=${month}`}>
              Scarica ZIP del mese
            </a>
          </div>
        </div>
        {publication.invoices.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Ancora nessuna fattura.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Numero</th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3 text-right">Totale</th>
                  <th className="py-2 pr-3">Stato</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {publication.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 pr-3 font-semibold text-gray-900">{i.label}</td>
                    <td className="py-2 pr-3 text-gray-600">{i.date}</td>
                    <td className="py-2 pr-3 text-gray-600">{i.buyerName}</td>
                    <td className="py-2 pr-3 text-right text-gray-900">{euro(i.totalCents)}</td>
                    <td className="py-2 pr-3">{i.status === "SENT" ? <span className="text-emerald-700">Trasmessa</span> : <span className="text-amber-700">Da trasmettere</span>}</td>
                    <td className="space-x-3 whitespace-nowrap py-2 text-right text-xs font-semibold">
                      <a className="text-gray-700 underline" href={`/api/invoices/${i.id}`}>
                        XML
                      </a>
                      {i.status === "SENT" ? (
                        <button type="button" className="text-gray-500 underline" onClick={() => mark(i.id, "mark-ready")}>
                          Annulla
                        </button>
                      ) : (
                        <button type="button" className="text-gray-700 underline" onClick={() => mark(i.id, "mark-sent")}>
                          Segna trasmessa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function InvoicesPanel({ publications }: { publications: InvoicePublication[] }) {
  return (
    <div className="space-y-6">
      {publications.map((p) => (
        <PublicationInvoices key={p.id} publication={p} />
      ))}
    </div>
  );
}
