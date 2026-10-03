import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@zerostack/database";
import { buildPasswordResetEmail } from "@zerostack/email";
import { PasswordResetRequestSchema, platformUrlFromEnv } from "@zerostack/shared";
import { clientIp, isSameOriginJson } from "../../../../../lib/auth";
import { allowAttempt } from "../../../../../lib/rate-limit";
import { emailTransport } from "../../../../../lib/email";

const VALID_MINUTES = 60;
// Si dice se l'indirizzo è registrato (decisione di Dario, 3/10/2026): la registrazione lo rivela già
// ("Esiste già un account con questa email"), e un messaggio vago confondeva chi sbagliava indirizzo.
// Contro chi prova indirizzi a raffica resta il limite per IP qui sotto.

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const parsed = PasswordResetRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Email non valida" }, { status: 400 });
  }
  const { email } = parsed.data;

  const [byIp, byAddress] = await Promise.all([
    allowAttempt(`password-forgot-ip:${clientIp(req)}`, 10, 60 * 60),
    allowAttempt(`password-forgot-address:${email}`, 3, 60 * 60)
  ]);
  if (!byIp) {
    return NextResponse.json({ error: "Troppe richieste da questa rete. Riprova tra un'ora." }, { status: 429 });
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) {
    return NextResponse.json({ error: "Non c'è nessun account con questa email. Controlla di averla scritta giusta, oppure crea un account.", code: "not_found" }, { status: 404 });
  }
  // Oltre tre link all'ora per lo stesso indirizzo non si spedisce: nessuno può sommergere una casella.
  if (!byAddress) {
    return NextResponse.json({ error: "Ti abbiamo già mandato tre link nell'ultima ora: cercali nella posta, anche nello spam. Puoi chiederne un altro fra un'ora." }, { status: 429 });
  }

  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + VALID_MINUTES * 60 * 1000)
    }
  });

  try {
    await emailTransport().send(
      buildPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: `${platformUrlFromEnv()}/reset-password?token=${token}`,
        validMinutes: VALID_MINUTES
      })
    );
  } catch (err) {
    console.error("[password/forgot] email non inviata:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Non siamo riusciti a inviare l'email. Riprova tra poco." }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    message: `Ti abbiamo mandato il link a ${user.email}. Vale ${VALID_MINUTES} minuti: se non lo trovi, guarda anche nello spam.`
  });
}
