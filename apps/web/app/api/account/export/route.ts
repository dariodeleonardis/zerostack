import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/** Esportazione dei propri dati (art. 20 GDPR, portabilità): un file JSON con tutto ciò che riguarda l'account. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });

  const [account, publications, posts, subscriptions, billing, newsletters, comments, media] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, email: true, name: true, handle: true, bio: true, avatarUrl: true, role: true, emailVerified: true, createdAt: true }
    }),
    prisma.publication.findMany({
      where: { members: { some: { userId: user.id } } },
      select: {
        id: true, name: true, slug: true, description: true, customDomain: true, createdAt: true,
        members: { where: { userId: user.id }, select: { role: true } },
        tiers: { select: { name: true, priceCents: true, currency: true, interval: true, isActive: true } },
        // Gli iscritti di una pubblicazione sono dati dell'autore che la possiede: esportati solo a lui.
        subscribers: { where: { publication: { ownerId: user.id } }, select: { email: true, name: true, status: true, source: true, createdAt: true, confirmedAt: true } }
      }
    }),
    prisma.post.findMany({
      where: { authorId: user.id },
      select: { id: true, title: true, subtitle: true, slug: true, status: true, access: true, publishedAt: true, contentHtml: true, publication: { select: { slug: true } } }
    }),
    prisma.subscription.findMany({
      where: { userId: user.id },
      select: { status: true, isPaid: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, createdAt: true, publication: { select: { name: true } }, tier: { select: { name: true } } }
    }),
    prisma.italianBillingInfo.findMany({
      where: { userId: user.id },
      select: { isCompany: true, ragioneSociale: true, codiceFiscale: true, partitaIva: true, sdi: true, pec: true, indirizzo: true, cap: true, citta: true, provincia: true, paese: true, createdAt: true }
    }),
    prisma.newsletterSubscriber.findMany({
      where: { email: user.email },
      select: { status: true, createdAt: true, confirmedAt: true, publication: { select: { name: true, slug: true } } }
    }),
    prisma.comment.findMany({ where: { authorId: user.id }, select: { content: true, createdAt: true, postId: true } }),
    prisma.media.findMany({ where: { ownerId: user.id }, select: { url: true, kind: true, size: true, createdAt: true } })
  ]);

  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), account, publications, posts, subscriptions, billing, newsletters, comments, media },
    null,
    2
  );
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="zerostack-${account.handle}-dati.json"`,
      "cache-control": "no-store"
    }
  });
}
