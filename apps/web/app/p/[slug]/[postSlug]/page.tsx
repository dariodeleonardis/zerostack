import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heart, MessageSquare, ArrowLeft } from "lucide-react";
import { prisma } from "@zerostack/database";
import { PaywallGate } from "../../../../components/PaywallGate";
import { TipJar } from "../../../../components/TipJar";
import { getCurrentUser } from "../../../../lib/auth";
import { publicationWhere } from "../../../../lib/publications";
import { canReadFullPost, isSubscriptionActive, sanitizePostHtml, splitAtPaywall } from "../../../../lib/posts";
import { ShareButton } from "./ShareButton";
import { platformUrlFromEnv } from "@zerostack/shared";

export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: { slug: string; postSlug: string };
}

const INTERVAL_LABEL = { MONTH: "/ mese", YEAR: "/ anno", ONE_TIME: "una tantum" } as const;

async function findPost(slugOrDomain: string, postSlug: string) {
  return prisma.post.findFirst({
    where: {
      slug: decodeURIComponent(postSlug).toLowerCase(),
      status: "PUBLISHED",
      format: { not: "NOTE" },
      publication: publicationWhere(slugOrDomain)
    },
    select: {
      id: true,
      title: true,
      subtitle: true,
      excerpt: true,
      contentHtml: true,
      coverImageUrl: true,
      podcastEpisode: { select: { audioUrl: true, durationSeconds: true } },
      access: true,
      likesCount: true,
      publishedAt: true,
      author: { select: { name: true } },
      publication: {
        select: {
          id: true,
          slug: true,
          name: true,
          tiers: {
            where: { isActive: true },
            orderBy: { priceCents: "asc" },
            take: 1,
            select: { id: true, name: true, priceCents: true, interval: true, benefits: true }
          }
        }
      },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 100,
        select: { id: true, content: true, createdAt: true, author: { select: { name: true } } }
      },
      _count: { select: { comments: true } }
    }
  });
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const post = await findPost(params.slug, params.postSlug);
  if (!post) return { title: "Articolo non trovato" };
  return { title: `${post.title} | ${post.publication.name}`, description: post.subtitle ?? post.excerpt ?? undefined };
}

async function readerAccess(userId: string | undefined, publicationId: string) {
  if (!userId) return { isMember: false, hasPaidSubscription: false };
  const [member, subscriptions] = await Promise.all([
    prisma.publicationMember.findUnique({ where: { publicationId_userId: { publicationId, userId } }, select: { id: true } }),
    prisma.subscription.findMany({
      where: { publicationId, userId },
      select: { status: true, isPaid: true, currentPeriodEnd: true }
    })
  ]);
  return { isMember: Boolean(member), hasPaidSubscription: subscriptions.some((s) => isSubscriptionActive(s)) };
}

export default async function ArticleReaderPage({ params }: ArticlePageProps) {
  const post = await findPost(params.slug, params.postSlug);
  if (!post) notFound();

  const publication = post.publication;
  const user = await getCurrentUser();
  const hasAccess = canReadFullPost(post.access, await readerAccess(user?.id, publication.id));

  // Il testo riservato non lascia mai il server se chi legge non ha accesso.
  const { preview, rest } = splitAtPaywall(post.contentHtml);
  const visibleHtml = hasAccess ? `${preview}${rest}` : preview;
  const tier = publication.tiers[0];

  const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const words = post.contentHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(words / 200));

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/p/${publication.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Tutti gli articoli di {publication.name}
        </Link>
      </div>

      <header className="border-b border-gray-100 pb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <span>{publication.name}</span>
        </div>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl sm:leading-tight">{post.title}</h1>

        {post.subtitle && <p className="mt-3 text-lg text-gray-600 leading-relaxed">{post.subtitle}</p>}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-blue-100 font-bold text-blue-700 flex items-center justify-center">
              {post.author.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{post.author.name}</p>
              <p className="text-xs text-gray-500">
                {post.publishedAt ? `${dateFormat.format(post.publishedAt)} • ` : ""}
                {readTime} min di lettura
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600">
              <Heart className="h-4 w-4" />
              <span>{post.likesCount}</span>
            </span>
            <ShareButton />
          </div>
        </div>
      </header>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="mt-8 aspect-video w-full rounded-2xl object-cover" />
      )}

      {post.podcastEpisode && hasAccess && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Ascolta l&apos;episodio</p>
          <audio controls preload="none" src={post.podcastEpisode.audioUrl} className="w-full" />
        </div>
      )}

      {visibleHtml.trim() && (
        <div
          className="prose prose-lg mt-8 max-w-none text-gray-800 leading-relaxed font-serif"
          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(visibleHtml) }}
        />
      )}

      {!hasAccess &&
        (tier ? (
          <PaywallGate
            publicationName={publication.name}
            tierId={tier.id}
            checkoutHref={`${platformUrlFromEnv()}/checkout/${tier.id}`}
            tierName={tier.name}
            monthlyPriceEur={tier.priceCents / 100}
            intervalLabel={INTERVAL_LABEL[tier.interval]}
            benefits={tier.benefits.length > 0 ? tier.benefits : undefined}
          />
        ) : (
          <p className="my-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
            Il resto di questo articolo è riservato agli abbonati di {publication.name}.
          </p>
        ))}

      <TipJar
        creatorName={post.author.name}
        publicationSlug={publication.slug}
        articleSlug={params.postSlug}
        allowPayPerArticle={false}
      />

      <section className="mt-12 border-t border-gray-200 pt-8">
        <div className="flex items-center gap-2 font-bold text-gray-900">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <span>Commenti dei lettori ({post._count.comments})</span>
        </div>

        {post.comments.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Ancora nessun commento.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {post.comments.map((comment) => (
              <li key={comment.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold text-gray-900">
                  {comment.author.name}
                  <span className="ml-2 font-normal text-gray-400">{dateFormat.format(comment.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{comment.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
