import { NextResponse } from "next/server";

interface RouteParams {
  params: {
    handle: string;
  };
}

/**
 * Endpoint W3C ActivityPub Actor
 * Restituisce l'oggetto JSON-LD dell'autore per consentire il follow da Mastodon/Fediverse
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { handle } = params;
  const hostHeader = req.headers.get("host") || "zerostack.it";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${protocol}://${hostHeader}`;
  const actorId = `${baseUrl}/api/activitypub/users/${handle}`;

  // Formato Actor W3C standard conforme a Mastodon / W3C ActivityPub
  const actorObject = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    id: actorId,
    type: "Person",
    preferredUsername: handle,
    name: handle === "tech-italia" ? "Tech & Futuro Italia" : `Autore ${handle}`,
    summary: `Pubblicazione e newsletter indipendente su ZeroStack.`,
    url: `${baseUrl}/p/${handle}`,
    inbox: `${actorId}/inbox`,
    outbox: `${actorId}/outbox`,
    followers: `${actorId}/followers`,
    following: `${actorId}/following`,
    publicKey: {
      id: `${actorId}#main-key`,
      owner: actorId,
      publicKeyPem: `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0u9ZmockPublicKeyZerostackFediverse1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\n-----END PUBLIC KEY-----`
    },
    icon: {
      type: "Image",
      mediaType: "image/png",
      url: `${baseUrl}/favicon.ico`
    }
  };

  return new Response(JSON.stringify(actorObject), {
    status: 200,
    headers: {
      "Content-Type": "application/activity+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
