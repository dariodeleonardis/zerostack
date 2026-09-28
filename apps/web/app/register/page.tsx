"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { slugify } from "@zerostack/shared";

type FieldErrors = Partial<Record<"name" | "email" | "handle" | "password", string[]>>;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!handleTouched) setHandle(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, handle, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Registrazione non riuscita");
        setFields(data.fields ?? {});
        return;
      }
      router.push("/studio/publications/new");
      router.refresh();
    } catch {
      setError("Connessione non riuscita. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (key: keyof FieldErrors) =>
    fields[key]?.[0] ? <p className="mt-1 text-[11px] font-semibold text-rose-600">{fields[key]?.[0]}</p> : null;

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-black text-gray-900">Crea il tuo account</h1>
      <p className="mt-1 text-xs text-gray-500">
        Poi scegli il nome della tua newsletter: avrà un indirizzo tutto suo, tipo <strong>tuonome.zerostack.it</strong>.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="name" className="block text-xs font-bold text-gray-700">Nome e cognome</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
          {fieldError("name")}
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-bold text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
          {fieldError("email")}
        </div>

        <div>
          <label htmlFor="handle" className="block text-xs font-bold text-gray-700">Nome utente</label>
          <input
            id="handle"
            type="text"
            autoComplete="username"
            value={handle}
            onChange={(e) => {
              setHandleTouched(true);
              setHandle(e.target.value.toLowerCase());
            }}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold focus:border-blue-500 focus:outline-none"
            required
          />
          <p className="mt-1 text-[11px] text-gray-400">Lettere minuscole, numeri e trattini. Nessun altro potrà usarlo come indirizzo.</p>
          {fieldError("handle")}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-bold text-gray-700">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
          <p className="mt-1 text-[11px] text-gray-400">Almeno 10 caratteri.</p>
          {fieldError("password")}
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {isSubmitting ? "Creazione in corso..." : "Crea account"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Hai già un account? <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700">Accedi</Link>
      </p>
    </div>
  );
}
