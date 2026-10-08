import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { AP_CONTEXT } from "@zerostack/shared/src/fediverse";
import { activityJson, actorFor, findActorPublication } from "../../../../../../lib/fediverse";

export const dynamic = "force-dynamic";

/** Seguaci dal Fediverso: solo il numero, l'elenco resta privato. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const publication = await findActorPublication(params.id);
  if (!publication) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  const totalItems = await prisma.apFollower.count({ where: { publicationId: publication.id } });
  return activityJson({ "@context": AP_CONTEXT, id: actorFor(publication.id).followers, type: "OrderedCollection", totalItems });
}
