import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@zerostack/database";
import { publicationBaseUrl } from "@zerostack/shared";
import { simplePage } from "../../../../lib/simple-page";

export const dynamic = "force-dynamic";

const LINK_DAYS = 7;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const invalid = () =>
    simplePage("Link non valido", "<p>Questo link di conferma non è valido o è già stato usato. Se non risulti iscritto, iscriviti di nuovo dalla pagina della newsletter.</p>", 400);
  if (token.length < 20) return invalid();

  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { confirmTokenHash: createHash("sha256").update(token).digest("hex") },
    select: {
      id: true,
      confirmSentAt: true,
      publication: { select: { slug: true, customDomain: true, isDomainVerified: true } }
    }
  });
  if (!subscriber) return invalid();

  const expired = !subscriber.confirmSentAt || Date.now() - subscriber.confirmSentAt.getTime() > LINK_DAYS * 24 * 60 * 60 * 1000;
  if (expired) {
    return simplePage("Link scaduto", `<p>Il link di conferma vale ${LINK_DAYS} giorni. Iscriviti di nuovo per riceverne uno nuovo.</p>`, 410);
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { status: "ACTIVE", confirmedAt: new Date(), confirmTokenHash: null, unsubscribedAt: null }
  });

  return NextResponse.redirect(`${publicationBaseUrl(subscriber.publication)}/?iscrizione=confermata`, 303);
}
