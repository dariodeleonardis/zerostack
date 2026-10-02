import { prisma } from "@zerostack/database";

/**
 * Dati del gestore della piattaforma per le pagine legali.
 *
 * Si cambiano da /admin e valgono subito, senza deploy: stanno in PlatformSetting, chiave
 * "dati-legali". Le variabili LEGAL_* restano solo come riserva per un database ancora vuoto.
 * Un campo che manca in tutti e due i posti si vede come "[da completare]", mai inventato.
 * I testi delle pagine sono nel codice e vanno fatti rivedere da un legale.
 */
const KEY = "dati-legali";
const MISSING = "[da completare]";

export const LEGAL_FIELDS = ["name", "vat", "address", "email"] as const;
export type LegalField = (typeof LEGAL_FIELDS)[number];
export type LegalData = Record<LegalField, string> & { updatedAt: string };

export const LEGAL_LIMITS: Record<LegalField, number> = { name: 160, vat: 32, address: 200, email: 120 };

function fromEnv(): Partial<LegalData> {
  const env = process.env;
  return {
    name: env.LEGAL_ENTITY_NAME,
    vat: env.LEGAL_VAT_NUMBER,
    address: env.LEGAL_ADDRESS,
    email: env.LEGAL_CONTACT_EMAIL,
    updatedAt: env.LEGAL_UPDATED_AT
  };
}

const STORED_KEYS: string[] = [...LEGAL_FIELDS, "updatedAt"];

async function fromDatabase(): Promise<Partial<LegalData>> {
  const row = await prisma.platformSetting.findUnique({ where: { key: KEY } });
  const value = row?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Partial<LegalData> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" && v.trim() && STORED_KEYS.includes(k)) out[k as keyof LegalData] = v.trim();
  }
  return out;
}

/** Quello che vede chi legge: database, poi variabili d'ambiente, poi "[da completare]". */
export async function legalEntity(): Promise<LegalData> {
  const [db, env] = [await fromDatabase(), fromEnv()];
  return {
    name: db.name || env.name || MISSING,
    vat: db.vat || env.vat || MISSING,
    address: db.address || env.address || MISSING,
    email: db.email || env.email || MISSING,
    updatedAt: db.updatedAt || env.updatedAt || "29 settembre 2026"
  };
}

/** Data italiana di oggi, ora di Roma ("2 ottobre 2026"). */
export function italianToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" }).format(now);
}

/** Problemi dei dati inviati dal pannello, campo per campo (vuoto = tutto a posto). */
export function legalProblems(input: Record<string, unknown>): Partial<Record<LegalField, string>> {
  const problems: Partial<Record<LegalField, string>> = {};
  for (const field of LEGAL_FIELDS) {
    const v = input[field];
    if (typeof v !== "string" || !v.trim()) problems[field] = "Obbligatorio";
    else if (v.trim().length > LEGAL_LIMITS[field]) problems[field] = `Massimo ${LEGAL_LIMITS[field]} caratteri`;
  }
  if (!problems.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email).trim())) problems.email = "Indirizzo email non valido";
  return problems;
}

/**
 * Salva i dati e porta la data "Aggiornato al" a oggi: cambiare il titolare cambia il documento.
 * Se i dati sono identici a quelli in vigore la data non si muove.
 */
export async function setLegalEntity(input: Record<LegalField, string>, adminHandle: string): Promise<LegalData> {
  const current = await legalEntity();
  const clean = Object.fromEntries(LEGAL_FIELDS.map((f) => [f, input[f].trim()])) as Record<LegalField, string>;
  const changed = LEGAL_FIELDS.some((f) => clean[f] !== current[f]);
  const value: LegalData = { ...clean, updatedAt: changed ? italianToday() : current.updatedAt };
  await prisma.platformSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminHandle },
    update: { value, updatedBy: adminHandle }
  });
  return value;
}
