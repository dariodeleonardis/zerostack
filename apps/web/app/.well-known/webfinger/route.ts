import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { rootDomainFromEnv } from "@zerostack/shared";
import { actorFor, platformHost } from "../../../lib/fediverse";

export const dynamic = "force-dynamic";

/**
 * WebFinger (RFC 7033) per il Fediverso (T6): acct:<slug>@<dominio> porta all'attore della
 * pubblicazione. Si accettano il dominio della piattaforma, il sottodominio della pubblicazione e il
 * suo dominio personalizzato verificato; il nome canonico resta @slug@<dominio della piattaforma>.
 */
export async function GET(req: Request) {
  const resource = new URL(req.url).searchParams.get("resource") ?? "";
  const match = resource.match(/^acct:([a-z0-9-]{1,63})@([a-z0-9.:-]{1,253})$/i);
  if (!match) return NextResponse.json({ error: "resource deve essere acct:nome@dominio" }, { status: 400 });
  const slug = match[1].toLowerCase();
  const host = match[2].toLowerCase();

  const publication = await prisma.publication.findFirst({
    where: { slug, suspendedAt: null },
    select: { id: true, slug: true, customDomain: true, isDomainVerified: true }
  });
  const hostOk =
    publication &&
    (host === platformHost() ||
      host === `${publication.slug}.${rootDomainFromEnv()}` ||
      (publication.isDomainVerified && publication.customDomain?.toLowerCase() === host));
  if (!publication || !hostOk) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const actor = actorFor(publication.id).id;
  return new NextResponse(
    JSON.stringify({
      subject: `acct:${publication.slug}@${platformHost()}`,
      aliases: [actor],
      links: [{ rel: "self", type: "application/activity+json", href: actor }]
    }),
    { headers: { "content-type": "application/jrd+json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "public, max-age=300" } }
  );
}
