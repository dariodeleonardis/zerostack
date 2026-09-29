import { NextResponse } from "next/server";
import { prisma, publishPost } from "@zerostack/database";
import { publicationBaseUrl, SavePostSchema, slugify, splitAtPaywall } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "./auth";
import { sanitizePostHtml } from "./posts";
import { VERIFY_FIRST } from "./email-verification";

async function uniquePostSlug(publicationId: string, title: string, excludePostId?: string): Promise<string> {
  const base = slugify(title) || "post";
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const clash = await prisma.post.findFirst({
      where: { publicationId, slug: candidate, ...(excludePostId ? { id: { not: excludePostId } } : {}) },
      select: { id: true }
    });
    if (!clash) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export function excerptFrom(html: string): string | null {
  const { preview, rest, hasDivider } = splitAtPaywall(html);
  const text = (hasDivider ? preview : rest).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
}

/**
 * Salvataggio dall'editor dello studio, usato da POST /api/posts (nuovo) e PATCH /api/posts/:id.
 * Chi collabora (CONTRIBUTOR) salva solo bozze; pubblicare e programmare spetta a OWNER ed EDITOR.
 */
export async function savePost(req: Request, postId?: string): Promise<Response> {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per scrivere" }, { status: 401 });
  }

  const parsed = SavePostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const input = parsed.data;

  const existing = postId
    ? await prisma.post.findUnique({ where: { id: postId }, select: { id: true, publicationId: true, status: true, slug: true, title: true } })
    : null;
  if (postId && (!existing || existing.publicationId !== input.publicationId)) {
    return NextResponse.json({ error: "Post non trovato" }, { status: 404 });
  }

  const membership = await prisma.publicationMember.findUnique({
    where: { publicationId_userId: { publicationId: input.publicationId, userId: user.id } },
    select: { role: true }
  });
  if (!membership) {
    return NextResponse.json({ error: postId ? "Post non trovato" : "Pubblicazione non trovata" }, { status: 404 });
  }
  if (input.action !== "draft" && membership.role === "CONTRIBUTOR") {
    return NextResponse.json({ error: "Puoi salvare bozze: la pubblicazione spetta alla redazione" }, { status: 403 });
  }
  // Mandare email agli iscritti da un indirizzo mai confermato è la porta dello spam.
  const wouldEmail = input.sendEmail && input.action !== "draft" && existing?.status !== "PUBLISHED";
  if (wouldEmail && !user.emailVerified) {
    return NextResponse.json({ error: VERIFY_FIRST, code: "email_not_verified" }, { status: 403 });
  }
  if (existing?.status === "PUBLISHED" && input.action !== "publish") {
    return NextResponse.json({ error: "Il post è già pubblicato: puoi solo aggiornarlo" }, { status: 400 });
  }

  const contentHtml = sanitizePostHtml(input.contentHtml);
  const isPublished = existing?.status === "PUBLISHED";
  // L'indirizzo di un post già uscito non cambia più: i link condivisi devono restare validi.
  const slug = isPublished
    ? existing!.slug
    : existing && existing.title === input.title
      ? existing.slug
      : await uniquePostSlug(input.publicationId, input.title, existing?.id);

  const data = {
    title: input.title,
    subtitle: input.subtitle || null,
    slug,
    contentHtml,
    excerpt: excerptFrom(contentHtml),
    access: input.access,
    emailOnPublish: input.action === "schedule" && input.sendEmail,
    ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
    ...(input.podcast !== undefined ? { format: input.podcast ? ("PODCAST" as const) : ("ARTICLE" as const) } : {}),
    ...(isPublished
      ? {}
      : input.action === "schedule"
        ? { status: "SCHEDULED" as const, scheduledAt: new Date(input.scheduledAt!) }
        : { status: "DRAFT" as const, scheduledAt: null })
  };

  const saved = existing
    ? await prisma.post.update({ where: { id: existing.id }, data, select: { id: true } })
    : await prisma.post.create({
        data: { format: "ARTICLE", ...data, publicationId: input.publicationId, authorId: user.id },
        select: { id: true }
      });

  // Episodio podcast: si crea, si aggiorna o si toglie insieme al post.
  if (input.podcast) {
    const episode = { audioUrl: input.podcast.audioUrl, durationSeconds: input.podcast.durationSeconds };
    await prisma.podcastEpisode.upsert({ where: { postId: saved.id }, create: { postId: saved.id, ...episode }, update: episode });
  } else if (input.podcast === null) {
    await prisma.podcastEpisode.deleteMany({ where: { postId: saved.id } });
  }

  let campaignId: string | null = null;
  if (input.action === "publish" && !isPublished) {
    campaignId = (await publishPost(prisma, saved.id, { sendEmail: input.sendEmail })).campaignId;
  }

  const post = await prisma.post.findUniqueOrThrow({
    where: { id: saved.id },
    select: { id: true, slug: true, status: true, scheduledAt: true, publication: { select: { slug: true, customDomain: true, isDomainVerified: true } } }
  });
  return NextResponse.json(
    {
      post: {
        id: post.id,
        slug: post.slug,
        status: post.status,
        scheduledAt: post.scheduledAt,
        url: `${publicationBaseUrl(post.publication)}/${post.slug}`
      },
      campaignId
    },
    { status: existing ? 200 : 201 }
  );
}
