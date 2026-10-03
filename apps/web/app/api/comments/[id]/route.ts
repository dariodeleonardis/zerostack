import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";
import { canModerate } from "../../../../lib/comments";

async function load(id: string) {
  return prisma.comment.findUnique({ where: { id }, select: { id: true, authorId: true, post: { select: { publicationId: true } } } });
}

/** Nascondere o rimostrare un commento: solo chi modera la pubblicazione. Altrimenti 404. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });
  const comment = await load(params.id);
  if (!comment?.post || !(await canModerate(user.id, comment.post.publicationId))) {
    return NextResponse.json({ error: "Commento non trovato" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.hidden !== "boolean") return NextResponse.json({ error: "Indica se nascondere il commento" }, { status: 400 });
  const updated = await prisma.comment.update({ where: { id: comment.id }, data: { hiddenAt: body.hidden ? new Date() : null }, select: { id: true, hiddenAt: true } });
  return NextResponse.json({ comment: updated });
}

/** Cancellare un commento (con le sue risposte): chi l'ha scritto o chi modera. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const origin = req.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== req.headers.get("host")) throw new Error();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });
  const comment = await load(params.id);
  const allowed = comment && (comment.authorId === user.id || (comment.post && (await canModerate(user.id, comment.post.publicationId))));
  if (!comment || !allowed) return NextResponse.json({ error: "Commento non trovato" }, { status: 404 });
  await prisma.comment.delete({ where: { id: comment.id } });
  return NextResponse.json({ ok: true });
}
