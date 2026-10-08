import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@zerostack/database";

export type EmailEventKind = "hard_bounce" | "complaint";

/**
 * Conseguenze di un evento del provider email:
 * - rimbalzo definitivo: l'indirizzo non esiste, si ferma ovunque (BOUNCED) per non rovinare la reputazione del mittente;
 * - segnalazione di spam: la persona non vuole quella newsletter, si disiscrive (dalla pubblicazione indicata nei tag,
 *   o da tutte se il tag manca).
 * I rimbalzi temporanei non cambiano nulla: il provider riprova da sé.
 */
export async function applyEmailEvent(event: { kind: EmailEventKind; email: string; publicationId?: string | null }): Promise<number> {
  const email = event.email.trim().toLowerCase();
  if (!email.includes("@")) return 0;
  if (event.kind === "hard_bounce") {
    const res = await prisma.newsletterSubscriber.updateMany({
      where: { email, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "BOUNCED", confirmTokenHash: null }
    });
    return res.count;
  }
  const res = await prisma.newsletterSubscriber.updateMany({
    where: { email, status: { in: ["ACTIVE", "PENDING"] }, ...(event.publicationId ? { publicationId: event.publicationId } : {}) },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date(), confirmTokenHash: null }
  });
  return res.count;
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Firma Svix usata dai webhook di Resend: HMAC-SHA256 di "<id>.<timestamp>.<corpo>" con il segreto
 * (dopo "whsec_", in base64); l'header svix-signature contiene una o più firme "v1,<base64>".
 */
export function verifySvixSignature(
  body: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > toleranceSeconds) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${body}`).digest("base64");
  return headers.signature
    .split(" ")
    .map((part) => part.split(",")[1] ?? "")
    .some((sig) => safeEqual(sig, expected));
}

/** Il tag "publication" nei formati dei provider: ["publication:<id>"], [{name, value}] o {publication: id}. */
export function publicationFromTags(tags: unknown): string | null {
  const uuid = /^[0-9a-f-]{36}$/i;
  if (Array.isArray(tags)) {
    for (const t of tags) {
      if (typeof t === "string" && t.startsWith("publication:") && uuid.test(t.slice(12))) return t.slice(12);
      if (t && typeof t === "object" && (t as { name?: string }).name === "publication") {
        const v = (t as { value?: string }).value;
        if (v && uuid.test(v)) return v;
      }
    }
  } else if (tags && typeof tags === "object") {
    const v = (tags as Record<string, unknown>).publication;
    if (typeof v === "string" && uuid.test(v)) return v;
  }
  return null;
}
