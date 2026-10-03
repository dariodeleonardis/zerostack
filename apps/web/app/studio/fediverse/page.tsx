import React from "react";
import Link from "next/link";
import { prisma } from "@zerostack/database";
import { requireUser } from "../../../lib/auth";
import { fediverseHandle } from "../../../lib/fediverse";

export const dynamic = "force-dynamic";

export default async function FediversePage() {
  const user = await requireUser("/studio/fediverse");
  const memberships = await prisma.publicationMember.findMany({
    where: { userId: user.id },
    orderBy: { publication: { createdAt: "asc" } },
    select: { publication: { select: { id: true, name: true, slug: true, suspendedAt: true, _count: { select: { apFollowers: true } } } } }
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Fediverso</h1>
        <p className="mt-1 text-base text-gray-600">
          Chi usa Mastodon, Pixelfed, Misskey e gli altri server del Fediverso può seguire la tua pubblicazione cercando il suo nome.
          Ogni articolo e ogni nota che pubblichi arriva nel loro flusso, con il link per leggerlo qui. Non devi fare niente: è già acceso.
        </p>
      </div>
      {memberships.length === 0 ? (
        <p className="border-y border-ink py-8 text-center text-base">
          Non hai ancora una pubblicazione. <Link href="/studio/publications/new" className="font-bold underline underline-offset-4">Creala ora</Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
          {memberships.map(({ publication: p }) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold">{p.name}</h2>
                <p className="mt-1 font-mono text-base text-ink">{fediverseHandle(p.slug)}</p>
                {p.suspendedAt && <p className="mt-1 text-sm text-red-700">Sospesa: per ora non è visibile nel Fediverso.</p>}
              </div>
              <p className="text-right">
                <span className="block font-display text-4xl font-extrabold">{p._count.apFollowers}</span>
                <span className="kicker text-gray-600">{p._count.apFollowers === 1 ? "seguace" : "seguaci"} dal Fediverso</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
