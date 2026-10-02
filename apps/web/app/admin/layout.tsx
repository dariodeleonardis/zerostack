import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert, Users, Layers, ArrowLeft, BarChart3 } from "lucide-react";
import { isPlatformAdmin, requireUser } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Chi non è amministratore non deve nemmeno sapere che il pannello esiste: 404, non 403.
  const user = await requireUser("/admin");
  if (!isPlatformAdmin(user)) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar SuperAdmin & Staff */}
      <aside className="w-64 border-r border-gray-200 bg-white p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Header con Badge SuperAdmin */}
          <div className="flex items-center gap-2.5 pb-6 border-b border-gray-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm font-extrabold">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-sm font-extrabold text-gray-900">ZeroStack Admin</h2>
              <span className="inline-block rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                Amministrazione
              </span>
            </div>
          </div>

          {/* Voci di Navigazione */}
          <nav className="mt-6 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <BarChart3 className="h-4 w-4 text-gray-500" />
              Panoramica
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <Users className="h-4 w-4 text-gray-500" />
              Utenti
            </Link>

            <Link
              href="/admin/publications"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <Layers className="h-4 w-4 text-gray-500" />
              Pubblicazioni
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

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
