import { NextResponse } from "next/server";
import { Feed } from "feed";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const siteUrl = process.env.APP_URL || "https://zerostack.it";
  const pubUrl = `${siteUrl}/p/${slug}`;

  const feed = new Feed({
    title: "Tech & Futuro Italia",
    description: "L'osservatorio indipendente su IA, creator economy e innovazione tecnologica in Italia.",
    id: pubUrl,
    link: pubUrl,
    language: "it",
    image: `${siteUrl}/logo.png`,
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `Tutti i diritti riservati 2026, Dario De Leonardis`,
    author: {
      name: "Dario De Leonardis",
      email: "dario@zerostack.it",
      link: siteUrl
    }
  });

  // Aggiungi articoli recenti
  feed.addItem({
    title: "Perché l'ecosistema creator italiano ha bisogno di un'alternativa a Substack",
    id: `${pubUrl}/alternativa-italiana-a-substack`,
    link: `${pubUrl}/alternativa-italiana-a-substack`,
    description: "Commissioni al 10%, assenza di fatturazione elettronica e server oltreoceano: come riconquistare la sovranità dei propri lettori.",
    content: "<p>Analisi approfondita sui limiti di Substack e i vantaggi del self-hosting con ZeroStack...</p>",
    author: [
      {
        name: "Dario De Leonardis",
        email: "dario@zerostack.it",
        link: siteUrl
      }
    ],
    date: new Date()
  });

  return new NextResponse(feed.rss2(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate"
    }
  });
}
