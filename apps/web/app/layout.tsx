import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "../components/Navbar";
import { GdprBanner } from "../components/GdprBanner";
import { AudioPlayer } from "../components/AudioPlayer";

export const metadata: Metadata = {
  title: "ZeroStack - La Piattaforma di Newsletter e Publishing Indipendente",
  description: "La vera alternativa italiana a Substack per creator, giornalisti e aziende. 0% commissioni, supporto nativo a fatturazione elettronica (SDI/PEC), podcast e sovranità dei dati."
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen pb-20">
        <Navbar />
        <main>{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-xs text-gray-500 sm:px-6">
          <a href="/privacy" className="hover:text-gray-900">Privacy</a> · <a href="/termini" className="hover:text-gray-900">Termini</a> ·{" "}
          <a href="/cookie" className="hover:text-gray-900">Cookie</a>
        </footer>
        <AudioPlayer />
        <GdprBanner />
      </body>
    </html>
  );
}
