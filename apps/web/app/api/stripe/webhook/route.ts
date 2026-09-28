import { NextResponse } from "next/server";
import { verifyStripeSignature } from "../../../../lib/stripe-signature";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    // Senza verifica chiunque potrebbe inventarsi un "checkout.session.completed".
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        console.error("[ZeroStack Webhook] STRIPE_WEBHOOK_SECRET assente: evento rifiutato");
        return NextResponse.json({ error: "Webhook non configurato" }, { status: 503 });
      }
      console.warn("[ZeroStack Webhook] STRIPE_WEBHOOK_SECRET assente: firma non verificata (solo sviluppo)");
    } else if (!verifyStripeSignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
    }

    const event = JSON.parse(rawBody || "{}");

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object;
        console.log("✅ Checkout completato per cliente:", session?.customer);
        // Aggiorna o crea abbonamento e salva dati fiscali italiani (CF, P.IVA, SDI, PEC)
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data?.object;
        console.log("⚠️ Abbonamento cancellato:", subscription?.id);
        // Disattiva stato utente abbonato
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data?.object;
        console.log("💳 Pagamento fattura riuscito:", invoice?.id);
        break;
      }

      default:
        console.log(`Evento non gestito: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Errore elaborazione webhook Stripe:", error);
    return NextResponse.json({ error: "Errore webhook" }, { status: 400 });
  }
}
