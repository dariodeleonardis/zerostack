"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenSquare } from "lucide-react";

interface Me {
  name: string;
  handle: string;
  role: string;
}

// Lato client: la barra sta nel layout comune e leggere la sessione sul server renderebbe dinamica ogni pagina.
export function NavbarUser() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [courtesy, setCourtesy] = useState(false);
  const pathname = usePathname();

  // Si rilegge a ogni cambio di pagina: il layout resta montato durante la navigazione, e leggendo
  // la sessione una volta sola la barra mostrava "Accedi" anche dopo il login, fino a un F5
  // (segnalato da Dario il 1/10).
  useEffect(() => {
    let attivo = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!attivo) return;
        setMe(data.user ?? null);
        setCourtesy(data.courtesy === true);
      })
      .catch(() => {
        if (attivo) setMe(null);
      });
    return () => {
      attivo = false;
    };
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    window.location.assign("/");
  };

  if (me === undefined) return <div className="h-8 w-40" aria-hidden />;

  if (!me) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm font-semibold text-paper-300 transition hover:text-saffron">
          Accedi
        </Link>
        <Link href="/register" className="rounded-full bg-saffron px-4 py-2 text-sm font-bold text-ink transition hover:bg-paper">
          <span className="sm:hidden">Inizia</span>
          <span className="hidden sm:inline">Apri la tua pubblicazione</span>
        </Link>
      </div>
    );
  }

  const isAdmin = me.role === "ADMIN" || me.role === "SUPERADMIN";
  return (
    <div className="flex items-center gap-3">
      {isAdmin && courtesy && (
        <Link
          href="/admin"
          title="I visitatori vedono la pagina di cortesia. Si spegne dal pannello di amministrazione."
          className="rounded-full bg-saffron px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-paper"
        >
          Sito chiuso ai visitatori
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className="hidden items-center rounded-full border border-paper-300/40 px-2.5 py-1 text-xs font-bold text-paper transition hover:border-saffron hover:text-saffron sm:inline-flex">
          Admin
        </Link>
      )}
      <Link href="/studio" className="text-sm font-semibold text-paper transition hover:text-saffron">
        Studio
      </Link>
      <Link href="/account/subscriptions" className="hidden text-sm font-semibold text-paper-300 transition hover:text-saffron lg:inline">
        Abbonamenti
      </Link>
      <button type="button" onClick={logout} className="text-sm font-semibold text-paper-300 transition hover:text-saffron">
        Esci
      </button>
      <Link
        href="/account/profile"
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-saffron bg-ink-700 font-display text-sm font-bold text-paper transition hover:bg-saffron hover:text-ink"
        title={me.name}
      >
        {me.name.charAt(0).toUpperCase()}
      </Link>
      <Link href="/studio/posts/new" aria-label="Scrivi" className="flex items-center gap-1.5 rounded-full bg-saffron px-4 py-2 text-sm font-bold text-ink transition hover:bg-paper">
        <PenSquare className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Scrivi</span>
      </Link>
    </div>
  );
}
