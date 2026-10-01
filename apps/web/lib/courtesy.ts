import { prisma } from "@zerostack/database";

/**
 * Pagina di cortesia: finché è accesa, chi visita zerostack.it (o un sottodominio) vede solo un
 * messaggio; gli amministratori con l'accesso fatto vedono e usano tutto. Vive in SystemStatus
 * (chiave "pagina-cortesia", ok = sito aperto ai visitatori, detail = messaggio): nessuna riga =
 * sito aperto. La applica il middleware, la cambia il pannello /admin.
 */
const KEY = "pagina-cortesia";

export const DEFAULT_COURTESY_MESSAGE = "Stiamo preparando ZeroStack: la piattaforma italiana per newsletter, blog e podcast indipendenti. Torna a trovarci presto.";
export const COURTESY_MESSAGE_MAX = 500;

export interface CourtesyState {
  enabled: boolean;
  message: string;
  /** Il messaggio scritto dall'amministratore, vuoto se si usa quello predefinito. */
  customMessage: string;
}

export async function getCourtesy(): Promise<CourtesyState> {
  const row = await prisma.systemStatus.findUnique({ where: { key: KEY } });
  const customMessage = row?.detail?.trim() ?? "";
  return { enabled: row ? !row.ok : false, message: customMessage || DEFAULT_COURTESY_MESSAGE, customMessage };
}

export async function setCourtesy(enabled: boolean, message: string): Promise<void> {
  const detail = message.trim().slice(0, COURTESY_MESSAGE_MAX) || null;
  await prisma.systemStatus.upsert({
    where: { key: KEY },
    create: { key: KEY, ok: !enabled, detail },
    update: { ok: !enabled, detail }
  });
}
