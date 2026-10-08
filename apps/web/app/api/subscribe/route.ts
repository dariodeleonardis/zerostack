import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@zerostack/database";
import { buildConfirmationEmail } from "@zerostack/email";
import { platformUrlFromEnv, SubscribeSchema } from "@zerostack/shared";
import { clientIp, isSameOriginJson } from "../../../lib/auth";
import { allowAttempt } from "../../../lib/rate-limit";
import { emailTransport } from "../../../lib/email";

// Stessa risposta in ogni caso (già iscritto, in attesa, nuovo): il modulo non rivela chi è iscritto.
const DONE = { ok: true, message: "Ti abbiamo scritto: apri l'email e conferma l'iscrizione." };

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  if (!(await allowAttempt(`subscribe-ip:${clientIp(req)}`, 20, 60 * 60))) {
    return NextResponse.json({ error: "Troppe iscrizioni da questa rete. Riprova tra un'ora." }, { status: 429 });
  }

  const parsed = SubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const { publicationId, email, name } = parsed.data;

  const publication = await prisma.publication.findUnique({
    where: { id: publicationId },
    select: { id: true, name: true, primaryColor: true, fromEmail: true, suspendedAt: true }
  });
  if (!publication || publication.suspendedAt) {
    return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
  }

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { publicationId_email: { publicationId, email } },
    select: { status: true }
  });
  if (existing?.status === "ACTIVE") return NextResponse.json(DONE);

  // Chi inserisce l'indirizzo di un altro non può sommergerlo di email di conferma.
  if (!(await allowAttempt(`subscribe-address:${publicationId}:${email}`, 3, 24 * 60 * 60))) {
    return NextResponse.json(DONE);
  }

  const token = randomBytes(32).toString("base64url");
  const confirmTokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.newsletterSubscriber.upsert({
    where: { publicationId_email: { publicationId, email } },
    create: { publicationId, email, name: name || null, status: "PENDING", confirmTokenHash, confirmSentAt: new Date() },
    update: { status: "PENDING", confirmTokenHash, confirmSentAt: new Date(), ...(name ? { name } : {}) }
  });

  const confirmUrl = `${platformUrlFromEnv()}/api/subscribe/confirm?token=${token}`;
  try {
    await emailTransport().send(
      await buildConfirmationEmail({
        to: email,
        subscriberName: name,
        publication: { name: publication.name, primaryColor: publication.primaryColor, replyTo: publication.fromEmail },
        confirmUrl
      })
    );
  } catch (err) {
    console.error("[subscribe] email di conferma non inviata:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Non siamo riusciti a inviare l'email di conferma. Riprova tra poco." }, { status: 502 });
  }

  return NextResponse.json(DONE);
}
