"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Rss,
  Headphones,
  Share2,
  Heart,
  Check,
  ArrowRight,
  Mail,
  CheckCircle2
} from "lucide-react";
import { TipJar } from "../../../components/TipJar";

export interface PublicationViewProps {
  publicationId: string;
  checkoutBaseUrl: string;
  slug: string;
  name: string;
  description: string | null;
  authorName: string;
  primaryColor: string;
  subscriberCount: number;
  articles: {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    readTime: string;
    isPaidOnly: boolean;
    likes: number;
  }[];
  tiers: {
    id: string;
    name: string;
    description: string;
    price: string;
    interval: string;
    benefits: string[];
  }[];
}

export function PublicationView({
  publicationId,
  checkoutBaseUrl,
  slug,
  name,
  description,
  authorName,
  primaryColor,
  subscriberCount,
  articles,
  tiers
}: PublicationViewProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeState, setSubscribeState] = useState<"idle" | "sending" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Arrivo dal link di conferma dell'email: /?iscrizione=confermata
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("iscrizione") === "confermata") setJustConfirmed(true);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeState("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicationId, email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubscribeState("error");
        setSubscribeMessage(data.error ?? "Iscrizione non riuscita. Riprova.");
        return;
      }
      setSubscribeMessage(data.message ?? "Controlla la tua email per confermare l'iscrizione.");
      setIsSubscribed(true);
      setSubscribeState("idle");
    } catch {
      setSubscribeState("error");
      setSubscribeMessage("Connessione non riuscita. Riprova.");
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Cover / Header Banner nel colore scelto dall'autore */}
      <div className="h-44 w-full shadow-inner" style={{ backgroundColor: primaryColor }} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 -mt-16">
        {/* Profile Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="h-20 w-20 overflow-hidden rounded-2xl font-extrabold text-white text-3xl flex items-center justify-center shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">
                  {name}
                </h1>
                <p className="text-xs font-semibold text-blue-600 mt-0.5">
                  Di {authorName}
                  {subscriberCount > 0 && (
                    <>
                      {" "}&bull; <span className="text-gray-500">{subscriberCount} lettori iscritti</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/api/feed/${slug}/rss`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                title="Feed RSS"
              >
                <Rss className="h-3.5 w-3.5 text-amber-500" /> RSS
              </Link>

              <Link
                href={`/api/feed/${slug}/podcast`}
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

          {description && (
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          )}

          {/* Sottoscrizione Newsletter Rapida */}
          <div className="mt-6 rounded-xl bg-blue-50/60 p-4 border border-blue-100">
            {justConfirmed ? (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Iscrizione confermata: riceverai i prossimi articoli via email.</span>
              </div>
            ) : isSubscribed ? (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <Check className="h-5 w-5 text-emerald-600" />
                <span>{subscribeMessage}</span>
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
                  disabled={subscribeState === "sending"}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
                >
                  <Mail className="h-4 w-4" />
                  <span>{subscribeState === "sending" ? "Invio..." : "Iscriviti Gratis"}</span>
                </button>
              </form>
            )}
            {subscribeState === "error" && <p className="mt-2 text-xs font-semibold text-rose-600">{subscribeMessage}</p>}
          </div>
        </div>

        {/* Tip Jar Component */}
        <div className="mt-8">
          <TipJar
            creatorName={authorName}
            publicationSlug={slug}
            allowPayPerArticle={false}
          />
        </div>

        {/* Lista Articoli / Feed */}
        <section className="mt-10">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-xl font-black text-gray-900">Ultimi Articoli & Analisi</h2>
            <span className="text-xs font-semibold text-gray-500">Archivio pubblico</span>
          </div>

          {articles.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              Ancora nessun articolo pubblicato. Iscriviti per ricevere il primo.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {articles.map((article) => (
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
                    <Link href={`/p/${slug}/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h3>

                  {article.excerpt && (
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 text-rose-500">
                      <Heart className="h-3.5 w-3.5 fill-rose-500" />
                      <span>{article.likes} apprezzamenti</span>
                    </div>

                    <Link
                      href={`/p/${slug}/${article.slug}`}
                      className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700"
                    >
                      Leggi articolo <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Abbonamenti: solo quelli che l'autore ha davvero creato */}
        {tiers.length > 0 && (
          <section className="mt-12 rounded-2xl border-2 border-blue-500/20 bg-gradient-to-b from-blue-50/50 to-white p-6 sm:p-8">
            <div className="text-center max-w-lg mx-auto">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                Supporto Indipendente
              </span>
              <h3 className="mt-3 text-2xl font-black text-gray-900">
                Diventa un Abbonato Sostenitore
              </h3>

              {tiers.map((tier) => (
                <div key={tier.id} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm">
                  <div className="flex items-baseline justify-between border-b border-gray-100 pb-4">
                    <div>
                      <h4 className="font-bold text-gray-900">{tier.name}</h4>
                      <p className="text-xs text-gray-500">{tier.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-gray-900">{tier.price}</span>
                      <span className="text-xs text-gray-500"> {tier.interval}</span>
                    </div>
                  </div>

                  {tier.benefits.length > 0 && (
                    <ul className="mt-4 space-y-2 text-xs text-gray-700">
                      {tier.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-6">
                    <Link
                      href={`${checkoutBaseUrl}/checkout/${tier.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
                    >
                      Abbonati a {tier.price} {tier.interval}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
