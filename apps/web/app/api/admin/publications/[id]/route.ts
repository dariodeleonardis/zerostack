import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { requireAdminApi } from "../../../../../lib/admin";

// Sospensione di una pubblicazione: pagine, feed, certificati, iscrizioni, pagamenti e invii fermi.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi(req);
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "suspend" && body?.action !== "unsuspend") {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }
  const updated = await prisma.publication.updateMany({
    where: { id: params.id },
    data: { suspendedAt: body.action === "suspend" ? new Date() : null }
  });
  if (updated.count === 0) return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
  return NextResponse.json({ ok: true, suspended: body.action === "suspend" });
}
