"use client";

import React, { useState } from "react";
import { Users, Search, ShieldAlert, ShieldCheck, UserCheck, UserX, MoreVertical } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  handle: string;
  role: "SUPERADMIN" | "STAFF" | "CREATOR" | "READER";
  status: "ATTIVO" | "SOSPESO";
  joinedDate: string;
  publicationsCount: number;
}

const mockUsers: AdminUser[] = [
  {
    id: "usr-1",
    name: "Dario De Leonardis",
    email: "dario@zerostack.it",
    handle: "dario",
    role: "SUPERADMIN",
    status: "ATTIVO",
    joinedDate: "Gennaio 2026",
    publicationsCount: 1
  },
  {
    id: "usr-2",
    name: "Marco Rossi (Moderatore)",
    email: "marco.staff@zerostack.it",
    handle: "marcostaff",
    role: "STAFF",
    status: "ATTIVO",
    joinedDate: "Febbraio 2026",
    publicationsCount: 0
  },
  {
    id: "usr-3",
    name: "Elena Bianchi",
    email: "elena@economiasemplice.it",
    handle: "elenab",
    role: "CREATOR",
    status: "ATTIVO",
    joinedDate: "Marzo 2026",
    publicationsCount: 1
  },
  {
    id: "usr-4",
    name: "Luca Verdi",
    email: "luca.verdi@gmail.com",
    handle: "lucav",
    role: "READER",
    status: "ATTIVO",
    joinedDate: "Maggio 2026",
    publicationsCount: 0
  }
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleChangeRole = (id: string, newRole: AdminUser["role"]) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
  };

  const handleToggleStatus = (id: string) => {
    setUsers(
      users.map((u) =>
        u.id === id ? { ...u, status: u.status === "ATTIVO" ? "SOSPESO" : "ATTIVO" } : u
      )
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.handle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gestione Utenti, Ruoli & Staff</h1>
          <p className="text-xs text-gray-500">
            Assegna ruoli SuperAdmin, Staff, abilita creator e gestisci le autorizzazioni della piattaforma.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">
            {filteredUsers.length} utenti visualizzati
          </span>
        </div>
      </div>

      {/* Filtri & Barra di Ricerca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, email o @handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "SUPERADMIN", "STAFF", "CREATOR", "READER"].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterRole === role
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {role === "ALL" ? "Tutti" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Tabella Utenti */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
          <thead className="bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Utente</th>
              <th className="px-6 py-3.5">Ruolo Piattaforma</th>
              <th className="px-6 py-3.5">Pubblicazioni</th>
              <th className="px-6 py-3.5">Stato</th>
              <th className="px-6 py-3.5">Iscrizione</th>
              <th className="px-6 py-3.5 text-right">Azioni Ruolo / Moderazione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/70 transition">
                {/* Nome & Email */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                      {u.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{u.name}</p>
                      <p className="text-[11px] text-gray-400">@{u.handle} &bull; {u.email}</p>
                    </div>
                  </div>
                </td>

                {/* Badge Ruolo */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      u.role === "SUPERADMIN"
                        ? "bg-rose-100 text-rose-800"
                        : u.role === "STAFF"
                        ? "bg-amber-100 text-amber-800"
                        : u.role === "CREATOR"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {u.role === "SUPERADMIN" && <ShieldAlert className="h-3 w-3" />}
                    {u.role === "STAFF" && <ShieldCheck className="h-3 w-3" />}
                    {u.role}
                  </span>
                </td>

                {/* Numero Pubblicazioni */}
                <td className="px-6 py-4 font-semibold text-gray-700">
                  {u.publicationsCount > 0 ? `${u.publicationsCount} attiva` : "—"}
                </td>

                {/* Stato */}
                <td className="px-6 py-4">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      u.status === "ATTIVO"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>

                {/* Data */}
                <td className="px-6 py-4 text-gray-500">{u.joinedDate}</td>

                {/* Azioni */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as AdminUser["role"])}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 focus:outline-none"
                    >
                      <option value="READER">Lettore</option>
                      <option value="CREATOR">Creator</option>
                      <option value="STAFF">Staff</option>
                      <option value="SUPERADMIN">SuperAdmin</option>
                    </select>

                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className={`rounded p-1.5 transition ${
                        u.status === "ATTIVO"
                          ? "text-red-600 hover:bg-red-50"
                          : "text-emerald-600 hover:bg-emerald-50"
                      }`}
                      title={u.status === "ATTIVO" ? "Sospendi utente" : "Riattiva utente"}
                    >
                      {u.status === "ATTIVO" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
