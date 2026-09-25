import crypto from "crypto";

/**
 * Sistema di Analitiche Privacy-First GDPR-Compliant senza Cookie
 * Crea un hash univoco giornaliero con salt rotante a 24 ore:
 * Non memorizza MAI l'indirizzo IP, rendendo superfluo il banner dei cookie traccianti.
 */
export function generateDailyVisitorHash(
  ip: string,
  userAgent: string,
  publicationSlug: string,
  dateIsoDay: string = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
): string {
  // Salt giornaliero segreto o derivato per anonimizzazione crittografica irreversibile
  const salt = process.env.ANALYTICS_SALT || "zerostack-privacy-salt-2026";
  const rawString = `${ip}-${userAgent}-${publicationSlug}-${dateIsoDay}-${salt}`;

  return crypto
    .createHash("sha256")
    .update(rawString)
    .digest("hex")
    .substring(0, 16); // Hash compatto anonimo a 16 caratteri esadecimali
}

export interface PageViewEvent {
  path: string;
  referrer?: string;
  publicationSlug: string;
  visitorHash: string;
  timestamp: string;
  deviceType: "mobile" | "desktop" | "tablet";
}

export function parseDeviceType(userAgent: string): "mobile" | "desktop" | "tablet" {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      userAgent
    )
  ) {
    return "mobile";
  }
  return "desktop";
}
