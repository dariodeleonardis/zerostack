import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser } from "../../../../lib/auth";
import { canModerateNotes } from "../../../../lib/notes";

/** Cancellare una nota (con le sue risposte) o una risposta: chi l'ha scritta o chi modera la pubblicazione. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const origin = req.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== req.headers.get("host")) throw new Error();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });
  const note = await prisma.note.findUnique({ where: { id: params.id }, select: { id: true, authorId: true, publicationId: true, replyToNoteId: true } });
  const allowed = note && (note.authorId === user.id || (await canModerateNotes(user.id, note.publicationId)));
  if (!note || !allowed) return NextResponse.json({ error: "Nota non trovata" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.note.deleteMany({ where: { id: note.id } });
    if (count && note.replyToNoteId) {
      await tx.note.updateMany({ where: { id: note.replyToNoteId, repliesCount: { gt: 0 } }, data: { repliesCount: { decrement: 1 } } });
    }
  });
  return NextResponse.json({ ok: true });
}
