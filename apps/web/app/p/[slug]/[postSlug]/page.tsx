"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PaywallGate } from "../../../../components/PaywallGate";
import { TipJar } from "../../../../components/TipJar";
import { Heart, MessageSquare, Share2, Bookmark, ArrowLeft, Check } from "lucide-react";

export default function ArticleReaderPage({
  params
}: {
  params: { slug: string; postSlug: string };
}) {
  const [likes, setLikes] = useState(88);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isArticleUnlocked, setIsArticleUnlocked] = useState(false);

  // Mock simulato di stato utente: false = lettore non abbonato (vede il paywall)
  const isPaidSubscriber = false;
  const hasAccess = isPaidSubscriber || isArticleUnlocked;

  const articleTitle = "Perché l'ecosistema creator italiano ha bisogno di un'alternativa a Substack";
  const publicationName = "Tech & Futuro Italia";
  const authorName = "Dario De Leonardis";
  const publishedDate = "25 Settembre 2026";

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Back to publication */}
      <div className="mb-6">
        <Link
          href={`/`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Tutte le pubblicazioni
        </Link>
      </div>

      {/* Header */}
      <header className="border-b border-gray-100 pb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <span>{publicationName}</span>
        </div>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl sm:leading-tight">
          {articleTitle}
        </h1>

        <p className="mt-3 text-lg text-gray-600 leading-relaxed">
          Commissioni al 10%, assenza di fatturazione elettronica e server oltreoceano: come riconquistare la sovranità dei propri lettori con una soluzione self-hosted su VPS.
        </p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-blue-100 font-bold text-blue-700 flex items-center justify-center">
              D
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{authorName}</p>
              <p className="text-xs text-gray-500">{publishedDate} &bull; 4 min di lettura</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsLiked(!isLiked);
                setLikes(isLiked ? likes - 1 : likes + 1);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isLiked ? "border-rose-300 bg-rose-50 text-rose-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-600" : ""}`} />
              <span>{likes}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1 rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:bg-gray-50"
              title="Copia link"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Contenuto Articolo Parte 1 (Gratuita per tutti) */}
      <div className="prose prose-lg mt-8 max-w-none text-gray-800 leading-relaxed font-serif">
        <p className="text-lg leading-relaxed text-gray-700 font-sans">
          Negli ultimi anni, Substack ha rivoluzionato il modo in cui scrittori e divulgatori monetizzano la propria penna. Tuttavia, per chi opera in Italia e in Europa, i limiti strutturali sono diventati insostenibili per chiunque intenda creare un business solido e a lungo termine.
        </p>

        <h2 className="text-xl font-bold font-sans text-gray-900 mt-6">1. Il costo nascosto: 10% di commissioni a vita</h2>
        <p>
          Ogni creator che fattura 2.000€ al mese dona 200€ al mese (2.400€ l'anno!) a Substack, oltre alle normali tariffe di transazione di Stripe. Con una soluzione self-hosted su VPS come ZeroStack, il creator paga solo il costo server fisso (5-10€/mese) trattenendo il 100% degli utili.
        </p>

        <h2 className="text-xl font-bold font-sans text-gray-900 mt-6">2. Il labirinto fiscale italiano e la fatturazione B2B</h2>
        <p>
          In Italia, professionisti, consulenti e aziende che si abbonano a una pubblicazione per aggiornamento professionale hanno diritto alla fattura elettronica con Codice Univoco SDI o PEC per dedurre il costo come spesa di formazione. Substack non supporta questi campi, costringendo i creator a compilare note a mano o rinunciare a lettori business ad alto valore.
        </p>
      </div>

      {/* BLOCCO PAYWALL SE L'UTENTE NON HA ACCESSO */}
      {!hasAccess ? (
        <>
          <PaywallGate
            publicationName={publicationName}
            tierName="Abbonato Premium"
            monthlyPriceEur={7}
            tierId="premium-monthly"
          />
          <TipJar
            creatorName={authorName}
            publicationSlug={params.slug}
            articleSlug={params.postSlug}
            allowPayPerArticle={true}
            payPerArticlePriceEur={1.50}
            onArticleUnlocked={() => setIsArticleUnlocked(true)}
          />
        </>
      ) : (
        <div className="prose prose-lg mt-6 max-w-none text-gray-800 leading-relaxed font-serif">
          <hr className="my-8" />
          <h2 className="text-xl font-bold font-sans text-gray-900">3. Sovranità dei dati ed email deliverability</h2>
          <p>
            Quando invii 10.000 email tramite Substack, condividi gli indirizzi IP di invio con migliaia di altri autori sconosciuti. Con ZeroStack puoi collegare Brevo o Resend con il tuo dominio verificato DKIM, SPF e DMARC, garantendo che le tue comunicazioni non finiscano mai nello spam.
          </p>
          <TipJar
            creatorName={authorName}
            publicationSlug={params.slug}
            articleSlug={params.postSlug}
            allowPayPerArticle={false}
          />
        </div>
      )}

      {/* Sezione Commenti */}
      <section className="mt-12 border-t border-gray-200 pt-8">
        <div className="flex items-center gap-2 font-bold text-gray-900">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <span>Commenti dei lettori (14)</span>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <textarea
            placeholder="Lascia un commento o una riflessione su questo articolo..."
            rows={3}
            className="w-full resize-none border-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
          />
          <div className="flex justify-end border-t border-gray-100 pt-2">
            <button className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
              Invia Commento
            </button>
          </div>
        </div>
      </section>
    </article>
  );
}
