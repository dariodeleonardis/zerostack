import { NextRequest } from "next/server";
import { prisma } from "@zerostack/database";
import { simplePage, text } from "../../../lib/simple-page";

export const dynamic = "force-dynamic";

async function findSubscriber(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  return prisma.newsletterSubscriber.findFirst({
    where: { unsubscribeToken: token },
    select: { id: true, email: true, status: true, publication: { select: { name: true } } }
  });
}

const notFound = () => simplePage("Link non valido", "<p>Questo link di disiscrizione non è valido.</p>", 404);

/**
 * GET mostra solo la conferma con un pulsante: i filtri antispam aprono i link delle email,
 * e una GET che disiscrive toglierebbe lettori a caso.
 */
export async function GET(req: NextRequest) {
  const subscriber = await findSubscriber(req);
  if (!subscriber) return notFound();
  if (subscriber.status === "UNSUBSCRIBED") {
    return simplePage("Sei già disiscritto", `<p>${text(subscriber.email)} non riceve più le email di <strong>${text(subscriber.publication.name)}</strong>.</p>`);
  }
  return simplePage(
    `Disiscriviti da ${subscriber.publication.name}`,
    `<p>Non riceverai più le email di <strong>${text(subscriber.publication.name)}</strong> all'indirizzo ${text(subscriber.email)}.</p>
     <form method="post"><button type="submit">Conferma la disiscrizione</button></form>`
  );
}

/** POST: il pulsante qui sopra oppure la disiscrizione a un clic dei client di posta (RFC 8058). */
export async function POST(req: NextRequest) {
  const subscriber = await findSubscriber(req);
  if (!subscriber) return notFound();
  if (subscriber.status !== "UNSUBSCRIBED") {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date(), confirmTokenHash: null }
    });
  }
  return simplePage("Disiscrizione completata", `<p>Non riceverai più le email di <strong>${text(subscriber.publication.name)}</strong>. Puoi iscriverti di nuovo quando vuoi dalla pagina della newsletter.</p>`);
}
