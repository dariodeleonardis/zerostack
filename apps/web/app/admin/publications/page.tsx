"use client";

import React, { useState } from "react";
import { Layers, Globe, CheckCircle2, AlertTriangle, Eye, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface PublicationAdminItem {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  customDomain?: string;
  isDomainVerified: boolean;
  subscribersCount: number;
  mrrEur: number;
  status: "ATTIVA" | "IN_REVISIONE";
}

const mockPublications: PublicationAdminItem[] = [
  {
    id: "pub-1",
    name: "Tech & Futuro Italia",
    slug: "tech-italia",
    ownerName: "Dario De Leonardis",
    ownerEmail: "dario@zerostack.it",
    customDomain: "tech.tuodominio.it",
    isDomainVerified: true,
    subscribersCount: 1840,
    mrrEur: 994,
    status: "ATTIVA"
  },
  {
    id: "pub-2",
    name: "Caffè Finanziario",
    slug: "caffe-finanza",
    ownerName: "Marco B.",
    ownerEmail: "marco@caffefinanza.it",
    customDomain: "newsletter.caffefinanza.it",
    isDomainVerified: false,
    subscribersCount: 820,
    mrrEur: 420,
    status: "ATTIVA"
  },
  {
    id: "pub-3",
    name: "Economia Semplice",
    slug: "economia-semplice",
    ownerName: "Elena Bianchi",
    ownerEmail: "elena@economiasemplice.it",
    isDomainVerified: false,
    subscribersCount: 290,
    mrrEur: 140,
    status: "ATTIVA"
  }
];

export default function AdminPublicationsPage() {
  const [publications, setPublications] = useState<PublicationAdminItem[]>(mockPublications);

  const handleVerifyDomain = (id: string) => {
    setPublications(
      publications.map((p) => (p.id === id ? { ...p, isDomainVerified: true } : p))
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Moderazione Pubblicazioni & Domini</h1>
          <p className="text-xs text-gray-500">
            Controlla tutte le pubblicazioni create sulla piattaforma, verifica i domini CNAME personalizzati e l'emissione dei certificati SSL Caddy.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
          <thead className="bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Pubblicazione</th>
              <th className="px-6 py-3.5">Autore / Creator</th>
              <th className="px-6 py-3.5">Dominio Personalizzato</th>
              <th className="px-6 py-3.5">Iscritti</th>
              <th className="px-6 py-3.5">MRR Stimato</th>
              <th className="px-6 py-3.5 text-right">Azioni / Caddy SSL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {publications.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/70 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{p.name}</span>
                    <span className="text-[11px] text-gray-400">({p.slug})</span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-800">{p.ownerName}</p>
                  <p className="text-[11px] text-gray-400">{p.ownerEmail}</p>
                </td>

                <td className="px-6 py-4">
                  {p.customDomain ? (
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-mono text-[11px] text-gray-800">{p.customDomain}</span>
                      {p.isDomainVerified ? (
                        <span className="flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-2.5 w-2.5" /> SSL OK
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                          <AlertTriangle className="h-2.5 w-2.5" /> In attesa CNAME
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Sottodominio predefinito</span>
                  )}
                </td>

                <td className="px-6 py-4 font-semibold text-gray-700">{p.subscribersCount}</td>

                <td className="px-6 py-4 font-bold text-emerald-600">{p.mrrEur}€ / mese</td>

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {p.customDomain && !p.isDomainVerified && (
                      <button
                        onClick={() => handleVerifyDomain(p.id)}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
                      >
                        Approva SSL Caddy
                      </button>
                    )}

                    <Link
                      href={`/p/${p.slug}`}
                      className="rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-100"
                      title="Visita pubblicazione"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
