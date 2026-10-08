import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/admin";
import { COURTESY_MESSAGE_MAX, setCourtesy } from "../../../../lib/courtesy";

// Accende o spegne la pagina di cortesia e ne cambia il messaggio. Solo amministratori.
export async function POST(req: Request) {
  const admin = await requireAdminApi(req);
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));

  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Indica se la pagina di cortesia va accesa o spenta" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message : "";
  if (message.length > COURTESY_MESSAGE_MAX) {
    return NextResponse.json({ error: `Messaggio troppo lungo (massimo ${COURTESY_MESSAGE_MAX} caratteri)` }, { status: 400 });
  }

  await setCourtesy(body.enabled, message);
  console.info(`[cortesia] ${body.enabled ? "accesa" : "spenta"} da ${admin.handle}`);
  return NextResponse.json({
    ok: true,
    enabled: body.enabled,
    message: body.enabled
      ? "Pagina di cortesia accesa: entro 15 secondi i visitatori vedono solo il messaggio."
      : "Pagina di cortesia spenta: entro 15 secondi il sito è di nuovo aperto a tutti."
  });
}
