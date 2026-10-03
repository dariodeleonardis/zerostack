import { prisma } from "@zerostack/database";
import type { EditorPublication } from "../components/PostEditor";

export async function editorPublications(userId: string): Promise<EditorPublication[]> {
  const memberships = await prisma.publicationMember.findMany({
    where: { userId },
    orderBy: { publication: { createdAt: "asc" } },
    select: { role: true, publication: { select: { id: true, name: true } } }
  });
  return memberships.map((m) => ({ id: m.publication.id, name: m.publication.name, role: m.role }));
}
