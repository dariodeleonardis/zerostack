import { NextResponse } from "next/server";
import { publicationBaseUrl } from "@zerostack/shared";
import { isActivityJsonAccept } from "@zerostack/shared/src/fediverse";
import { activityJson, actorDocument, ensureActorKeys, findActorPublication } from "../../../../../lib/fediverse";

export const dynamic = "force-dynamic";

/** Attore ActivityPub della pubblicazione (T6). Chi lo apre dal browser va alla pagina della pubblicazione. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const publication = await findActorPublication(params.id);
  if (!publication) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (!isActivityJsonAccept(req.headers.get("accept"))) return NextResponse.redirect(publicationBaseUrl(publication), 302);
  const { publicKeyPem } = await ensureActorKeys(publication.id);
  return activityJson(actorDocument(publication, publicKeyPem));
}
