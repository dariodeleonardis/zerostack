import React from "react";
import Link from "next/link";
import { Inbox, CheckCircle2, BookOpen, Clock } from "lucide-react";

const feedItems = [
  {
    id: "post-1",
    publication: "Tech & Futuro Italia",
    publicationSlug: "tech-italia",
    title: "Perché l'ecosistema creator italiano ha bisogno di un'alternativa a Substack",
    date: "Oggi alle 08:30",
    readTime: "4 min",
    excerpt: "Analisi delle criticità dei modelli a percentuale fissa e l'importanza della fattura elettronica per i lettori B2B italiani...",
    isRead: false
  },
  {
    id: "post-2",
    publication: "Caffè Finanziario",
    publicationSlug: "caffe-finanza",
    title: "Tassi BCE, inflazione e scenari per le imprese italiane nell'autunno 2026",
    date: "Ieri",
    readTime: "6 min",
    excerpt: "L'impatto delle recenti decisioni di Francoforte sui mutui e sui finanziamenti aziendali...",
    isRead: true
  }
];

export default function InboxPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">La Tua Posta</h1>
            <p className="text-xs text-gray-500">Tutti i post e le newsletter delle pubblicazioni a cui sei iscritto.</p>
          </div>
        </div>

        <button className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" /> Segna tutti come letti
        </button>
      </div>

      <div className="space-y-4">
        {feedItems.map((item) => (
          <Link
            key={item.id}
            href={`/p/${item.publicationSlug}/alternativa-italiana-a-substack`}
            className={`block rounded-2xl border p-5 transition hover:border-blue-300 hover:shadow-sm ${
              item.isRead ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50/20"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-bold text-blue-600">{item.publication}</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {item.date}
                </span>
                <span>&bull;</span>
                <span>{item.readTime}</span>
              </div>
            </div>

            <h2 className="mt-2 text-lg font-bold text-gray-900">{item.title}</h2>
            <p className="mt-1 text-xs text-gray-600 line-clamp-2 leading-relaxed">{item.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
