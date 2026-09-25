import { NextResponse } from "next/server";

/**
 * RFC 7033 WebFinger endpoint per interoperabilità Fediverse (Mastodon, Threads, Lemmy)
 * Risponde a: /.well-known/webfinger?resource=acct:autore@dominio
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource");

  if (!resource || !resource.startsWith("acct:")) {
    return NextResponse.json(
      { error: "Parametro 'resource' mancante o non valido (es. acct:dario@zerostack.it)" },
      { status: 400 }
    );
  }

  // Estrae l'username e l'host: acct:dario@zerostack.it -> dario
  const acctPart = resource.replace(/^acct:/, "");
  const [handle, host] = acctPart.split("@");

  if (!handle) {
    return NextResponse.json({ error: "Handle non valido" }, { status: 400 });
  }

  const hostHeader = req.headers.get("host") || "zerostack.it";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${protocol}://${hostHeader}`;
  const actorUrl = `${baseUrl}/api/activitypub/users/${handle}`;

  const webfingerResponse = {
    subject: `acct:${handle}@${hostHeader}`,
    aliases: [actorUrl, `${baseUrl}/@${handle}`],
    links: [
      {
        rel: "http://webfinger.net/rel/profile-page",
        type: "text/html",
        href: `${baseUrl}/p/${handle}`
      },
      {
        rel: "self",
        type: "application/activity+json",
        href: actorUrl
      }
    ]
  };

  return new Response(JSON.stringify(webfingerResponse), {
    status: 200,
    headers: {
      "Content-Type": "application/jrd+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
