// Consenso ai cookie, secondo le linee guida del Garante (provvedimento del 10 giugno 2021).
//
// Questo file è l'unico elenco dei cookie di ZeroStack: la pagina /cookie e il pannello delle
// preferenze lo leggono da qui. Oggi ci sono solo cookie tecnici, che non chiedono consenso:
// il banner non compare e le preferenze restano consultabili dal piè di pagina.
//
// Per aggiungere un servizio facoltativo (statistiche con cookie, video incorporati, pixel):
//   1. aggiungilo a OPTIONAL_SERVICES, con i suoi cookie;
//   2. alza CONSENT_VERSION, così chi aveva già scelto viene interpellato di nuovo;
//   3. caricalo SOLO se isGranted(readConsent(), categoria) è vero, e ascolta CONSENT_EVENT.
//
// Ogni scelta viene anche registrata sul server (POST /api/consent, tabella ConsentRecord) con il
// codice casuale che resta nel cookie: serve a dimostrare il consenso. Niente IP, niente account.

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
  // Codice casuale della scelta, uguale nel cookie e nel registro sul server.
  id: string | null;
}

export const CONSENT_COOKIE = "zs_consent";
export const CONSENT_VERSION = 1;
// Il Garante chiede di non riproporre il banner prima di sei mesi da una scelta.
export const CONSENT_MAX_AGE_DAYS = 180;
// Evento del browser: aprire il pannello (OPEN) e scelta salvata (CHANGED).
export const CONSENT_OPEN_EVENT = "zs:cookie-preferences";
export const CONSENT_EVENT = "zs:consent-changed";
// Per quanto si tiene il registro delle scelte: la prova serve anche dopo i sei mesi di validità.
export const CONSENT_RECORD_MONTHS = 24;
export const CONSENT_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

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
    purpose: "Ricorda le tue scelte sui cookie, per non chiedertele di nuovo, e il codice casuale con cui sono registrate.",
    duration: "6 mesi"
  }
];

export const OPTIONAL_SERVICES: OptionalService[] = [];

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

/** Categorie con almeno un servizio attivo: sono le sole su cui si chiede il consenso. */
export function activeCategories(services: OptionalService[] = OPTIONAL_SERVICES): ConsentCategory[] {
  return CATEGORIES.map((c) => c.id).filter((id) => services.some((s) => s.category === id));
}

/** Solo categorie note, senza doppioni. */
export function cleanCategories(values: unknown[]): ConsentCategory[] {
  return Array.from(new Set(values.filter((g): g is ConsentCategory => typeof g === "string" && CATEGORY_IDS.has(g))));
}

/** Valore del cookie: "versione.secondi.categoria+categoria.codice" (vuoto fra i punti = rifiuto). */
export function serializeConsent(granted: ConsentCategory[], id: string, now: Date = new Date()): string {
  return `${CONSENT_VERSION}.${Math.floor(now.getTime() / 1000)}.${cleanCategories(granted).join("+")}.${id}`;
}

/** null se manca, è illeggibile o viene da una versione precedente dell'elenco. */
export function parseConsent(raw: string | null | undefined): ConsentState | null {
  const match = /^(\d+)\.(\d+)\.([a-z+-]*)(?:\.([A-Za-z0-9_-]{22}))?$/.exec(raw ?? "");
  if (!match) return null;
  const version = Number(match[1]);
  if (version !== CONSENT_VERSION) return null;
  return { version, decidedAt: new Date(Number(match[2]) * 1000), granted: cleanCategories(match[3].split("+")), id: match[4] ?? null };
}

/** 22 caratteri base64url da 16 byte casuali. */
export function newConsentId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...Array.from(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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

/**
 * Scrive la scelta nel cookie del browser, la registra sul server e avvisa chi ascolta CONSENT_EVENT.
 * Il codice resta lo stesso per tutte le scelte successive dello stesso browser.
 * La registrazione parte con keepalive: arriva anche se subito dopo la pagina si ricarica.
 */
export function writeConsent(granted: ConsentCategory[]): ConsentState | null {
  const id = readConsent()?.id ?? newConsentId();
  const value = serializeConsent(granted, id);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`;
  const state = parseConsent(value);
  fetch("/api/consent", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consentId: id, version: CONSENT_VERSION, granted: state?.granted ?? [] })
  }).catch((err) => console.warn("[cookie] scelta non registrata sul server:", err));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  return state;
}
