import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../lib/auth";
import { VERIFY_FIRST } from "../../../lib/email-verification";
import { allowAttempt } from "../../../lib/rate-limit";
import { findNote, noteProblem, writablePublications } from "../../../lib/notes";

/** Nuova nota { content, publicationId } o risposta { content, replyToNoteId }. Regole in lib/notes.ts. */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi per scrivere" }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: VERIFY_FIRST, code: "email_not_verified" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const problem = noteProblem(body?.content);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const content = String(body.content).trim();

  if (body?.replyToNoteId != null) {
    const parent = typeof body.replyToNoteId === "string" ? await findNote(body.replyToNoteId) : null;
    if (!parent) return NextResponse.json({ error: "La nota a cui rispondi non c'è più" }, { status: 404 });
    if (!(await allowAttempt(`note:${user.id}`, 20, 10 * 60))) {
      return NextResponse.json({ error: "Stai scrivendo troppo in fretta. Riprova tra qualche minuto." }, { status: 429 });
    }
    // Un solo livello: rispondere a una risposta vale come rispondere alla nota.
    const rootId = parent.replyToNoteId ?? parent.id;
    const [note] = await prisma.$transaction([
      prisma.note.create({ data: { authorId: user.id, publicationId: parent.publicationId, replyToNoteId: rootId, content }, select: { id: true } }),
      prisma.note.update({ where: { id: rootId }, data: { repliesCount: { increment: 1 } } })
    ]);
    return NextResponse.json({ note: { id: note.id, rootId } }, { status: 201 });
  }

  const publications = await writablePublications(user.id);
  const publication = publications.find((p) => p.id === body?.publicationId);
  if (!publication) {
    return NextResponse.json({ error: "Scegli una pubblicazione di cui sei proprietario o editor" }, { status: publications.length ? 400 : 403 });
  }
  if (!(await allowAttempt(`note:${user.id}`, 20, 10 * 60))) {
    return NextResponse.json({ error: "Stai scrivendo troppo in fretta. Riprova tra qualche minuto." }, { status: 429 });
  }
  const note = await prisma.note.create({ data: { authorId: user.id, publicationId: publication.id, content }, select: { id: true } });
  return NextResponse.json({ note: { id: note.id, rootId: note.id } }, { status: 201 });
}
