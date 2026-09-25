import React from "react";
import Link from "next/link";
import { Users, Layers, DollarSign, ShieldCheck, ArrowUpRight, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

export default function AdminOverviewPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Panoramica Piattaforma</h1>
          <p className="text-xs text-gray-500">Monitoraggio globale di utenti, pubblicazioni, transazioni Stripe e stato server.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <Activity className="h-3.5 w-3.5" /> Tutti i servizi VPS operativi
          </span>
        </div>
      </div>

      {/* Global KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Utenti Totali */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Utenti Registrati</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">4.920</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">12 SuperAdmin/Staff &bull; 340 Creator</p>
        </div>

        {/* Pubblicazioni Attive */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pubblicazioni Attive</span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">385</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">42 con dominio personalizzato SSL</p>
        </div>

        {/* Volume GMV Stripe */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Volume Stripe (GMV)</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">68.450€</span>
            <span className="text-xs font-bold text-emerald-600">+18% mese</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Transato direttamente sui conti dei creator</p>
        </div>

        {/* Abbonamenti Attivi */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Abbonamenti Ricorrenti</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">1.240</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Conformi a fatturazione elettronica IT</p>
        </div>
      </div>

      {/* Sezione Azioni Rapide & Verifiche per lo Staff */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Richieste di Verifica Domini Personalizzati */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="font-bold text-sm text-gray-900">Domini Personalizzati in Attesa di Caddy TLS</h2>
            <Link href="/admin/publications" className="text-xs font-semibold text-blue-600 hover:underline">
              Gestisci tutti &rarr;
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-xs">
              <div>
                <p className="font-bold text-gray-900">newsletter.mariorossi.it</p>
                <p className="text-gray-500">Pubblicazione: Cronache Digitali</p>
              </div>
              <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                <AlertTriangle className="h-3 w-3" /> CNAME in verifica
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-xs">
              <div>
                <p className="font-bold text-gray-900">tech.tuodominio.it</p>
                <p className="text-gray-500">Pubblicazione: Tech & Futuro Italia</p>
              </div>
              <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" /> SSL Attivo & Connesso
              </span>
            </div>
          </div>
        </div>

        {/* Ultime Pubblicazioni Registrate */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="font-bold text-sm text-gray-900">Nuovi Creator Registrati</h2>
            <Link href="/admin/users" className="text-xs font-semibold text-blue-600 hover:underline">
              Tutti gli utenti &rarr;
            </Link>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div>
                <p className="font-bold text-gray-900">Dario De Leonardis (@dario)</p>
                <p className="text-gray-500">Ruolo: SUPERADMIN &bull; 1 pubblicazione attiva</p>
              </div>
              <span className="rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-800">SuperUser</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div>
                <p className="font-bold text-gray-900">Elena Bianchi (@elenab)</p>
                <p className="text-gray-500">Ruolo: CREATOR &bull; Pubblicazione: Economia Semplice</p>
              </div>
              <span className="rounded bg-purple-100 px-2 py-0.5 font-bold text-purple-800">Creator</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
