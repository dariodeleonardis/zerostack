import { z } from "zod";

export type LocalSubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";

/**
 * Commissione di ZeroStack sugli abbonamenti pagati, in percento (decisione di Dario del 2/10/2026:
 * lievemente sotto il 10% di Substack). Unico punto di verità: la usano il checkout Stripe
 * (application_fee) e tutti i testi che la citano. Si cambia con PLATFORM_FEE_PERCENT.
 */
export const DEFAULT_PLATFORM_FEE_PERCENT = 8;
/** Commissione trattenuta da Substack, per i confronti nei testi (verificata il 2/10/2026). */
export const SUBSTACK_FEE_PERCENT = 10;

export function platformFeePercent(env: Record<string, string | undefined> = process.env): number {
  const raw = env.PLATFORM_FEE_PERCENT?.trim();
  if (!raw) return DEFAULT_PLATFORM_FEE_PERCENT;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 30) {
    throw new Error(`PLATFORM_FEE_PERCENT="${raw}" non è valido: serve un numero fra 0 e 30`);
  }
  return value;
}

/** Commissione in centesimi su un importo (pagamenti una tantum: Stripe vuole un importo fisso). */
export function platformFeeCents(amountCents: number, percent: number): number {
  return Math.round((amountCents * percent) / 100);
}

/** "8%" o "7,5%", per i testi. */
export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value)}%`;
}

/**
 * Stato Stripe -> stato locale. Solo ACTIVE e TRIALING aprono il paywall (vedi isSubscriptionActive):
 * un pagamento non riuscito (past_due, unpaid, incomplete) chiude l'accesso finché Stripe non incassa.
 */
export function mapStripeSubscriptionStatus(status: string): LocalSubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "PAST_DUE";
  }
}

export const TierInputSchema = z.object({
  publicationId: z.string().uuid(),
  name: z.string().trim().min(2, "Nome del livello richiesto").max(60, "Nome massimo 60 caratteri"),
  description: z.string().trim().min(5, "Descrizione richiesta").max(300, "Descrizione massima 300 caratteri"),
  priceEur: z.number().min(1, "Il prezzo minimo è 1€").max(1000, "Il prezzo massimo è 1000€"),
  interval: z.enum(["MONTH", "YEAR", "ONE_TIME"]),
  benefits: z.array(z.string().trim().min(1).max(120)).min(1, "Inserisci almeno un vantaggio").max(10, "Massimo 10 vantaggi")
});

export type TierInput = z.infer<typeof TierInputSchema>;

/** 7,5 -> 750 centesimi, senza gli errori di virgola mobile (7.1 * 100 = 709.999...). */
export function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}
