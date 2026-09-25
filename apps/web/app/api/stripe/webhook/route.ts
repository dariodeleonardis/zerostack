import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    console.log("[ZeroStack Webhook] Ricevuto evento Stripe con firma:", sig?.substring(0, 15));

    // Parsing e verifica evento (in produzione: stripe.webhooks.constructEvent(rawBody, sig, secret))
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
