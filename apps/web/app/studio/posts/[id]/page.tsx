import { notFound } from "next/navigation";
import { prisma } from "@zerostack/database";
import { publicationBaseUrl } from "@zerostack/shared";
import { PostEditor } from "../../../../components/PostEditor";
import { requireUser } from "../../../../lib/auth";
import { editorPublications } from "../../../../lib/studio";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/studio/posts/${params.id}`);
  const publications = await editorPublications(user.id);

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      publicationId: true,
      title: true,
      subtitle: true,
      slug: true,
      contentHtml: true,
      access: true,
      status: true,
      scheduledAt: true,
      emailOnPublish: true,
      coverImageUrl: true,
      podcastEpisode: { select: { audioUrl: true, durationSeconds: true } },
      publication: { select: { slug: true, customDomain: true, isDomainVerified: true } },
      campaigns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, sentCount: true, recipientsCount: true }
      }
    }
  });
  // Un post di una pubblicazione di cui non si fa parte è, per chi guarda, inesistente.
  if (!post || !publications.some((p) => p.id === post.publicationId)) notFound();

  return (
    <PostEditor
      publications={publications}
      post={{
        id: post.id,
        publicationId: post.publicationId,
        title: post.title,
        subtitle: post.subtitle,
        contentHtml: post.contentHtml,
        access: post.access,
        status: post.status,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
        emailOnPublish: post.emailOnPublish,
        url: `${publicationBaseUrl(post.publication)}/${post.slug}`,
        campaign: post.campaigns[0] ?? null,
        coverImageUrl: post.coverImageUrl,
        podcast: post.podcastEpisode
      }}
    />
  );
}
