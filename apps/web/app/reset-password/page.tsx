"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  // undefined finché la pagina non ha letto l'indirizzo, "" se il link non contiene il token.
  const [token, setToken] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Il token arriva nel link dell'email; letto nel browser per non rendere dinamica la pagina.
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Le due password non coincidono");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Cambio password non riuscito");
        setPending(false);
        return;
      }
      window.location.assign("/studio");
    } catch {
      setError("Connessione non riuscita. Riprova.");
      setPending(false);
    }
  };

  const input = "mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-black text-gray-900">Nuova password</h1>
      {token === "" ? (
        <p className="mt-6 text-sm text-gray-600">
          Link incompleto. <Link href="/forgot-password" className="font-bold text-blue-600">Chiedine uno nuovo</Link>.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-gray-700">Nuova password (almeno 10 caratteri)</label>
            <input id="password" type="password" autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className={input} required />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-bold text-gray-700">Ripeti la password</label>
            <input id="confirm" type="password" autoComplete="new-password" minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} required />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}{" "}
              {/non è valido|scaduto/.test(error) && <Link href="/forgot-password" className="underline">Chiedi un nuovo link</Link>}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !token}
            className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "Salvataggio..." : "Salva e accedi"}
          </button>
        </form>
      )}
    </div>
  );
}
