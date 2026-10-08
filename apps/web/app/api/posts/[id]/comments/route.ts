import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../../lib/auth";
import { allowAttempt } from "../../../../../lib/rate-limit";
import { VERIFY_FIRST } from "../../../../../lib/email-verification";
import { canReadComments, commentProblem, findCommentablePost, notifyOwner } from "../../../../../lib/comments";

/** Nuovo commento (o risposta, con parentId) a un articolo. Regole in lib/comments.ts. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi per commentare" }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: VERIFY_FIRST, code: "email_not_verified" }, { status: 403 });

  const post = await findCommentablePost(params.id);
  if (!post || !(await canReadComments(user.id, post))) return NextResponse.json({ error: "Articolo non trovato" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const problem = commentProblem(body?.content);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (!(await allowAttempt(`comment:${user.id}`, 10, 10 * 60))) {
    return NextResponse.json({ error: "Stai commentando troppo in fretta. Riprova tra qualche minuto." }, { status: 429 });
  }

  let parentId: string | null = null;
  if (body?.parentId != null) {
    const parent =
      typeof body.parentId === "string"
        ? await prisma.comment.findFirst({ where: { id: body.parentId, postId: post.id, hiddenAt: null }, select: { id: true, parentId: true } })
        : null;
    if (!parent) return NextResponse.json({ error: "Il commento a cui rispondi non c'è più" }, { status: 400 });
    // Un solo livello di risposte: rispondere a una risposta vale come rispondere al commento.
    parentId = parent.parentId ?? parent.id;
  }

  const content = String(body.content).trim();
  const comment = await prisma.comment.create({
    data: { authorId: user.id, postId: post.id, parentId, content },
    select: { id: true, content: true, parentId: true, createdAt: true, author: { select: { name: true } } }
  });
  await notifyOwner(post, user, content);
  return NextResponse.json({ comment }, { status: 201 });
}
