import { z } from "zod";

export type LocalSubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";

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
