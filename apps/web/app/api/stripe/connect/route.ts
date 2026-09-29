import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { platformUrlFromEnv, publicationBaseUrl } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";
import { isStripeConfigured, stripe } from "../../../../lib/stripe";
import { VERIFY_FIRST } from "../../../../lib/email-verification";

/**
 * Avvia (o riprende) il collegamento del conto Stripe di una pubblicazione (Connect Express).
 * Restituisce l'indirizzo della procedura guidata di Stripe: dati, documento, IBAN.
 */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per collegare Stripe" }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: VERIFY_FIRST, code: "email_not_verified" }, { status: 403 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "I pagamenti non sono ancora configurati su questa piattaforma" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const publicationId = typeof body?.publicationId === "string" ? body.publicationId : "";
  // I pagamenti di una pubblicazione li collega solo chi la possiede.
  const owned = publicationId
    ? await prisma.publicationMember.findFirst({
        where: { publicationId, userId: user.id, role: "OWNER" },
        select: { publication: { select: { id: true, name: true, slug: true, customDomain: true, isDomainVerified: true, stripeAccountId: true } } }
      })
    : null;
  if (!owned) {
    return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
  }
  const publication = owned.publication;

  try {
    let accountId = publication.stripeAccountId;
    if (!accountId) {
      const account = await stripe().accounts.create(
        {
          type: "express",
          country: "IT",
          email: user.email,
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          business_profile: { name: publication.name, url: publicationBaseUrl(publication) },
          metadata: { publicationId: publication.id }
        },
        // Due clic ravvicinati non devono creare due conti.
        { idempotencyKey: `zs-account-${publication.id}` }
      );
      accountId = account.id;
      await prisma.publication.update({ where: { id: publication.id }, data: { stripeAccountId: accountId } });
    }

    const back = `${platformUrlFromEnv()}/studio/monetization?pub=${publication.id}`;
    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${back}&stripe=refresh`,
      return_url: `${back}&stripe=return`
    });
    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error("[stripe/connect]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Stripe non ha risposto. Riprova tra poco." }, { status: 502 });
  }
}
