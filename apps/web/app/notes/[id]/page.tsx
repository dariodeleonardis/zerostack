import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { canModerateNotes, findNote, noteReplies } from "../../../lib/notes";
import { NoteCard, PLATFORM_PALETTE } from "../NoteCard";
import { NoteComposer } from "../NoteClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const note = await findNote(params.id);
  if (!note) return { title: "Nota non trovata" };
  const text = note.content.length > 140 ? `${note.content.slice(0, 137)}…` : note.content;
  return { title: `${note.author.name}: nota | ZeroStack`, description: text };
}

export default async function NotePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const note = await findNote(params.id, user?.id);
  if (!note) notFound();
  // La pagina di una risposta è quella della nota, con la risposta in vista.
  if (note.replyToNoteId) redirect(`/notes/${note.replyToNoteId}#nota-${note.id}`);

  const [replies, moderator] = await Promise.all([noteReplies(note.id, user?.id), canModerateNotes(user?.id, note.publicationId)]);
  const here = `/notes/${note.id}`;
  const loginHref = `/login?next=${encodeURIComponent(here)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6" style={PLATFORM_PALETTE}>
      <Link href="/notes" className="kicker text-saffron-800 hover:underline">
        ← Note
      </Link>
      <div className="mt-4 border-y-[3px] border-ink">
        <NoteCard note={note} viewerId={user?.id} canDelete={Boolean(user && (note.authorId === user.id || moderator))} linkToNote={false} loginHref={loginHref} deleteGoTo="/notes" />
      </div>

      <section id="risposte" className="mt-8" aria-label="Risposte">
        <h2 className="font-display text-2xl font-extrabold">
          {replies.length === 0 ? "Nessuna risposta" : replies.length === 1 ? "1 risposta" : `${replies.length} risposte`}
        </h2>
        <div className="mt-4">
          {!user ? (
            <p className="text-base">
              <Link href={loginHref} className="font-bold underline underline-offset-4">Entra</Link> per rispondere.
            </p>
          ) : !user.emailVerified ? (
            <p className="text-base">Conferma il tuo indirizzo email per rispondere: trovi il link nella posta.</p>
          ) : (
            <NoteComposer replyToNoteId={note.id} />
          )}
        </div>
        <div className="mt-4 divide-y divide-gray-300">
          {replies.map((reply) => (
            <NoteCard key={reply.id} note={reply} viewerId={user?.id} canDelete={Boolean(user && (reply.authorId === user.id || moderator))} linkToNote={false} loginHref={loginHref} />
          ))}
        </div>
      </section>
    </div>
  );
}
