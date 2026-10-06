import React from "react";
import { prisma } from "@zerostack/database";
import { requireUser } from "../../../lib/auth";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await requireUser("/studio/import");
  const owned = await prisma.publicationMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    orderBy: { publication: { createdAt: "asc" } },
    select: { publication: { select: { id: true, name: true } } }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Importa iscritti e articoli</h1>
        <p className="mt-1 text-sm text-gray-600">
          Dalla piattaforma che usi oggi scarica l&apos;export (di solito in <strong>Impostazioni → Esporta</strong>), poi carica qui lo ZIP. Arrivano gli iscritti (già confermati, senza nuove
          email) e gli articoli con il loro paywall. Nessuna newsletter parte durante l&apos;import, e puoi ripeterlo senza creare doppioni.
        </p>
      </div>
      <ImportForm publications={owned.map((o) => o.publication)} />
    </div>
  );
}
