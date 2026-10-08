/** @type {import('tailwindcss').Config} */
// Stile ZeroStack (2/10/2026, direzione «Zafferano» con la griglia di «Milano 1964»):
// inchiostro, carta e zafferano; Bodoni Moda per i titoli, Archivo per il resto; angoli piccoli,
// filetti al posto delle ombre. Il giallo è un fondo o un segno, mai il colore di un testo su carta:
// per il testo c'è saffron-800, che regge il contrasto AA.
// Le pagine delle pubblicazioni usano invece i colori scelti dall'autore (variabili --pub-*).
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/*/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#141210",
          300: "#8F877B",
          400: "#6B6458",
          500: "#4A443B",
          600: "#2A2621",
          700: "#3A342C",
          800: "#1F1C18",
          900: "#141210",
          950: "#0B0A09"
        },
        paper: {
          DEFAULT: "#F6F1E7",
          50: "#FBF8F2",
          100: "#F6F1E7",
          200: "#ECE4D4",
          300: "#D9CFBC"
        },
        saffron: {
          DEFAULT: "#F2B705",
          50: "#FDF6DC",
          100: "#FBEAB0",
          200: "#F8DA75",
          300: "#F5C93D",
          400: "#F2B705",
          500: "#F2B705",
          600: "#D9A204",
          700: "#A87D00",
          800: "#7A5800",
          900: "#4D3800"
        },
        // Grigi caldi, intonati alla carta (i grigi freddi di serie stonavano col giallo).
        gray: {
          50: "#FAF8F4",
          100: "#F2EEE6",
          200: "#E4DED2",
          300: "#CFC7B8",
          400: "#A39A8A",
          500: "#7A7265",
          600: "#5E574C",
          700: "#474138",
          800: "#2F2A24",
          900: "#1C1915"
        }
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "Archivo", "system-ui", "sans-serif"],
        display: ["var(--font-bodoni)", "Bodoni Moda", "Didot", "Georgia", "serif"],
        serif: ["var(--font-newsreader)", "Newsreader", "Georgia", "serif"]
      },
      borderRadius: {
        lg: "4px",
        xl: "6px",
        "2xl": "8px",
        "3xl": "12px"
      },
      boxShadow: {
        sm: "0 1px 0 rgba(20, 18, 16, 0.05)",
        md: "0 2px 0 rgba(20, 18, 16, 0.08)",
        lg: "0 8px 24px rgba(20, 18, 16, 0.10)",
        xl: "0 12px 32px rgba(20, 18, 16, 0.14)",
        "2xl": "0 20px 48px rgba(20, 18, 16, 0.18)"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};
