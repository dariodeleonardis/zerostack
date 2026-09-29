import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { FiscalProfileSchema } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "../../../../../lib/auth";
import { issuePendingForPublication } from "../../../../../lib/invoicing";
import { isPublicationOwner } from "../../../../../lib/publication-owner";

// Fattura immediata: entro 12 giorni dall'incasso. Attivando la fatturazione si recuperano quelli.
const CATCH_UP_DAYS = 12;

/** Salva i dati fiscali dell'autore; con enabled=true le fatture partono da sole a ogni incasso. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi per continuare" }, { status: 401 });
  if (!(await isPublicationOwner(user, params.id))) return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });

  const parsed = FiscalProfileSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  const v = parsed.data;
  const company = v.kind === "COMPANY";
  const data = {
    enabled: v.enabled,
    kind: v.kind,
    denominazione: company ? v.denominazione || null : null,
    nome: company ? null : v.nome || null,
    cognome: company ? null : v.cognome || null,
    partitaIva: v.partitaIva,
    codiceFiscale: v.codiceFiscale.toUpperCase(),
    regimeFiscale: v.regimeFiscale,
    // In forfettario non c'è IVA: l'aliquota non conta, si tiene quella predefinita.
    aliquotaIva: v.regimeFiscale === "RF01" ? v.aliquotaIva : 22,
    indirizzo: v.indirizzo,
    numeroCivico: v.numeroCivico || null,
    cap: v.cap,
    comune: v.comune,
    provincia: v.provincia.toUpperCase(),
    email: v.email || null
  };
  const before = await prisma.fiscalProfile.findUnique({ where: { publicationId: params.id }, select: { enabled: true } });
  await prisma.fiscalProfile.upsert({ where: { publicationId: params.id }, create: { publicationId: params.id, ...data }, update: data });

  let caughtUp = 0;
  if (v.enabled && !before?.enabled) {
    caughtUp = await issuePendingForPublication(params.id, new Date(Date.now() - CATCH_UP_DAYS * 86_400_000));
  }
  return NextResponse.json({ saved: true, caughtUp });
}
