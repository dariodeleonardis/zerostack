import { NextResponse } from "next/server";
import { Feed } from "feed";
import { prisma } from "@zerostack/database";
import { publicationBaseUrl, splitAtPaywall } from "@zerostack/shared";
import { publicationWhere } from "../../../../../lib/publications";
import { sanitizePostHtml } from "../../../../../lib/posts";

export const dynamic = "force-dynamic";

// Feed RSS 2.0 degli articoli pubblicati. Dei post a pagamento esce solo la parte prima del paywall.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const publication = await prisma.publication.findFirst({
    where: publicationWhere(params.slug),
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      customDomain: true,
      isDomainVerified: true,
      owner: { select: { name: true } },
      posts: {
        where: { status: "PUBLISHED", format: { not: "NOTE" } },
        orderBy: { publishedAt: "desc" },
        take: 50,
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          excerpt: true,
          contentHtml: true,
          access: true,
          coverImageUrl: true,
          publishedAt: true,
          author: { select: { name: true } }
        }
      }
    }
  });
  if (!publication) {
    return new NextResponse("Pubblicazione non trovata", { status: 404 });
  }

  const base = publicationBaseUrl(publication);
  const feed = new Feed({
    title: publication.name,
    description: publication.description ?? undefined,
    id: base,
    link: base,
    language: "it",
    image: publication.logoUrl ?? undefined,
    copyright: `© ${new Date().getFullYear()} ${publication.owner.name}`,
    updated: publication.posts[0]?.publishedAt ?? undefined,
    feedLinks: { rss: `${base}/api/feed/${publication.slug}/rss` },
    author: { name: publication.owner.name, link: base }
  });

  for (const post of publication.posts) {
    const url = `${base}/${post.slug}`;
    const { preview, rest, hasDivider } = splitAtPaywall(post.contentHtml);
    const isPaid = post.access !== "FREE";
    const visible = isPaid ? (hasDivider ? preview : "") : `${preview}${rest}`;
    const content = isPaid
      ? `${sanitizePostHtml(visible)}<p><a href="${url}">Continua a leggere: articolo riservato agli abbonati</a></p>`
      : sanitizePostHtml(visible);
    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.subtitle ?? post.excerpt ?? undefined,
      content,
      author: [{ name: post.author.name }],
      date: post.publishedAt ?? new Date(),
      image: post.coverImageUrl ?? undefined
    });
  }

  return new NextResponse(feed.rss2(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" }
  });
}
