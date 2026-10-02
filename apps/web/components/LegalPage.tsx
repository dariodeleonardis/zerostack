import React from "react";
import Link from "next/link";

/** Pagine legali: impaginate come un documento, testo serif a misura di lettura. */
export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="kicker text-saffron-800">Aggiornato al {updatedAt}</p>
      <h1 className="mt-3 border-b-[3px] border-ink pb-5 font-display text-5xl font-extrabold tracking-tight text-ink">{title}</h1>
      <div className="prose prose-lg mt-8 max-w-none font-serif text-ink prose-headings:font-display prose-headings:font-extrabold prose-headings:tracking-tight prose-a:text-ink prose-a:decoration-saffron prose-a:decoration-2 prose-a:underline-offset-4 prose-strong:text-ink prose-th:font-sans prose-td:font-sans prose-td:text-base">
        {children}
      </div>
      <p className="mt-14 border-t border-ink pt-4 text-sm text-gray-600">
        <Link href="/privacy" className="underline underline-offset-4">Privacy</Link> · <Link href="/termini" className="underline underline-offset-4">Termini</Link> ·{" "}
        <Link href="/cookie" className="underline underline-offset-4">Cookie</Link>
      </p>
    </article>
  );
}
