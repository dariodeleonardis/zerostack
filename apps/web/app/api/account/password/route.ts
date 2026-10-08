import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@zerostack/database";
import { ChangePasswordSchema } from "@zerostack/shared";
import { clientIp, getCurrentUser, hashPassword, isSameOriginJson, SESSION_COOKIE, verifyPassword } from "../../../../lib/auth";
import { allowAttempt } from "../../../../lib/rate-limit";

// Cambio password da loggati: serve quella attuale, e le altre sessioni vengono chiuse.
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });
  if (!(await allowAttempt(`password-change:${user.id}:${clientIp(req)}`, 10, 60 * 60))) {
    return NextResponse.json({ error: "Troppi tentativi. Riprova tra un'ora." }, { status: 429 });
  }
  const parsed = ChangePasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return NextResponse.json({ error: "La password attuale non è corretta" }, { status: 400 });
  }
  const current = cookies().get(SESSION_COOKIE)?.value ?? "";
  const currentHash = createHash("sha256").update(current).digest("hex");
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } }),
    prisma.session.deleteMany({ where: { userId: user.id, tokenHash: { not: currentHash } } })
  ]);
  return NextResponse.json({ ok: true });
}
