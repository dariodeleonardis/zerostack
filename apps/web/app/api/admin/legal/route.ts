import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/admin";
import { LEGAL_FIELDS, legalProblems, setLegalEntity, type LegalField } from "../../../../lib/legal";

// Dati del titolare nelle pagine legali: valgono subito, senza deploy. Solo amministratori.
export async function POST(req: Request) {
  const admin = await requireAdminApi(req);
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const problems = legalProblems(body);
  if (Object.keys(problems).length > 0) {
    return NextResponse.json({ error: "Controlla i campi segnati", fields: problems }, { status: 400 });
  }
  const input = Object.fromEntries(LEGAL_FIELDS.map((f) => [f, String(body[f])])) as Record<LegalField, string>;
  const saved = await setLegalEntity(input, admin.handle);
  console.info(`[dati-legali] aggiornati da ${admin.handle}`);
  return NextResponse.json({ ok: true, data: saved, message: `Salvato. Le pagine legali mostrano i nuovi dati, aggiornate al ${saved.updatedAt}.` });
}
