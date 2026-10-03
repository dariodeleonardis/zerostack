import React from "react";
import Link from "next/link";
import { publicationBaseUrl } from "@zerostack/shared";
import type { NoteRow } from "../../lib/notes";
import { publicationPalette } from "../../lib/colors";
import { LikeButton } from "../p/[slug]/[postSlug]/LikeButton";
import { NoteDelete } from "./NoteClient";

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Colori della piattaforma per i componenti che leggono le variabili --pub-* (il pulsante mi piace). */
export const PLATFORM_PALETTE = {
  "--pub-text": "#141210",
  "--pub-bg": "#FBF8F2",
  "--pub-accent": "#F2B705",
  "--pub-on-accent": "#141210"
} as React.CSSProperties;

/** Una nota nel feed o nella sua pagina. Le risposte non portano il nome della pubblicazione. */
export function NoteCard({
  note,
  viewerId,
  canDelete,
  linkToNote = true,
  loginHref,
  deleteGoTo
}: {
  note: NoteRow;
  viewerId?: string;
  canDelete: boolean;
  linkToNote?: boolean;
  loginHref: string;
  deleteGoTo?: string;
}) {
  const isReply = Boolean(note.replyToNoteId);
  const accent = note.publication ? publicationPalette(note.publication.primaryColor, null).accent : "#141210";
  const when = dateFmt.format(note.createdAt);
  return (
    <article id={`nota-${note.id}`} className="grid grid-cols-[2.5rem_1fr] gap-3 py-5">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-bold text-paper"
        style={{ backgroundColor: isReply ? "#141210" : accent }}
        aria-hidden
      >
        {note.author.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-bold text-ink">{note.author.name}</span>
          {!isReply && note.publication && (
            <a href={publicationBaseUrl(note.publication)} className="font-semibold text-saffron-800 hover:underline">
              {note.publication.name}
            </a>
          )}
          {linkToNote ? (
            <Link href={`/notes/${note.id}`} className="text-gray-500 hover:underline">
              <time dateTime={note.createdAt.toISOString()}>{when}</time>
            </Link>
          ) : (
            <time dateTime={note.createdAt.toISOString()} className="text-gray-500">{when}</time>
          )}
        </p>
        <p className="mt-1 whitespace-pre-line break-words text-lg leading-relaxed text-ink">{note.content}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <LikeButton
            url={`/api/notes/${note.id}/like`}
            initialLiked={note.likes.length > 0}
            initialCount={note.likesCount}
            loginHref={viewerId ? null : loginHref}
          />
          {!isReply && (
            <Link href={`/notes/${note.id}#risposte`} className="text-sm font-semibold text-gray-700 hover:underline">
              {note.repliesCount === 0 ? "Rispondi" : note.repliesCount === 1 ? "1 risposta" : `${note.repliesCount} risposte`}
            </Link>
          )}
          {canDelete && <NoteDelete noteId={note.id} goTo={deleteGoTo} />}
        </div>
      </div>
    </article>
  );
}
