import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";

/**
 * Attiva o disattiva un livello. Non si cancella: gli abbonati esistenti restano collegati
 * e continuano a pagare finché non disdicono; il livello sparisce solo dalle offerte.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per gestire gli abbonamenti" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json({ error: "Indica isActive" }, { status: 400 });
  }
  const tier = await prisma.tier.findUnique({ where: { id: params.id }, select: { id: true, publicationId: true } });
  const owner = tier
    ? await prisma.publicationMember.findFirst({ where: { publicationId: tier.publicationId, userId: user.id, role: "OWNER" }, select: { id: true } })
    : null;
  if (!tier || !owner) {
    return NextResponse.json({ error: "Livello non trovato" }, { status: 404 });
  }
  const updated = await prisma.tier.update({ where: { id: tier.id }, data: { isActive: body.isActive }, select: { id: true, isActive: true } });
  return NextResponse.json({ tier: updated });
}
