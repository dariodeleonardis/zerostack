"use client";

import React, { useState } from "react";
import { User, Mail, AtSign, FileText, Save, Check } from "lucide-react";
import Link from "next/link";

export default function UserProfilePage() {
  const [name, setName] = useState("Dario De Leonardis");
  const [handle, setHandle] = useState("dario");
  const [email, setEmail] = useState("dario@zerostack.it");
  const [bio, setBio] = useState("Fondatore di ZeroStack. Appassionato di software libero, publishing e sovranità digitale.");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Il Tuo Profilo Personale</h1>
          <p className="text-xs text-gray-500">Gestisci le informazioni visualizzate nelle tue note, commenti e articoli.</p>
        </div>
        <Link
          href="/account/subscriptions"
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          Gestisci Abbonamenti &rarr;
        </Link>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
          <div className="h-16 w-16 rounded-full bg-blue-600 font-black text-white text-2xl flex items-center justify-center shadow-md">
            {name[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{name}</p>
            <p className="text-xs text-gray-400">@{handle}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Nome Completo</label>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 py-2 text-xs">
            <User className="h-4 w-4 text-gray-400 mr-2" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Handle Univoco (@username)</label>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 py-2 text-xs">
            <AtSign className="h-4 w-4 text-gray-400 mr-1" />
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="flex-1 bg-transparent text-gray-900 focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Email di Accesso</label>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 py-2 text-xs bg-gray-50">
            <Mail className="h-4 w-4 text-gray-400 mr-2" />
            <input
              type="email"
              value={email}
              disabled
              className="flex-1 bg-transparent text-gray-500 focus:outline-none cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Biografia Breve</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isSaved ? "Modifiche Salvate!" : "Salva Profilo"}
          </button>
        </div>
      </form>
    </div>
  );
}
