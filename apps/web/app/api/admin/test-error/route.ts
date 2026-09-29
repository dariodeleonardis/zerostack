import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/admin";

/**
 * Manda un errore di prova lungo la stessa strada degli errori veri (console.error),
 * per verificare dal pannello che la segnalazione a Sentry/GlitchTip funzioni.
 */
export async function POST(req: Request) {
  const admin = await requireAdminApi(req);
  if (admin instanceof NextResponse) return admin;
  const configured = Boolean(process.env.ERROR_REPORTING_DSN || process.env.SENTRY_DSN);
  console.error("[admin] errore di prova", new Error(`Errore di prova inviato da ${admin.email} dal pannello admin`));
  return NextResponse.json({
    configured,
    message: configured ? "Errore di prova inviato: deve comparire tra pochi secondi nel tuo Sentry/GlitchTip." : "ERROR_REPORTING_DSN non impostato: l'errore è finito solo nei log."
  });
}
