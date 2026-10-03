"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";

/** Mi piace all'articolo: si accende subito e si riallinea con la risposta del server. */
export function LikeButton({ postId, initialLiked, initialCount, loginHref }: { postId: string; initialLiked: boolean; initialCount: number; loginHref: string | null }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const label = `${count} mi piace`;
  const cls = "flex items-center gap-1.5 rounded-full border border-[color:var(--pub-text)] px-3 py-1.5 text-sm font-semibold transition";

  if (loginHref) {
    return (
      <a href={loginHref} className={`${cls} hover:bg-[color:var(--pub-text)] hover:text-[color:var(--pub-bg)]`} title="Accedi per mettere mi piace" aria-label={`${label}. Accedi per mettere mi piace`}>
        <Heart className="h-4 w-4" aria-hidden />
        <span>{count}</span>
      </a>
    );
  }

  const toggle = async () => {
    const next = !liked;
    setPending(true);
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    const res = await fetch(`/api/posts/${postId}/like`, { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (data) {
      setLiked(Boolean(data.liked));
      setCount(Number(data.likesCount) || 0);
    } else {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? `Ti piace (${label}). Togli il mi piace` : `${label}. Metti mi piace`}
      className={`${cls} ${liked ? "bg-[color:var(--pub-accent)] text-[color:var(--pub-on-accent)]" : "hover:bg-[color:var(--pub-text)] hover:text-[color:var(--pub-bg)]"}`}
    >
      <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} aria-hidden />
      <span>{count}</span>
    </button>
  );
}
