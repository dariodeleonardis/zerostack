import React from "react";
import Link from "next/link";
import { prisma } from "@zerostack/database";
import { requireUser } from "../../../lib/auth";
import { AppearancePanel } from "./AppearancePanel";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const user = await requireUser("/studio/appearance");
  const owned = await prisma.publicationMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    orderBy: { publication: { createdAt: "asc" } },
    select: { publication: { select: { id: true, name: true, description: true, primaryColor: true, backgroundColor: true, fontStyle: true } } }
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Aspetto</h1>
        <p className="mt-1 text-base text-gray-600">
          Colori e caratteri della tua pubblicazione. Valgono per le pagine pubbliche appena salvi; il colore principale anche per le email.
        </p>
      </div>
      {owned.length === 0 ? (
        <p className="border-y border-ink py-8 text-center text-base">
          Non hai ancora una pubblicazione. <Link href="/studio/publications/new" className="font-bold underline underline-offset-4">Creala ora</Link>
        </p>
      ) : (
        owned.map(({ publication: p }) => (
          <AppearancePanel
            key={p.id}
            publicationId={p.id}
            name={p.name}
            description={p.description}
            initial={{ primaryColor: p.primaryColor, backgroundColor: p.backgroundColor, fontStyle: p.fontStyle }}
          />
        ))
      )}
    </div>
  );
}
