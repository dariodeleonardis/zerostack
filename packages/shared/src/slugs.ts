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

/** Taglia a `max` caratteri senza spezzare una parola (se l'ultima non ci sta, resta fuori). */
function cutAtWord(slug: string, max: number): string {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max + 1);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 0 ? cut.slice(0, lastDash) : slug.slice(0, max)).replace(/-+$/g, "");
}

function plainWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Per il campo dell'indirizzo mentre si scrive a mano: minuscole, niente accenti, spazi e caratteri
 * non ammessi diventano un solo trattino. Il trattino finale resta (si sta per scrivere la parola
 * successiva): lo toglie trimSlug prima del controllo e del salvataggio.
 */
export function normalizeSlugInput(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40);
}

/** Lo slug da controllare e salvare: senza trattini in testa o in coda. */
export function trimSlug(value: string): string {
  return value.replace(/^-+|-+$/g, "");
}

/** "Cronache di Design & AI" -> "cronache-di-design-ai" (accenti tolti, massimo 40 caratteri, mai a metà parola). */
export function slugify(value: string): string {
  return cutAtWord(plainWords(value).join("-"), 40);
}

// Articoli, preposizioni (anche articolate e con apostrofo: "dell'IA" -> "dell", "ia"), congiunzioni
// e pronomi: in un indirizzo non dicono niente e lo allungano.
const STOP_WORDS: ReadonlySet<string> = new Set([
  "il", "lo", "la", "i", "gli", "le", "l", "un", "uno", "una",
  "di", "a", "da", "in", "con", "su", "per", "tra", "fra",
  "del", "dello", "della", "dei", "degli", "delle", "dell",
  "al", "allo", "alla", "ai", "agli", "alle", "all",
  "dal", "dallo", "dalla", "dai", "dagli", "dalle", "dall",
  "nel", "nello", "nella", "nei", "negli", "nelle", "nell",
  "sul", "sullo", "sulla", "sui", "sugli", "sulle", "sull", "col", "coi",
  // "non" resta: una negazione cambia il senso ("Non lo so ancora" non è "so-ancora").
  "e", "ed", "o", "od", "ma", "che", "chi", "se", "si", "ci", "ne", "come", "piu", "anche",
  "questo", "questa", "questi", "queste", "quello", "quella", "quelli", "quelle",
  "mio", "mia", "miei", "mie", "tuo", "tua", "suo", "sua", "nostro", "nostra", "vostro", "vostra", "loro",
  "the", "an", "of", "and", "or", "to", "on", "for", "with", "my", "your", "our"
]);

// Parole che descrivono il formato, non l'argomento: nei suggerimenti corti si tolgono.
const GENERIC_WORDS: ReadonlySet<string> = new Set([
  "newsletter", "blog", "rubrica", "podcast", "magazine", "rivista", "notizie", "news",
  "settimana", "settimanale", "mensile", "giornaliero", "quotidiano", "quotidiana", "weekly", "daily"
]);

const SUGGESTION_MAX = 30;
// Fin qui il titolo intero è già un buon indirizzo: comprimerlo toglierebbe senso, non lunghezza.
const SHORT_TITLE_MAX = 25;

/**
 * Indirizzi da proporre per una pubblicazione, dal titolo libero, mai oltre 30 caratteri né a metà parola.
 * Titolo breve: prima il titolo intero ("Non lo so ancora" -> non-lo-so-ancora).
 * Titolo lungo: varianti senza articoli, preposizioni e parole di formato
 * ("Questa settimana nel grottesco mondo dell'IA" -> grottesco-mondo-ia, grottesco-ia, ...).
 * In coda il nome utente dell'autore, se lo si passa.
 * Solo indirizzi validi e non riservati; la disponibilità la controlla il server.
 */
export function suggestSlugs(title: string, handle?: string): string[] {
  const words = plainWords(title);
  const full = words.join("-");
  const keywords = words.filter((w) => !STOP_WORDS.has(w));
  const content = keywords.filter((w) => !GENERIC_WORDS.has(w));
  const topic = content.length > 0 ? content : keywords;

  const candidates = [
    full.length <= SHORT_TITLE_MAX ? full : "",
    topic.slice(0, 3).join("-"),
    topic.length >= 3 ? [topic[0], topic[topic.length - 1]].join("-") : "",
    keywords.slice(0, 4).join("-"),
    handle ?? "",
    topic.length >= 2 ? topic.slice(0, 2).join("-") : ""
  ];

  const result: string[] = [];
  for (const candidate of candidates) {
    const slug = cutAtWord(candidate, SUGGESTION_MAX);
    if (slug && !result.includes(slug) && slugProblem(slug) === null) result.push(slug);
  }
  return result.slice(0, 4);
}
