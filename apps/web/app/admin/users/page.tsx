import React from "react";
import { prisma } from "@zerostack/database";
import { getCurrentUser } from "../../../lib/auth";
import { AdminAction, RoleSelect } from "../AdminAction";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const me = await getCurrentUser();
  const q = (searchParams.q ?? "").trim();
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { handle: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, name: true, email: true, handle: true, role: true, emailVerified: true, suspendedAt: true, createdAt: true,
      _count: { select: { ownedPublications: true } }
    }
  });
  const date = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Utenti</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Email, nome o nome utente" className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white">Cerca</button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Utente</th>
              <th className="px-4 py-3">Ruolo</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3">Pubblicazioni</th>
              <th className="px-4 py-3">Registrato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const editable = u.id !== me?.id && u.role !== "SUPERADMIN";
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email} · @{u.handle}</p>
                  </td>
                  <td className="px-4 py-3">{editable && me?.role === "SUPERADMIN" ? <RoleSelect userId={u.id} role={u.role} /> : <span className="text-xs font-bold">{u.role}</span>}</td>
                  <td className="px-4 py-3 text-xs">
                    {u.suspendedAt ? (
                      <span className="font-bold text-rose-700">Sospeso</span>
                    ) : u.role === "ADMIN" || u.role === "SUPERADMIN" ? (
                      // Chi amministra non è un utente da tenere d'occhio: niente "Email da confermare" (Dario, 1/10).
                      <span className="text-emerald-700">Amministratore</span>
                    ) : u.emailVerified ? (
                      <span className="text-emerald-700">Attivo</span>
                    ) : (
                      <span className="text-amber-700">Email da confermare</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{u._count.ownedPublications}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{date.format(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {editable &&
                      (u.suspendedAt ? (
                        <AdminAction url={`/api/admin/users/${u.id}`} body={{ action: "unsuspend" }} label="Riattiva" />
                      ) : (
                        <AdminAction url={`/api/admin/users/${u.id}`} body={{ action: "suspend" }} label="Sospendi" tone="danger" confirm={`Sospendere ${u.email}? Verrà disconnesso subito.`} />
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Nessun utente trovato.</p>}
      </div>
    </div>
  );
}
