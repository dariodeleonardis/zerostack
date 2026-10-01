"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Check, Globe, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { normalizeSlugInput, suggestSlugs, trimSlug } from "@zerostack/shared";

type SlugState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; url: string }
  | { status: "unavailable"; message: string };

type FieldErrors = Partial<Record<"name" | "slug" | "description" | "customDomain" | "primaryColor", string[]>>;

export default function NewPublicationPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [rootDomain, setRootDomain] = useState("zerostack.it");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>({ status: "idle" });
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0066FF");
  const [customDomain, setCustomDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [created, setCreated] = useState<{ name: string; url: string } | null>(null);
  const [handle, setHandle] = useState<string | undefined>(undefined);
  // Disponibilità dei suggerimenti: true libero, false preso o riservato, assente = non ancora controllato.
  const [suggestionStatus, setSuggestionStatus] = useState<Record<string, boolean>>({});

  // Il titolo è libero; l'indirizzo no: dal titolo si propongono indirizzi brevi, senza articoli e
  // preposizioni (prima l'indirizzo era il titolo intero, troncato a metà parola).
  const suggestions = useMemo(() => suggestSlugs(name, handle), [name, handle]);

  // Serve un account: chi non ha fatto l'accesso va al login e poi torna qui.
  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (data.rootDomain) setRootDomain(data.rootDomain);
        if (data.user?.handle) setHandle(data.user.handle);
        if (res.status === 401) {
          router.replace("/login?next=/studio/publications/new");
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, [router]);

  // Lo slug come si salva: il trattino finale serve solo mentre si scrive la parola successiva.
  const finalSlug = trimSlug(slug);

  // Disponibilità dello slug mentre si scrive (con una breve attesa per non chiedere a ogni tasto).
  useEffect(() => {
    if (!finalSlug) {
      setSlugState({ status: "idle" });
      return;
    }
    setSlugState({ status: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/publications/slug-check?slug=${encodeURIComponent(finalSlug)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) =>
          setSlugState(data.available ? { status: "available", url: data.url } : { status: "unavailable", message: data.message })
        )
        .catch(() => {
          if (!controller.signal.aborted) setSlugState({ status: "idle" });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [finalSlug]);

  // Disponibilità di tutti i suggerimenti insieme, con una breve attesa mentre si scrive il titolo.
  useEffect(() => {
    if (suggestions.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      Promise.all(
        suggestions.map((candidate) =>
          fetch(`/api/publications/slug-check?slug=${encodeURIComponent(candidate)}`, { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => [candidate, Boolean(data.available)] as const)
        )
      )
        .then((entries) => setSuggestionStatus((prev) => ({ ...prev, ...Object.fromEntries(entries) })))
        .catch(() => undefined);
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [suggestions]);

  // Finché l'autore non sceglie da sé, l'indirizzo è il primo suggerimento libero.
  useEffect(() => {
    if (slugTouched) return;
    const firstFree = suggestions.find((candidate) => suggestionStatus[candidate] === true);
    setSlug(firstFree ?? suggestions[0] ?? "");
  }, [suggestions, suggestionStatus, slugTouched]);

  const handleNameChange = (val: string) => {
    setName(val);
  };

  const chooseSuggestion = (candidate: string) => {
    setSlugTouched(true);
    setSlug(candidate);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !finalSlug) return;

    setIsSubmitting(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch("/api/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: finalSlug,
          description: description || undefined,
          primaryColor,
          customDomain: customDomain || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/studio/publications/new");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Creazione non riuscita");
        setFields(data.fields ?? {});
        return;
      }
      setCreated({ name: data.publication.name, url: data.publication.url });
    } catch {
      setError("Connessione non riuscita. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (key: keyof FieldErrors) =>
    fields[key]?.[0] ? <p className="mt-1 text-[11px] font-semibold text-rose-600">{fields[key]?.[0]}</p> : null;

  if (created) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-2 text-emerald-800">
            <Check className="h-5 w-5" />
            <h1 className="text-xl font-black">«{created.name}» è online</h1>
          </div>
          <p className="mt-2 text-sm text-emerald-900">
            Il suo indirizzo è{" "}
            <a href={created.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline">
              {created.url.replace("https://", "")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            Alla prima visita il certificato HTTPS viene creato in automatico: può volerci qualche secondo.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/studio/posts/new" className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
            Scrivi il primo articolo
          </Link>
          <Link href="/studio" className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
            Vai allo Studio
          </Link>
        </div>
      </div>
    );
  }

  if (!authChecked) {
    return <p className="max-w-2xl mx-auto py-12 text-center text-xs text-gray-400">Caricamento...</p>;
  }

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

      <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-900">
        Il tuo account è già attivo. Se non hai ancora deciso nome e indirizzo, puoi creare la pubblicazione più
        tardi dallo Studio.{" "}
        <Link href="/studio" className="font-bold underline">
          Lo faccio dopo
        </Link>
      </p>

      <form onSubmit={handleCreate} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="name" className="block text-xs font-bold text-gray-700">Nome della Pubblicazione</label>
          <input
            id="name"
            type="text"
            placeholder="Es. Cronache di Design & AI"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
          {fieldError("name")}
        </div>

        <div>
          <label htmlFor="slug" className="block text-xs font-bold text-gray-700">Indirizzo della tua newsletter</label>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50">
            <span className="text-gray-400">https://</span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                // Spazi e caratteri non ammessi diventano trattini mentre si scrive (Dario, 1/10).
                setSlug(normalizeSlugInput(e.target.value));
              }}
              onBlur={() => setSlug((current) => trimSlug(current))}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-right font-bold text-gray-900 focus:outline-none"
              aria-describedby="slug-status"
              required
            />
            <span className="text-gray-400">.{rootDomain}</span>
          </div>
          <p id="slug-status" aria-live="polite" className="mt-1 min-h-[16px] text-[11px] font-semibold">
            {slugState.status === "checking" && <span className="text-gray-400">Controllo in corso...</span>}
            {slugState.status === "available" && (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="h-3 w-3" /> Disponibile: {slugState.url.replace("https://", "")}
              </span>
            )}
            {slugState.status === "unavailable" && (
              <span className="inline-flex items-center gap-1 text-rose-600">
                <X className="h-3 w-3" /> {slugState.message}
              </span>
            )}
          </p>
          {suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-gray-500">
                Indirizzi brevi suggeriti dal nome (più facili da ricordare e da trovare):
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-label="Indirizzi suggeriti">
                {suggestions.map((candidate) => {
                  const status = suggestionStatus[candidate];
                  const selected = candidate === slug;
                  return (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => chooseSuggestion(candidate)}
                      disabled={status === false}
                      aria-pressed={selected}
                      title={status === false ? "Già in uso" : `${candidate}.${rootDomain}`}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : status === false
                            ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 line-through"
                            : "border-gray-300 bg-white text-gray-800 hover:border-blue-500 hover:text-blue-700"
                      }`}
                    >
                      {status === true && !selected && <Check className="h-3 w-3 text-emerald-600" />}
                      {status === false && <X className="h-3 w-3" />}
                      {candidate}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {fieldError("slug")}
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-bold text-gray-700">Descrizione Breve / Tagline</label>
          <textarea
            id="description"
            placeholder="Spiega ai lettori di cosa parlerai e perché dovrebbero iscriversi..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={250}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
          {fieldError("description")}
        </div>

        <div>
          <label htmlFor="customDomain" className="block text-xs font-bold text-gray-700">Dominio Personalizzato (Opzionale)</label>
          <div className="mt-1 flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            <input
              id="customDomain"
              type="text"
              placeholder="Es. newsletter.tuobrand.it"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Il dominio si attiva dopo la verifica. Intanto la newsletter è raggiungibile al suo indirizzo .{rootDomain}.
          </p>
          {fieldError("customDomain")}
        </div>

        <div>
          <span className="block text-xs font-bold text-gray-700">Colore Primario del Brand</span>
          <div className="mt-2 flex items-center gap-3">
            {["#0066FF", "#7E22CE", "#059669", "#DC2626", "#D97706", "#111827"].map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setPrimaryColor(color)}
                style={{ backgroundColor: color }}
                aria-label={`Colore ${color}`}
                aria-pressed={primaryColor === color}
                className={`h-7 w-7 rounded-full transition ${
                  primaryColor === color ? "ring-2 ring-offset-2 ring-gray-900" : ""
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || slugState.status === "unavailable"}
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
