"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Globe, AlertTriangle } from "lucide-react";

export interface DomainPublication {
  id: string;
  name: string;
  platformAddress: string;
  customDomain: string | null;
  isDomainVerified: boolean;
  txtName: string | null;
  txtValue: string | null;
}

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2 text-xs">
      <span className="font-semibold text-gray-500">{label}</span>
      <code className="break-all rounded bg-gray-100 px-2 py-1 text-gray-900">{value}</code>
    </div>
  );
}

function PublicationDomain({ publication }: { publication: DomainPublication }) {
  const router = useRouter();
  const [domain, setDomain] = useState(publication.customDomain ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);

  const save = async (value: string | null) => {
    setPending(true);
    setMessage(null);
    const { ok, data } = await send(`/api/publications/${publication.id}/domain`, "PUT", { customDomain: value });
    setPending(false);
    if (!ok) setMessage({ tone: "error", text: data.error ?? "Salvataggio non riuscito" });
    router.refresh();
  };

  const verify = async () => {
    setPending(true);
    setMessage(null);
    const { ok, data } = await send(`/api/publications/${publication.id}/domain/verify`, "POST", {});
    setPending(false);
    if (!ok) setMessage({ tone: "error", text: data.error ?? "Verifica non riuscita" });
    else if (data.verified) {
      setMessage({ tone: "ok", text: "Dominio verificato: il certificato HTTPS verrà emesso alla prima visita." });
      router.refresh();
    } else setMessage({ tone: "info", text: data.message ?? "Record non ancora visibile" });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="border-b border-gray-100 pb-3 text-lg font-black text-gray-900">{publication.name}</h2>
      <p className="mt-3 text-xs text-gray-500">
        Indirizzo sulla piattaforma: <strong className="text-gray-800">{publication.platformAddress}</strong> (sempre attivo)
      </p>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          save(domain.trim());
        }}
      >
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="newsletter.tuodominio.it"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={pending || !domain.trim()} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          Salva dominio
        </button>
        {publication.customDomain && (
          <button type="button" disabled={pending} onClick={() => save(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50">
            Rimuovi
          </button>
        )}
      </form>

      {publication.customDomain && (
        <div className="mt-5 space-y-4">
          {publication.isDomainVerified ? (
            <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {publication.customDomain} è verificato
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
              <AlertTriangle className="h-4 w-4" /> {publication.customDomain} da verificare
            </p>
          )}

          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold text-gray-800">1. Punta il dominio a ZeroStack (dal pannello DNS del tuo provider)</p>
            <Row label="Tipo" value="CNAME" />
            <Row label="Nome" value={publication.customDomain} />
            <Row label="Valore" value={publication.platformAddress} />
            <p className="text-[11px] text-gray-500">Per un dominio principale (senza sottodominio) usa un record ALIAS/ANAME, se il provider lo offre.</p>
          </div>

          {!publication.isDomainVerified && publication.txtName && publication.txtValue && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold text-gray-800">2. Dimostra che il dominio è tuo</p>
              <Row label="Tipo" value="TXT" />
              <Row label="Nome" value={publication.txtName} />
              <Row label="Valore" value={publication.txtValue} />
              <button type="button" onClick={verify} disabled={pending} className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {pending ? "Verifica..." : "Verifica ora"}
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <p className={`mt-4 rounded-xl px-3 py-2 text-xs font-semibold ${message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : message.tone === "error" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

export function DomainPanel({ publications }: { publications: DomainPublication[] }) {
  if (publications.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-600">
        <Globe className="h-4 w-4" /> Solo chi possiede una pubblicazione può collegarle un dominio.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {publications.map((p) => (
        <PublicationDomain key={`${p.id}-${p.customDomain}-${p.isDomainVerified}`} publication={p} />
      ))}
    </div>
  );
}
