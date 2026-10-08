import { NextResponse } from "next/server";
import { prisma, Prisma } from "@zerostack/database";
import { RegisterSchema } from "@zerostack/shared";
import { clientIp, createSession, hashPassword, isSameOriginJson } from "../../../../lib/auth";
import { allowAttempt } from "../../../../lib/rate-limit";
import { sendVerificationEmail } from "../../../../lib/email-verification";
import { getCourtesy } from "../../../../lib/courtesy";

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  // La pagina di cortesia chiude /register, ma l'API restava aperta a chi la chiamava direttamente.
  if ((await getCourtesy()).enabled) {
    return NextResponse.json({ error: "ZeroStack non è ancora aperto alle iscrizioni." }, { status: 403 });
  }
  if (!(await allowAttempt(`register:${clientIp(req)}`, 5, 60 * 60))) {
    return NextResponse.json({ error: "Troppe registrazioni da questa rete. Riprova tra un'ora." }, { status: 429 });
  }

  const parsed = RegisterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, email, handle, password } = parsed.data;

  // Il nome utente non può coincidere con il sottodominio di una pubblicazione esistente.
  const slugInUse = await prisma.publication.findUnique({ where: { slug: handle }, select: { id: true } });
  if (slugInUse) {
    return NextResponse.json({ error: "Questo nome utente è già in uso", fields: { handle: ["Già in uso"] } }, { status: 409 });
  }

  try {
    const user = await prisma.user.create({
      data: { name, email, handle, passwordHash: await hashPassword(password) },
      select: { id: true, handle: true, email: true, name: true }
    });
    await createSession(user.id);
    // Se l'email di conferma non parte l'account resta valido: la si può richiedere dal pannello.
    await sendVerificationEmail(user).catch((err) =>
      console.error("[register] email di conferma non inviata:", err instanceof Error ? err.message : err)
    );
    return NextResponse.json({ user: { handle: user.handle } }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String((err.meta as { target?: unknown } | undefined)?.target ?? "");
      const field = target.includes("email") ? "email" : "handle";
      const message = field === "email" ? "Esiste già un account con questa email" : "Questo nome utente è già in uso";
      return NextResponse.json({ error: message, fields: { [field]: ["Già in uso"] } }, { status: 409 });
    }
    throw err;
  }
}
