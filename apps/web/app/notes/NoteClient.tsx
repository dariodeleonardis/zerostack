"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { NOTE_MAX } from "../../lib/note-limits";

/** Scrivere una nota (scegliendo la pubblicazione) o, con `replyToNoteId`, una risposta. */
export function NoteComposer({ publications, replyToNoteId }: { publications?: { id: string; name: string }[]; replyToNoteId?: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [publicationId, setPublicationId] = useState(publications?.[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isReply = Boolean(replyToNoteId);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isReply ? { content, replyToNoteId } : { content, publicationId })
        }).catch(() => null);
        setPending(false);
        if (res?.ok) {
          setContent("");
          router.refresh();
          return;
        }
        setError(((await res?.json().catch(() => null))?.error as string) ?? "Connessione assente: riprova");
      }}
    >
      <label className="block">
        <span className="sr-only">{isReply ? "La tua risposta" : "La tua nota"}</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={NOTE_MAX}
          rows={isReply ? 3 : 4}
          required
          placeholder={isReply ? "Rispondi…" : "Cosa c'è di nuovo? Una nota breve per chi ti segue"}
          className="w-full resize-y rounded-xl border-2 border-ink bg-white px-4 py-3 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-saffron"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          {!isReply && publications && publications.length > 1 && (
            <label className="flex items-center gap-2">
              <span>A nome di</span>
              <select value={publicationId} onChange={(e) => setPublicationId(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5">
                {publications.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!isReply && publications?.length === 1 && <span>A nome di {publications[0].name}</span>}
          <span aria-live="polite">{content.length}/{NOTE_MAX}</span>
        </div>
        <button type="submit" disabled={pending || content.trim().length < 2} className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-ink-700 disabled:opacity-50">
          {pending ? "Un momento…" : isReply ? "Rispondi" : "Pubblica la nota"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

/** Cancella una nota o una risposta; `goTo` per lasciare la pagina di una nota cancellata. */
export function NoteDelete({ noteId, goTo }: { noteId: string; goTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm("Cancellare questa nota? Non si torna indietro.")) return;
        setPending(true);
        const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" }).catch(() => null);
        setPending(false);
        if (!res?.ok) return window.alert("Non è stato possibile cancellarla: riprova");
        if (goTo) router.push(goTo);
        router.refresh();
      }}
      className="text-sm font-semibold text-red-700 underline-offset-4 hover:underline disabled:opacity-50"
    >
      Cancella
    </button>
  );
}
