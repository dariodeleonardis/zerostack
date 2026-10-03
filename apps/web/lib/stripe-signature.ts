import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifica dell'header Stripe-Signature ("t=<unix>,v1=<hex>[,v1=...]") come fa
 * stripe.webhooks.constructEvent: HMAC-SHA256 di "<t>.<corpo grezzo>" con il segreto
 * dell'endpoint, e timestamp entro `toleranceSeconds` per bloccare le ripetizioni.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!header) return false;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = Number(value);
    else if (key === "v1" && value) signatures.push(value);
  }
  if (timestamp === null || !Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest();
  return signatures.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
