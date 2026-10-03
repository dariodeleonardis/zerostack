"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const res = await fetch("/api/team/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
          }).catch(() => null);
          if (res?.ok) {
            router.push("/studio");
            router.refresh();
            return;
          }
          setPending(false);
          setError(((await res?.json().catch(() => null))?.error as string) ?? "Connessione assente: riprova");
        }}
        className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper transition hover:bg-ink-700 disabled:opacity-50"
      >
        {pending ? "Un momento…" : "Accetta l'invito"}
      </button>
      {error && <p role="alert" className="mt-3 text-base text-red-700">{error}</p>}
    </div>
  );
}
