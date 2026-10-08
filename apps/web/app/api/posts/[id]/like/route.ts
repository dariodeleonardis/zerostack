import { NextResponse } from "next/server";
import { prisma, Prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../../lib/auth";
import { allowAttempt } from "../../../../../lib/rate-limit";
import { canReadComments, findCommentablePost } from "../../../../../lib/comments";

/**
 * Mi piace a un articolo (T2, 3/10/2026): POST mette, DELETE toglie. Al massimo uno per utente
 * (vincolo Like_userId_postId_key); il contatore Post.likesCount cambia nella stessa transazione
 * del mi piace, quindi resta coerente anche con richieste in contemporanea.
 */
async function prepare(req: Request, postId: string) {
  if (!isSameOriginJson(req)) return { error: NextResponse.json({ error: "Richiesta non valida" }, { status: 400 }) };
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Accedi per mettere mi piace" }, { status: 401 }) };
  const post = await findCommentablePost(postId);
  if (!post || !(await canReadComments(user.id, post))) return { error: NextResponse.json({ error: "Articolo non trovato" }, { status: 404 }) };
  if (!(await allowAttempt(`like:${user.id}`, 60, 10 * 60))) {
    return { error: NextResponse.json({ error: "Troppi mi piace in poco tempo. Riprova tra qualche minuto." }, { status: 429 }) };
  }
  return { user, post };
}

async function result(postId: string, liked: boolean) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { likesCount: true } });
  return NextResponse.json({ liked, likesCount: post?.likesCount ?? 0 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ready = await prepare(req, params.id);
  if ("error" in ready) return ready.error;
  try {
    await prisma.$transaction([
      prisma.like.create({ data: { userId: ready.user.id, postId: ready.post.id } }),
      prisma.post.update({ where: { id: ready.post.id }, data: { likesCount: { increment: 1 } } })
    ]);
  } catch (err) {
    // Già messo (anche da una richiesta parallela): nessun errore, il contatore non si tocca.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  return result(ready.post.id, true);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ready = await prepare(req, params.id);
  if ("error" in ready) return ready.error;
  await prisma.$transaction(async (tx) => {
    const removed = await tx.like.deleteMany({ where: { userId: ready.user.id, postId: ready.post.id } });
    if (removed.count > 0) await tx.post.update({ where: { id: ready.post.id }, data: { likesCount: { decrement: removed.count } } });
  });
  return result(ready.post.id, false);
}
