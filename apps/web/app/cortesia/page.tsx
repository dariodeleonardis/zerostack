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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-gradient-to-b from-white to-blue-50 px-6 py-12">
      <div className="max-w-xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white shadow-md">
          Z
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">ZeroStack sta arrivando</h1>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-gray-600">{message}</p>
        <p className="mt-10 text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-gray-700">Privacy</Link> ·{" "}
          <Link href="/termini" className="hover:text-gray-700">Termini</Link> ·{" "}
          <Link href="/login" className="hover:text-gray-700">Accesso riservato</Link>
        </p>
      </div>
    </div>
  );
}
