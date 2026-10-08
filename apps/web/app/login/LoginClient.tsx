"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { safeNext } from "../../lib/safe-next";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

// Solo percorsi interni: "//altro-sito.it" o "https://..." porterebbero l'utente fuori dopo il login.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Accesso non riuscito");
        return;
      }
      router.push(safeNext(searchParams.get("next"), "/studio"));
      router.refresh();
    } catch {
      setError("Connessione non riuscita. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-ink">Email</label>
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

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-ink">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base focus:border-ink focus:outline-none"
          required
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-ink-700 transition disabled:opacity-50"
      >
        <LogIn className="h-4 w-4" />
        {isSubmitting ? "Accesso in corso..." : "Accedi"}
      </button>
    </form>
  );
}

export default function LoginClient({ google }: { google?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Accedi a ZeroStack</h1>
      <p className="mt-1 text-xs text-gray-500">Per scrivere, gestire le tue pubblicazioni e i tuoi abbonamenti.</p>
      {google}
      {/* useSearchParams richiede un confine Suspense nelle pagine statiche di Next 14 */}
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-xs text-gray-500">
        <Link href="/forgot-password" className="font-bold text-gray-700 hover:text-gray-900">Password dimenticata?</Link>
      </p>
      <p className="mt-2 text-center text-xs text-gray-500">
        Non hai un account? <Link href="/register" className="font-bold text-ink-600 hover:text-ink-700">Registrati</Link>
      </p>
    </div>
  );
}
