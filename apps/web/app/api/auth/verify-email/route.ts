import { NextRequest } from "next/server";
import { prisma } from "@zerostack/database";
import { hashToken } from "../../../../lib/email-verification";
import { simplePage } from "../../../../lib/simple-page";

export const dynamic = "force-dynamic";

// Link dell'email di conferma: segna l'indirizzo come verificato (una volta sola, entro 48 ore).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const row = token.length >= 20
    ? await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, userId: true, expiresAt: true, usedAt: true } })
    : null;
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return simplePage("Link non valido", '<p>Il link di conferma non è valido o è scaduto. Accedi e richiedine uno nuovo dal <a href="/studio">pannello</a>.</p>', 400);
  }
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } })
  ]);
  return simplePage("Email confermata", '<p>Grazie: il tuo indirizzo è confermato. Ora puoi inviare newsletter e ricevere pagamenti.</p><p><a href="/studio">Vai al pannello</a></p>');
}
