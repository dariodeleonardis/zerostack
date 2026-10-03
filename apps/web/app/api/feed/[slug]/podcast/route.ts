import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { publicationBaseUrl } from "@zerostack/shared";
import { publicationWhere } from "../../../../../lib/publications";

export const dynamic = "force-dynamic";

const xml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

function audioType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ext === "m4a" ? "audio/x-m4a" : ext === "ogg" ? "audio/ogg" : ext === "wav" ? "audio/wav" : "audio/mpeg";
}

/**
 * Feed podcast (RSS 2.0 con i tag iTunes) per Apple Podcasts e Spotify. Solo episodi gratuiti:
 * gli episodi riservati avranno un feed privato per abbonato.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const publication = await prisma.publication.findFirst({
    where: publicationWhere(params.slug),
    select: {
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      coverUrl: true,
      fromEmail: true,
      customDomain: true,
      isDomainVerified: true,
      owner: { select: { name: true } },
      posts: {
        where: { status: "PUBLISHED", access: "FREE", podcastEpisode: { isNot: null } },
        orderBy: { publishedAt: "desc" },
        take: 300,
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          excerpt: true,
          publishedAt: true,
          podcastEpisode: { select: { audioUrl: true, durationSeconds: true, episodeNumber: true, seasonNumber: true, explicit: true } }
        }
      }
    }
  });
  if (!publication) {
    return new NextResponse("Pubblicazione non trovata", { status: 404 });
  }

  const base = publicationBaseUrl(publication);
  const image = publication.coverUrl ?? publication.logoUrl;
  const summary = publication.description ?? publication.name;

  const items = publication.posts
    .map((post) => {
      const ep = post.podcastEpisode!;
      const url = `${base}/${post.slug}`;
      return `    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="false">${xml(post.id)}</guid>
      <description>${xml(post.subtitle ?? post.excerpt ?? post.title)}</description>
      <enclosure url="${xml(ep.audioUrl)}" length="0" type="${audioType(ep.audioUrl)}"/>
      <pubDate>${(post.publishedAt ?? new Date()).toUTCString()}</pubDate>
      <itunes:duration>${ep.durationSeconds}</itunes:duration>
      <itunes:explicit>${ep.explicit ? "true" : "false"}</itunes:explicit>${ep.episodeNumber ? `
      <itunes:episode>${ep.episodeNumber}</itunes:episode>` : ""}${ep.seasonNumber ? `
      <itunes:season>${ep.seasonNumber}</itunes:season>` : ""}
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(publication.name)}</title>
    <link>${xml(base)}</link>
    <atom:link href="${xml(`${base}/api/feed/${publication.slug}/podcast`)}" rel="self" type="application/rss+xml"/>
    <language>it</language>
    <description>${xml(summary)}</description>
    <itunes:summary>${xml(summary)}</itunes:summary>
    <itunes:author>${xml(publication.owner.name)}</itunes:author>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="News"/>${image ? `
    <itunes:image href="${xml(image)}"/>` : ""}${publication.fromEmail ? `
    <itunes:owner>
      <itunes:name>${xml(publication.owner.name)}</itunes:name>
      <itunes:email>${xml(publication.fromEmail)}</itunes:email>
    </itunes:owner>` : ""}
${items}
  </channel>
</rss>`;

  return new NextResponse(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" }
  });
}
