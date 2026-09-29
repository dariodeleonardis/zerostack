import { NextResponse } from "next/server";
import { applyEmailEvent, publicationFromTags, verifySvixSignature } from "../../../../../lib/email-events";

// Webhook di Resend (firmati con Svix): email.bounced definitivi ed email.complained.
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 503 });
  }
  const body = await req.text();
  const ok = verifySvixSignature(
    body,
    { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") },
    secret
  );
  if (!ok) {
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  let event: { type?: string; data?: { to?: string[] | string; tags?: unknown; bounce?: { type?: string } } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Corpo non valido" }, { status: 400 });
  }
  const recipients = Array.isArray(event.data?.to) ? event.data!.to : event.data?.to ? [event.data.to] : [];
  const publicationId = publicationFromTags(event.data?.tags);

  let kind: "hard_bounce" | "complaint" | null = null;
  if (event.type === "email.complained") kind = "complaint";
  // Un rimbalzo temporaneo (casella piena, server giù) non toglie l'iscrizione.
  if (event.type === "email.bounced" && !/transient|temporary|soft/i.test(event.data?.bounce?.type ?? "")) kind = "hard_bounce";

  let updated = 0;
  if (kind) {
    for (const email of recipients) updated += await applyEmailEvent({ kind, email, publicationId });
  }
  return NextResponse.json({ received: true, updated });
}
