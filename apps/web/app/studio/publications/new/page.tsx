"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Check, Globe } from "lucide-react";
import Link from "next/link";

export default function NewPublicationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0066FF");
  const [customDomain, setCustomDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/studio");
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
        <Link href="/studio" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Crea una Nuova Pubblicazione</h1>
          <p className="text-xs text-gray-500">
            Lancia una nuova newsletter, rivista o podcast indipendente su ZeroStack.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-gray-700">Nome della Pubblicazione</label>
          <input
            type="text"
            placeholder="Es. Cronache di Design & AI"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Indirizzo Web (Slug)</label>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 py-2 text-xs bg-gray-50">
            <span className="text-gray-400">zerostack.it/p/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 bg-transparent font-bold text-gray-900 focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Descrizione Breve / Tagline</label>
          <textarea
            placeholder="Spiega ai lettori di cosa parlerai e perché dovrebbero iscriversi..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Dominio Personalizzato (Opzionale)</label>
          <div className="mt-1 flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Es. newsletter.tuobrand.it"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            I certificati SSL sono emessi in automatico e gratuitamente dal server Caddy.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Colore Primario del Brand</label>
          <div className="mt-2 flex items-center gap-3">
            {["#0066FF", "#7E22CE", "#059669", "#DC2626", "#D97706", "#111827"].map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setPrimaryColor(color)}
                style={{ backgroundColor: color }}
                className={`h-7 w-7 rounded-full transition ${
                  primaryColor === color ? "ring-2 ring-offset-2 ring-gray-900" : ""
                }`}
              />
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {isSubmitting ? "Creazione in corso..." : "Lancia la tua Pubblicazione"}
          </button>
        </div>
      </form>
    </div>
  );
}
