import { prisma } from "@zerostack/database";
import { slugProblem } from "@zerostack/shared";

export function rootDomain(): string {
  return (process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "zerostack.it").toLowerCase();
}

export function publicationUrl(slug: string): string {
  return `https://${slug}.${rootDomain()}`;
}

/**
 * Il middleware porta su /p/<chiave> sia slug.zerostack.it (chiave = "slug") sia i domini
 * personalizzati (chiave = "newsletter.mario.it"): questi valgono solo se verificati.
 */
export function publicationWhere(slugOrDomain: string) {
  const key = decodeURIComponent(slugOrDomain).toLowerCase();
  return key.includes(".") ? { customDomain: key, isDomainVerified: true } : { slug: key };
}

export type SlugAvailability =
  | { available: true }
  | { available: false; reason: "format" | "reserved" | "taken" };

/**
 * Può `slug` diventare il sottodominio di una nuova pubblicazione di `userId`?
 * Pubblicazioni e nomi utente condividono lo spazio dei sottodomini: lo slug non può essere
 * il nome utente di qualcun altro (il proprio sì, è il caso tipico: dario -> dario.zerostack.it).
 * L'ultima parola resta al vincolo @unique sullo slug, che copre due richieste simultanee.
 */
export async function checkSlugAvailability(slug: string, userId?: string): Promise<SlugAvailability> {
  const problem = slugProblem(slug);
  if (problem) return { available: false, reason: problem };

  const [publication, user] = await Promise.all([
    prisma.publication.findUnique({ where: { slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { handle: slug }, select: { id: true } })
  ]);
  if (publication) return { available: false, reason: "taken" };
  if (user && user.id !== userId) return { available: false, reason: "taken" };
  return { available: true };
}

export const SLUG_REASON_MESSAGES: Record<"format" | "reserved" | "taken", string> = {
  format: "Da 3 a 40 caratteri: lettere minuscole, numeri e trattini singoli",
  reserved: "Questo nome è riservato alla piattaforma",
  taken: "Questo indirizzo è già in uso"
};
