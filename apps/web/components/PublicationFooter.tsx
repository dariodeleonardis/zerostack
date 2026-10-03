import React from "react";
import { platformUrlFromEnv } from "@zerostack/shared";
import { CookiePreferencesButton } from "./CookieConsent";

/**
 * Piede delle pagine di una pubblicazione, al posto di quello di ZeroStack: una riga sola,
 * nei colori dell'autore (va dentro il contenitore con le variabili --pub-*).
 * Colora anche il fondo della pagina sotto il contenuto, che altrimenti resterebbe color carta.
 */
export function PublicationFooter({ background }: { background: string }) {
  const platform = platformUrlFromEnv();
  const link = "underline-offset-4 hover:underline";
  return (
    <footer className="mt-20 border-t border-[color:var(--pub-text)] font-sans">
      <style>{`body{background:${background}}`}</style>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm opacity-90 sm:px-6">
        <a href={platform} className={`${link} font-semibold`}>
          Pubblicato con <span className="font-display font-extrabold">Zero</span>
          <span className="font-display italic">Stack</span>
        </a>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <a href="/privacy" className={link}>Privacy</a>
          <a href="/termini" className={link}>Termini</a>
          <a href="/cookie" className={link}>Cookie</a>
          <CookiePreferencesButton className={link} />
        </span>
      </div>
    </footer>
  );
}
