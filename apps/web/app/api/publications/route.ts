import { NextResponse } from "next/server";
import { prisma, Prisma } from "@zerostack/database";
import { CreatePublicationSchema } from "@zerostack/shared";
import { clientIp, getCurrentUser, isSameOriginJson } from "../../../lib/auth";
import { allowAttempt } from "../../../lib/rate-limit";
import { newVerifyToken } from "../../../lib/domains";
import { checkSlugAvailability, publicationUrl, rootDomain, SLUG_REASON_MESSAGES } from "../../../lib/publications";

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per creare una pubblicazione" }, { status: 401 });
  }
  const parsed = CreatePublicationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, slug, description, primaryColor } = parsed.data;
  const customDomain = parsed.data.customDomain?.trim().toLowerCase() || null;

  if (customDomain && (customDomain === rootDomain() || customDomain.endsWith(`.${rootDomain()}`))) {
    return NextResponse.json({ error: "Il dominio personalizzato deve essere un tuo dominio, non un indirizzo della piattaforma", fields: { customDomain: ["Non valido"] } }, { status: 400 });
  }

  const availability = await checkSlugAvailability(slug, user.id);
  if (!availability.available) {
    const status = availability.reason === "taken" ? 409 : 400;
    return NextResponse.json({ error: SLUG_REASON_MESSAGES[availability.reason], fields: { slug: [SLUG_REASON_MESSAGES[availability.reason]] } }, { status });
  }

  // Ogni sottodominio nuovo costa un certificato Let's Encrypt: il limite protegge anche quella quota.
  // Si conta dopo i controlli, così uno slug già preso o un dato sbagliato non consumano i tentativi del giorno.
  if (!(await allowAttempt(`publication-create:${user.id}:${clientIp(req)}`, 5, 24 * 60 * 60))) {
    return NextResponse.json({ error: "Hai creato troppe pubblicazioni oggi. Riprova domani." }, { status: 429 });
  }

  try {
    const publication = await prisma.$transaction(async (tx) => {
      const created = await tx.publication.create({
        data: {
          ownerId: user.id,
          name,
          slug,
          description: description || null,
          ...(primaryColor ? { primaryColor } : {}),
          // Il dominio personalizzato resta non verificato: Caddy non emette certificati finché non lo è.
          customDomain,
          isDomainVerified: false,
          domainVerifyToken: customDomain ? newVerifyToken() : null,
          members: { create: { userId: user.id, role: "OWNER" } }
        },
        select: { id: true, slug: true, name: true }
      });
      if (user.role === "READER") {
        await tx.user.update({ where: { id: user.id }, data: { role: "AUTHOR" } });
      }
      return created;
    });

    return NextResponse.json({ publication: { ...publication, url: publicationUrl(publication.slug) } }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String((err.meta as { target?: unknown } | undefined)?.target ?? "");
      if (target.includes("customDomain")) {
        return NextResponse.json({ error: "Questo dominio è già collegato a un'altra pubblicazione", fields: { customDomain: ["Già in uso"] } }, { status: 409 });
      }
      return NextResponse.json({ error: SLUG_REASON_MESSAGES.taken, fields: { slug: [SLUG_REASON_MESSAGES.taken] } }, { status: 409 });
    }
    throw err;
  }
}
