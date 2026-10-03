"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HEX_COLOR, PUBLICATION_FONTS, contrast, paletteStyle, publicationFont, publicationPalette, type PublicationFont } from "../../../lib/colors";

// Abbinamenti pronti: colori di tradizione italiana, tutti già verificati per la leggibilità.
const PRESETS = [
  { name: "Zafferano", primaryColor: "#F2B705", backgroundColor: "#FBF8F2" },
  { name: "Rosso pompeiano", primaryColor: "#A8322D", backgroundColor: "#F6F1E7" },
  { name: "Verde bottiglia", primaryColor: "#1F4D3A", backgroundColor: "#F4F1E8" },
  { name: "Blu Savoia", primaryColor: "#1C3F94", backgroundColor: "#FFFFFF" },
  { name: "Terracotta", primaryColor: "#B4532A", backgroundColor: "#F3EDE2" },
  { name: "Inchiostro", primaryColor: "#141210", backgroundColor: "#FFFFFF" },
  { name: "Notte", primaryColor: "#F2B705", backgroundColor: "#141210" }
];

interface Appearance {
  primaryColor: string;
  backgroundColor: string;
  fontStyle: string;
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const valid = HEX_COLOR.test(text);
  // Il campo di testo segue il selettore, e viceversa quando il codice è completo.
  React.useEffect(() => setText(value), [value]);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input type="color" aria-label={`${label}: selettore`} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1" />
        <input
          id={id}
          value={text}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!valid}
          onChange={(e) => {
            const v = e.target.value.trim().toUpperCase();
            setText(v);
            if (HEX_COLOR.test(v)) onChange(v);
          }}
          className={`w-32 rounded-lg border bg-white px-3 py-2.5 font-mono text-base uppercase focus:outline-none ${valid ? "border-gray-300 focus:border-ink" : "border-rose-400"}`}
        />
      </div>
      {!valid && <p className="mt-1 text-sm text-rose-700">Scrivi il colore come #RRGGBB</p>}
    </div>
  );
}

/** Un riquadro per pubblicazione: scelta dei colori e dei caratteri con l'anteprima accanto. */
export function AppearancePanel({ publicationId, name, description, initial }: { publicationId: string; name: string; description: string | null; initial: Appearance }) {
  const router = useRouter();
  const [value, setValue] = useState<Appearance>({ ...initial, fontStyle: initial.fontStyle in PUBLICATION_FONTS ? initial.fontStyle : "bodoni" });
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const palette = useMemo(() => publicationPalette(value.primaryColor, value.backgroundColor), [value.primaryColor, value.backgroundColor]);
  const font = publicationFont(value.fontStyle);
  const adjusted = palette.accentText !== palette.accent;
  const lowAccentContrast = contrast(palette.accent, palette.bg) < 1.5;

  const set = (patch: Partial<Appearance>) => {
    setValue((v) => ({ ...v, ...patch }));
    setNotice(null);
  };

  const save = async () => {
    setPending(true);
    setNotice(null);
    const res = await fetch(`/api/publications/${publicationId}/appearance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value)
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    setNotice(res.ok ? { ok: true, text: "Salvato. Le pagine della pubblicazione hanno già i nuovi colori." } : { ok: false, text: data.error ?? "Salvataggio non riuscito" });
    if (res.ok) router.refresh();
  };

  return (
    <section className="rounded-2xl border border-gray-300 bg-white p-6">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{name}</h2>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Abbinamenti pronti</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = p.primaryColor === value.primaryColor && p.backgroundColor === value.backgroundColor;
                return (
                  <button
                    key={p.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set({ primaryColor: p.primaryColor, backgroundColor: p.backgroundColor })}
                    className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-semibold transition ${active ? "border-ink" : "border-gray-200 hover:border-gray-400"}`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300" style={{ backgroundColor: p.backgroundColor }}>
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.primaryColor }} />
                    </span>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField id={`primary-${publicationId}`} label="Colore principale" value={value.primaryColor} onChange={(v) => set({ primaryColor: v })} />
            <ColorField id={`bg-${publicationId}`} label="Colore di fondo" value={value.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Caratteri</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(Object.keys(PUBLICATION_FONTS) as PublicationFont[]).map((key) => {
                const f = PUBLICATION_FONTS[key];
                const active = value.fontStyle === key;
                return (
                  <label key={key} className={`cursor-pointer rounded-xl border-2 p-3 transition ${active ? "border-ink" : "border-gray-200 hover:border-gray-400"}`}>
                    <input type="radio" name={`font-${publicationId}`} value={key} checked={active} onChange={() => set({ fontStyle: key })} className="sr-only" />
                    <span className={`block text-2xl font-extrabold ${f.title}`}>Aa</span>
                    <span className="mt-1 block text-sm font-bold">{f.label}</span>
                    <span className="block text-xs text-gray-600">{f.hint}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2 text-sm" aria-live="polite">
            {adjusted && (
              <p className="border-l-4 border-saffron bg-saffron-50 px-3 py-2">
                Sul fondo che hai scelto il colore principale si legge poco: per titoletti e link usiamo una sua versione più scura,{" "}
                <span className="font-mono">{palette.accentText}</span>. Testate e pulsanti restano nel tuo colore.
              </p>
            )}
            {lowAccentContrast && (
              <p className="border-l-4 border-rose-500 bg-rose-50 px-3 py-2 text-rose-900">
                Colore principale e fondo sono quasi uguali: la testata non si distinguerà dal resto della pagina.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={pending} className="rounded-full bg-ink px-6 py-3 text-base font-bold text-paper transition hover:bg-ink-700 disabled:opacity-50">
              {pending ? "Salvataggio…" : "Salva l'aspetto"}
            </button>
            {notice && (
              <p role="status" className={`text-sm font-semibold ${notice.ok ? "text-emerald-800" : "text-rose-700"}`}>
                {notice.text}
              </p>
            )}
          </div>
        </div>

        {/* Anteprima: la stessa impaginazione delle pagine pubbliche, in piccolo */}
        <div aria-label="Anteprima" className="overflow-hidden rounded-xl border border-gray-300" style={paletteStyle(palette) as React.CSSProperties}>
          <div className={`bg-[color:var(--pub-bg)] text-[color:var(--pub-text)] ${font.body}`}>
            <div className="bg-[color:var(--pub-accent)] px-5 pb-6 pt-7 text-[color:var(--pub-on-accent)]">
              <p className="kicker">Anteprima</p>
              <p className={`mt-1 text-3xl font-extrabold leading-none tracking-tight ${font.title}`}>{name}</p>
              {description && <p className="mt-3 line-clamp-2 text-base">{description}</p>}
            </div>
            <div className="px-5 py-5">
              <p className="kicker font-sans text-[color:var(--pub-accent-text)]">2 ottobre 2026 · 4 min di lettura</p>
              <p className={`mt-2 text-xl font-bold leading-snug ${font.title}`}>Il titolo del tuo prossimo articolo</p>
              <p className="mt-2 text-base leading-relaxed">
                Così si legge il testo dei tuoi articoli, con <span className="font-semibold text-[color:var(--pub-accent-text)] underline underline-offset-4">un link</span> nel mezzo.
              </p>
              <span className="mt-4 inline-block rounded-full bg-[color:var(--pub-accent)] px-5 py-2 font-sans text-sm font-bold text-[color:var(--pub-on-accent)] ring-2 ring-[color:var(--pub-text)]">
                Iscriviti gratis
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
