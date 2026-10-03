import { NextResponse } from "next/server";
import { prisma, Prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../../lib/auth";
import { allowAttempt } from "../../../../../lib/rate-limit";
import { findNote } from "../../../../../lib/notes";

/** Mi piace a una nota (T5): come per gli articoli, uno per utente e contatore nella stessa transazione. */
async function prepare(req: Request, noteId: string) {
  if (!isSameOriginJson(req)) return { error: NextResponse.json({ error: "Richiesta non valida" }, { status: 400 }) };
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Accedi per mettere mi piace" }, { status: 401 }) };
  const note = await findNote(noteId);
  if (!note) return { error: NextResponse.json({ error: "Nota non trovata" }, { status: 404 }) };
  if (!(await allowAttempt(`like:${user.id}`, 60, 10 * 60))) {
    return { error: NextResponse.json({ error: "Troppi mi piace in poco tempo. Riprova tra qualche minuto." }, { status: 429 }) };
  }
  return { user, note };
}

async function result(noteId: string, liked: boolean) {
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { likesCount: true } });
  return NextResponse.json({ liked, likesCount: note?.likesCount ?? 0 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ready = await prepare(req, params.id);
  if ("error" in ready) return ready.error;
  try {
    await prisma.$transaction([
      prisma.like.create({ data: { userId: ready.user.id, noteId: ready.note.id } }),
      prisma.note.update({ where: { id: ready.note.id }, data: { likesCount: { increment: 1 } } })
    ]);
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  return result(ready.note.id, true);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ready = await prepare(req, params.id);
  if ("error" in ready) return ready.error;
  await prisma.$transaction(async (tx) => {
    const removed = await tx.like.deleteMany({ where: { userId: ready.user.id, noteId: ready.note.id } });
    if (removed.count > 0) await tx.note.update({ where: { id: ready.note.id }, data: { likesCount: { decrement: removed.count } } });
  });
  return result(ready.note.id, false);
}
