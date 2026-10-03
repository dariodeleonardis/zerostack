import { NextResponse } from "next/server";
import { AP_CONTEXT } from "@zerostack/shared/src/fediverse";
import { activityJson, actorFor, findActorPublication } from "../../../../../../lib/fediverse";
import { outboxItems } from "../../../../../../lib/fediverse-objects";

export const dynamic = "force-dynamic";

/** Le ultime uscite della pubblicazione: Mastodon le mostra nel profilo appena qualcuno lo apre. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const publication = await findActorPublication(params.id);
  if (!publication) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  const { totalItems, items } = await outboxItems(publication.id);
  return activityJson({ "@context": AP_CONTEXT, id: actorFor(publication.id).outbox, type: "OrderedCollection", totalItems, orderedItems: items });
}
