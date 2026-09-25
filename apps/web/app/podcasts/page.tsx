"use client";

import React from "react";
import { Play, Clock, Calendar, Radio, Share2 } from "lucide-react";

interface Episode {
  id: string;
  title: string;
  publicationName: string;
  description: string;
  audioUrl: string;
  durationFormatted: string;
  durationSeconds: number;
  publishedDate: string;
  episodeNumber: number;
}

const episodes: Episode[] = [
  {
    id: "ep-1",
    title: "Ep. 01: L'evoluzione dell'AI applicata allo sviluppo web e il self-hosting",
    publicationName: "Tech & Futuro Italia",
    description: "In questa prima puntata analizziamo perché i creator e le aziende stanno tornando ad adottare soluzioni self-hosted su VPS con Docker, evitando il lock-in delle piattaforme centralizzate americane.",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    durationFormatted: "6 min 12 sec",
    durationSeconds: 372,
    publishedDate: "25 Settembre 2026",
    episodeNumber: 1
  },
  {
    id: "ep-2",
    title: "Ep. 02: Gestione fiscale, Partita IVA e fatturazione elettronica per creator",
    publicationName: "Caffè Finanziario",
    description: "Guida pratica a SDI, PEC e detrazione dei costi di abbonamento per professionisti e PMI in Italia.",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    durationFormatted: "7 min 40 sec",
    durationSeconds: 460,
    publishedDate: "20 Settembre 2026",
    episodeNumber: 2
  }
];

export default function PodcastsPage() {
  const handlePlay = (ep: Episode) => {
    const event = new CustomEvent("zerostack:play-audio", {
      detail: {
        title: ep.title,
        publicationName: ep.publicationName,
        audioUrl: ep.audioUrl,
        durationSeconds: ep.durationSeconds
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
          <Radio className="h-3.5 w-3.5" /> Podcast & Audio
        </div>
        <h1 className="mt-3 text-3xl font-black text-gray-900">Episodi Podcast</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ascolta i podcast delle tue pubblicazioni preferite. Puoi continuare la riproduzione mentre navighi o leggi articoli.
        </p>
      </div>

      <div className="space-y-6">
        {episodes.map((ep) => (
          <div
            key={ep.id}
            className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                <span className="text-purple-600 font-bold">{ep.publicationName}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {ep.publishedDate}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {ep.durationFormatted}
                </span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-gray-900">{ep.title}</h2>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed sm:text-sm">{ep.description}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePlay(ep)}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-purple-600/20 transition hover:bg-purple-700"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Ascolta</span>
              </button>
              <button className="rounded-xl border border-gray-200 p-3 text-gray-500 hover:bg-gray-50">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
