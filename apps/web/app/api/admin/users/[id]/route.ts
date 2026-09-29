import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { requireAdminApi } from "../../../../../lib/admin";

const ROLES = ["READER", "AUTHOR", "ADMIN"] as const;

// Sospensione e ruolo di un utente. Un SUPERADMIN non si tocca; solo un SUPERADMIN cambia i ruoli.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi(req);
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  if (target.id === admin.id) return NextResponse.json({ error: "Non puoi modificare il tuo stesso account da qui" }, { status: 400 });
  if (target.role === "SUPERADMIN") return NextResponse.json({ error: "Un SUPERADMIN non si può modificare dal pannello" }, { status: 403 });

  if (body?.action === "suspend") {
    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { suspendedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: target.id } })
    ]);
    return NextResponse.json({ ok: true, suspended: true });
  }
  if (body?.action === "unsuspend") {
    await prisma.user.update({ where: { id: target.id }, data: { suspendedAt: null } });
    return NextResponse.json({ ok: true, suspended: false });
  }
  if (body?.action === "role") {
    if (admin.role !== "SUPERADMIN") return NextResponse.json({ error: "Solo un SUPERADMIN cambia i ruoli" }, { status: 403 });
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
    await prisma.user.update({ where: { id: target.id }, data: { role: body.role } });
    return NextResponse.json({ ok: true, role: body.role });
  }
  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}
