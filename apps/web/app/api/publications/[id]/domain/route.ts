import { NextResponse } from "next/server";
import { prisma, Prisma } from "@zerostack/database";
import { CustomDomainSchema } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "../../../../../lib/auth";
import { newVerifyToken } from "../../../../../lib/domains";
import { rootDomain } from "../../../../../lib/publications";

/**
 * Imposta (o toglie, con null) il dominio personalizzato. Ogni cambio riparte da "non verificato"
 * con un token nuovo: Caddy non emette certificati finché la verifica DNS non passa.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per gestire il dominio" }, { status: 401 });
  }
  const owner = await prisma.publicationMember.findFirst({ where: { publicationId: params.id, userId: user.id, role: "OWNER" }, select: { id: true } });
  if (!owner) {
    return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.customDomain === null || body?.customDomain === "") {
    await prisma.publication.update({ where: { id: params.id }, data: { customDomain: null, isDomainVerified: false, domainVerifyToken: null } });
    return NextResponse.json({ customDomain: null });
  }
  const parsed = CustomDomainSchema.safeParse(body?.customDomain);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dominio non valido" }, { status: 400 });
  }
  const domain = parsed.data;
  const root = rootDomain();
  if (domain === root || domain.endsWith(`.${root}`)) {
    return NextResponse.json({ error: "Deve essere un tuo dominio, non un indirizzo della piattaforma" }, { status: 400 });
  }

  const current = await prisma.publication.findUnique({ where: { id: params.id }, select: { customDomain: true, domainVerifyToken: true, isDomainVerified: true } });
  if (current?.customDomain === domain && current.domainVerifyToken) {
    return NextResponse.json({ customDomain: domain, verifyToken: current.domainVerifyToken, isDomainVerified: current.isDomainVerified });
  }
  try {
    const token = newVerifyToken();
    await prisma.publication.update({ where: { id: params.id }, data: { customDomain: domain, isDomainVerified: false, domainVerifyToken: token } });
    return NextResponse.json({ customDomain: domain, verifyToken: token, isDomainVerified: false });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Questo dominio è già collegato a un'altra pubblicazione" }, { status: 409 });
    }
    throw err;
  }
}
