import { prisma } from "@zerostack/database";
import { platformUrlFromEnv, publicationBaseUrl } from "@zerostack/shared";
import { actorUrls, AP_CONTENT_TYPE, generateActorKeys } from "@zerostack/shared/src/fediverse";
import { NextResponse } from "next/server";

/**
 * Attori ActivityPub delle pubblicazioni (T6). L'indirizzo canonico è sulla piattaforma
 * (/api/ap/p/<id>), il nome è @slug@<dominio della piattaforma>. Le pubblicazioni sospese spariscono.
 */
export function platformHost(): string {
  return new URL(platformUrlFromEnv()).host;
}

export const fediverseHandle = (slug: string) => `@${slug}@${platformHost()}`;

export function actorFor(publicationId: string) {
  return actorUrls(platformUrlFromEnv(), publicationId);
}

export function findActorPublication(id: string) {
  return prisma.publication.findFirst({
    where: { id, suspendedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      customDomain: true,
      isDomainVerified: true,
      createdAt: true,
      apPublicKeyPem: true,
      apPrivateKeyPem: true
    }
  });
}

/** Le chiavi dell'attore, create la prima volta (se due richieste corrono, vince la prima). */
export async function ensureActorKeys(publicationId: string): Promise<{ publicKeyPem: string; privateKeyPem: string }> {
  const current = await prisma.publication.findUnique({ where: { id: publicationId }, select: { apPublicKeyPem: true, apPrivateKeyPem: true } });
  if (current?.apPublicKeyPem && current.apPrivateKeyPem) return { publicKeyPem: current.apPublicKeyPem, privateKeyPem: current.apPrivateKeyPem };
  const keys = generateActorKeys();
  await prisma.publication.updateMany({
    where: { id: publicationId, apPublicKeyPem: null },
    data: { apPublicKeyPem: keys.publicKeyPem, apPrivateKeyPem: keys.privateKeyPem }
  });
  const saved = await prisma.publication.findUniqueOrThrow({ where: { id: publicationId }, select: { apPublicKeyPem: true, apPrivateKeyPem: true } });
  return { publicKeyPem: saved.apPublicKeyPem!, privateKeyPem: saved.apPrivateKeyPem! };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function actorDocument(publication: NonNullable<Awaited<ReturnType<typeof findActorPublication>>>, publicKeyPem: string) {
  const urls = actorFor(publication.id);
  return {
    "@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
    id: urls.id,
    type: "Person",
    preferredUsername: publication.slug,
    name: publication.name,
    summary: publication.description ? `<p>${escapeHtml(publication.description)}</p>` : "",
    url: publicationBaseUrl(publication),
    inbox: urls.inbox,
    outbox: urls.outbox,
    followers: urls.followers,
    manuallyApprovesFollowers: false,
    discoverable: true,
    published: publication.createdAt.toISOString(),
    ...(publication.logoUrl ? { icon: { type: "Image", url: publication.logoUrl } } : {}),
    publicKey: { id: urls.keyId, owner: urls.id, publicKeyPem }
  };
}

export function activityJson(body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": `${AP_CONTENT_TYPE}; charset=utf-8`, "cache-control": "public, max-age=60" }
  });
}
