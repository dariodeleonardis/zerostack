import React from "react";
import Link from "next/link";
import { NavbarUser } from "./NavbarUser";
import { Wordmark } from "./Wordmark";

/** Testata: fascia d'inchiostro, marchio a sinistra, voci in maiuscoletto, filo zafferano sotto. */
export const Navbar: React.FC = () => {
  const item = "kicker text-paper-300 transition hover:text-saffron";
  return (
    <header className="sticky top-0 z-40 w-full border-b-[3px] border-saffron bg-ink text-paper">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="ZeroStack, pagina iniziale" className="shrink-0">
          <Wordmark />
        </Link>
        <nav aria-label="Sezioni" className="hidden items-center gap-7 md:flex">
          <Link href="/notes" className={item}>Note</Link>
          <Link href="/podcasts" className={item}>Podcast</Link>
          <Link href="/inbox" className={item}>Posta</Link>
        </nav>
        <NavbarUser />
      </div>
    </header>
  );
};
