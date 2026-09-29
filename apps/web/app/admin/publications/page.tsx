import React from "react";
import { prisma } from "@zerostack/database";
import { publicationBaseUrl } from "@zerostack/shared";
import { AdminAction } from "../AdminAction";

export const dynamic = "force-dynamic";

export default async function AdminPublicationsPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const publications = await prisma.publication.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { customDomain: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, name: true, slug: true, customDomain: true, isDomainVerified: true, stripeChargesEnabled: true, suspendedAt: true,
      owner: { select: { email: true } },
      _count: { select: { subscribers: { where: { status: "ACTIVE" } }, posts: { where: { status: "PUBLISHED" } } } }
    }
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-gray-900">Pubblicazioni</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Nome, slug o dominio" className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white">Cerca</button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Pubblicazione</th>
              <th className="px-4 py-3">Proprietario</th>
              <th className="px-4 py-3">Iscritti</th>
              <th className="px-4 py-3">Articoli</th>
              <th className="px-4 py-3">Dominio</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {publications.map((p) => (
              <tr key={p.id} className={p.suspendedAt ? "bg-rose-50/40" : undefined}>
                <td className="px-4 py-3">
                  <a href={publicationBaseUrl({ slug: p.slug })} target="_blank" rel="noreferrer" className="font-semibold text-gray-900 hover:underline">
                    {p.name}
                  </a>
                  <p className="text-xs text-gray-500">{p.slug}{p.suspendedAt ? " · SOSPESA" : ""}</p>
                </td>
                <td className="px-4 py-3 text-xs">{p.owner.email}</td>
                <td className="px-4 py-3 text-xs">{p._count.subscribers}</td>
                <td className="px-4 py-3 text-xs">{p._count.posts}</td>
                <td className="px-4 py-3 text-xs">{p.customDomain ? `${p.customDomain} ${p.isDomainVerified ? "✓" : "(da verificare)"}` : "—"}</td>
                <td className="px-4 py-3 text-xs">{p.stripeChargesEnabled ? "attivo" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  {p.suspendedAt ? (
                    <AdminAction url={`/api/admin/publications/${p.id}`} body={{ action: "unsuspend" }} label="Riattiva" />
                  ) : (
                    <AdminAction
                      url={`/api/admin/publications/${p.id}`}
                      body={{ action: "suspend" }}
                      label="Sospendi"
                      tone="danger"
                      confirm={`Sospendere ${p.name}? Pagine, feed, iscrizioni, pagamenti e invii si fermano subito.`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {publications.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Nessuna pubblicazione trovata.</p>}
      </div>
    </div>
  );
}
