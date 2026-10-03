import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { publicationBaseUrl } from "@zerostack/shared";
import { requireUser } from "../../lib/auth";
import { inboxPage } from "../../lib/inbox";
import { publicationPalette } from "../../lib/colors";
import { MarkAllRead } from "./MarkAllRead";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Posta | ZeroStack" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

export default async function InboxPage({ searchParams }: { searchParams: { prima?: string } }) {
  const user = await requireUser("/inbox");
  const before = searchParams.prima ? new Date(searchParams.prima) : undefined;
  const { followed, unread, posts, next } = await inboxPage(user, before && !Number.isNaN(before.getTime()) ? before : undefined);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-5">
        <div>
          <p className="kicker text-saffron-800">{unread > 0 ? `${unread} da leggere` : followed > 0 ? "Tutto letto" : "La tua posta"}</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight">Posta</h1>
        </div>
        {unread > 0 && <MarkAllRead />}
      </div>

      {followed === 0 ? (
        <div className="py-14 text-center">
          <p className="font-display text-2xl italic">Non segui ancora nessuna pubblicazione.</p>
          <p className="mx-auto mt-3 max-w-md text-gray-600">
            Qui arrivano gli articoli delle pubblicazioni a cui ti iscrivi o ti abboni. Iscriviti dalla pagina di una pubblicazione: trovi le più recenti nella prima pagina.
          </p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper transition hover:bg-ink-700">
            Scopri le pubblicazioni
          </Link>
        </div>
      ) : posts.length === 0 ? (
        <p className="py-14 text-center text-lg italic text-gray-600">Le pubblicazioni che segui non hanno ancora articoli.</p>
      ) : (
        <ol className="divide-y divide-gray-300">
          {posts.map((post) => {
            const color = publicationPalette(post.publication.primaryColor, null).accent;
            return (
              <li key={post.id}>
                <a href={`${publicationBaseUrl(post.publication)}/${post.slug}`} className="group grid grid-cols-[1rem_1fr] gap-3 py-6">
                  <span className="mt-2 h-3 w-3 rounded-full" style={{ backgroundColor: post.read ? "transparent" : color, boxShadow: `inset 0 0 0 2px ${color}` }} aria-hidden />
                  <span>
                    <span className="kicker flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600">
                      <span>{post.publication.name}</span>
                      {post.publishedAt && <span>{dateFmt.format(post.publishedAt)}</span>}
                      {!post.read && <span className="rounded-full bg-saffron px-2 py-0.5 text-ink">Nuovo</span>}
                      {post.access !== "FREE" && <span className="rounded-full border border-gray-400 px-2 py-0.5">Per gli abbonati</span>}
                    </span>
                    <span className={`mt-2 block font-display text-2xl leading-snug group-hover:underline sm:text-3xl ${post.read ? "font-semibold text-gray-600" : "font-extrabold text-ink"}`}>
                      {post.title}
                    </span>
                    {(post.subtitle || post.excerpt) && <span className="mt-1 line-clamp-2 block text-gray-600">{post.subtitle || post.excerpt}</span>}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}

      {next && (
        <div className="mt-8 text-center">
          <Link href={`/inbox?prima=${encodeURIComponent(next)}`} className="font-semibold underline underline-offset-4">
            Articoli precedenti
          </Link>
        </div>
      )}
    </div>
  );
}
