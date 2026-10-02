import type { Metadata } from "next";
import { Archivo, Bodoni_Moda, Newsreader } from "next/font/google";
import "./globals.css";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { CookieConsent } from "../components/CookieConsent";
import { AudioPlayer } from "../components/AudioPlayer";

// next/font scarica i caratteri durante la build e li serve dal nostro dominio:
// nessuna richiesta a Google dal browser dei lettori, quindi niente cookie né IP a terzi.
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap", style: ["normal", "italic"], adjustFontFallback: false });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", style: ["normal", "italic"], adjustFontFallback: false });

export const metadata: Metadata = {
  title: "ZeroStack: newsletter, blog e podcast indipendenti",
  description: "La piattaforma italiana per chi scrive: newsletter, articoli e podcast con zero commissioni e fattura elettronica inclusa."
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${archivo.variable} ${bodoni.variable} ${newsreader.variable}`}>
      <body className="flex min-h-screen flex-col pb-20">
        <a href="#contenuto" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-saffron focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-ink">
          Vai al contenuto
        </a>
        <Navbar />
        <main id="contenuto" className="flex-1">{children}</main>
        <Footer />
        <AudioPlayer />
        <CookieConsent />
      </body>
    </html>
  );
}
