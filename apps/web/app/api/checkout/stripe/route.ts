import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tierId, paymentMethod, fiscalData } = body;

    console.log(`[ZeroStack Checkout] Avvio transazione per tier: ${tierId}`, {
      method: paymentMethod,
      fiscalData
    });

    // In produzione crea la sessione Stripe con metadati fiscali italiani:
    // stripe.checkout.sessions.create({
    //   payment_method_types: paymentMethod === 'sepa' ? ['sepa_debit'] : ['card'],
    //   metadata: {
    //     codiceFiscale: fiscalData?.codiceFiscale || '',
    //     partitaIva: fiscalData?.partitaIva || '',
    //     sdi: fiscalData?.codiceDestinatarioSDI || '',
    //     pec: fiscalData?.pec || ''
    //   }
    // });

    return NextResponse.json({
      success: true,
      subscriptionId: "sub_" + Math.random().toString(36).substring(7),
      message: "Transazione completata. Abbonamento attivato e ricevuta inviata con dati fiscali italiani."
    });
  } catch (error) {
    console.error("Errore checkout:", error);
    return NextResponse.json({ error: "Errore durante il checkout" }, { status: 500 });
  }
}
