"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface CommentItem {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  authorName: string;
  mine: boolean;
  hidden: boolean;
}

export interface CommentViewer {
  /** "ok" = può scrivere; gli altri spiegano perché no. */
  state: "ok" | "anonymous" | "unverified";
  canModerate: boolean;
  loginHref: string;
}

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const MAX = 2000;

function Composer({ postId, parentId, onDone, autoFocus }: { postId: string; parentId?: string; onDone: () => void; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `commento-${parentId ?? "nuovo"}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, ...(parentId ? { parentId } : {}) })
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setPending(false);
    if (!res?.ok) {
      setError(data?.error ?? "Commento non pubblicato. Riprova.");
      return;
    }
    setText("");
    onDone();
  };

  return (
    <form onSubmit={submit} className="font-sans">
      <label htmlFor={id} className="sr-only">{parentId ? "La tua risposta" : "Il tuo commento"}</label>
      <textarea
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={parentId ? 3 : 4}
        autoFocus={autoFocus}
        required
        placeholder={parentId ? "Scrivi una risposta" : "Scrivi un commento"}
        className="block w-full rounded-lg border-2 border-[color:var(--pub-text)] bg-white px-4 py-3 text-base text-ink placeholder-gray-500 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs opacity-80">{text.length}/{MAX}</span>
        <button
          type="submit"
          disabled={pending || text.trim().length < 2}
          className="rounded-full bg-[color:var(--pub-accent)] px-6 py-2.5 text-sm font-bold text-[color:var(--pub-on-accent)] ring-2 ring-[color:var(--pub-text)] transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Invio…" : parentId ? "Rispondi" : "Pubblica il commento"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
    </form>
  );
}

/** Commenti dell'articolo: elenco con risposte di un livello, modulo, moderazione per chi ne ha diritto. */
export function Comments({ postId, comments, viewer, titleFont }: { postId: string; comments: CommentItem[]; viewer: CommentViewer; titleFont: string }) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const top = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);
  const visible = comments.filter((c) => !c.hidden).length;

  const act = async (id: string, method: "PATCH" | "DELETE", body?: object) => {
    if (method === "DELETE" && !window.confirm("Cancellare il commento? Spariscono anche le risposte.")) return;
    setBusy(id);
    await fetch(`/api/comments/${id}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    setBusy(null);
    router.refresh();
  };

  const item = (c: CommentItem, isReply: boolean) => (
    <li key={c.id} className={`py-5 ${isReply ? "border-l-2 border-[color:var(--pub-accent)] pl-4" : ""} ${c.hidden ? "opacity-60" : ""}`}>
      <p className="font-sans text-sm">
        <span className="font-bold">{c.authorName}</span>
        <span className="ml-2 opacity-80">{dateFmt.format(new Date(c.createdAt))}</span>
        {c.hidden && <span className="ml-2 rounded-full border border-[color:var(--pub-text)] px-2 py-0.5 text-xs font-semibold">Nascosto ai lettori</span>}
      </p>
      <p className="mt-2 whitespace-pre-line text-base leading-relaxed">{c.content}</p>
      <div className="mt-2 flex flex-wrap gap-4 font-sans text-sm font-semibold">
        {!isReply && viewer.state === "ok" && !c.hidden && (
          <button type="button" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="underline-offset-4 hover:underline">
            {replyTo === c.id ? "Annulla" : "Rispondi"}
          </button>
        )}
        {viewer.canModerate && (
          <button type="button" disabled={busy === c.id} onClick={() => act(c.id, "PATCH", { hidden: !c.hidden })} className="underline-offset-4 hover:underline">
            {c.hidden ? "Mostra di nuovo" : "Nascondi"}
          </button>
        )}
        {(c.mine || viewer.canModerate) && (
          <button type="button" disabled={busy === c.id} onClick={() => act(c.id, "DELETE")} className="text-rose-700 underline-offset-4 hover:underline">
            Cancella
          </button>
        )}
      </div>
      {replyTo === c.id && (
        <div className="mt-4">
          <Composer postId={postId} parentId={c.id} autoFocus onDone={() => { setReplyTo(null); router.refresh(); }} />
        </div>
      )}
      {!isReply && repliesOf(c.id).length > 0 && <ul className="mt-3">{repliesOf(c.id).map((r) => item(r, true))}</ul>}
    </li>
  );

  return (
    <section id="commenti" className="mt-14 border-t-[3px] border-[color:var(--pub-text)] pt-6">
      <h2 className={`text-2xl font-extrabold tracking-tight ${titleFont}`}>Commenti{visible > 0 ? ` (${visible})` : ""}</h2>

      <div className="mt-6">
        {viewer.state === "ok" ? (
          <Composer postId={postId} onDone={() => router.refresh()} />
        ) : viewer.state === "unverified" ? (
          <p className="font-sans text-base">Conferma il tuo indirizzo email per commentare: trovi il link nella posta.</p>
        ) : (
          <p className="font-sans text-base">
            <a href={viewer.loginHref} className="font-bold underline underline-offset-4">Accedi</a> per commentare.
          </p>
        )}
      </div>

      {top.length > 0 ? (
        <ul className="mt-6 divide-y divide-[color:var(--pub-text)]">{top.map((c) => item(c, false))}</ul>
      ) : (
        <p className="mt-6 opacity-80">Ancora nessun commento. Il primo può essere il tuo.</p>
      )}
    </section>
  );
}
