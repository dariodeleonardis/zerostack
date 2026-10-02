"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Cookie, X } from "lucide-react";
import {
  CATEGORIES,
  CONSENT_OPEN_EVENT,
  OPTIONAL_SERVICES,
  TECHNICAL_COOKIES,
  activeCategories,
  needsConsentPrompt,
  readConsent,
  writeConsent,
  type ConsentCategory
} from "../lib/consent";

const button = "rounded-lg px-3.5 py-2 text-xs font-semibold transition";
// Rifiutare deve essere facile quanto accettare: stessi pulsanti, stesso peso.
const choice = `${button} border border-gray-900 bg-gray-900 text-white hover:bg-gray-700`;
const secondary = `${button} border border-gray-300 bg-white text-gray-900 hover:bg-gray-50`;

/** Apre il pannello delle preferenze da qualunque punto della pagina (piè di pagina, /cookie). */
export function CookiePreferencesButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      {children ?? "Preferenze cookie"}
    </button>
  );
}

export function CookieConsent() {
  const active = activeCategories();
  const [banner, setBanner] = useState(false);
  const [panel, setPanel] = useState(false);
  const [selected, setSelected] = useState<ConsentCategory[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // La vecchia versione salvava "ho capito" in localStorage: non serve più.
    try {
      localStorage.removeItem("zerostack_gdpr_consent");
    } catch {}
    const state = readConsent();
    setSelected(state?.granted ?? []);
    setBanner(needsConsentPrompt(state));
    const open = () => {
      setSelected(readConsent()?.granted ?? []);
      setPanel(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!panel) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const save = useCallback((granted: ConsentCategory[]) => {
    const before = readConsent()?.granted ?? [];
    writeConsent(granted);
    setBanner(false);
    setPanel(false);
    // Uno script già caricato non si scarica: se si revoca qualcosa si ricarica la pagina.
    if (before.some((g) => !granted.includes(g))) window.location.reload();
  }, []);

  const toggle = (id: ConsentCategory) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      {banner && !panel && (
        <aside aria-label="Cookie" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          <button type="button" aria-label="Chiudi e rifiuta i cookie facoltativi" onClick={() => save([])} className="absolute right-3 top-3 text-gray-400 hover:text-gray-900">
            <X className="h-4 w-4" />
          </button>
          <p className="pr-6 text-sm font-semibold text-gray-900">Cookie</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Usiamo cookie tecnici, necessari al sito, e con il tuo consenso anche cookie di{" "}
            {active.map((id) => CATEGORIES.find((c) => c.id === id)?.label.toLowerCase()).join(", ")}. Puoi cambiare idea quando vuoi da &quot;Preferenze cookie&quot; in fondo alla
            pagina. <a href="/cookie" className="underline">Dettagli</a>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={choice} onClick={() => save([])}>Rifiuta</button>
            <button type="button" className={choice} onClick={() => save(active)}>Accetta</button>
            <button type="button" className={secondary} onClick={() => setPanel(true)}>Scegli</button>
          </div>
        </aside>
      )}

      {panel && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setPanel(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-panel-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="cookie-panel-title" className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Cookie className="h-5 w-5" /> Preferenze cookie
              </h2>
              <button type="button" aria-label="Chiudi" onClick={() => setPanel(false)} className="text-gray-400 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <section className="mt-4 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Necessari</p>
                <span className="text-xs font-medium text-gray-500">Sempre attivi</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">Servono a far funzionare il sito e non richiedono consenso.</p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                {TECHNICAL_COOKIES.map((c) => (
                  <li key={c.name}>
                    <code className="text-gray-900">{c.name}</code>: {c.purpose} ({c.duration})
                  </li>
                ))}
              </ul>
            </section>

            {CATEGORIES.map((cat) => {
              const services = OPTIONAL_SERVICES.filter((s) => s.category === cat.id);
              const inUse = services.length > 0;
              return (
                <section key={cat.id} className="mt-3 rounded-lg border border-gray-200 p-3">
                  <label className={`flex items-center justify-between gap-3 ${inUse ? "cursor-pointer" : ""}`}>
                    <span className="text-sm font-semibold text-gray-900">{cat.label}</span>
                    {inUse ? (
                      <input type="checkbox" className="h-4 w-4" checked={selected.includes(cat.id)} onChange={() => toggle(cat.id)} />
                    ) : (
                      <span className="text-xs font-medium text-gray-400">Non in uso</span>
                    )}
                  </label>
                  <p className="mt-1 text-xs text-gray-600">{cat.description}</p>
                  {inUse && (
                    <p className="mt-1 text-xs text-gray-500">
                      Servizi: {services.map((s) => `${s.name} (${s.provider})`).join(", ")}
                    </p>
                  )}
                </section>
              );
            })}

            {active.length === 0 ? (
              <>
                <p className="mt-4 text-xs text-gray-600">ZeroStack oggi usa solo cookie tecnici: non c&apos;è niente da accettare né da rifiutare.</p>
                <div className="mt-3 flex justify-end">
                  <button type="button" className={secondary} onClick={() => setPanel(false)}>Chiudi</button>
                </div>
              </>
            ) : (
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" className={choice} onClick={() => save([])}>Rifiuta tutti</button>
                <button type="button" className={choice} onClick={() => save(active)}>Accetta tutti</button>
                <button type="button" className={secondary} onClick={() => save(selected.filter((s) => active.includes(s)))}>Salva le scelte</button>
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500">
              <a href="/cookie" className="underline">Informativa sui cookie</a> · <a href="/privacy" className="underline">Privacy</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
