import { NextRequest, NextResponse } from "next/server";
import { applyEmailEvent, publicationFromTags, safeEqual, type EmailEventKind } from "../../../../../lib/email-events";

// Brevo non firma i webhook: l'indirizzo configurato su Brevo contiene ?token=<EMAIL_WEBHOOK_TOKEN>.
const KIND: Record<string, EmailEventKind> = {
  hard_bounce: "hard_bounce",
  invalid_email: "hard_bounce",
  spam: "complaint",
  complaint: "complaint"
};

export async function POST(req: NextRequest) {
  const expected = process.env.EMAIL_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 503 });
  }
  if (!safeEqual(req.nextUrl.searchParams.get("token") ?? "", expected)) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const events: Array<Record<string, unknown>> = Array.isArray(payload) ? payload : payload ? [payload] : [];
  let updated = 0;
  for (const e of events) {
    const kind = KIND[String(e.event ?? "")];
    if (!kind || typeof e.email !== "string") continue;
    updated += await applyEmailEvent({ kind, email: e.email, publicationId: publicationFromTags(e.tags) });
  }
  return NextResponse.json({ received: events.length, updated });
}
