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
        <AudioPlayer />
        <GdprBanner />
      </body>
    </html>
  );
}
