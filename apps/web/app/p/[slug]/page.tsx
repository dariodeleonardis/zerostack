import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@zerostack/database";
import { PublicationView } from "./PublicationView";
import { publicationWhere } from "../../../lib/publications";

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

  return (
    <PublicationView
      publicationId={publication.id}
      slug={publication.slug}
      name={publication.name}
      description={publication.description}
      authorName={publication.owner.name}
      primaryColor={publication.primaryColor}
      subscriberCount={publication._count.subscribers}
      articles={publication.posts.map((post) => ({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? post.subtitle ?? "",
        date: post.publishedAt ? dateFormat.format(post.publishedAt) : "",
        readTime: readTime(post.contentHtml),
        isPaidOnly: post.access !== "FREE",
        likes: post.likesCount
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
