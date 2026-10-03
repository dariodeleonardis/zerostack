import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { AP_CONTEXT, deliverActivity, fetchRemoteActor, parseSignatureHeader, verifySignedRequest } from "@zerostack/shared/src/fediverse";
import { actorFor, ensureActorKeys, findActorPublication } from "../../../../../../lib/fediverse";
import { allowAttempt } from "../../../../../../lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BODY = 256 * 1024;
const reply = (status: number, error?: string) => NextResponse.json(error ? { error } : { ok: true }, { status });

/**
 * Casella dell'attore (T6). Ogni richiesta deve essere firmata dall'attore che la manda: si legge
 * la sua chiave pubblica dal suo server e si verificano firma, digest del corpo e data.
 * Gestite: Follow (si accetta subito e si risponde con Accept) e Undo di un Follow. Il resto si
 * riceve e si ignora (202), come fanno i server che non lo supportano.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const publication = await findActorPublication(params.id);
  if (!publication) return reply(404, "Non trovato");

  const body = await req.text();
  if (body.length > MAX_BODY) return reply(413, "Troppo grande");
  let activity: Record<string, unknown>;
  try {
    activity = JSON.parse(body);
  } catch {
    return reply(400, "JSON non valido");
  }

  const signature = parseSignatureHeader(req.headers.get("signature"));
  if (!signature) return reply(401, "Firma assente");
  const remoteActorId = signature.keyId.split("#")[0];
  if (typeof activity.actor !== "string" || activity.actor !== remoteActorId) return reply(401, "La firma non è dell'attore dell'attività");

  let host: string;
  try {
    host = new URL(remoteActorId).host;
  } catch {
    return reply(401, "Firma non valida");
  }
  if (!(await allowAttempt(`ap-inbox:${host}`, 300, 10 * 60))) return reply(429, "Troppe richieste");

  const keys = await ensureActorKeys(publication.id);
  const actor = actorFor(publication.id);
  const signer = { keyId: actor.keyId, privateKeyPem: keys.privateKeyPem };
  let remote;
  try {
    remote = await fetchRemoteActor(remoteActorId, signer);
  } catch (err) {
    console.warn("[fediverso] attore non leggibile:", remoteActorId, err instanceof Error ? err.message : err);
    return reply(401, "Attore non verificabile");
  }
  const url = new URL(req.url);
  const check = verifySignedRequest({
    method: "POST",
    path: `${url.pathname}${url.search}`,
    header: (name) => req.headers.get(name),
    body,
    signature,
    publicKeyPem: remote.publicKeyPem
  });
  if (!check.ok) return reply(401, `Firma non valida: ${check.reason}`);

  const type = activity.type;
  const objectId = (o: unknown) => (typeof o === "string" ? o : typeof (o as { id?: unknown })?.id === "string" ? (o as { id: string }).id : null);

  if (type === "Follow" && objectId(activity.object) === actor.id) {
    const handle = remote.preferredUsername ? `${remote.preferredUsername}@${host}` : null;
    await prisma.apFollower.upsert({
      where: { publicationId_actorUrl: { publicationId: publication.id, actorUrl: remote.id } },
      create: { publicationId: publication.id, actorUrl: remote.id, inboxUrl: remote.inbox, sharedInboxUrl: remote.sharedInbox, handle },
      update: { inboxUrl: remote.inbox, sharedInboxUrl: remote.sharedInbox, handle }
    });
    const accept = { "@context": AP_CONTEXT, id: `${actor.id}#accept-${Date.now()}`, type: "Accept", actor: actor.id, object: activity };
    try {
      const status = await deliverActivity(remote.inbox, accept, signer);
      if (status >= 300) console.warn("[fediverso] Accept rifiutato:", remote.inbox, status);
    } catch (err) {
      console.warn("[fediverso] Accept non consegnato:", remote.inbox, err instanceof Error ? err.message : err);
    }
    return reply(202);
  }

  if (type === "Undo") {
    const inner = activity.object as Record<string, unknown> | null;
    // Solo l'annullamento di un Follow verso di noi (un Undo di un "mi piace" non tocca i seguaci).
    if (inner && typeof inner === "object" && inner.type === "Follow" && objectId(inner.object) === actor.id) {
      await prisma.apFollower.deleteMany({ where: { publicationId: publication.id, actorUrl: remote.id } });
    }
    return reply(202);
  }

  return reply(202);
}
