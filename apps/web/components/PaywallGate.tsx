import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

interface PaywallGateProps {
  publicationName: string;
  tierName: string;
  monthlyPriceEur: number;
  intervalLabel: string;
  tierId: string;
  /** Indirizzo assoluto del checkout sulla piattaforma (dai sottodomini il relativo non basta). */
  checkoutHref?: string;
  /** Solo i vantaggi scritti dall'autore: se non ne ha scritti, non se ne inventano. */
  benefits?: string[];
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

/** Fine dell'anteprima gratuita: nei colori della pubblicazione (variabili --pub-*). */
export function PaywallGate({ publicationName, tierName, monthlyPriceEur, intervalLabel, tierId, checkoutHref, benefits = [] }: PaywallGateProps) {
  const price = euro.format(monthlyPriceEur);
  return (
    <aside className="my-12 border-y-[3px] border-double border-[color:var(--pub-text)] py-10 font-sans">
      <div className="mx-auto max-w-lg text-center">
        <p className="kicker text-[color:var(--pub-accent-text)]">Continua a leggere</p>
        <h3 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Il resto è riservato agli abbonati</h3>
        <p className="mt-3 text-lg opacity-90">
          Abbonati a <strong>{publicationName}</strong> per leggere tutto, e sostieni chi scrive.
        </p>

        <div className="mt-8 border-2 border-[color:var(--pub-text)] p-6 text-left">
          <div className="flex items-baseline justify-between gap-4">
            <h4 className="kicker">{tierName}</h4>
            <p>
              <span className="font-display text-4xl font-extrabold">{price}</span>
              <span className="text-sm opacity-80"> {intervalLabel}</span>
            </p>
          </div>
          {benefits.length > 0 && (
            <ul className="mt-4 space-y-2 text-base">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={checkoutHref ?? `/checkout/${tierId}`}
            className="mt-6 block rounded-full bg-[color:var(--pub-accent)] py-3 text-center text-base font-bold text-[color:var(--pub-on-accent)] ring-2 ring-[color:var(--pub-text)] transition hover:opacity-90"
          >
            Abbonati a {price} {intervalLabel}
          </Link>
        </div>
        <p className="mt-4 text-sm opacity-80">Pagamento con Stripe · Disdici quando vuoi · Fattura elettronica su richiesta</p>
      </div>
    </aside>
  );
}
