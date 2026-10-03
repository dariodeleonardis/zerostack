import React from "react";
import Link from "next/link";
import { PenSquare, Users, MailCheck, Clock, CreditCard, ArrowUpRight, Pencil } from "lucide-react";
import { prisma } from "@zerostack/database";
import { publicationBaseUrl } from "@zerostack/shared";
import { requireUser } from "../../lib/auth";

export const dynamic = "force-dynamic";

const STATUS_BADGE = {
  DRAFT: { label: "Bozza", className: "bg-gray-100 text-gray-700" },
  SCHEDULED: { label: "Programmato", className: "bg-amber-100 text-amber-800" },
  PUBLISHED: { label: "Pubblicato", className: "bg-emerald-100 text-emerald-800" },
  ARCHIVED: { label: "Archiviato", className: "bg-gray-100 text-gray-500" }
} as const;

const CAMPAIGN_LABEL: Record<string, string> = {
  PENDING: "email in coda",
  PROCESSING: "email in invio",
  SENT: "email inviate",
  FAILED: "invio interrotto"
};

function KpiCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-gray-500">
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-display text-4xl font-extrabold tracking-tight text-gray-900">{value}</div>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}

export default async function StudioDashboard() {
  const user = await requireUser("/studio");
  const memberships = await prisma.publicationMember.findMany({
    where: { userId: user.id },
    select: { publication: { select: { id: true, name: true, slug: true, customDomain: true, isDomainVerified: true } } }
  });
  const publications = memberships.map((m) => m.publication);
  const publicationIds = publications.map((p) => p.id);

  if (publications.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Benvenuto nello studio</h1>
        <p className="mt-2 text-sm text-gray-600">Crea la tua pubblicazione: avrà un indirizzo tutto suo e una lista di iscritti.</p>
        <Link href="/studio/publications/new" className="mt-6 inline-block rounded-xl bg-ink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-ink-700">
          Crea la pubblicazione
        </Link>
      </div>
    );
  }

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [activeSubscribers, pendingSubscribers, paidSubscriptions, emailsSent, posts] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { publicationId: { in: publicationIds }, status: "ACTIVE" } }),
    prisma.newsletterSubscriber.count({ where: { publicationId: { in: publicationIds }, status: "PENDING" } }),
    prisma.subscription.count({ where: { publicationId: { in: publicationIds }, isPaid: true, status: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.emailDelivery.count({ where: { status: "SENT", createdAt: { gte: monthAgo }, campaign: { publicationId: { in: publicationIds } } } }),
    prisma.post.findMany({
      where: { publicationId: { in: publicationIds }, format: { not: "NOTE" } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        scheduledAt: true,
        updatedAt: true,
        publicationId: true,
        campaigns: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, sentCount: true, recipientsCount: true } }
      }
    })
  ]);

  const byId = new Map(publications.map((p) => [p.id, p]));
  const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const number = new Intl.NumberFormat("it-IT");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900">Pannello Creator</h1>
          <p className="mt-1 text-sm text-gray-500">{publications.map((p) => p.name).join(" · ")}</p>
        </div>
        <Link
          href="/studio/posts/new"
          className="flex items-center gap-2 self-start rounded-xl bg-ink-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-ink-700"
        >
          <PenSquare className="h-4 w-4" />
          Nuovo post
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Iscritti attivi" value={number.format(activeSubscribers)} hint="Hanno confermato l'email" icon={<Users className="h-4 w-4 text-ink-600" />} />
        <KpiCard label="In attesa" value={number.format(pendingSubscribers)} hint="Non hanno ancora confermato" icon={<Clock className="h-4 w-4 text-amber-600" />} />
        <KpiCard label="Abbonati paganti" value={number.format(paidSubscriptions)} hint="Abbonamenti attivi" icon={<CreditCard className="h-4 w-4 text-emerald-600" />} />
        <KpiCard label="Email inviate" value={number.format(emailsSent)} hint="Ultimi 30 giorni" icon={<MailCheck className="h-4 w-4 text-ink-600" />} />
      </div>

      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-900">I tuoi post</h2>
          <Link href="/studio/posts/new" className="text-xs font-semibold text-ink-600 hover:underline">
            + Scrivi nuovo
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Ancora nessun post. Il primo è a un clic.</p>
        ) : (
          <div className="mt-2 divide-y divide-gray-100">
            {posts.map((post) => {
              const badge = STATUS_BADGE[post.status];
              const campaign = post.campaigns[0];
              const publication = byId.get(post.publicationId)!;
              const when =
                post.status === "PUBLISHED" && post.publishedAt
                  ? `Uscito il ${dateFormat.format(post.publishedAt)}`
                  : post.status === "SCHEDULED" && post.scheduledAt
                    ? `Esce il ${dateFormat.format(post.scheduledAt)}`
                    : `Modificato il ${dateFormat.format(post.updatedAt)}`;
              return (
                <div key={post.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>{badge.label}</span>
                      <span className="text-xs text-gray-400">{when}</span>
                      {publications.length > 1 && <span className="text-xs text-gray-400">· {publication.name}</span>}
                    </div>
                    <h3 className="mt-1 truncate font-bold text-gray-900">{post.title}</h3>
                    {campaign && (
                      <p className="text-xs text-gray-500">
                        {CAMPAIGN_LABEL[campaign.status] ?? campaign.status}: {number.format(campaign.sentCount)} su {number.format(campaign.recipientsCount)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/studio/posts/${post.id}`}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifica
                    </Link>
                    {post.status === "PUBLISHED" && (
                      <a
                        href={`${publicationBaseUrl(publication)}/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Vedi <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
