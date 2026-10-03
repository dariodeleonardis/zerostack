/**
 * Legge un numero dall'ambiente. Vuoto o assente = valore predefinito; scritto male o fuori
 * dall'intervallo = errore all'avvio, con il nome della variabile. Prima un refuso dava NaN, e
 * setTimeout(NaN) gira senza pausa (audit A12, 2/10/2026).
 */
export function envNumber(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number,
  { min = 0, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {}
): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name}="${raw}" non è valido: serve un numero fra ${min} e ${max}`);
  }
  return value;
}
