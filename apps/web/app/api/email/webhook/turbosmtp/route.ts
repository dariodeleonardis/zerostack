import { NextRequest, NextResponse } from "next/server";
import { applyEmailEvent, safeEqual, type EmailEventKind } from "../../../../../lib/email-events";

/**
 * Event Webhook di turboSMTP (configurato dal pannello turboSMTP, docs/webhooks.md del loro developers hub).
 * turboSMTP non firma le chiamate: l'indirizzo configurato contiene ?token=<EMAIL_WEBHOOK_TOKEN>.
 * BOUNCED = rifiuto definitivo; REPORT = segnalazione di spam; UNSUBSCRIBED = disiscrizione dal link di turboSMTP.
 */
const KIND: Record<string, EmailEventKind> = {
  BOUNCED: "hard_bounce",
  REPORT: "complaint",
  UNSUBSCRIBED: "complaint"
};

// reference_id lo impostiamo noi all'invio: "publication:<uuid>".
function publicationFromReference(value: unknown): string | null {
  const match = typeof value === "string" ? /^publication:([0-9a-f-]{36})$/i.exec(value) : null;
  return match ? match[1] : null;
}

async function readEvents(req: NextRequest): Promise<Array<Record<string, unknown>>> {
  const raw = await req.text();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Alcune configurazioni inviano i campi come form: si accettano anche così.
    const form = Object.fromEntries(new URLSearchParams(raw));
    return Object.keys(form).length > 0 ? [form] : [];
  }
}

export async function POST(req: NextRequest) {
  const expected = process.env.EMAIL_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 503 });
  }
  if (!safeEqual(req.nextUrl.searchParams.get("token") ?? "", expected)) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const events = await readEvents(req);
  let updated = 0;
  for (const e of events) {
    const kind = KIND[String(e.status ?? "").toUpperCase()];
    if (!kind || typeof e.email !== "string") continue;
    updated += await applyEmailEvent({ kind, email: e.email, publicationId: publicationFromReference(e.reference_id) });
  }
  return NextResponse.json({ received: events.length, updated });
}
