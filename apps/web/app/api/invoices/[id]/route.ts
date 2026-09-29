import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";
import { isPublicationOwner } from "../../../../lib/publication-owner";

async function ownedInvoice(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || !(await isPublicationOwner(user, invoice.publicationId))) return null;
  return invoice;
}

/** Il file XML della fattura, con il nome richiesto dallo SdI. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const invoice = await ownedInvoice(params.id);
  if (!invoice) return NextResponse.json({ error: "Fattura non trovata" }, { status: 404 });
  return new NextResponse(invoice.xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${invoice.fileName}"`,
      "cache-control": "private, no-store"
    }
  });
}

/** L'autore segna le fatture che ha trasmesso allo SdI (dal suo gestionale o dal portale dell'Agenzia). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const invoice = await ownedInvoice(params.id);
  if (!invoice) return NextResponse.json({ error: "Fattura non trovata" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (body?.action === "mark-sent") {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
  } else if (body?.action === "mark-ready") {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "READY", sentAt: null } });
  } else {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
