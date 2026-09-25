"use client";

import React, { useState } from "react";
import { Users, UserPlus, Shield, Trash2, Mail } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "EDITOR" | "CONTRIBUTOR";
}

const initialTeam: TeamMember[] = [
  { id: "m-1", name: "Dario De Leonardis", email: "dario@zerostack.it", role: "OWNER" },
  { id: "m-2", name: "Marco Rossi", email: "marco@techitalia.it", role: "EDITOR" }
];

export default function PublicationTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("EDITOR");
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setTimeout(() => {
      const newMember: TeamMember = {
        id: "m-" + Date.now(),
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole
      };
      setTeam([...team, newMember]);
      setInviteEmail("");
      setIsInviting(false);
    }, 600);
  };

  const handleRemove = (id: string) => {
    setTeam(team.filter((m) => m.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Squadra & Collaboratori</h1>
          <p className="text-xs text-gray-500">
            Invita co-autori ed editor a collaborare agli articoli della tua pubblicazione.
          </p>
        </div>
      </div>

      {/* Form Invito */}
      <form onSubmit={handleInvite} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-blue-600" /> Invita un Nuovo Membro
        </h2>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="Indirizzo email del collaboratore..."
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none"
            required
          />

          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as TeamMember["role"])}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:outline-none"
          >
            <option value="EDITOR">Editor (Può scrivere e pubblicare)</option>
            <option value="CONTRIBUTOR">Contributor (Può proporre bozze)</option>
          </select>

          <button
            type="submit"
            disabled={isInviting}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isInviting ? "Invio invito..." : "Invia Invito"}
          </button>
        </div>
      </form>

      {/* Lista Membri Attuali */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
          <thead className="bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Membro</th>
              <th className="px-6 py-3.5">Email</th>
              <th className="px-6 py-3.5">Ruolo</th>
              <th className="px-6 py-3.5 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {team.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/70 transition">
                <td className="px-6 py-4 font-bold text-gray-900">{m.name}</td>
                <td className="px-6 py-4 text-gray-500">{m.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      m.role === "OWNER"
                        ? "bg-purple-100 text-purple-800"
                        : m.role === "EDITOR"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {m.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {m.role !== "OWNER" && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="rounded p-1 text-red-500 hover:bg-red-50 transition"
                      title="Rimuovi membro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
