import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { clientIp, isSameOriginJson } from "../../../lib/auth";
import { allowAttempt } from "../../../lib/rate-limit";
import { CONSENT_ID_PATTERN, CONSENT_RECORD_MONTHS, CONSENT_VERSION, activeCategories, cleanCategories } from "../../../lib/consent";

/**
 * Registra una scelta sui cookie facoltativi (la scrive il pannello, vedi lib/consent.ts).
 * Si registra solo ciò che si poteva davvero scegliere: una categoria senza servizi attivi
 * non diventa un consenso. L'IP serve solo al limite di richieste, non viene salvato.
 */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  if (!(await allowAttempt(`consent:${clientIp(req)}`, 30, 60 * 60))) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const consentId = typeof body?.consentId === "string" ? body.consentId : "";
  if (!CONSENT_ID_PATTERN.test(consentId) || body?.version !== CONSENT_VERSION || !Array.isArray(body?.granted)) {
    return NextResponse.json({ error: "Scelta non valida" }, { status: 400 });
  }
  const active = activeCategories();
  const granted = cleanCategories(body.granted).filter((g) => active.includes(g));
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase().slice(0, 253);

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - CONSENT_RECORD_MONTHS);
  await prisma.$transaction([
    prisma.consentRecord.create({ data: { consentId, version: CONSENT_VERSION, granted, host } }),
    prisma.consentRecord.deleteMany({ where: { createdAt: { lt: cutoff } } })
  ]);
  return NextResponse.json({ ok: true, granted }, { status: 201 });
}
