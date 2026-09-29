import { prisma } from "@zerostack/database";
import type { CurrentUser } from "./auth";

/** L'utente è proprietario della pubblicazione? I dati fiscali e le fatture sono solo suoi, non dei collaboratori. */
export async function isPublicationOwner(user: CurrentUser, publicationId: string): Promise<boolean> {
  const row = await prisma.publicationMember.findFirst({ where: { publicationId, userId: user.id, role: "OWNER" }, select: { id: true } });
  return Boolean(row);
}
