import { NextResponse } from "next/server";
import { getCurrentUser, isPlatformAdmin, isSameOriginJson, type CurrentUser } from "./auth";

/** Per le API di amministrazione: utente ADMIN o SUPERADMIN, oppure la risposta d'errore da restituire. */
export async function requireAdminApi(req: Request): Promise<CurrentUser | NextResponse> {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  // 404 come per le pagine: chi non è amministratore non deve sapere che l'API esiste.
  if (!user || !isPlatformAdmin(user)) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return user;
}
