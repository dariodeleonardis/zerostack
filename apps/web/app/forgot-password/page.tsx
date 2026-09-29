"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Richiesta non riuscita");
      else setMessage(data.message);
    } catch {
      setError("Connessione non riuscita. Riprova.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-black text-gray-900">Password dimenticata</h1>
      <p className="mt-1 text-xs text-gray-500">Ti mandiamo un link per sceglierne una nuova.</p>
      {message ? (
        <p role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          {message}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-700">Email dell&apos;account</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "Invio..." : "Mandami il link"}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-xs text-gray-500">
        <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700">Torna all&apos;accesso</Link>
      </p>
    </div>
  );
}
