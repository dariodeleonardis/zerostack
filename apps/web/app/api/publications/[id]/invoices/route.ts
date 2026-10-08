import { NextResponse } from "next/server";
import { strToU8, zipSync } from "fflate";
import { prisma } from "@zerostack/database";
import { getCurrentUser } from "../../../../../lib/auth";
import { isPublicationOwner } from "../../../../../lib/publication-owner";

/**
 * Tutte le fatture di un mese in uno ZIP (?mese=2026-09), da caricare in blocco nel gestionale
 * o sul portale "Fatture e Corrispettivi". Con ?stato=READY solo quelle non ancora trasmesse.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !(await isPublicationOwner(user, params.id))) return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });

  const url = new URL(req.url);
  const month = url.searchParams.get("mese") ?? "";
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return NextResponse.json({ error: "Indica il mese come AAAA-MM" }, { status: 400 });
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  // Le date delle fatture sono italiane: il mese si prende largo e si filtra sull'etichetta del giorno.
  const from = new Date(Date.UTC(year, monthIndex, 1) - 2 * 3_600_000);
  const to = new Date(Date.UTC(year, monthIndex + 1, 1) + 2 * 3_600_000);
  const onlyReady = url.searchParams.get("stato") === "READY";

  const invoices = await prisma.invoice.findMany({
    where: { publicationId: params.id, payment: { paidAt: { gte: from, lt: to } }, ...(onlyReady ? { status: "READY" as const } : {}) },
    orderBy: [{ year: "asc" }, { number: "asc" }],
    select: { fileName: true, xml: true, payment: { select: { paidAt: true } } }
  });
  const inMonth = invoices.filter((i) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(i.payment.paidAt).startsWith(month));
  if (inMonth.length === 0) return NextResponse.json({ error: "Nessuna fattura in questo mese" }, { status: 404 });

  const zip = zipSync(Object.fromEntries(inMonth.map((i) => [i.fileName, strToU8(i.xml)])), { level: 6 });
  return new NextResponse(Buffer.from(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="fatture-${month}.zip"`,
      "cache-control": "private, no-store"
    }
  });
}
