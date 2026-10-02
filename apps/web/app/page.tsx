import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@zerostack/database";
import { SUBSTACK_FEE_PERCENT, formatPercent, platformFeePercent, publicationBaseUrl } from "@zerostack/shared";
import { publicationPalette } from "../lib/colors";

// Le pubblicazioni e gli articoli sono veri, letti dal database: niente esempi inventati.
export const dynamic = "force-dynamic";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// La commissione viene da un punto solo (packages/shared/src/billing.ts): i testi non possono
// promettere una cifra diversa da quella che Stripe trattiene davvero.
const facts = (fee: number) => [
  {
    n: "01",
    title: `Commissione del ${formatPercent(fee)}`,
    text: `Substack trattiene il ${formatPercent(SUBSTACK_FEE_PERCENT)}, noi il ${formatPercent(fee)}. Su ciò che pubblichi gratis, niente. Gli abbonamenti arrivano sul tuo conto Stripe.`
  },
  { n: "02", title: "Fattura elettronica", text: "Codice fiscale, partita IVA, SDI e PEC dei lettori, e l'XML pronto per lo SdI." },
  { n: "03", title: "Newsletter, blog, podcast", text: "Un solo posto per scrivere, spedire e pubblicare gli episodi, con il feed per Apple e Spotify." },
  { n: "04", title: "I lettori restano tuoi", text: "Esporti iscritti e articoli quando vuoi. Il tuo dominio, i tuoi colori." }
];

async function loadShowcase() {
  try {
    const [publications, posts] = await Promise.all([
      prisma.publication.findMany({
        where: { suspendedAt: null, posts: { some: { status: "PUBLISHED" } } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { name: true, slug: true, description: true, logoUrl: true, primaryColor: true, customDomain: true, isDomainVerified: true }
      }),
      prisma.post.findMany({
        where: { status: "PUBLISHED", publication: { suspendedAt: null } },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: {
          title: true, subtitle: true, slug: true, publishedAt: true,
          author: { select: { name: true } },
          publication: { select: { name: true, slug: true, customDomain: true, isDomainVerified: true } }
        }
      })
    ]);
    return { publications, posts };
  } catch (err) {
    // La home resta in piedi anche col database in difficoltà: mostra solo la parte fissa.
    console.error("[home] vetrina non caricata:", err instanceof Error ? err.message : err);
    return { publications: [], posts: [] };
  }
}

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

export default async function HomePage() {
  const { publications, posts } = await loadShowcase();
  const fee = platformFeePercent();
  const keep = (rate: number) => 1000 - (1000 * rate) / 100;

  return (
    <div>
      {/* Apertura: inchiostro, titolo in Bodoni, il cerchio zafferano con quanto resta all'autore */}
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div>
            <p className="kicker text-saffron">Newsletter · Blog · Podcast</p>
            <h1 className="mt-5 font-display text-6xl font-extrabold leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
              Scrivi.
              <br />
              <span className="font-medium italic text-saffron">Incassa</span> di più.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-paper-300">
              La piattaforma italiana per chi scrive: newsletter, articoli e podcast con i lettori che pagano te, la fattura elettronica già fatta
              e una commissione più bassa di Substack.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-saffron px-7 py-3.5 text-base font-bold text-ink transition hover:bg-paper">
                Apri la tua pubblicazione <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#come-funziona" className="text-base font-semibold text-paper underline decoration-saffron decoration-2 underline-offset-8 hover:text-saffron">
                Come funziona
              </a>
            </div>
          </div>
          <div className="mx-auto flex aspect-square w-64 flex-col items-center justify-center rounded-full border-[10px] border-saffron bg-ink-700 text-center sm:w-80">
            <span className="font-display text-8xl font-extrabold leading-none sm:text-9xl">{formatPercent(100 - fee)}</span>
            <span className="kicker mt-3 max-w-[12rem] text-saffron">di ogni abbonamento resta a te</span>
          </div>
        </div>
      </section>

      {/* I quattro punti: griglia con filetti, alla milanese */}
      <section id="come-funziona" className="border-y-2 border-ink bg-saffron">
        <h2 className="sr-only">Come funziona</h2>
        <ol className="mx-auto grid max-w-7xl gap-[2px] bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {facts(fee).map((f) => (
            <li key={f.n} className="bg-saffron px-6 py-8 text-ink">
              <span className="font-display text-3xl font-extrabold">{f.n}</span>
              <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed">{f.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Le pubblicazioni: cerchi col colore di ciascun autore */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Le pubblicazioni.</h2>
        {publications.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xl border-y border-ink py-10 text-center">
            <p className="font-display text-2xl italic">La prima pagina è ancora bianca.</p>
            <p className="mt-3 text-gray-600">Le pubblicazioni compaiono qui appena escono i loro primi articoli. Può essere la tua.</p>
            <Link href="/register" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper transition hover:bg-ink-700">
              Apri la tua pubblicazione <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
            {publications.map((p) => {
              const palette = publicationPalette(p.primaryColor, null);
              return (
                <li key={p.slug} className="text-center">
                  <a href={publicationBaseUrl(p)} className="group block">
                    <span
                      className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[5px] font-display text-4xl font-extrabold transition group-hover:scale-105"
                      style={{ borderColor: palette.accent, backgroundColor: p.logoUrl ? undefined : palette.accent, color: palette.onAccent }}
                    >
                      {p.logoUrl ? <img src={p.logoUrl} alt="" className="h-full w-full object-cover" /> : p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="mt-4 block font-bold leading-tight group-hover:underline">{p.name}</span>
                    {p.description && <span className="mt-1 line-clamp-2 block text-sm text-gray-600">{p.description}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Gli ultimi articoli: sommario da giornale */}
      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between border-b-[3px] border-ink pb-3">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Usciti da poco</h2>
          </div>
          <ol className="divide-y divide-gray-300">
            {posts.map((post) => (
              <li key={`${post.publication.slug}/${post.slug}`}>
                <a href={`${publicationBaseUrl(post.publication)}/${post.slug}`} className="group grid gap-2 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
                  <span className="kicker text-saffron-800">{post.publication.name}</span>
                  <span>
                    <span className="block font-display text-2xl font-bold leading-snug group-hover:underline sm:text-3xl">{post.title}</span>
                    {post.subtitle && <span className="mt-1 block text-gray-600">{post.subtitle}</span>}
                    <span className="mt-2 block text-sm text-gray-500">
                      {post.author.name}
                      {post.publishedAt && ` · ${dateFmt.format(post.publishedAt)}`}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Il confronto, detto chiaro */}
      <section className="border-y-2 border-ink bg-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <div>
            <p className="kicker text-saffron-800">Il conto</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight">
              Su 1.000 € di abbonamenti, <span className="italic">quanto resta a te?</span>
            </h2>
            <p className="mt-4 text-gray-600">In tutti e due i casi Stripe applica le sue commissioni sui pagamenti. La differenza è quello che si prende la piattaforma.</p>
          </div>
          <dl className="grid grid-cols-2 border-2 border-ink">
            <div className="border-r-2 border-ink p-6">
              <dt className="kicker text-gray-600">Substack, {formatPercent(SUBSTACK_FEE_PERCENT)}</dt>
              <dd className="mt-3 font-display text-5xl font-extrabold text-gray-500 line-through decoration-2">{euro.format(keep(SUBSTACK_FEE_PERCENT))}</dd>
              <dd className="mt-2 text-sm text-gray-600">{euro.format(1000 - keep(SUBSTACK_FEE_PERCENT))} a ogni mille</dd>
            </div>
            <div className="bg-ink p-6 text-paper">
              <dt className="kicker text-saffron">ZeroStack, {formatPercent(fee)}</dt>
              <dd className="mt-3 font-display text-5xl font-extrabold">{euro.format(keep(fee))}</dd>
              <dd className="mt-2 text-sm text-paper-300">
                {euro.format(keep(fee) - keep(SUBSTACK_FEE_PERCENT))} in più a te ogni mille, con la fattura elettronica inclusa
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Chiusura */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          La tua firma, <span className="italic">il tuo stile.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">Scegli i colori della tua pubblicazione, collega il tuo dominio e comincia a scrivere. Bastano pochi minuti.</p>
        <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-base font-bold text-paper transition hover:bg-ink-700">
          Apri la tua pubblicazione <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
