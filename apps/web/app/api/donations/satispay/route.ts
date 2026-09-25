import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amountEur, publicationSlug, articleSlug } = body;

    if (!amountEur || amountEur <= 0) {
      return NextResponse.json({ error: "Importo non valido" }, { status: 400 });
    }

    // Amount in cents (es. 2.00 € = 200 cents)
    const amountCents = Math.round(Number(amountEur) * 100);

    // In produzione: integrazione ufficiale Satispay API v1 (Online Shop)
    // Satispay AuthServices: POST https://authservices.satispay.com/g_business/v1/charges
    const paymentId = `sat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Deep-link per app mobile Satispay con fallback su portale web sicuro
    const satispayDeepLink = `satispay://pay?amount=${amountCents}&currency=EUR&description=Mancia+ZeroStack+${encodeURIComponent(publicationSlug || "creator")}`;
    const redirectUrl = process.env.SATISPAY_STAGING === "true"
      ? `https://staging.authservices.satispay.com/online/pay/${paymentId}`
      : satispayDeepLink;

    return NextResponse.json({
      success: true,
      paymentId,
      amountCents,
      currency: "EUR",
      publicationSlug,
      articleSlug: articleSlug || null,
      redirectUrl
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Errore elaborazione Satispay" }, { status: 500 });
  }
}
