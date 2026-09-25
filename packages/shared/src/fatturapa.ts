import { ItalianBillingDetails } from "./types";

interface InvoiceData {
  progressivoInvio: string; // Es. ZS001
  numeroFattura: string;    // Es. 2026/01
  dataFattura: string;      // YYYY-MM-DD
  importoCents: number;
  aliquotaIvaPercent: number; // Es. 22
  cedente: {
    denominazione: string;
    partitaIva: string;
    codiceFiscale: string;
    regimeFiscale: string; // Es. "RF01" (Ordinario) o "RF19" (Forfettario)
    indirizzo: string;
    cap: string;
    comune: string;
    provincia: string;
    nazione: string;
  };
  cessionario: ItalianBillingDetails;
}

/**
 * Genera il file XML conforme allo schema FatturaPA v1.2.2 dell'Agenzia delle Entrate
 * per la trasmissione al Sistema di Interscambio (SDI).
 */
export function generateFatturaPAXml(data: InvoiceData): string {
  const imponibile = (data.importoCents / (1 + data.aliquotaIvaPercent / 100) / 100).toFixed(2);
  const imposta = ((data.importoCents / 100) - parseFloat(imponibile)).toFixed(2);
  const totale = (data.importoCents / 100).toFixed(2);

  const codiceDestinatario = data.cessionario.codiceDestinatarioSDI || "0000000";
  const pecDestinatario = data.cessionario.pec ? `<PECDestinatario>${escapeXml(data.cessionario.pec)}</PECDestinatario>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${escapeXml(data.cedente.codiceFiscale)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${escapeXml(data.progressivoInvio)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${escapeXml(codiceDestinatario)}</CodiceDestinatario>
      ${pecDestinatario}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escapeXml(data.cedente.partitaIva)}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${escapeXml(data.cedente.codiceFiscale)}</CodiceFiscale>
        <Anagrafica>
          <Denominazione>${escapeXml(data.cedente.denominazione)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${escapeXml(data.cedente.regimeFiscale)}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(data.cedente.indirizzo)}</Indirizzo>
        <CAP>${escapeXml(data.cedente.cap)}</CAP>
        <Comune>${escapeXml(data.cedente.comune)}</Comune>
        <Provincia>${escapeXml(data.cedente.provincia)}</Provincia>
        <Nazione>${escapeXml(data.cedente.nazione)}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${data.cessionario.partitaIva ? `
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escapeXml(data.cessionario.partitaIva)}</IdCodice>
        </IdFiscaleIVA>` : ""}
        <CodiceFiscale>${escapeXml(data.cessionario.codiceFiscale)}</CodiceFiscale>
        <Anagrafica>
          <Denominazione>${escapeXml(data.cessionario.ragioneSocialeOIntestatario)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(data.cessionario.indirizzo)}</Indirizzo>
        <CAP>${escapeXml(data.cessionario.cap)}</CAP>
        <Comune>${escapeXml(data.cessionario.citta)}</Comune>
        <Provincia>${escapeXml(data.cessionario.provincia)}</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${escapeXml(data.dataFattura)}</Data>
        <Numero>${escapeXml(data.numeroFattura)}</Numero>
        <ImportoTotaleDocumento>${totale}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Abbonamento Pubblicazione Editoriale Digitale</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>${imponibile}</PrezzoUnitario>
        <PrezzoTotale>${imponibile}</PrezzoTotale>
        <AliquotaIVA>${data.aliquotaIvaPercent.toFixed(2)}</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>${data.aliquotaIvaPercent.toFixed(2)}</AliquotaIVA>
        <ImponibileImporto>${imponibile}</ImponibileImporto>
        <Imposta>${imposta}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP08</ModalitaPagamento>
        <DataScadenzaPagamento>${escapeXml(data.dataFattura)}</DataScadenzaPagamento>
        <ImportoPagamento>${totale}</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
