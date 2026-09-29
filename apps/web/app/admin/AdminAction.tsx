"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Pulsante per le azioni di amministrazione: chiede conferma, chiama l'API e ricarica la pagina. */
export function AdminAction({
  url,
  body,
  label,
  confirm,
  tone = "neutral"
}: {
  url: string;
  body: Record<string, unknown>;
  label: string;
  confirm?: string;
  tone?: "neutral" | "danger";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const run = async () => {
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) window.alert(data.error ?? "Operazione non riuscita");
    router.refresh();
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${tone === "danger" ? "border border-rose-200 text-rose-700 hover:bg-rose-50" : "border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
    >
      {pending ? "..." : label}
    </button>
  );
}

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  return (
    <select
      defaultValue={role}
      onChange={async (e) => {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "role", role: e.target.value })
        });
        if (!res.ok) window.alert((await res.json().catch(() => ({}))).error ?? "Cambio ruolo non riuscito");
        router.refresh();
      }}
      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
    >
      {["READER", "AUTHOR", "ADMIN"].map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
