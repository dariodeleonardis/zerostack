import React from "react";
import { prisma } from "@zerostack/database";
import { rootDomainFromEnv } from "@zerostack/shared";
import { requireUser } from "../../../lib/auth";
import { newVerifyToken, verificationRecordName, VERIFY_PREFIX } from "../../../lib/domains";
import { DomainPanel } from "./DomainPanel";

export const dynamic = "force-dynamic";

export default async function DomainPage() {
  const user = await requireUser("/studio/domain");
  const owned = await prisma.publicationMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    orderBy: { publication: { createdAt: "asc" } },
    select: { publication: { select: { id: true, name: true, slug: true, customDomain: true, isDomainVerified: true, domainVerifyToken: true } } }
  });
  const root = rootDomainFromEnv();

  // Domini impostati prima della verifica DNS: ricevono ora il loro token.
  for (const { publication } of owned) {
    if (publication.customDomain && !publication.domainVerifyToken && !publication.isDomainVerified) {
      publication.domainVerifyToken = newVerifyToken();
      await prisma.publication.update({ where: { id: publication.id }, data: { domainVerifyToken: publication.domainVerifyToken } });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Dominio personalizzato</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pubblica anche su un indirizzo tuo, gratis. Il certificato HTTPS arriva da solo dopo la verifica.
        </p>
      </div>
      <DomainPanel
        publications={owned.map(({ publication: p }) => ({
          id: p.id,
          name: p.name,
          platformAddress: `${p.slug}.${root}`,
          customDomain: p.customDomain,
          isDomainVerified: p.isDomainVerified,
          txtName: p.customDomain ? verificationRecordName(p.customDomain) : null,
          txtValue: p.domainVerifyToken ? `${VERIFY_PREFIX}${p.domainVerifyToken}` : null
        }))}
      />
    </div>
  );
}
