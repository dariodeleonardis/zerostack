import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heart, ArrowLeft } from "lucide-react";
import { prisma } from "@zerostack/database";
import { PaywallGate } from "../../../../components/PaywallGate";
import { getCurrentUser } from "../../../../lib/auth";
import { publicationWhere } from "../../../../lib/publications";
import { canReadFullPost, isSubscriptionActive, sanitizePostHtml, splitAtPaywall } from "../../../../lib/posts";
import { paletteStyle, publicationFont, publicationPalette } from "../../../../lib/colors";
import { ShareButton } from "./ShareButton";
import { PublicationFooter } from "../../../../components/PublicationFooter";
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
          primaryColor: true,
          backgroundColor: true,
          fontStyle: true,
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
  const palette = publicationPalette(publication.primaryColor, publication.backgroundColor);
  const font = publicationFont(publication.fontStyle);

  return (
    <div style={paletteStyle(palette) as React.CSSProperties} className="bg-[color:var(--pub-bg)] text-[color:var(--pub-text)]">
      <div className="h-2 bg-[color:var(--pub-accent)]" />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href={`/p/${publication.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Tutti gli articoli di {publication.name}
        </Link>

        <header className="mt-10 border-b-[3px] border-[color:var(--pub-text)] pb-8">
          <p className="kicker text-[color:var(--pub-accent-text)]">{publication.name}</p>
          <h1 className={`mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl ${font.title}`}>{post.title}</h1>
          {post.subtitle && <p className={`mt-5 text-xl leading-relaxed opacity-90 sm:text-2xl ${font.body}`}>{post.subtitle}</p>}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--pub-accent)] font-display text-lg font-extrabold text-[color:var(--pub-on-accent)]">
                {post.author.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="text-base font-bold">{post.author.name}</p>
                <p className="text-sm opacity-80">
                  {post.publishedAt ? `${dateFormat.format(post.publishedAt)} · ` : ""}
                  {readTime} min di lettura
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-[color:var(--pub-text)] px-3 py-1.5 text-sm font-semibold" aria-label={`${post.likesCount} apprezzamenti`}>
                <Heart className="h-4 w-4" aria-hidden />
                <span>{post.likesCount}</span>
              </span>
              <ShareButton />
            </div>
          </div>
        </header>

        {post.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImageUrl} alt="" className="mt-10 aspect-video w-full object-cover" />
        )}

        {post.podcastEpisode && hasAccess && (
          <div className="mt-10 border-2 border-[color:var(--pub-text)] p-4">
            <p className="kicker mb-3">Ascolta l&apos;episodio</p>
            <audio controls preload="none" src={post.podcastEpisode.audioUrl} className="w-full" />
          </div>
        )}

        {visibleHtml.trim() && (
          <div
            className={`prose prose-lg prose-pub mt-10 max-w-none leading-relaxed ${font.body} prose-headings:tracking-tight`}
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
            <p className="my-10 border-y-[3px] border-double border-[color:var(--pub-text)] py-8 text-center text-lg">
              Il resto di questo articolo è riservato agli abbonati di {publication.name}.
            </p>
          ))}

        {/* Il TipJar non c'è: simulava il pagamento (successo dopo 600 ms senza addebito) e Satispay
            non è collegato. Torna quando le mance passano davvero da Stripe. */}

        <section className="mt-14 border-t-[3px] border-[color:var(--pub-text)] pt-6">
          <h2 className={`text-2xl font-extrabold tracking-tight ${font.title}`}>Commenti dei lettori ({post._count.comments})</h2>
          {post.comments.length === 0 ? (
            <p className="mt-4 opacity-80">Ancora nessun commento.</p>
          ) : (
            <ul className="mt-6 divide-y divide-[color:var(--pub-text)]">
              {post.comments.map((comment) => (
                <li key={comment.id} className="py-5">
                  <p className="text-sm font-bold">
                    {comment.author.name}
                    <span className="ml-2 font-normal opacity-80">{dateFormat.format(comment.createdAt)}</span>
                  </p>
                  <p className={`mt-2 whitespace-pre-line text-base ${font.body}`}>{comment.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
      <PublicationFooter background={palette.bg} />
    </div>
  );
}
