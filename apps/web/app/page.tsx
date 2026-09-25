import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Mail, Radio, MessageSquare, TrendingUp, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 px-6 py-16 text-center text-white shadow-2xl sm:px-12 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1.5 text-xs font-semibold text-blue-200 border border-blue-400/30">
            <Sparkles className="h-4 w-4" /> La Piattaforma Publishing Indipendente per l'Italia
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl sm:leading-none">
            Scrivi, pubblica e monetizza. <br />
            <span className="bg-gradient-to-r from-blue-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
              Senza cedere il 10% a Substack.
            </span>
          </h1>

          <p className="mt-6 text-lg text-blue-100/90 leading-relaxed sm:text-xl">
            Tutte le funzionalità di Substack, ottimizzate per il mercato italiano ed europeo: supporto fatturazione elettronica con SDI/PEC, zero commissioni trattenute, server VPS sotto il tuo controllo e app mobile inclusa.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/studio"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-bold text-blue-900 shadow-lg transition hover:bg-blue-50"
            >
              Crea la tua Pubblicazione <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/p/tech-italia"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Esplora Tech & Futuro Italia
            </Link>
          </div>
        </div>
      </section>

      {/* Feature comparison highlights */}
      <section className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
            0%
          </div>
          <h3 className="mt-4 font-bold text-gray-900">Zero Commissioni</h3>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            Substack trattiene il 10% fisso su ogni abbonamento. Su ZeroStack ricevi il 100% degli incassi direttamente sul tuo conto Stripe.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-bold text-gray-900">Fattura Elettronica & SDI</h3>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            Campi integrati per Codice Fiscale, Partita IVA, PEC e Codice SDI a 7 caratteri per la deducibilità aziendale dei tuoi abbonati in Italia.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <Radio className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-bold text-gray-900">Podcast & Note Integrati</h3>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            Player audio persistente, generazione feed RSS compatibile Apple/Spotify e feed social "Note" per dialogare con i tuoi lettori.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Mail className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-bold text-gray-900">Deliverability Senza Limiti</h3>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            Collega il tuo account Brevo, Resend o Amazon SES con domini verificati per recapitare il 100% delle email nella inbox primaria.
          </p>
        </div>
      </section>

      {/* Main Content Grid: Latest Articles & Notes Feed */}
      <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Articles Column (2 spans) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>In Primo Piano su ZeroStack</span>
            </div>
            <Link href="/p/tech-italia" className="text-xs font-semibold text-blue-600 hover:underline">
              Vedi archivio &rarr;
            </Link>
          </div>

          <div className="mt-6 space-y-8">
            <article className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <span className="font-bold text-blue-600">Tech & Futuro Italia</span>
                <span>&bull;</span>
                <span>25 Settembre 2026</span>
                <span>&bull;</span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Edizione Libera</span>
              </div>

              <h2 className="mt-3 text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                <Link href="/p/tech-italia/alternativa-italiana-a-substack">
                  Perché l'ecosistema creator italiano ha bisogno di un'alternativa a Substack
                </Link>
              </h2>

              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Commissioni al 10%, assenza di fatturazione elettronica e server oltreoceano: come riconquistare la sovranità dei propri lettori con una soluzione self-hosted su VPS.
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
                <span>Di Dario De Leonardis &bull; 4 min di lettura</span>
                <Link
                  href="/p/tech-italia/alternativa-italiana-a-substack"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Leggi articolo completo &rarr;
                </Link>
              </div>
            </article>

            {/* Podcast Article Card */}
            <article className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <span className="font-bold text-purple-600">Podcast Ep. 01</span>
                <span>&bull;</span>
                <span>Durata: 6 min</span>
              </div>

              <h2 className="mt-3 text-xl font-bold text-gray-900 group-hover:text-purple-600 transition">
                <Link href="/podcasts">
                  🎙️ Podcast Ep. 01: L'evoluzione dell'AI applicata allo sviluppo web
                </Link>
              </h2>

              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Conversazione aperta sulle novità dello sviluppo web moderno, la containerizzazione su VPS e l'architettura tecnica di ZeroStack.
              </p>

              <div className="mt-4">
                <Link
                  href="/podcasts"
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
                >
                  Ascolta l'episodio &rarr;
                </Link>
              </div>
            </article>
          </div>
        </div>

        {/* Sidebar: Notes & Dispacci teaser */}
        <div>
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              <span>Note & Dispacci</span>
            </div>
            <Link href="/notes" className="text-xs font-semibold text-indigo-600 hover:underline">
              Vedi tutte &rarr;
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  D
                </span>
                <span>Dario De Leonardis</span>
                <span className="text-gray-400 font-normal">@dario</span>
              </div>
              <p className="mt-2 text-xs text-gray-700 leading-relaxed">
                Abbiamo appena rilasciato la prima versione di ZeroStack! Completamente open-source, con supporto nativo a SDI, PEC e 0% commissioni. Cosa ne pensate?
              </p>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-400">
                <span>❤️ 42 mi piace</span>
                <span>🔁 15 rilanci</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  D
                </span>
                <span>Dario De Leonardis</span>
                <span className="text-gray-400 font-normal">@dario</span>
              </div>
              <p className="mt-2 text-xs text-gray-700 leading-relaxed">
                Un sondaggio rapido: quale provider email preferite per le vostre newsletter? Brevo (ex Sendinblue), Resend o Amazon SES?
              </p>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-400">
                <span>❤️ 19 mi piace</span>
                <span>🔁 4 rilanci</span>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-100 text-center">
              <p className="text-xs font-bold text-blue-900">Vuoi condividere un pensiero?</p>
              <Link
                href="/notes"
                className="mt-2 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Apri Feed Note
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
