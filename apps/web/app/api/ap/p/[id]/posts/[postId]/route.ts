import { NextResponse } from "next/server";
import { AP_CONTEXT } from "@zerostack/shared/src/fediverse";
import { activityJson, findActorPublication } from "../../../../../../../lib/fediverse";
import { articleFor } from "../../../../../../../lib/fediverse-objects";

export const dynamic = "force-dynamic";

/** Un articolo come oggetto ActivityPub (l'indirizzo che gli altri server usano per ritrovarlo). */
export async function GET(_req: Request, { params }: { params: { id: string; postId: string } }) {
  const publication = await findActorPublication(params.id);
  const object = publication ? await articleFor(publication.id, params.postId) : null;
  if (!object) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return activityJson({ "@context": AP_CONTEXT, ...object });
}
