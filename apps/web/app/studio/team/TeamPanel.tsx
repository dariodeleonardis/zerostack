"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL, type TeamRole } from "../../../lib/team-roles";

interface Member {
  id: string;
  role: TeamRole;
  userId: string;
  name: string;
  email: string;
}
interface Invite {
  id: string;
  email: string;
  role: TeamRole;
  expiresAt: string;
}

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" });

async function teamAction(publicationId: string, body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(`/api/publications/${publicationId}/team`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).catch(() => null);
  if (!res) return "Connessione assente: riprova";
  if (res.ok) return null;
  return ((await res.json().catch(() => null))?.error as string) ?? "Qualcosa non ha funzionato";
}

export function TeamPanel({
  publicationId,
  name,
  currentUserId,
  members,
  invites
}: {
  publicationId: string;
  name: string;
  currentUserId: string;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "CONTRIBUTOR">("CONTRIBUTOR");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(body: Record<string, unknown>, okText: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return false;
    setPending(true);
    setMessage(null);
    const error = await teamAction(publicationId, body);
    setPending(false);
    setMessage(error ? { ok: false, text: error } : { ok: true, text: okText });
    if (!error) router.refresh();
    return !error;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="font-display text-2xl font-extrabold">{name}</h2>

      <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {m.name}
                {m.userId === currentUserId && <span className="font-normal text-gray-500"> (tu)</span>}
              </p>
              <p className="truncate text-sm text-gray-500">{m.email}</p>
            </div>
            {m.role === "OWNER" ? (
              <span className="kicker text-gray-600">{ROLE_LABEL.OWNER}</span>
            ) : (
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`ruolo-${m.id}`}>Ruolo di {m.name}</label>
                <select
                  id={`ruolo-${m.id}`}
                  value={m.role}
                  disabled={pending}
                  onChange={(e) => run({ action: "role", memberId: m.id, role: e.target.value }, `Ruolo di ${m.name} aggiornato`)}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="EDITOR">{ROLE_LABEL.EDITOR}</option>
                  <option value="CONTRIBUTOR">{ROLE_LABEL.CONTRIBUTOR}</option>
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run({ action: "remove", memberId: m.id }, `${m.name} non fa più parte della squadra`, `Togliere ${m.name} dalla squadra di ${name}?`)}
                  className="rounded-lg px-2 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Togli
                </button>
              </div>
            )}
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{i.email}</p>
              <p className="text-sm text-gray-500">
                Invitato come {ROLE_LABEL[i.role].toLowerCase()}, in attesa fino al {dateFmt.format(new Date(i.expiresAt))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run({ action: "invite", email: i.email, role: i.role }, `Invito a ${i.email} spedito di nuovo`)}
                className="rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
              >
                Rispedisci
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run({ action: "revoke", inviteId: i.id }, `Invito a ${i.email} annullato`)}
                className="rounded-lg px-2 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Annulla
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run({ action: "invite", email, role }, `Invito spedito a ${email}`)) setEmail("");
        }}
      >
        <label className="min-w-[14rem] flex-1">
          <span className="block text-sm font-semibold">Invita per email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@esempio.it"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label>
          <span className="block text-sm font-semibold">Ruolo</span>
          <select value={role} onChange={(e) => setRole(e.target.value as "EDITOR" | "CONTRIBUTOR")} className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <option value="CONTRIBUTOR">{ROLE_LABEL.CONTRIBUTOR}</option>
            <option value="EDITOR">{ROLE_LABEL.EDITOR}</option>
          </select>
        </label>
        <button type="submit" disabled={pending} className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-ink-700 disabled:opacity-50">
          {pending ? "Un momento…" : "Invita"}
        </button>
      </form>

      {message && (
        <p role="status" className={`mt-3 text-sm ${message.ok ? "text-green-800" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

export function LeaveButton({ publicationId, name }: { publicationId: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (!window.confirm(`Uscire dalla squadra di ${name}? Per rientrare servirà un nuovo invito.`)) return;
          setPending(true);
          const err = await teamAction(publicationId, { action: "leave" });
          setPending(false);
          setError(err);
          if (!err) router.refresh();
        }}
        className="rounded-full border-2 border-ink px-5 py-2 text-sm font-bold transition hover:bg-ink hover:text-paper disabled:opacity-50"
      >
        Esci dalla squadra
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
