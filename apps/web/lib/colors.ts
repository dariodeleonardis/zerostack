// Colori scelti dagli autori: qualunque combinazione scelgano, il testo deve restare leggibile.
// Contrasto calcolato come in WCAG 2.1 (luminanza relativa), soglia AA 4,5:1 per il testo.

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const INK = "#141210";
export const WHITE = "#FFFFFF";

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Inchiostro o bianco, quello che si legge meglio sopra `background`. */
export function readableOn(background: string): string {
  return contrast(INK, background) >= contrast(WHITE, background) ? INK : WHITE;
}

/**
 * Il colore dell'autore usato per un testo (link, titoletti) su `background`: se non regge 4,5:1
 * lo si scurisce (o schiarisce, su fondo scuro) a piccoli passi, mantenendo la tinta.
 */
export function textSafe(color: string, background: string, min = 4.5): string {
  let c = channels(color);
  const darken = luminance(background) > 0.18;
  for (let i = 0; i < 40 && contrast(toHex(c), background) < min; i++) {
    c = darken ? (c.map((v) => v * 0.9) as typeof c) : (c.map((v) => v + (255 - v) * 0.12) as typeof c);
  }
  const result = toHex(c);
  // Fondo di media luminanza: nessuna variante della tinta basta, si torna a inchiostro o bianco.
  return contrast(result, background) >= min ? result : readableOn(background);
}

export interface PublicationPalette {
  /** Colore principale scelto dall'autore: fondi pieni, pulsanti, filetti. */
  accent: string;
  /** Testo sopra il colore principale. */
  onAccent: string;
  /** Fondo della pagina scelto dall'autore. */
  bg: string;
  /** Testo sul fondo. */
  text: string;
  /** Colore principale reso leggibile come testo sul fondo. */
  accentText: string;
}

export function publicationPalette(accent: string | null | undefined, background: string | null | undefined): PublicationPalette {
  const a = accent && HEX_COLOR.test(accent) ? accent.toUpperCase() : INK;
  const bg = background && HEX_COLOR.test(background) ? background.toUpperCase() : "#FBF8F2";
  return { accent: a, onAccent: readableOn(a), bg, text: readableOn(bg), accentText: textSafe(a, bg) };
}

/** Le tre scelte di caratteri per una pubblicazione (campo Publication.fontStyle). */
export const PUBLICATION_FONTS = {
  bodoni: { label: "Editoriale", hint: "Titoli in Bodoni, testo serif", title: "font-display", body: "font-serif" },
  serif: { label: "Classico", hint: "Tutto in serif, da quotidiano", title: "font-serif", body: "font-serif" },
  sans: { label: "Moderno", hint: "Tutto senza grazie, essenziale", title: "font-sans", body: "font-sans" }
} as const;
export type PublicationFont = keyof typeof PUBLICATION_FONTS;

export function publicationFont(value: string | null | undefined) {
  return PUBLICATION_FONTS[(value && value in PUBLICATION_FONTS ? value : "bodoni") as PublicationFont];
}

/** Le variabili CSS che le pagine della pubblicazione leggono (--pub-*). */
export function paletteStyle(p: PublicationPalette): Record<string, string> {
  return {
    "--pub-accent": p.accent,
    "--pub-on-accent": p.onAccent,
    "--pub-bg": p.bg,
    "--pub-text": p.text,
    "--pub-accent-text": p.accentText
  };
}
