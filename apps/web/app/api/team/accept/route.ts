import { NextResponse } from "next/server";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";
import { acceptInvite } from "../../../../lib/team";

/** Accettazione di un invito alla squadra (T4): chi è entrato con l'indirizzo invitato. */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.token !== "string" || !body.token) return NextResponse.json({ error: "Invito non valido" }, { status: 400 });
  try {
    const result = await acceptInvite(user, body.token);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, publicationId: result.publicationId });
  } catch {
    // Due clic in contemporanea: il secondo trova l'invito già usato.
    return NextResponse.json({ error: "Invito già usato" }, { status: 409 });
  }
}
