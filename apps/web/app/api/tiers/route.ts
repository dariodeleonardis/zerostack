import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { eurToCents, TierInputSchema } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "../../../lib/auth";

// Crea un livello di abbonamento. Il prezzo su Stripe nasce alla prima vendita (ensureStripePrice).
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per gestire gli abbonamenti" }, { status: 401 });
  }
  const parsed = TierInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const input = parsed.data;

  const owner = await prisma.publicationMember.findFirst({
    where: { publicationId: input.publicationId, userId: user.id, role: "OWNER" },
    select: { id: true }
  });
  if (!owner) {
    return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
  }

  const tier = await prisma.tier.create({
    data: {
      publicationId: input.publicationId,
      name: input.name,
      description: input.description,
      priceCents: eurToCents(input.priceEur),
      interval: input.interval,
      benefits: input.benefits
    },
    select: { id: true, name: true, priceCents: true, interval: true, isActive: true }
  });
  return NextResponse.json({ tier }, { status: 201 });
}
