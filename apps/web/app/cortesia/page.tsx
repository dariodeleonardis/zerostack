import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_COURTESY_MESSAGE, getCourtesy } from "../../lib/courtesy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ZeroStack - In arrivo",
  robots: { index: false, follow: false }
};

/**
 * Pagina di cortesia: la mostra il middleware a chi non è amministratore finché è accesa dal pannello /admin.
 * Copre a schermo intero barra e piè di pagina del layout, che altrimenti offrirebbero registrazione e Studio.
 */
export default async function CourtesyPage() {
  const message = await getCourtesy()
    .then((c) => c.message)
    .catch(() => DEFAULT_COURTESY_MESSAGE);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-ink text-paper">
      <div className="h-2 shrink-0 bg-saffron" />
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="max-w-2xl text-center">
          <div className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-full border-[8px] border-saffron bg-ink-700">
            <span className="font-display text-5xl leading-none">
              <span className="font-extrabold">Z</span>
              <span className="italic">S</span>
              <span className="text-saffron">.</span>
            </span>
          </div>
          <p className="kicker mt-8 text-saffron">Newsletter · Blog · Podcast</p>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            ZeroStack sta arrivando
          </h1>
          <p className="mx-auto mt-6 max-w-xl whitespace-pre-line text-lg leading-relaxed text-paper-300">{message}</p>
          <p className="mt-12 text-sm text-ink-300">
            <Link href="/privacy" className="underline-offset-4 hover:text-saffron hover:underline">Privacy</Link> ·{" "}
            <Link href="/termini" className="underline-offset-4 hover:text-saffron hover:underline">Termini</Link> ·{" "}
            <Link href="/login" className="underline-offset-4 hover:text-saffron hover:underline">Accesso riservato</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
