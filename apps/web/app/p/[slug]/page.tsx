import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@zerostack/database";
import { PublicationView } from "./PublicationView";
import { publicationWhere } from "../../../lib/publications";
import { platformUrlFromEnv } from "@zerostack/shared";
import { paletteStyle, publicationFont, publicationPalette } from "../../../lib/colors";
import { PublicationFooter } from "../../../components/PublicationFooter";

export const dynamic = "force-dynamic";

interface PublicationPageProps {
  params: {
    slug: string;
  };
}

async function findPublication(slugOrDomain: string) {
  const where = publicationWhere(slugOrDomain);
  return prisma.publication.findFirst({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      primaryColor: true,
      backgroundColor: true,
      fontStyle: true,
      logoUrl: true,
      owner: { select: { name: true } },
      tiers: {
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
        select: { id: true, name: true, description: true, priceCents: true, currency: true, interval: true, benefits: true }
      },
      posts: {
        where: { status: "PUBLISHED", format: { not: "NOTE" } },
        orderBy: { publishedAt: "desc" },
        take: 20,
        select: { slug: true, title: true, excerpt: true, subtitle: true, contentHtml: true, access: true, likesCount: true, publishedAt: true }
      },
      notes: {
        where: { replyToNoteId: null },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, content: true, createdAt: true, repliesCount: true, author: { select: { name: true } } }
      },
      _count: { select: { subscribers: { where: { status: "ACTIVE" } } } }
    }
  });
}

export async function generateMetadata({ params }: PublicationPageProps): Promise<Metadata> {
  const publication = await findPublication(params.slug);
  if (!publication) return { title: "Pubblicazione non trovata" };
  return { title: publication.name, description: publication.description ?? undefined };
}

const INTERVAL_LABEL = { MONTH: "/ mese", YEAR: "/ anno", ONE_TIME: "una tantum" } as const;

function readTime(html: string): string {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}

export default async function PublicationHomePage({ params }: PublicationPageProps) {
  const publication = await findPublication(params.slug);
  if (!publication) notFound();

  const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const palette = publicationPalette(publication.primaryColor, publication.backgroundColor);

  return (
    <PublicationView
      publicationId={publication.id}
      checkoutBaseUrl={platformUrlFromEnv()}
      slug={publication.slug}
      name={publication.name}
      description={publication.description}
      authorName={publication.owner.name}
      logoUrl={publication.logoUrl}
      paletteStyle={paletteStyle(palette)}
      footer={<PublicationFooter background={palette.bg} />}
      titleFont={publicationFont(publication.fontStyle).title}
      bodyFont={publicationFont(publication.fontStyle).body}
      subscriberCount={publication._count.subscribers}
      articles={publication.posts.map((post) => ({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? post.subtitle ?? "",
        date: post.publishedAt ? dateFormat.format(post.publishedAt) : "",
        readTime: readTime(post.contentHtml),
        isPaidOnly: post.access !== "FREE"
      }))}
      notesUrl={`${platformUrlFromEnv()}/notes?pubblicazione=${encodeURIComponent(publication.slug)}`}
      notes={publication.notes.map((note) => ({
        id: note.id,
        url: `${platformUrlFromEnv()}/notes/${note.id}`,
        author: note.author.name,
        content: note.content.length > 280 ? `${note.content.slice(0, 277).trimEnd()}…` : note.content,
        date: dateFormat.format(note.createdAt),
        replies: note.repliesCount
      }))}
      tiers={publication.tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description,
        price: new Intl.NumberFormat("it-IT", { style: "currency", currency: tier.currency }).format(tier.priceCents / 100),
        interval: INTERVAL_LABEL[tier.interval],
        benefits: tier.benefits
      }))}
    />
  );
}
