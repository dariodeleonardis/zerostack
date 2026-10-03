/** Destinazione dopo login o registrazione: solo percorsi interni, mai un altro sito. */
export function safeNext(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
