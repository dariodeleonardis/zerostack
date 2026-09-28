"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PenSquare } from "lucide-react";

interface Me {
  name: string;
  handle: string;
  role: string;
}

// Lato client: la barra sta nel layout comune e leggere la sessione sul server renderebbe dinamica ogni pagina.
export function NavbarUser() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setMe(data.user ?? null))
      .catch(() => setMe(null));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    window.location.assign("/");
  };

  if (me === undefined) return <div className="h-8 w-40" aria-hidden />;

  if (!me) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-xs font-semibold text-gray-700 transition hover:text-gray-900">
          Accedi
        </Link>
        <Link href="/register" className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700">
          Crea la tua newsletter
        </Link>
      </div>
    );
  }

  const isAdmin = me.role === "ADMIN" || me.role === "SUPERADMIN";
  return (
    <div className="flex items-center gap-3">
      {isAdmin && (
        <Link href="/admin" className="hidden items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-100 sm:inline-flex">
          Admin
        </Link>
      )}
      <Link href="/studio" className="text-xs font-semibold text-gray-700 transition hover:text-gray-900">
        Studio
      </Link>
      <Link href="/account/subscriptions" className="text-xs font-semibold text-gray-500 transition hover:text-gray-900">
        Abbonamenti
      </Link>
      <button type="button" onClick={logout} className="text-xs font-semibold text-gray-500 transition hover:text-gray-900">
        Esci
      </button>
      <Link
        href="/account/profile"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 transition hover:ring-2 hover:ring-blue-600"
        title={me.name}
      >
        {me.name.charAt(0).toUpperCase()}
      </Link>
      <Link href="/studio/posts/new" className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700">
        <PenSquare className="h-3.5 w-3.5" />
        <span>Scrivi</span>
      </Link>
    </div>
  );
}
