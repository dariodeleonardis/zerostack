"use client";

import React, { useState } from "react";
import { Send, Image as ImageIcon, Sparkles } from "lucide-react";

interface NoteComposerProps {
  onNoteCreated?: (note: any) => void;
}

export const NoteComposer: React.FC<NoteComposerProps> = ({ onNoteCreated }) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    // Simula salvataggio nota
    setTimeout(() => {
      const newNote = {
        id: "note-" + Date.now(),
        content,
        author: {
          name: "Dario De Leonardis",
          handle: "dario",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
        },
        likesCount: 0,
        restacksCount: 0,
        repliesCount: 0,
        createdAt: "Adesso"
      };

      onNoteCreated?.(newNote);
      setContent("");
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue-100 font-bold text-blue-700 flex items-center justify-center">
            D
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cosa c'è di nuovo? Condividi una nota rapida o una riflessione..."
              rows={3}
              maxLength={1000}
              className="w-full resize-none border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
            />

            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 text-gray-400">
                <button
                  type="button"
                  className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-600 transition"
                  title="Aggiungi immagine"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-400">{1000 - content.length} caratteri rimanenti</span>
              </div>

              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Invio..." : "Invia Nota"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
