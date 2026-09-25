import React from "react";
import Link from "next/link";
import { PenSquare, Users, DollarSign, MailCheck, Globe, ShieldCheck, ArrowUpRight, TrendingUp } from "lucide-react";

export default function StudioDashboard() {
  const mrr = 994;
  const substackYearlyFee = (mrr * 12 * 0.1).toFixed(2);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Studio Header */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-gray-900">Pannello Creator</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              Tech & Futuro Italia
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Monitora iscritti, ricavi ricorrenti, metriche newsletter e configurazioni VPS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/studio/posts/new"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <PenSquare className="h-4 w-4" />
            Nuovo Post o Newsletter
          </Link>
        </div>
      </div>

      {/* Substack Savings Alert Banner */}
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-lg">
              0%
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Risparmio rispetto a Substack: +{substackYearlyFee}€ / anno stimati
              </p>
              <p className="text-xs text-emerald-800">
                Substack tratterrebbe il 10% di ogni tuo abbonamento. Su ZeroStack il 100% dei ricavi resta tuo!
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/10 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300/40">
            <ShieldCheck className="h-4 w-4" /> Self-Hosted su VPS
          </span>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Iscritti Totali */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wider">Iscritti Totali</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">1.840</span>
            <span className="flex items-center text-xs font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +14% mese
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">142 abbonati paganti (7,7% conv.)</p>
        </div>

        {/* Ricavi Ricorrenti (MRR) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wider">MRR (Ricavo Mensile)</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{mrr}€</span>
            <span className="text-xs font-bold text-gray-500">/ mese</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">11.928€/anno ARR stimato</p>
        </div>

        {/* Tasso di Apertura Newsletter */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wider">Open Rate Medio</span>
            <MailCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">48,2%</span>
            <span className="text-xs font-semibold text-purple-600">Ottimo</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Provider: Brevo (DKIM verificato)</p>
        </div>

        {/* Dominio e Hosting */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wider">Dominio & SSL</span>
            <Globe className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-sm font-bold text-gray-900">tech.tuodominio.it</span>
            <p className="text-xs text-emerald-600 font-semibold mt-1">✓ SSL Let's Encrypt Attivo</p>
          </div>
          <p className="mt-1 text-xs text-gray-400">Gratuito con Caddy Reverse Proxy</p>
        </div>
      </div>

      {/* Post recenti e Campagne */}
      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-900">I tuoi ultimi post</h2>
          <Link href="/studio/posts/new" className="text-xs font-semibold text-blue-600 hover:underline">
            + Scrivi nuovo
          </Link>
        </div>

        <div className="mt-4 divide-y divide-gray-100">
          <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  Pubblicato
                </span>
                <span className="text-xs text-gray-400">25 Settembre 2026</span>
              </div>
              <h3 className="mt-1 font-bold text-gray-900">
                Perché l'ecosistema creator italiano ha bisogno di un'alternativa a Substack
              </h3>
              <p className="text-xs text-gray-500">
                1.420 visualizzazioni &bull; 88 mi piace &bull; 1.840 email inviate (49% apertura)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/p/tech-italia/alternativa-italiana-a-substack"
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Vedi <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
