"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Richiesta non riuscita");
        setNotFound(data.code === "not_found");
      } else setMessage(data.message);
    } catch {
      setError("Connessione non riuscita. Riprova.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Password dimenticata</h1>
      <p className="mt-1 text-xs text-gray-500">Ti mandiamo un link per sceglierne una nuova.</p>
      {message ? (
        <p role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          {message}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-ink">Email dell&apos;account</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base focus:border-ink focus:outline-none"
              required
            />
          </div>
          {error && (
            <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              <p>{error}</p>
              {notFound && (
                <Link href="/register" className="mt-1 inline-block font-bold text-ink underline underline-offset-2">
                  Crea un account
                </Link>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-ink-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-ink-700 disabled:opacity-50"
          >
            {pending ? "Invio..." : "Mandami il link"}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-xs text-gray-500">
        <Link href="/login" className="font-bold text-ink-600 hover:text-ink-700">Torna all&apos;accesso</Link>
      </p>
    </div>
  );
}
