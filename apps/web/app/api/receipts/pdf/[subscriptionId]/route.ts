import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function GET(
  req: Request,
  { params }: { params: { subscriptionId: string } }
) {
  const { subscriptionId } = params;

  // Generazione ricevuta fiscale italiana
  const doc = new jsPDF();

  // Intestazione
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 255);
  doc.text("ZeroStack - Ricevuta Fiscale", 20, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Documento valido ai fini fiscali in Italia (art. 22 D.P.R. 633/72)", 20, 32);

  // Linea separatrice
  doc.setDrawColor(220, 220, 220);
  doc.line(20, 36, 190, 36);

  // Dati Ricevuta
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text("Numero Ricevuta:", 20, 46);
  doc.setFont("helvetica", "normal");
  doc.text(`ZS-2026-${subscriptionId.substring(0, 8).toUpperCase()}`, 65, 46);

  doc.setFont("helvetica", "bold");
  doc.text("Data Emissione:", 20, 53);
  doc.setFont("helvetica", "normal");
  doc.text("25/09/2026", 65, 53);

  // Dati Cliente & Fiscali
  doc.setFont("helvetica", "bold");
  doc.text("Dati Intestatario / Acquirente:", 20, 68);
  doc.setFont("helvetica", "normal");
  doc.text("Mario Rossi", 20, 75);
  doc.text("Codice Fiscale: RSSMRA85M01H501Z", 20, 82);
  doc.text("Partita IVA: 01234567890", 20, 89);
  doc.text("Codice Destinatario SDI: M5UXCR1", 20, 96);
  doc.text("Indirizzo: Via Roma 12, 00100 Roma (RM) - IT", 20, 103);

  // Tabella Prodotto
  doc.setFillColor(245, 247, 250);
  doc.rect(20, 115, 170, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Descrizione", 25, 121);
  doc.text("Periodo", 110, 121);
  doc.text("Importo", 160, 121);

  doc.setFont("helvetica", "normal");
  doc.text("Abbonamento Tech & Futuro Italia (Premium)", 25, 133);
  doc.text("Mensile", 110, 133);
  doc.text("5,74 €", 160, 133);

  doc.text("IVA 22%:", 110, 143);
  doc.text("1,26 €", 160, 143);

  // Totale
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Totale Pagato:", 110, 155);
  doc.text("7,00 €", 160, 155);

  // Footer
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text("Pagamento saldato elettronicamente tramite Stripe / SEPA Direct Debit.", 20, 180);
  doc.text("La fattura elettronica SDI associata viene trasmessa al Sistema di Interscambio dell'AdE.", 20, 186);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ricevuta-zerostack-${subscriptionId}.pdf"`
    }
  });
}
