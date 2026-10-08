import { prisma, type Prisma } from "@zerostack/database";
import { NOTE_MAX, NOTE_MIN } from "./note-limits";

export { NOTE_MAX, NOTE_MIN };

/**
 * Note (T5, 3/10/2026): testi brevi dei creatori, fuori dagli articoli. Regole:
 * - scrive una nota chi è proprietario o editor di una pubblicazione, a nome di quella;
 * - risponde chiunque abbia l'email confermata, un solo livello (la risposta a una risposta va alla nota);
 * - cancella chi ha scritto, oppure chi modera la pubblicazione (proprietario o editor);
 * - testo semplice, mai HTML; una pubblicazione sospesa nasconde le sue note.
 */
export const NOTE_PAGE = 30;

export function noteProblem(content: unknown): string | null {
  if (typeof content !== "string") return "Scrivi la nota";
  const text = content.trim();
  if (text.length < NOTE_MIN) return "La nota è troppo corta";
  if (text.length > NOTE_MAX) return `La nota è troppo lunga (massimo ${NOTE_MAX} caratteri)`;
  return null;
}

/** Pubblicazioni a nome delle quali l'utente può scrivere note. */
export async function writablePublications(userId: string) {
  const rows = await prisma.publicationMember.findMany({
    where: { userId, role: { in: ["OWNER", "EDITOR"] }, publication: { suspendedAt: null } },
    orderBy: { publication: { createdAt: "asc" } },
    select: { publication: { select: { id: true, name: true } } }
  });
  return rows.map((r) => r.publication);
}

export function noteSelect(viewerId: string | undefined) {
  return {
    id: true,
    content: true,
    createdAt: true,
    likesCount: true,
    repliesCount: true,
    replyToNoteId: true,
    authorId: true,
    publicationId: true,
    author: { select: { name: true, handle: true } },
    publication: { select: { name: true, slug: true, customDomain: true, isDomainVerified: true, primaryColor: true } },
    // Nessun utente ha l'id vuoto: per chi non è entrato la lista resta vuota.
    likes: { where: { userId: viewerId ?? "" }, select: { id: true } }
  } satisfies Prisma.NoteSelect;
}

export type NoteRow = Prisma.NoteGetPayload<{ select: ReturnType<typeof noteSelect> }>;

const visible = { publication: { suspendedAt: null } } satisfies Prisma.NoteWhereInput;

/** Una pagina del feed: note principali (non risposte), dalla più recente. `publicationIds` assente = tutte. */
export async function notesFeed(options: { viewerId?: string; publicationIds?: string[]; before?: Date }) {
  const rows = await prisma.note.findMany({
    where: {
      ...visible,
      replyToNoteId: null,
      publicationId: options.publicationIds ? { in: options.publicationIds } : { not: null },
      ...(options.before ? { createdAt: { lt: options.before } } : {})
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: NOTE_PAGE + 1,
    select: noteSelect(options.viewerId)
  });
  const page = rows.slice(0, NOTE_PAGE);
  const last = page[page.length - 1];
  return { notes: page, next: rows.length > NOTE_PAGE && last ? last.createdAt.toISOString() : null };
}

/** Nota visibile (principale o risposta), o null. */
export function findNote(id: string, viewerId?: string) {
  return prisma.note.findFirst({ where: { id, ...visible }, select: noteSelect(viewerId) });
}

export function noteReplies(noteId: string, viewerId?: string) {
  return prisma.note.findMany({
    where: { replyToNoteId: noteId, ...visible },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: noteSelect(viewerId)
  });
}

/** Proprietario o editor della pubblicazione della nota. */
export async function canModerateNotes(userId: string | undefined, publicationId: string | null): Promise<boolean> {
  if (!userId || !publicationId) return false;
  const member = await prisma.publicationMember.findUnique({
    where: { publicationId_userId: { publicationId, userId } },
    select: { role: true }
  });
  return member?.role === "OWNER" || member?.role === "EDITOR";
}
