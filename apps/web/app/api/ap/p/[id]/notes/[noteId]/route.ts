import { NextResponse } from "next/server";
import { AP_CONTEXT } from "@zerostack/shared/src/fediverse";
import { activityJson, findActorPublication } from "../../../../../../../lib/fediverse";
import { noteFor } from "../../../../../../../lib/fediverse-objects";

export const dynamic = "force-dynamic";

/** Una nota (T5) come oggetto ActivityPub. */
export async function GET(_req: Request, { params }: { params: { id: string; noteId: string } }) {
  const publication = await findActorPublication(params.id);
  const object = publication ? await noteFor(publication.id, params.noteId) : null;
  if (!object) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return activityJson({ "@context": AP_CONTEXT, ...object });
}
