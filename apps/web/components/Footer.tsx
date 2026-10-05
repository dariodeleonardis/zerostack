import React from "react";
import Link from "next/link";
import { CookiePreferencesButton } from "./CookieConsent";
import { Wordmark } from "./Wordmark";
import { percentWithArticle, platformFeePercent } from "@zerostack/shared";

/** Piè di pagina: fascia d'inchiostro con il filo zafferano sopra, come nella testata. */
export function Footer() {
  const link = "text-paper-300 underline-offset-4 transition hover:text-saffron hover:underline";
  return (
    <footer className="mt-20 border-t-[6px] border-saffron bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Wordmark className="text-paper" />
          <p className="mt-3 max-w-sm font-display text-lg italic leading-snug text-paper-300">
            La piattaforma italiana per chi scrive, e per chi vuole leggerlo senza intermediari.
          </p>
        </div>
        <nav aria-label="Piattaforma" className="text-sm">
          <p className="kicker text-saffron">Piattaforma</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/register" className={link}>Apri una pubblicazione</Link></li>
            <li><Link href="/login" className={link}>Accedi</Link></li>
          </ul>
        </nav>
        <nav aria-label="Note legali" className="text-sm">
          <p className="kicker text-saffron">Note legali</p>
          <ul className="mt-3 space-y-2">
            <li><a href="/privacy" className={link}>Privacy</a></li>
            <li><a href="/termini" className={link}>Termini</a></li>
            <li><a href="/cookie" className={link}>Cookie</a></li>
            <li><CookiePreferencesButton className={link} /></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-ink-700">
        {/* Copyright come sulle altre app di AbsoluteZero: absolutezero.agency in arancione. */}
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-4 text-xs text-ink-300 sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://absolutezero.agency/"
              className="font-semibold text-[#CC6A00] underline underline-offset-2 transition hover:text-[#E8862A]"
            >
              absolutezero.agency
            </a>{" "}
            di Dario De Leonardis
          </p>
          <p>Fatto in Italia · commissione {percentWithArticle(platformFeePercent(), "del")} sugli abbonamenti</p>
        </div>
      </div>
    </footer>
  );
}
