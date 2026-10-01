import { NextResponse } from "next/server";
import { getCurrentUser, isPlatformAdmin } from "../../../../lib/auth";
import { getCourtesy } from "../../../../lib/courtesy";

export const dynamic = "force-dynamic";

/**
 * Per il middleware: la pagina di cortesia è accesa? E chi fa la richiesta (dal cookie) può passare?
 * Passano solo gli amministratori. Se il database non risponde il sito resta aperto: è una pagina
 * di cortesia, non una protezione, e chiudere tutto per un errore sarebbe peggio.
 */
export async function GET() {
  try {
    const courtesy = await getCourtesy();
    if (!courtesy.enabled) {
      return NextResponse.json({ enabled: false, open: true }, { headers: { "cache-control": "no-store" } });
    }
    const user = await getCurrentUser();
    const open = Boolean(user && isPlatformAdmin(user));
    return NextResponse.json({ enabled: true, open }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[cortesia] stato non leggibile, sito lasciato aperto:", err instanceof Error ? err.message : err);
    return NextResponse.json({ enabled: false, open: true, error: true }, { headers: { "cache-control": "no-store" } });
  }
}
