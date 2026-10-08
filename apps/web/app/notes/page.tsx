import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@zerostack/database";
import { getCurrentUser } from "../../lib/auth";
import { followedPublicationIds } from "../../lib/inbox";
import { notesFeed, writablePublications } from "../../lib/notes";
import { NoteCard, PLATFORM_PALETTE } from "./NoteCard";
import { NoteComposer } from "./NoteClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Note | ZeroStack", description: "Le note brevi degli autori di ZeroStack." };

/**
 * Feed delle note. Chi è entrato vede di serie quelle delle pubblicazioni che segue o di cui fa
 * parte ("Seguite"), con la scheda "Tutte"; chi non è entrato vede tutte. ?pubblicazione=slug
 * mostra solo quella, ?prima= la pagina successiva.
 */
export default async function NotesPage({ searchParams }: { searchParams: { tutte?: string; prima?: string; pubblicazione?: string } }) {
  const user = await getCurrentUser();
  const before = searchParams.prima ? new Date(searchParams.prima) : undefined;
  const validBefore = before && !Number.isNaN(before.getTime()) ? before : undefined;

  const onePublication = searchParams.pubblicazione
    ? await prisma.publication.findFirst({ where: { slug: searchParams.pubblicazione, suspendedAt: null }, select: { id: true, name: true, slug: true } })
    : null;
  const writable = user ? await writablePublications(user.id) : [];
  let tab: "seguite" | "tutte" | "una" = onePublication ? "una" : user && !searchParams.tutte ? "seguite" : "tutte";
  let publicationIds: string[] | undefined = onePublication ? [onePublication.id] : undefined;
  if (tab === "seguite" && user) {
    const followed = await followedPublicationIds(user);
    const member = await prisma.publicationMember.findMany({ where: { userId: user.id }, select: { publicationId: true } });
    publicationIds = Array.from(new Set([...followed, ...member.map((m) => m.publicationId)]));
    if (publicationIds.length === 0) tab = "tutte";
    if (tab === "tutte") publicationIds = undefined;
  }
  const { notes, next } = await notesFeed({ viewerId: user?.id, publicationIds, before: validBefore });
  const moderated = new Set(writable.map((p) => p.id));
  const query = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    if (tab === "tutte" && user) params.set("tutte", "1");
    if (onePublication) params.set("pubblicazione", onePublication.slug);
    const s = params.toString();
    return s ? `/notes?${s}` : "/notes";
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6" style={PLATFORM_PALETTE}>
      <div className="border-b-[3px] border-ink pb-5">
        <p className="kicker text-saffron-800">{onePublication ? onePublication.name : "Dalle pubblicazioni"}</p>
        <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight">Note</h1>
        {user && !onePublication && (
          <nav className="mt-5 flex gap-2 text-sm font-bold" aria-label="Quali note">
            <Link href="/notes" aria-current={tab === "seguite" ? "page" : undefined} className={`rounded-full px-4 py-1.5 ${tab === "seguite" ? "bg-ink text-paper" : "border-2 border-ink"}`}>
              Seguite
            </Link>
            <Link href="/notes?tutte=1" aria-current={tab === "tutte" ? "page" : undefined} className={`rounded-full px-4 py-1.5 ${tab === "tutte" ? "bg-ink text-paper" : "border-2 border-ink"}`}>
              Tutte
            </Link>
          </nav>
        )}
        {onePublication && (
          <Link href="/notes" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
            Tutte le note
          </Link>
        )}
      </div>

      {writable.length > 0 && !onePublication && (
        <div className="border-b border-gray-300 py-6">
          <NoteComposer publications={writable} />
        </div>
      )}

      {notes.length === 0 ? (
        <p className="py-14 text-center text-lg italic text-gray-600">
          {tab === "seguite" ? "Le pubblicazioni che segui non hanno ancora scritto note." : "Ancora nessuna nota."}
        </p>
      ) : (
        <div className="divide-y divide-gray-300">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              viewerId={user?.id}
              canDelete={Boolean(user && (note.authorId === user.id || (note.publicationId && moderated.has(note.publicationId))))}
              loginHref={`/login?next=${encodeURIComponent(query({}))}`}
            />
          ))}
        </div>
      )}

      {next && (
        <div className="mt-8 text-center">
          <Link href={query({ prima: next })} className="font-semibold underline underline-offset-4">
            Note precedenti
          </Link>
        </div>
      )}
    </div>
  );
}
