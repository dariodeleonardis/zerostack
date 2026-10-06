import React from "react";
import { prisma } from "@zerostack/database";
import { requireUser } from "../../../lib/auth";
import { importPlatform } from "../../../lib/import-platforms";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage({ searchParams }: { searchParams: { da?: string } }) {
  const user = await requireUser("/studio/import");
  const owned = await prisma.publicationMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    orderBy: { publication: { createdAt: "asc" } },
    select: { publication: { select: { id: true, name: true } } }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Importa</h1>
        <p className="mt-1 text-sm text-gray-600">
          Porta su ZeroStack iscritti e articoli dalla piattaforma che usi oggi. Gli iscritti arrivano già confermati, senza nuove email;
          nessuna newsletter parte durante l&apos;import, e puoi ripeterlo senza creare doppioni.
        </p>
      </div>
      {/* key: dal menu dello studio si passa da una piattaforma all'altra senza ricaricare la pagina */}
      <ImportForm key={searchParams.da ?? ""} publications={owned.map((o) => o.publication)} initialPlatform={importPlatform(searchParams.da)?.id ?? "substack"} />
    </div>
  );
}
