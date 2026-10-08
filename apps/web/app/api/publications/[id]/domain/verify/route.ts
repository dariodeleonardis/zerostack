import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../../../lib/auth";
import { allowAttempt } from "../../../../../../lib/rate-limit";
import { hasVerificationRecord, newVerifyToken, verificationRecordName, VERIFY_PREFIX } from "../../../../../../lib/domains";

// Controlla il record TXT _zerostack.<dominio>: se c'è il token giusto, il dominio è dell'autore.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per gestire il dominio" }, { status: 401 });
  }
  const owned = await prisma.publicationMember.findFirst({
    where: { publicationId: params.id, userId: user.id, role: "OWNER" },
    select: { publication: { select: { id: true, customDomain: true, domainVerifyToken: true, isDomainVerified: true } } }
  });
  if (!owned) {
    return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
  }
  const publication = owned.publication;
  if (!publication.customDomain) {
    return NextResponse.json({ error: "Imposta prima un dominio" }, { status: 400 });
  }
  if (publication.isDomainVerified) return NextResponse.json({ verified: true });
  if (!(await allowAttempt(`domain-verify:${publication.id}`, 30, 60 * 60))) {
    return NextResponse.json({ error: "Troppe verifiche. Il DNS può metterci qualche ora ad aggiornarsi: riprova più tardi." }, { status: 429 });
  }

  // Domini impostati prima di questa funzione: il token nasce qui.
  let token = publication.domainVerifyToken;
  if (!token) {
    token = newVerifyToken();
    await prisma.publication.update({ where: { id: publication.id }, data: { domainVerifyToken: token } });
  }

  let verified = false;
  try {
    verified = await hasVerificationRecord(publication.customDomain, token);
  } catch (err) {
    console.error("[domain/verify] DNS:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Il DNS non ha risposto. Riprova tra poco." }, { status: 502 });
  }
  if (!verified) {
    return NextResponse.json({
      verified: false,
      message: `Record non trovato. Aggiungi un record TXT con nome ${verificationRecordName(publication.customDomain)} e valore ${VERIFY_PREFIX}${token}, poi riprova (il DNS può metterci fino a qualche ora).`
    });
  }
  // Solo se nel frattempo il dominio non è cambiato.
  const updated = await prisma.publication.updateMany({
    where: { id: publication.id, customDomain: publication.customDomain, domainVerifyToken: token },
    data: { isDomainVerified: true }
  });
  return NextResponse.json({ verified: updated.count === 1 });
}
