// Il divisore che l'editor inserisce nel testo: <hr class="paywall-divider" data-paywall="true" />
const PAYWALL_DIVIDER = /<hr\b[^>]*\bdata-paywall\s*=\s*["']?true["']?[^>]*>/i;

/** Divide il testo al divisore del paywall. Senza divisore tutto il testo è `rest`. */
export function splitAtPaywall(html: string): { preview: string; rest: string; hasDivider: boolean } {
  const match = PAYWALL_DIVIDER.exec(html);
  if (!match) return { preview: "", rest: html, hasDivider: false };
  return {
    preview: html.slice(0, match.index),
    rest: html.slice(match.index + match[0].length),
    hasDivider: true
  };
}

export type PostAccessLevel = "FREE" | "PAID_SUBSCRIBERS" | "FOUNDING_MEMBERS" | "TIER_SPECIFIC";

/**
 * Chi legge tutto: tutti per i post gratuiti; la redazione della pubblicazione sempre;
 * per gli altri livelli serve un abbonamento pagato attivo. Lo schema non lega ancora un post
 * a un livello preciso, quindi FOUNDING_MEMBERS e TIER_SPECIFIC valgono come "abbonato pagante".
 */
export function canReadFullPost(access: PostAccessLevel, reader: { isMember: boolean; hasPaidSubscription: boolean }): boolean {
  if (access === "FREE") return true;
  return reader.isMember || reader.hasPaidSubscription;
}

export function isSubscriptionActive(
  sub: { status: string; isPaid: boolean; currentPeriodEnd: Date | null },
  now = new Date()
): boolean {
  if (!sub.isPaid) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIALING") return false;
  return sub.currentPeriodEnd === null || sub.currentPeriodEnd > now;
}
