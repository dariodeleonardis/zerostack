import { createTransportFromEnv, type EmailTransport } from "@zerostack/email";

let transport: EmailTransport | null = null;

/** Trasporto email del processo web (le conferme d'iscrizione partono subito, non dal worker). */
export function emailTransport(): EmailTransport {
  transport ??= createTransportFromEnv();
  return transport;
}
