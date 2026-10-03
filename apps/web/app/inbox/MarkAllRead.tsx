"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/inbox/read-all", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
        setPending(false);
        router.refresh();
      }}
      className="rounded-full border-2 border-ink px-5 py-2 text-sm font-bold transition hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {pending ? "Un momento…" : "Segna tutto come letto"}
    </button>
  );
}
