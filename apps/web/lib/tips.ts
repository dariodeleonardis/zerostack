/**
 * Mance (T7, 3/10/2026): un pagamento una tantum al conto Stripe dell'autore, con la stessa
 * commissione degli abbonamenti. Non dà accesso a niente e non genera una fattura automatica.
 * Niente database qui: lo usa anche il modulo nel browser.
 */
export const TIP_MIN_CENTS = 100;
export const TIP_MAX_CENTS = 50_000;
export const TIP_PRESETS_CENTS = [300, 500, 1000, 2000];
export const TIP_MESSAGE_MAX = 280;

/** Importo in centesimi, o null se non è un intero fra il minimo e il massimo. */
export function tipAmount(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= TIP_MIN_CENTS && n <= TIP_MAX_CENTS ? n : null;
}

/** "12,50" o "12.5" in centesimi (null se non è un importo). */
export function euroToCents(text: string): number | null {
  const clean = text.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export const formatEuro = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
