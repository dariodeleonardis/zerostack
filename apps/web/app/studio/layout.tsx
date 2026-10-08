import React from "react";
import { prisma } from "@zerostack/database";
import { requireUser } from "../../lib/auth";
import { StudioShell } from "./StudioShell";
import { VerifyEmailBanner } from "./VerifyEmailBanner";

export const dynamic = "force-dynamic";

// Lo studio è solo per chi ha una sessione: il controllo sta sul server, non nel browser.
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/studio");
  const memberships = await prisma.publicationMember.findMany({
    where: { userId: user.id },
    orderBy: { publication: { createdAt: "asc" } },
    select: { role: true, publication: { select: { id: true, name: true, slug: true } } }
  });

  return (
    <StudioShell publications={memberships.map((m) => ({ ...m.publication, role: m.role }))}>
      {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
      {children}
    </StudioShell>
  );
}
