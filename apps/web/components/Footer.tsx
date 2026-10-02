import React from "react";
import Link from "next/link";
import { CookiePreferencesButton } from "./CookieConsent";
import { Wordmark } from "./Wordmark";

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
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-ink-300 sm:px-6 lg:px-8">Fatto in Italia · zero commissioni sugli abbonamenti</p>
      </div>
    </footer>
  );
}
