import React from "react";
import Link from "next/link";
import { prisma } from "@zerostack/database";
import { requireUser } from "../../../lib/auth";
import { ROLE_HINT, ROLE_LABEL } from "../../../lib/team-roles";
import { INVITE_DAYS } from "../../../lib/team";
import { LeaveButton, TeamPanel } from "./TeamPanel";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireUser("/studio/team");
  const memberships = await prisma.publicationMember.findMany({
    where: { userId: user.id },
    orderBy: { publication: { createdAt: "asc" } },
    select: {
      role: true,
      publication: {
        select: {
          id: true,
          name: true,
          members: { orderBy: { role: "asc" }, select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } } },
          invites: { where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, role: true, expiresAt: true } }
        }
      }
    }
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Squadra</h1>
        <p className="mt-1 text-base text-gray-600">
          Invita chi scrive con te. L&apos;editor {ROLE_HINT.EDITOR}; il collaboratore {ROLE_HINT.CONTRIBUTOR}. Pagamenti, fatture e aspetto restano del proprietario. Gli inviti valgono {INVITE_DAYS} giorni.
        </p>
      </div>

      {memberships.length === 0 ? (
        <p className="border-y border-ink py-8 text-center text-base">
          Non hai ancora una pubblicazione. <Link href="/studio/publications/new" className="font-bold underline underline-offset-4">Creala ora</Link>
        </p>
      ) : (
        memberships.map(({ role, publication: p }) =>
          role === "OWNER" ? (
            <TeamPanel
              key={p.id}
              publicationId={p.id}
              name={p.name}
              currentUserId={user.id}
              members={p.members.map((m) => ({ id: m.id, role: m.role, userId: m.user.id, name: m.user.name, email: m.user.email }))}
              invites={p.invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString() }))}
            />
          ) : (
            <section key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold">{p.name}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Ne fai parte come <strong>{ROLE_LABEL[role].toLowerCase()}</strong>: {ROLE_HINT[role]}.
                </p>
              </div>
              <LeaveButton publicationId={p.id} name={p.name} />
            </section>
          )
        )
      )}
    </div>
  );
}
