import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { LoginSchema } from "@zerostack/shared";
import { clientIp, createSession, isSameOriginJson, passwordHashForTiming, verifyPassword } from "../../../../lib/auth";
import { allowAttempt } from "../../../../lib/rate-limit";

const WRONG = "Email o password non corretti";

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }
  const { email, password } = parsed.data;

  // Due limiti: uno per rete (chi prova tante email) e uno per account (chi prova tante password).
  const ip = clientIp(req);
  const [byIp, byAccount] = await Promise.all([
    allowAttempt(`login-ip:${ip}`, 30, 15 * 60),
    allowAttempt(`login-account:${email}`, 10, 15 * 60)
  ]);
  if (!byIp || !byAccount) {
    return NextResponse.json({ error: "Troppi tentativi. Riprova tra 15 minuti." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, handle: true, passwordHash: true, suspendedAt: true } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await passwordHashForTiming()));
  if (!user || !ok) {
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }
  if (user.suspendedAt) {
    return NextResponse.json({ error: "Questo account è sospeso. Scrivi all'assistenza per informazioni." }, { status: 403 });
  }

  await createSession(user.id);
  return NextResponse.json({ user: { handle: user.handle } });
}
