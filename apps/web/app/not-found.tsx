import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-display text-8xl font-extrabold leading-none text-saffron-700">404</p>
      <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight">Questa pagina non c&apos;è.</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-gray-600">
        Forse l&apos;indirizzo è cambiato, o la pubblicazione non esiste più. Dalla prima pagina ritrovi tutto.
      </p>
      <Link href="/" className="mt-8 inline-flex rounded-full bg-ink px-7 py-3 text-base font-bold text-paper transition hover:bg-ink-700">
        Torna alla prima pagina
      </Link>
    </section>
  );
}
