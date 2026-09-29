import React from "react";
import Link from "next/link";

export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Aggiornato al {updatedAt}</p>
      <h1 className="mt-2 text-3xl font-black text-gray-900">{title}</h1>
      <div className="prose prose-sm mt-8 max-w-none text-gray-700">{children}</div>
      <p className="mt-12 text-xs text-gray-500">
        <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/termini" className="underline">Termini</Link> ·{" "}
        <Link href="/cookie" className="underline">Cookie</Link>
      </p>
    </article>
  );
}
