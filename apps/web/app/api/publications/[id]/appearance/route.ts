import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { AppearanceSchema } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "../../../../../lib/auth";
import { isPublicationOwner } from "../../../../../lib/publication-owner";
import { publicationPalette } from "../../../../../lib/colors";

/** Colori e caratteri della pubblicazione: solo il proprietario. Valgono subito sulle pagine pubbliche. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi per cambiare l'aspetto" }, { status: 401 });
  if (!(await isPublicationOwner(user, params.id))) return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });

  const parsed = AppearanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const data = { ...parsed.data, primaryColor: parsed.data.primaryColor.toUpperCase(), backgroundColor: parsed.data.backgroundColor.toUpperCase() };
  await prisma.publication.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, ...data, palette: publicationPalette(data.primaryColor, data.backgroundColor) });
}
