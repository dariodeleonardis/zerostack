import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { platformFeeCents, platformFeePercent, platformUrlFromEnv } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";
import { allowAttempt } from "../../../../lib/rate-limit";
import { isStripeConfigured, stripe } from "../../../../lib/stripe";
import { TIP_MAX_CENTS, TIP_MESSAGE_MAX, TIP_MIN_CENTS, formatEuro, tipAmount } from "../../../../lib/tips";

/**
 * Mancia (T7): crea la sessione di Stripe Checkout sul conto dell'autore. L'incasso si registra
 * solo quando arriva il webhook di Stripe; da qui non si registra niente.
 */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi per lasciare una mancia" }, { status: 401 });
  if (!isStripeConfigured()) return NextResponse.json({ error: "I pagamenti non sono ancora attivi su questa piattaforma" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const amount = tipAmount(body?.amountCents);
  if (!amount) return NextResponse.json({ error: `La mancia va da ${formatEuro(TIP_MIN_CENTS)} a ${formatEuro(TIP_MAX_CENTS)}` }, { status: 400 });
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length > TIP_MESSAGE_MAX) return NextResponse.json({ error: `Il messaggio è troppo lungo (massimo ${TIP_MESSAGE_MAX} caratteri)` }, { status: 400 });

  const publication =
    typeof body?.publicationId === "string"
      ? await prisma.publication.findFirst({
          where: { id: body.publicationId, suspendedAt: null },
          select: { id: true, name: true, slug: true, stripeAccountId: true, stripeChargesEnabled: true }
        })
      : null;
  if (!publication) return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
  if (!publication.stripeAccountId || !publication.stripeChargesEnabled) {
    return NextResponse.json({ error: "Questa pubblicazione non accetta ancora pagamenti" }, { status: 409 });
  }
  if (!(await allowAttempt(`tip:${user.id}`, 10, 10 * 60))) {
    return NextResponse.json({ error: "Troppi tentativi in poco tempo. Riprova tra qualche minuto." }, { status: 429 });
  }

  try {
    const fee = platformFeePercent();
    const platform = platformUrlFromEnv();
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: { currency: "eur", unit_amount: amount, product_data: { name: `Mancia per ${publication.name}` } }
          }
        ],
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: { kind: "tip", userId: user.id, publicationId: publication.id, message },
        // Commissione come sugli abbonamenti (packages/shared/src/billing.ts).
        ...(fee > 0 ? { payment_intent_data: { application_fee_amount: platformFeeCents(amount, fee) } } : {}),
        locale: "it",
        success_url: `${platform}/mancia/${publication.slug}?esito=ok`,
        cancel_url: `${platform}/mancia/${publication.slug}`
      },
      { stripeAccount: publication.stripeAccountId }
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[mancia]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Stripe non ha risposto. Riprova tra poco." }, { status: 502 });
  }
}
