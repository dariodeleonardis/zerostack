import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@zerostack/database";
import { PasswordResetSchema } from "@zerostack/shared";
import { clientIp, createSession, hashPassword, isSameOriginJson } from "../../../../../lib/auth";
import { allowAttempt } from "../../../../../lib/rate-limit";

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  if (!(await allowAttempt(`password-reset-ip:${clientIp(req)}`, 20, 60 * 60))) {
    return NextResponse.json({ error: "Troppi tentativi. Riprova tra un'ora." }, { status: 429 });
  }
  const parsed = PasswordResetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const { token, password } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const passwordHash = await hashPassword(password);

  // Il token si "brucia" in modo atomico: due richieste con lo stesso link non passano entrambe.
  const userId = await prisma.$transaction(async (tx) => {
    const reset = await tx.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) return null;
    const used = await tx.passwordResetToken.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) return null;
    // Chi apre il link ricevuto per email ha dimostrato che la casella è sua: vale come conferma.
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, emailVerified: new Date() } });
    // Chi aveva rubato la password (o una sessione) viene buttato fuori ovunque.
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    // Gli altri link di recupero ancora aperti non servono più.
    await tx.passwordResetToken.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } });
    return reset.userId;
  });

  if (!userId) {
    return NextResponse.json({ error: "Il link non è valido o è scaduto. Chiedine uno nuovo." }, { status: 400 });
  }
  await createSession(userId);
  return NextResponse.json({ ok: true });
}
