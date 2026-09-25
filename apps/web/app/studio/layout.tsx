"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PenSquare, LayoutDashboard, DollarSign, Users, Settings, Plus, ChevronDown, Check, ArrowLeft } from "lucide-react";

interface PublicationContext {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "EDITOR";
}

const userPublications: PublicationContext[] = [
  { id: "pub-1", name: "Tech & Futuro Italia", slug: "tech-italia", role: "OWNER" },
  { id: "pub-2", name: "Caffè Finanziario", slug: "caffe-finanza", role: "EDITOR" }
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const [currentPub, setCurrentPub] = useState<PublicationContext>(userPublications[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Studio Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Switcher Pubblicazioni Multi-Tenant */}
          <div className="relative pb-6 border-b border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Pubblicazione Attiva
            </span>

            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="mt-1 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-left text-xs font-bold text-gray-900 hover:bg-gray-100 transition"
            >
              <div className="truncate">
                <p className="truncate text-xs font-black">{currentPub.name}</p>
                <p className="text-[10px] text-gray-400 font-normal">Ruolo: {currentPub.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            </button>

            {/* Menu Tendina Switcher */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-20 z-50 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                <div className="space-y-1">
                  {userPublications.map((pub) => (
                    <button
                      key={pub.id}
                      onClick={() => {
                        setCurrentPub(pub);
                        setIsDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs hover:bg-gray-50"
                    >
                      <span className="font-semibold text-gray-800">{pub.name}</span>
                      {currentPub.id === pub.id && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-gray-100 mt-2 pt-2">
                  <Link
                    href="/studio/publications/new"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-1.5 rounded-lg p-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Crea Nuova Pubblicazione
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Voci di Navigazione Studio */}
          <nav className="mt-6 space-y-1">
            <Link
              href="/studio"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <LayoutDashboard className="h-4 w-4 text-gray-500" />
              Panoramica & Statistiche
            </Link>

            <Link
              href="/studio/posts/new"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-blue-600 bg-blue-50/50 hover:bg-blue-100 transition"
            >
              <PenSquare className="h-4 w-4 text-blue-600" />
              Scrivi Post o Newsletter
            </Link>

            <Link
              href="/studio/monetization"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <DollarSign className="h-4 w-4 text-gray-500" />
              Monetizzazione & Stripe
            </Link>

            <Link
              href="/studio/team"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <Users className="h-4 w-4 text-gray-500" />
              Squadra & Collaboratori
            </Link>
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="border-t border-gray-100 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Torna al portale pubblico
          </Link>
        </div>
      </aside>

      {/* Area Contenuto Studio */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
