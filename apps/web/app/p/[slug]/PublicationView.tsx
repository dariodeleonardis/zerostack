"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Rss, Headphones, Share2, Check, ArrowRight, CheckCircle2, Coffee } from "lucide-react";

export interface PublicationViewProps {
  publicationId: string;
  checkoutBaseUrl: string;
  slug: string;
  name: string;
  description: string | null;
  authorName: string;
  logoUrl: string | null;
  /** Variabili --pub-* calcolate sul server da lib/colors.ts (colori dell'autore, contrasto garantito). */
  paletteStyle: Record<string, string>;
  titleFont: string;
  bodyFont: string;
  subscriberCount: number;
  /** Piede della pubblicazione, reso sul server (legge l'indirizzo della piattaforma). */
  footer?: React.ReactNode;
  articles: {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    readTime: string;
    isPaidOnly: boolean;
  }[];
  tiers: {
    id: string;
    name: string;
    description: string;
    price: string;
    interval: string;
    benefits: string[];
  }[];
  /** Le ultime note della pubblicazione (T5); i link vanno alla piattaforma, dove vivono le note. */
  notes?: { id: string; url: string; author: string; content: string; date: string; replies: number }[];
  notesUrl?: string;
  /** @slug@dominio: il nome con cui seguirla da Mastodon (T6). */
  fediverseHandle?: string;
  /** Pagina della mancia (T7), solo se la pubblicazione accetta pagamenti. */
  tipUrl?: string | null;
}

/**
 * Pagina di una pubblicazione: testata e colori sono dell'autore, l'impaginazione resta quella di
 * ZeroStack (filetti, sommario da giornale). Ogni colore passa dalle variabili --pub-*.
 */
export function PublicationView({
  publicationId,
  checkoutBaseUrl,
  slug,
  name,
  description,
  authorName,
  logoUrl,
  paletteStyle,
  titleFont,
  bodyFont,
  subscriberCount,
  footer,
  articles,
  tiers,
  notes = [],
  notesUrl,
  fediverseHandle,
  tipUrl
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Appunti non disponibili (pagina non sicura o permesso negato): niente da fare.
    }
  };

  const chip =
    "inline-flex items-center gap-1.5 rounded-full border border-[color:var(--pub-on-accent)] px-3 py-1.5 text-xs font-bold text-[color:var(--pub-on-accent)] transition hover:bg-[color:var(--pub-on-accent)] hover:text-[color:var(--pub-accent)]";

  return (
    <div style={paletteStyle as React.CSSProperties} className={`min-h-screen bg-[color:var(--pub-bg)] pb-20 text-[color:var(--pub-text)] ${bodyFont}`}>
      {/* Testata nel colore dell'autore */}
      <header className="bg-[color:var(--pub-accent)] text-[color:var(--pub-on-accent)]">
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-14 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-5">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[color:var(--pub-on-accent)] font-display text-4xl font-extrabold sm:h-24 sm:w-24">
                {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="kicker opacity-90">Di {authorName}</p>
                <h1 className={`mt-1 text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl ${titleFont}`}>{name}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-sans">
              <Link href={`/api/feed/${slug}/rss`} target="_blank" className={chip} title="Feed RSS">
                <Rss className="h-3.5 w-3.5" aria-hidden /> RSS
              </Link>
              <Link href={`/api/feed/${slug}/podcast`} target="_blank" className={chip} title="Feed del podcast">
                <Headphones className="h-3.5 w-3.5" aria-hidden /> Podcast
              </Link>
              {tipUrl && (
                <a href={tipUrl} className={chip} title="Lascia una mancia all'autore">
                  <Coffee className="h-3.5 w-3.5" aria-hidden /> Mancia
                </a>
              )}
              <button type="button" onClick={handleShare} className={chip} aria-label="Copia il link della pubblicazione">
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
                {copied ? "Copiato" : "Condividi"}
              </button>
            </div>
          </div>
          {description && <p className="mt-8 max-w-2xl text-xl leading-relaxed">{description}</p>}
          {subscriberCount > 0 && <p className="kicker mt-4 opacity-90">{subscriberCount} lettori iscritti</p>}
          {fediverseHandle && (
            <p className="mt-3 font-sans text-sm opacity-90">
              Seguila da Mastodon e dal Fediverso: <span className="select-all font-mono font-bold">{fediverseHandle}</span>
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Iscrizione: il gesto principale della pagina */}
        <section aria-label="Iscriviti alla newsletter" className="-mt-6 border-2 border-[color:var(--pub-text)] bg-[color:var(--pub-bg)] p-5 font-sans sm:p-6">
          {justConfirmed ? (
            <p className="flex items-center gap-2 text-base font-bold">
              <CheckCircle2 className="h-5 w-5" aria-hidden /> Iscrizione confermata: riceverai i prossimi articoli via email.
            </p>
          ) : isSubscribed ? (
            <p role="status" className="flex items-center gap-2 text-base font-bold">
              <Check className="h-5 w-5" aria-hidden /> {subscribeMessage}
            </p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="iscrizione-email" className="sr-only">La tua email</label>
              <input
                id="iscrizione-email"
                type="email"
                required
                autoComplete="email"
                placeholder="nome@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-full border-2 border-[color:var(--pub-text)] bg-white px-5 py-3 text-base text-ink placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={subscribeState === "sending"}
                className="rounded-full bg-[color:var(--pub-accent)] px-7 py-3 text-base font-bold text-[color:var(--pub-on-accent)] ring-2 ring-[color:var(--pub-text)] transition hover:opacity-90 disabled:opacity-60"
              >
                {subscribeState === "sending" ? "Invio…" : "Iscriviti gratis"}
              </button>
            </form>
          )}
          {subscribeState === "error" && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{subscribeMessage}</p>}
          {!isSubscribed && !justConfirmed && (
            <p className="mt-3 text-sm opacity-80">
              Ti arriva un&apos;email di conferma. Ti disiscrivi con un clic da ogni newsletter.{" "}
              <a href={`${checkoutBaseUrl}/privacy`} className="underline underline-offset-4">Privacy</a>
            </p>
          )}
        </section>

        {/* Archivio: sommario da giornale */}
        <section className="mt-16">
          <h2 className={`border-b-[3px] border-[color:var(--pub-text)] pb-3 text-3xl font-extrabold tracking-tight ${titleFont}`}>Articoli</h2>
          {articles.length === 0 ? (
            <p className="py-10 text-center text-lg italic opacity-80">Il primo articolo deve ancora uscire. Iscriviti per riceverlo.</p>
          ) : (
            <ol className="divide-y divide-[color:var(--pub-text)]">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link href={`/p/${slug}/${article.slug}`} className="group block py-8">
                    <p className="kicker flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[color:var(--pub-accent-text)]">
                      <span>{article.date}</span>
                      <span aria-hidden>·</span>
                      <span>{article.readTime} di lettura</span>
                      {article.isPaidOnly && (
                        <span className="rounded-full bg-[color:var(--pub-accent)] px-2 py-0.5 text-[color:var(--pub-on-accent)]">Per gli abbonati</span>
                      )}
                    </p>
                    <h3 className={`mt-3 text-2xl font-bold leading-snug group-hover:underline sm:text-3xl ${titleFont}`}>{article.title}</h3>
                    {article.excerpt && <p className="mt-2 line-clamp-2 text-lg leading-relaxed opacity-90">{article.excerpt}</p>}
                    <span className="mt-3 inline-flex items-center gap-1 font-sans text-sm font-bold">
                      Leggi <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Note: le ultime tre, testo breve */}
        {notes.length > 0 && (
          <section className="mt-16">
            <div className="flex items-baseline justify-between gap-4 border-b-[3px] border-[color:var(--pub-text)] pb-3">
              <h2 className={`text-3xl font-extrabold tracking-tight ${titleFont}`}>Note</h2>
              {notesUrl && (
                <a href={notesUrl} className="font-sans text-sm font-bold hover:underline">
                  Tutte le note
                </a>
              )}
            </div>
            <ul className="divide-y divide-[color:var(--pub-text)]">
              {notes.map((note) => (
                <li key={note.id}>
                  <a href={note.url} className="group block py-6">
                    <p className="kicker flex flex-wrap gap-x-3 font-sans text-[color:var(--pub-accent-text)]">
                      <span>{note.author}</span>
                      <span aria-hidden>·</span>
                      <span>{note.date}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-line break-words text-lg leading-relaxed group-hover:underline">{note.content}</p>
                    {note.replies > 0 && (
                      <span className="mt-2 inline-block font-sans text-sm font-bold">{note.replies === 1 ? "1 risposta" : `${note.replies} risposte`}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Abbonamenti: solo quelli che l'autore ha davvero creato */}
        {tiers.length > 0 && (
          <section className="mt-16 font-sans">
            <h2 className={`border-b-[3px] border-[color:var(--pub-text)] pb-3 text-3xl font-extrabold tracking-tight ${titleFont}`}>Sostieni {name}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {tiers.map((tier) => (
                <div key={tier.id} className="flex flex-col border-2 border-[color:var(--pub-text)] p-6">
                  <h3 className="kicker">{tier.name}</h3>
                  <p className="mt-3">
                    <span className={`text-5xl font-extrabold tracking-tight ${titleFont}`}>{tier.price}</span>
                    <span className="text-sm opacity-80"> {tier.interval}</span>
                  </p>
                  {tier.description && <p className="mt-3 text-base opacity-90">{tier.description}</p>}
                  {tier.benefits.length > 0 && (
                    <ul className="mt-4 space-y-2 text-base">
                      {tier.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                          <Check className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={`${checkoutBaseUrl}/checkout/${tier.id}`}
                    className="mt-6 block rounded-full bg-[color:var(--pub-accent)] py-3 text-center text-base font-bold text-[color:var(--pub-on-accent)] ring-2 ring-[color:var(--pub-text)] transition hover:opacity-90"
                  >
                    Abbonati a {tier.price} {tier.interval}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
      {footer}
    </div>
  );
}
