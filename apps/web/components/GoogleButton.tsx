import React from "react";
import { isGoogleConfigured } from "../lib/google-oauth";
import { safeNext } from "../lib/safe-next";

const ERRORS: Record<string, string> = {
  "google-spento": "L'accesso con Google non è attivo.",
  "google-annullato": "Accesso con Google annullato.",
  "google-scaduto": "La richiesta a Google è scaduta o non è valida. Riprova.",
  "google-email-non-verificata": "Google non ha verificato l'email di questo account: usa email e password.",
  "iscrizioni-chiuse": "ZeroStack non è ancora aperto alle iscrizioni: con Google può entrare solo chi ha già un account.",
  "google-errore": "Google non ha risposto come previsto. Riprova tra poco.",
  "troppi-tentativi": "Troppi tentativi. Riprova tra 15 minuti.",
  sospeso: "Questo account è sospeso. Scrivi all'assistenza per informazioni."
};

/**
 * "Continua con Google" (componente server: legge le chiavi a ogni richiesta). Senza chiavi non
 * compare; gli errori del ritorno da Google si mostrano comunque, perché arrivano nell'indirizzo.
 */
export function GoogleButton({ next, error, label = "Continua con Google" }: { next?: string; error?: string; label?: string }) {
  const message = error ? ERRORS[error] : undefined;
  const target = safeNext(next ?? null, "");
  const href = `/api/auth/google/start${target ? `?next=${encodeURIComponent(target)}` : ""}`;
  return (
    <div className="mt-6 space-y-4">
      {message && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {message}
        </p>
      )}
      {isGoogleConfigured() && (
        <>
          <a
            href={href}
            className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-ink bg-white px-6 py-3 text-base font-bold text-ink transition hover:bg-paper"
          >
            <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            {label}
          </a>
          <p className="text-center text-xs text-gray-500">
            Continuando con Google accetti i <a href="/termini" className="underline">Termini di servizio</a> e dichiari di aver letto
            l&apos;<a href="/privacy" className="underline">informativa privacy</a>. Da Google riceviamo solo nome ed email.
          </p>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            <span className="h-px flex-1 bg-gray-300" />
            oppure con email
            <span className="h-px flex-1 bg-gray-300" />
          </p>
        </>
      )}
    </div>
  );
}
