import { z } from "zod";

/**
 * Nomi che non possono diventare un sottodominio (nomeautore.zerostack.it).
 * Una sola lista per tutti: registrazione, creazione della pubblicazione e
 * /api/domains/check, che decide se Caddy emette il certificato. Se la
 * registrazione accettasse un nome che il controllo dei certificati rifiuta,
 * l'autore resterebbe con un indirizzo senza HTTPS.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  // piattaforma
  "www", "api", "app", "admin", "superadmin", "dashboard", "studio", "account",
  "login", "logout", "register", "signup", "auth", "billing", "checkout",
  "inbox", "notes", "podcasts", "p", "feed", "rss",
  // infrastruttura e servizi
  "cdn", "static", "assets", "media", "img", "status", "coolify", "proxy",
  "mail", "smtp", "imap", "pop", "webmail", "mx", "ns1", "ns2", "ftp",
  "autodiscover", "autoconfig", "dev", "staging", "test",
  // marchio e assistenza
  "zerostack", "blog", "help", "support", "docs", "legal", "privacy", "security"
]);

// Un'etichetta DNS valida: minuscole, cifre e trattini, mai un trattino in testa o in coda.
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export type SlugProblem = "format" | "reserved";

/** Motivo per cui uno slug non può diventare un sottodominio, oppure null se va bene. */
export function slugProblem(slug: string): SlugProblem | null {
  if (slug.length < 3 || slug.length > 40 || !SLUG_PATTERN.test(slug)) return "format";
  // "xn--" è il prefisso dei nomi internazionalizzati: un sottodominio così sembrerebbe un altro nome.
  if (slug.includes("--")) return "format";
  if (RESERVED_SUBDOMAINS.has(slug)) return "reserved";
  return null;
}

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((slug, ctx) => {
    const problem = slugProblem(slug);
    if (problem === "format") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Da 3 a 40 caratteri: lettere minuscole, numeri e trattini singoli, senza trattino all'inizio o alla fine"
      });
    } else if (problem === "reserved") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Questo nome è riservato alla piattaforma" });
    }
  });

/** "Cronache di Design & AI" -> "cronache-di-design-ai" (accenti tolti, massimo 40 caratteri). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
