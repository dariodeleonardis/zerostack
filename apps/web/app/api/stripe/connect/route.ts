import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per collegare Stripe" }, { status: 401 });
  }

  try {
    const { publicationId, returnUrl } = await req.json();

    // I pagamenti di una pubblicazione li collega solo chi la possiede.
    const owned = typeof publicationId === "string"
      ? await prisma.publicationMember.findFirst({ where: { publicationId, userId: user.id, role: "OWNER" }, select: { id: true } })
      : null;
    if (!owned) {
      return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
    }

    // Logica di avvio onboarding Stripe Connect Express per il creator:
    // In produzione crea l'account Stripe Connect se non esiste già:
    // const account = await stripe.accounts.create({
    //   type: 'express',
    //   country: 'IT',
    //   capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    //   business_type: 'individual'
    // });
    // const accountLink = await stripe.accountLinks.create({
    //   account: account.id,
    //   refresh_url: returnUrl,
    //   return_url: returnUrl,
    //   type: 'account_onboarding'
    // });

    return NextResponse.json({
      success: true,
      onboardingUrl: "https://connect.stripe.com/express/oauth/demo_zerostack",
      accountId: "acct_demo_" + Math.random().toString(36).substring(7)
    });
  } catch (error) {
    console.error("Errore avvio Stripe Connect:", error);
    return NextResponse.json({ error: "Errore durante l'onboarding Stripe Connect" }, { status: 500 });
  }
}
