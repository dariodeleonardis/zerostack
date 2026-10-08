"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function SubscriptionActions({ id, cancelAtPeriodEnd }: { id: string; cancelAtPeriodEnd: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "cancel" | "resume") => {
    if (action === "cancel" && !window.confirm("Disdire? Continuerai a leggere fino alla fine del periodo già pagato.")) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Operazione non riuscita");
      return;
    }
    router.refresh();
  };

  return (
    <div className="text-right">
      {cancelAtPeriodEnd ? (
        <button type="button" disabled={pending} onClick={() => run("resume")} className="rounded-lg bg-ink-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-700 disabled:opacity-50">
          Riattiva il rinnovo
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => run("cancel")} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          Disdici
        </button>
      )}
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
