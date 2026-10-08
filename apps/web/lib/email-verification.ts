import { createHash, randomBytes } from "crypto";
import { prisma } from "@zerostack/database";
import { buildVerifyEmail } from "@zerostack/email";
import { platformUrlFromEnv } from "@zerostack/shared";
import { emailTransport } from "./email";

const VALID_HOURS = 48;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Spedisce il link di conferma dell'indirizzo. Gli errori li gestisce chi chiama. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string }): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + VALID_HOURS * 60 * 60 * 1000) }
  });
  await emailTransport().send(
    await buildVerifyEmail({ to: user.email, name: user.name, verifyUrl: `${platformUrlFromEnv()}/api/auth/verify-email?token=${token}` })
  );
}

/** Messaggio per le azioni che richiedono l'email confermata (invio newsletter, Stripe). */
export const VERIFY_FIRST = "Conferma prima il tuo indirizzo email: trovi il link nella posta (o richiedilo di nuovo dal pannello).";
