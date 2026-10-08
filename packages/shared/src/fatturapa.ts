/**
 * Fattura elettronica FatturaPA, formato FPR12 (fatture tra privati, specifiche tecniche 1.2.x
 * dell'Agenzia delle Entrate). Il file si trasmette al Sistema di Interscambio (SdI) da un
 * intermediario o dal portale "Fatture e Corrispettivi".
 *
 * I prezzi su ZeroStack sono finali (IVA inclusa): in regime ordinario l'imponibile si scorpora
 * dal totale; in forfettario non c'è IVA (natura N2.2) e sopra 77,47 € va il bollo virtuale da 2 €.
 */

export type RegimeFiscale = "RF01" | "RF19";

export interface Cedente {
  kind: "PERSON" | "COMPANY";
  denominazione?: string | null;
  nome?: string | null;
  cognome?: string | null;
  partitaIva: string;
  codiceFiscale: string;
  regimeFiscale: RegimeFiscale;
  indirizzo: string;
  numeroCivico?: string | null;
  cap: string;
  comune: string;
  provincia: string;
  email?: string | null;
}

export interface Cessionario {
  denominazione: string;
  codiceFiscale?: string | null;
  partitaIva?: string | null;
  /** Codice destinatario SdI (7 caratteri); senza, si usa la PEC o "0000000" (area riservata del cliente). */
  codiceDestinatario?: string | null;
  pec?: string | null;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
}

export interface InvoiceInput {
  /** Codice fiscale di chi trasmette (l'autore, o l'intermediario). */
  idTrasmittente: string;
  progressivo: string;
  numero: string;
  /** YYYY-MM-DD */
  data: string;
  totaleCents: number;
  /** Aliquota IVA (regime ordinario): 22, o 4 per le pubblicazioni con ISSN. */
  aliquotaIva: number;
  descrizione: string;
  periodo?: { inizio: string; fine: string };
  cedente: Cedente;
  cessionario: Cessionario;
}

export interface InvoiceTotals {
  imponibileCents: number;
  impostaCents: number;
  totaleCents: number;
  bolloCents: number;
}

export const FORFETTARIO_RIFERIMENTO =
  "Operazione in franchigia IVA, art. 1 commi 54-89 L. 190/2014 (regime forfettario)";
export const BOLLO_SOGLIA_CENTS = 7747;
export const BOLLO_CENTS = 200;

export function computeTotals(totaleCents: number, regime: RegimeFiscale, aliquotaIva: number): InvoiceTotals {
  if (regime === "RF19") {
    return { imponibileCents: totaleCents, impostaCents: 0, totaleCents, bolloCents: totaleCents > BOLLO_SOGLIA_CENTS ? BOLLO_CENTS : 0 };
  }
  // Scorporo: imponibile arrotondato al centesimo, l'IVA è la differenza (così la somma torna sempre).
  const imponibileCents = Math.round((totaleCents * 100) / (100 + aliquotaIva));
  return { imponibileCents, impostaCents: totaleCents - imponibileCents, totaleCents, bolloCents: 0 };
}

const euro = (cents: number) => (cents / 100).toFixed(2);

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Testo per l'XML: solo caratteri ammessi (Latin-1 stampabile), senza spazi doppi, al massimo `max` caratteri. */
export function cleanText(value: string, max: number): string {
  const normalized = value
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, max);
}

const tag = (name: string, value: string | null | undefined, max = 80) => (value ? `<${name}>${esc(cleanText(value, max))}</${name}>` : "");

function anagrafica(p: { kind?: "PERSON" | "COMPANY"; denominazione?: string | null; nome?: string | null; cognome?: string | null }): string {
  if (p.kind === "PERSON" && p.nome && p.cognome) {
    return `<Anagrafica>${tag("Nome", p.nome, 60)}${tag("Cognome", p.cognome, 60)}</Anagrafica>`;
  }
  return `<Anagrafica>${tag("Denominazione", p.denominazione ?? `${p.nome ?? ""} ${p.cognome ?? ""}`, 80)}</Anagrafica>`;
}

function sede(s: { indirizzo: string; numeroCivico?: string | null; cap: string; comune: string; provincia: string }): string {
  return `<Sede>${tag("Indirizzo", s.indirizzo, 60)}${tag("NumeroCivico", s.numeroCivico, 8)}<CAP>${esc(s.cap)}</CAP>${tag("Comune", s.comune, 60)}<Provincia>${esc(s.provincia.toUpperCase())}</Provincia><Nazione>IT</Nazione></Sede>`;
}

/** Controlli prima di generare: meglio un errore qui che uno scarto dello SdI giorni dopo. */
export function validateInvoiceInput(input: InvoiceInput): string[] {
  const errors: string[] = [];
  const c = input.cedente;
  const b = input.cessionario;
  if (!/^\d{11}$/.test(c.partitaIva)) errors.push("Partita IVA dell'autore non valida (11 cifre)");
  if (!/^([A-Z0-9]{16}|\d{11})$/i.test(c.codiceFiscale)) errors.push("Codice fiscale dell'autore non valido");
  if (c.kind === "COMPANY" ? !c.denominazione : !(c.nome && c.cognome)) errors.push("Nome o denominazione dell'autore mancanti");
  if (!/^\d{5}$/.test(c.cap) || !/^[A-Z]{2}$/i.test(c.provincia)) errors.push("CAP o provincia dell'autore non validi");
  if (!b.partitaIva && !b.codiceFiscale) errors.push("Il cliente deve avere codice fiscale o partita IVA");
  if (b.partitaIva && !/^\d{11}$/.test(b.partitaIva)) errors.push("Partita IVA del cliente non valida");
  if (b.codiceFiscale && !/^([A-Z0-9]{16}|\d{11})$/i.test(b.codiceFiscale)) errors.push("Codice fiscale del cliente non valido");
  if (b.codiceDestinatario && !/^[A-Z0-9]{7}$/i.test(b.codiceDestinatario)) errors.push("Codice destinatario del cliente non valido");
  if (!/^\d{5}$/.test(b.cap) || !/^[A-Z]{2}$/i.test(b.provincia)) errors.push("CAP o provincia del cliente non validi");
  if (!/^[A-Za-z0-9]{1,10}$/.test(input.progressivo)) errors.push("Progressivo di invio non valido");
  if (!input.numero || input.numero.length > 20) errors.push("Numero della fattura non valido");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) errors.push("Data della fattura non valida");
  if (!Number.isInteger(input.totaleCents) || input.totaleCents <= 0) errors.push("Importo non valido");
  if (c.regimeFiscale === "RF01" && ![4, 5, 10, 22].includes(input.aliquotaIva)) errors.push("Aliquota IVA non ammessa");
  return errors;
}

/** Nome del file per lo SdI: IT + codice di chi trasmette + "_" + progressivo di 5 caratteri. */
export function invoiceFileName(idTrasmittente: string, progressivo: string): string {
  return `IT${idTrasmittente.toUpperCase()}_${progressivo.padStart(5, "0").slice(-5)}.xml`;
}

export function generateFatturaPAXml(input: InvoiceInput): string {
  const errors = validateInvoiceInput(input);
  if (errors.length) throw new Error(errors.join("; "));

  const { cedente: c, cessionario: b } = input;
  const forfettario = c.regimeFiscale === "RF19";
  const totals = computeTotals(input.totaleCents, c.regimeFiscale, input.aliquotaIva);
  const aliquota = forfettario ? "0.00" : input.aliquotaIva.toFixed(2);
  const natura = forfettario ? "<Natura>N2.2</Natura>" : "";

  // Con la partita IVA del cliente serve il codice destinatario o la PEC; per un privato "0000000"
  // manda la fattura nella sua area riservata dell'Agenzia delle Entrate.
  const codiceDestinatario = (b.codiceDestinatario || "0000000").toUpperCase();
  const pec = codiceDestinatario === "0000000" && b.pec ? tag("PECDestinatario", b.pec, 256) : "";

  const cessionarioIva = b.partitaIva ? `<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${esc(b.partitaIva)}</IdCodice></IdFiscaleIVA>` : "";
  const bollo = totals.bolloCents ? `<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>${euro(totals.bolloCents)}</ImportoBollo></DatiBollo>` : "";
  const periodo = input.periodo ? `<DataInizioPeriodo>${input.periodo.inizio}</DataInizioPeriodo><DataFinePeriodo>${input.periodo.fine}</DataFinePeriodo>` : "";
  // Lo schema vuole un'email di almeno 7 caratteri: se non ci sta, il contatto si omette (è facoltativo).
  const contatti = c.email && c.email.length >= 7 && c.email.length <= 256 ? `<Contatti>${tag("Email", c.email, 256)}</Contatti>` : "";

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">`,
    `<FatturaElettronicaHeader>`,
    `<DatiTrasmissione><IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>${esc(input.idTrasmittente.toUpperCase())}</IdCodice></IdTrasmittente><ProgressivoInvio>${esc(input.progressivo)}</ProgressivoInvio><FormatoTrasmissione>FPR12</FormatoTrasmissione><CodiceDestinatario>${esc(codiceDestinatario)}</CodiceDestinatario>${pec}</DatiTrasmissione>`,
    `<CedentePrestatore><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${esc(c.partitaIva)}</IdCodice></IdFiscaleIVA><CodiceFiscale>${esc(c.codiceFiscale.toUpperCase())}</CodiceFiscale>${anagrafica(c)}<RegimeFiscale>${c.regimeFiscale}</RegimeFiscale></DatiAnagrafici>${sede(c)}${contatti}</CedentePrestatore>`,
    `<CessionarioCommittente><DatiAnagrafici>${cessionarioIva}${b.codiceFiscale ? `<CodiceFiscale>${esc(b.codiceFiscale.toUpperCase())}</CodiceFiscale>` : ""}${anagrafica({ denominazione: b.denominazione })}</DatiAnagrafici>${sede(b)}</CessionarioCommittente>`,
    `</FatturaElettronicaHeader>`,
    `<FatturaElettronicaBody>`,
    `<DatiGenerali><DatiGeneraliDocumento><TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa><Data>${input.data}</Data>${tag("Numero", input.numero, 20)}${bollo}<ImportoTotaleDocumento>${euro(totals.totaleCents)}</ImportoTotaleDocumento></DatiGeneraliDocumento></DatiGenerali>`,
    `<DatiBeniServizi>`,
    `<DettaglioLinee><NumeroLinea>1</NumeroLinea>${tag("Descrizione", input.descrizione, 1000)}<Quantita>1.00</Quantita>${periodo}<PrezzoUnitario>${euro(totals.imponibileCents)}</PrezzoUnitario><PrezzoTotale>${euro(totals.imponibileCents)}</PrezzoTotale><AliquotaIVA>${aliquota}</AliquotaIVA>${natura}</DettaglioLinee>`,
    `<DatiRiepilogo><AliquotaIVA>${aliquota}</AliquotaIVA>${natura}<ImponibileImporto>${euro(totals.imponibileCents)}</ImponibileImporto><Imposta>${euro(totals.impostaCents)}</Imposta>${forfettario ? tag("RiferimentoNormativo", FORFETTARIO_RIFERIMENTO, 100) : "<EsigibilitaIVA>I</EsigibilitaIVA>"}</DatiRiepilogo>`,
    `</DatiBeniServizi>`,
    `</FatturaElettronicaBody>`,
    `</p:FatturaElettronica>`
  ].join("\n");
}
