"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Rss, 
  Headphones, 
  Share2, 
  Heart, 
  Check, 
  ArrowRight, 
  Mail, 
  Globe, 
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { TipJar } from "../../../components/TipJar";

interface PublicationPageProps {
  params: {
    slug: string;
  };
}

export default function PublicationHomePage({ params }: PublicationPageProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicationName = params.slug === "tech-italia" ? "Tech & Futuro Italia" : `Pubblicazione @${params.slug}`;
  const authorName = "Dario De Leonardis";
  const publicationBio = "L'osservatorio indipendente su tecnologia, IA, sovranità digitale e business dei creator in Italia ed Europa.";
  const subscriberCount = 1420;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setIsSubscribed(true);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sampleArticles = [
    {
      slug: "alternativa-italiana-a-substack",
      title: "Perché l'ecosistema creator italiano ha bisogno di un'alternativa a Substack",
      excerpt: "Commissioni al 10%, assenza di fatturazione elettronica e server oltreoceano: come riconquistare la sovranità dei propri lettori con una soluzione self-hosted su VPS.",
      date: "25 Settembre 2026",
      readTime: "4 min",
      isPaidOnly: true,
      likes: 88
    },
    {
      slug: "fatturazione-elettronica-creator-b2b",
      title: "Guida alla Fatturazione Elettronica B2B per Newsletter e Abbonamenti",
      excerpt: "Come dedurre gli abbonamenti editoriali come costi di formazione professionale e integrare Codice Univoco SDI e PEC nel checkout.",
      date: "18 Settembre 2026",
      readTime: "6 min",
      isPaidOnly: false,
      likes: 64
    },
    {
      slug: "privacy-first-analytics-zero-cookie",
      title: "Analitiche senza cookie: tracciare i lettori rispettando il GDPR al 100%",
      excerpt: "Come eliminare i fastidiosi banner dei cookie e implementare hash effimeri a 24 ore per la privacy assoluta della tua audience.",
      date: "10 Settembre 2026",
      readTime: "5 min",
      isPaidOnly: false,
      likes: 52
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Cover / Header Banner */}
      <div className="h-44 w-full bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 shadow-inner" />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 -mt-16">
        {/* Profile Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-blue-600 font-extrabold text-white text-3xl flex items-center justify-center shadow-md">
                {publicationName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">
                  {publicationName}
                </h1>
                <p className="text-xs font-semibold text-blue-600 mt-0.5">
                  Di {authorName} &bull; <span className="text-gray-500">{subscriberCount} lettori iscritti</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/api/feed/${params.slug}/rss`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                title="Feed RSS"
              >
                <Rss className="h-3.5 w-3.5 text-amber-500" /> RSS
              </Link>

              <Link
                href={`/api/feed/${params.slug}/podcast`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                title="Feed Podcast"
              >
                <Headphones className="h-3.5 w-3.5 text-purple-600" /> Podcast
              </Link>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-700 hover:bg-gray-50"
                title="Condividi"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600 leading-relaxed">
            {publicationBio}
          </p>

          {/* Sottoscrizione Newsletter Rapida */}
          <div className="mt-6 rounded-xl bg-blue-50/60 p-4 border border-blue-100">
            {isSubscribed ? (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <Check className="h-5 w-5 text-emerald-600" />
                <span>Ti abbiamo inviato un'email di conferma (Double Opt-in)! Controlla la tua casella di posta.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  placeholder="Inserisci la tua email migliore..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <Mail className="h-4 w-4" />
                  <span>Iscriviti Gratis</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Tip Jar Component */}
        <div className="mt-8">
          <TipJar
            creatorName={authorName}
            publicationSlug={params.slug}
            allowPayPerArticle={false}
          />
        </div>

        {/* Lista Articoli / Feed */}
        <section className="mt-10">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-xl font-black text-gray-900">Ultimi Articoli & Analisi</h2>
            <span className="text-xs font-semibold text-gray-500">Archivio pubblico</span>
          </div>

          <div className="mt-6 space-y-4">
            {sampleArticles.map((article) => (
              <article
                key={article.slug}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <span>{article.date}</span>
                  <span>&bull;</span>
                  <span>{article.readTime} di lettura</span>
                  {article.isPaidOnly && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Riservato Abbonati
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                  <Link href={`/p/${params.slug}/${article.slug}`}>
                    {article.title}
                  </Link>
                </h3>

                <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-2">
                  {article.excerpt}
                </p>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5 text-rose-500">
                    <Heart className="h-3.5 w-3.5 fill-rose-500" />
                    <span>{article.likes} apprezzamenti</span>
                  </div>

                  <Link
                    href={`/p/${params.slug}/${article.slug}`}
                    className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700"
                  >
                    Leggi articolo <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Abbonamento Premium / Tiers */}
        <section className="mt-12 rounded-2xl border-2 border-blue-500/20 bg-gradient-to-b from-blue-50/50 to-white p-6 sm:p-8">
          <div className="text-center max-w-lg mx-auto">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
              Supporto Indipendente
            </span>
            <h3 className="mt-3 text-2xl font-black text-gray-900">
              Diventa un Abbonato Sostenitore
            </h3>
            <p className="mt-2 text-xs text-gray-600">
              Sblocca tutti i post riservati, accedi al podcast esclusivo e deduci il costo grazie alla fatturazione elettronica B2B.
            </p>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm">
              <div className="flex items-baseline justify-between border-b border-gray-100 pb-4">
                <div>
                  <h4 className="font-bold text-gray-900">Abbonamento Mensile Pro</h4>
                  <p className="text-xs text-gray-500">Accesso illimitato senza vincoli</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-gray-900">7€</span>
                  <span className="text-xs text-gray-500"> / mese</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Tutti gli articoli completi e archivio storico</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Feed Podcast privato compatibile con Apple Podcast & Spotify</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Fattura elettronica con Codice Univoco SDI per deduzione P.IVA</span>
                </li>
              </ul>

              <div className="mt-6">
                <Link
                  href="/checkout/premium-monthly"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
                >
                  Abbonati a 7€/mese
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
