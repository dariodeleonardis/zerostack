import React from "react";
import Link from "next/link";
import { NavbarUser } from "./NavbarUser";
import { Wordmark } from "./Wordmark";

/**
 * Testata: fascia d'inchiostro, marchio a sinistra, filo zafferano sotto. Le voci Note, Podcast e
 * Posta sono state tolte il 2/10: erano pagine finte. Tornano qui quando esistono davvero.
 */
export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b-[3px] border-saffron bg-ink text-paper">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="ZeroStack, pagina iniziale" className="shrink-0">
          <Wordmark />
        </Link>
        <NavbarUser />
      </div>
    </header>
  );
};
