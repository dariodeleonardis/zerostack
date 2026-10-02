// Consenso ai cookie, secondo le linee guida del Garante (provvedimento del 10 giugno 2021).
//
// Questo file è l'unico elenco dei cookie di ZeroStack: la pagina /cookie e il pannello delle
// preferenze lo leggono da qui. Oggi ci sono solo cookie tecnici, che non chiedono consenso:
// il banner non compare e le preferenze restano consultabili dal piè di pagina.
//
// Per aggiungere un servizio facoltativo (statistiche con cookie, video incorporati, pixel):
//   1. aggiungilo a OPTIONAL_SERVICES, con i suoi cookie;
//   2. alza CONSENT_VERSION, così chi aveva già scelto viene interpellato di nuovo;
//   3. caricalo SOLO se isGranted(readConsent(), categoria) è vero, e ascolta CONSENT_EVENT;
//   4. prima di andare in produzione serve anche la registrazione delle scelte lato server,
//      per poter dimostrare il consenso (oggi non c'è perché non c'è niente da consentire).

export type ConsentCategory = "statistiche" | "contenuti-esterni" | "marketing";

export interface CookieEntry {
  name: string;
  purpose: string;
  duration: string;
}

export interface OptionalService {
  id: string;
  name: string;
  category: ConsentCategory;
  provider: string;
  privacyUrl: string;
  cookies: CookieEntry[];
}

export interface ConsentState {
  version: number;
  decidedAt: Date;
  granted: ConsentCategory[];
}

export const CONSENT_COOKIE = "zs_consent";
export const CONSENT_VERSION = 1;
// Il Garante chiede di non riproporre il banner prima di sei mesi da una scelta.
export const CONSENT_MAX_AGE_DAYS = 180;
// Evento del browser: aprire il pannello (OPEN) e scelta salvata (CHANGED).
export const CONSENT_OPEN_EVENT = "zs:cookie-preferences";
export const CONSENT_EVENT = "zs:consent-changed";

export const CATEGORIES: { id: ConsentCategory; label: string; description: string }[] = [
  { id: "statistiche", label: "Statistiche", description: "Misurano come vengono lette le pagine, con strumenti che usano cookie." },
  { id: "contenuti-esterni", label: "Contenuti esterni", description: "Video, podcast e post social incorporati negli articoli (YouTube, Spotify e simili)." },
  { id: "marketing", label: "Marketing", description: "Misurano le campagne pubblicitarie e possono profilarti." }
];

export const TECHNICAL_COOKIES: CookieEntry[] = [
  {
    name: "zs_session",
    purpose: "Ti tiene collegato al tuo account, anche sui sottodomini delle pubblicazioni. È visibile solo al server (HttpOnly).",
    duration: "30 giorni, o fino a quando esci"
  },
  {
    name: CONSENT_COOKIE,
    purpose: "Ricorda le tue scelte sui cookie, per non chiedertele di nuovo.",
    duration: "6 mesi"
  }
];

export const OPTIONAL_SERVICES: OptionalService[] = [];

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

/** Categorie con almeno un servizio attivo: sono le sole su cui si chiede il consenso. */
export function activeCategories(services: OptionalService[] = OPTIONAL_SERVICES): ConsentCategory[] {
  return CATEGORIES.map((c) => c.id).filter((id) => services.some((s) => s.category === id));
}

/** Valore del cookie: "versione.secondi.categoria+categoria" (vuoto dopo il punto = rifiuto). */
export function serializeConsent(granted: ConsentCategory[], now: Date = new Date()): string {
  const unique = Array.from(new Set(granted.filter((g) => CATEGORY_IDS.has(g))));
  return `${CONSENT_VERSION}.${Math.floor(now.getTime() / 1000)}.${unique.join("+")}`;
}

/** null se manca, è illeggibile o viene da una versione precedente dell'elenco. */
export function parseConsent(raw: string | null | undefined): ConsentState | null {
  const match = /^(\d+)\.(\d+)\.([a-z+-]*)$/.exec(raw ?? "");
  if (!match) return null;
  const version = Number(match[1]);
  if (version !== CONSENT_VERSION) return null;
  const granted = match[3].split("+").filter((g): g is ConsentCategory => CATEGORY_IDS.has(g));
  return { version, decidedAt: new Date(Number(match[2]) * 1000), granted };
}

/** Il banner serve solo se c'è qualcosa da consentire e la persona non ha ancora scelto. */
export function needsConsentPrompt(state: ConsentState | null, services: OptionalService[] = OPTIONAL_SERVICES): boolean {
  return activeCategories(services).length > 0 && state === null;
}

export function isGranted(state: ConsentState | null, category: ConsentCategory): boolean {
  return state?.granted.includes(category) ?? false;
}

/** Legge la scelta dal cookie del browser (solo lato client). */
export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(entry?.slice(CONSENT_COOKIE.length + 1));
}

/** Scrive la scelta nel cookie del browser e avvisa chi ascolta CONSENT_EVENT. */
export function writeConsent(granted: ConsentCategory[]): ConsentState | null {
  const value = serializeConsent(granted);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`;
  const state = parseConsent(value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  return state;
}
