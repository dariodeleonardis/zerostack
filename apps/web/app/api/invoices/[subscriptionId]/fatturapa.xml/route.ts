import { NextRequest, NextResponse } from "next/server";
import { generateFatturaPAXml } from "@zerostack/shared";

export async function GET(
  req: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  const { subscriptionId } = params;

  // Dati di esempio conformi a FatturaPA v1.2.2
  const xmlContent = generateFatturaPAXml({
    progressivoInvio: `ZS${Date.now().toString().slice(-5)}`,
    numeroFattura: `ZS-2026-${subscriptionId.substring(0, 6).toUpperCase()}`,
    dataFattura: new Date().toISOString().slice(0, 10),
    importoCents: 700, // 7.00 EUR
    aliquotaIvaPercent: 22.0,
    cedente: {
      denominazione: "Tech & Futuro Italia Editoriale S.r.l.",
      partitaIva: "01234567890",
      codiceFiscale: "01234567890",
      regimeFiscale: "RF01",
      indirizzo: "Via Montenapoleone 8",
      cap: "20121",
      comune: "Milano",
      provincia: "MI",
      nazione: "IT"
    },
    cessionario: {
      ragioneSocialeOIntestatario: "Studio Tecnico Rossi",
      codiceFiscale: "RSSMRA85M01H501Z",
      partitaIva: "09876543210",
      codiceDestinatarioSDI: "M5UXCR1",
      pec: "studiorossi@pec.it",
      indirizzo: "Via Roma 100",
      cap: "00100",
      citta: "Roma",
      provincia: "RM",
      paese: "IT"
    }
  });

  return new NextResponse(xmlContent, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="IT01234567890_ZS${subscriptionId.substring(0, 5)}.xml"`
    }
  });
}
