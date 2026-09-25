"use client";

import React, { useState } from "react";
import { NoteComposer } from "../../components/NoteComposer";
import { MessageSquare, Heart, Repeat, Share2 } from "lucide-react";

interface NoteItem {
  id: string;
  author: {
    name: string;
    handle: string;
    avatarUrl?: string;
  };
  content: string;
  likesCount: number;
  restacksCount: number;
  repliesCount: number;
  createdAt: string;
  isLiked?: boolean;
}

const initialNotes: NoteItem[] = [
  {
    id: "note-1",
    author: {
      name: "Dario De Leonardis",
      handle: "dario",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
    },
    content: "Abbiamo appena rilasciato la prima versione di ZeroStack! Completamente open-source, con supporto nativo a SDI, PEC e 0% commissioni trattenute. Cosa ne pensate del ritorno al self-hosting?",
    likesCount: 42,
    restacksCount: 15,
    repliesCount: 6,
    createdAt: "2 ore fa"
  },
  {
    id: "note-2",
    author: {
      name: "Dario De Leonardis",
      handle: "dario"
    },
    content: "Un sondaggio rapido: quale provider email preferite per le vostre newsletter? Brevo (ex Sendinblue), Resend o Amazon SES? Su ZeroStack supportiamo tutti e tre con un clic.",
    likesCount: 19,
    restacksCount: 4,
    repliesCount: 8,
    createdAt: "5 ore fa"
  },
  {
    id: "note-3",
    author: {
      name: "Redazione Tech Italia",
      handle: "techitalia"
    },
    content: "Stiamo preparando un'analisi approfondita su come l'IA generativa sta cambiando la documentazione tecnica nel 2026. Uscirà venerdì solo per gli abbonati Premium!",
    likesCount: 31,
    restacksCount: 8,
    repliesCount: 2,
    createdAt: "Ieri"
  }
];

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);

  const handleAddNote = (newNote: NoteItem) => {
    setNotes([newNote, ...notes]);
  };

  const handleToggleLike = (id: string) => {
    setNotes(
      notes.map((n) => {
        if (n.id === id) {
          const isLiked = !n.isLiked;
          return {
            ...n,
            isLiked,
            likesCount: isLiked ? n.likesCount + 1 : n.likesCount - 1
          };
        }
        return n;
      })
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Note & Dispacci</h1>
          <p className="text-xs text-gray-500">
            Il micro-blogging di ZeroStack: pensieri rapidi, aggiornamenti e conversazioni tra autori e lettori.
          </p>
        </div>
      </div>

      {/* Composer */}
      <NoteComposer onNoteCreated={handleAddNote} />

      {/* Notes Stream */}
      <div className="mt-8 space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-blue-100 font-bold text-blue-700 flex items-center justify-center text-xs">
                  {note.author.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">{note.author.name}</span>
                    <span className="text-xs text-gray-400">@{note.author.handle}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">{note.createdAt}</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{note.content}</p>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
              <button
                onClick={() => handleToggleLike(note.id)}
                className={`flex items-center gap-1.5 transition ${
                  note.isLiked ? "text-rose-600 font-bold" : "hover:text-rose-600"
                }`}
              >
                <Heart className={`h-4 w-4 ${note.isLiked ? "fill-rose-600" : ""}`} />
                <span>{note.likesCount}</span>
              </button>

              <button className="flex items-center gap-1.5 hover:text-blue-600 transition">
                <Repeat className="h-4 w-4" />
                <span>{note.restacksCount}</span>
              </button>

              <button className="flex items-center gap-1.5 hover:text-blue-600 transition">
                <MessageSquare className="h-4 w-4" />
                <span>{note.repliesCount}</span>
              </button>

              <button className="flex items-center gap-1.5 hover:text-gray-900 transition">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
