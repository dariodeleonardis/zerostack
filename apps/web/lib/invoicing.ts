import { prisma, Prisma } from "@zerostack/database";
import { generateFatturaPAXml, invoiceFileName, type InvoiceInput } from "@zerostack/shared";

/**
 * Fatture elettroniche: chi incassa è l'autore (i pagamenti vanno sul suo conto Stripe), quindi
 * la fattura è sua, con i suoi dati fiscali. La piattaforma la prepara in formato FatturaPA
 * quando il lettore ha chiesto la fattura al checkout e l'autore ha attivato la fatturazione.
 *
 * Senza richiesta di fattura non si emette nulla: per i servizi elettronici venduti a privati
 * la fattura non è obbligatoria se il cliente non la chiede (art. 22 DPR 633/72).
 */

/** Data italiana (YYYY-MM-DD): un pagamento alle 00:30 di Roma è del giorno dopo rispetto a UTC. */
export function romeDate(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d);
}

export interface PaymentInput {
  publicationId: string;
  subscriptionId: string | null;
  userId: string | null;
  stripeObjectId: string;
  amountCents: number;
  currency: string;
  paidAt: Date;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  description: string;
}

/** Registra un incasso. Idempotente: lo stesso oggetto Stripe (evento ripetuto) non crea doppioni. */
export async function recordPayment(input: PaymentInput): Promise<string> {
  const row = await prisma.payment.upsert({
    where: { stripeObjectId: input.stripeObjectId },
    create: { ...input, currency: input.currency.toLowerCase() },
    update: { subscriptionId: input.subscriptionId ?? undefined },
    select: { id: true }
  });
  return row.id;
}

function describe(interval: string | undefined, tierName: string | undefined, publication: string): string {
  const tier = tierName ? ` - piano "${tierName}"` : "";
  if (interval === "MONTH") return `Abbonamento mensile alla pubblicazione digitale "${publication}"${tier}`;
  if (interval === "YEAR") return `Abbonamento annuale alla pubblicazione digitale "${publication}"${tier}`;
  return `Accesso alla pubblicazione digitale "${publication}"${tier}`;
}

/** Progressivo di invio e del nome file: anno e numero in base 36, unico per chi trasmette. */
export function progressivoFor(year: number, number: number): string {
  return ((year % 100) * 100_000 + number).toString(36).toUpperCase().padStart(5, "0");
}

export type IssueResult = { status: "issued" | "exists"; invoiceId: string } | { status: "skipped"; reason: string };

/**
 * Emette la fattura per un incasso, se ci sono le condizioni. Il numero si assegna dentro una
 * transazione con il profilo fiscale bloccato: due rinnovi nello stesso istante non prendono
 * lo stesso numero, e se l'XML non passa i controlli il numero non si consuma.
 */
export async function issueInvoice(paymentId: string): Promise<IssueResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amountCents: true,
      currency: true,
      paidAt: true,
      periodStart: true,
      periodEnd: true,
      publicationId: true,
      invoice: { select: { id: true } },
      publication: { select: { name: true, fiscalProfile: { select: { id: true, enabled: true } } } },
      subscription: {
        select: {
          billingInfo: true,
          tier: { select: { name: true, interval: true } }
        }
      }
    }
  });
  if (!payment) return { status: "skipped", reason: "pagamento inesistente" };
  if (payment.invoice) return { status: "exists", invoiceId: payment.invoice.id };
  if (!payment.publication.fiscalProfile?.enabled) return { status: "skipped", reason: "fatturazione non attiva" };
  const billing = payment.subscription?.billingInfo;
  if (!billing) return { status: "skipped", reason: "il lettore non ha chiesto la fattura" };
  if (payment.currency !== "eur") return { status: "skipped", reason: "valuta diversa dall'euro" };
  if (payment.amountCents <= 0) return { status: "skipped", reason: "importo nullo" };

  const profileId = payment.publication.fiscalProfile.id;
  const data = romeDate(payment.paidAt);
  const year = Number(data.slice(0, 4));

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FiscalProfile" WHERE id = ${profileId} FOR UPDATE`;
      const profile = await tx.fiscalProfile.findUniqueOrThrow({ where: { id: profileId } });
      const number = profile.numberingYear === year ? profile.nextNumber : 1;
      const progressivo = progressivoFor(year, number);
      const idTrasmittente = (process.env.SDI_ID_TRASMITTENTE || profile.codiceFiscale).toUpperCase();
      const input: InvoiceInput = {
        idTrasmittente,
        progressivo,
        numero: `${number}/${year}`,
        data,
        totaleCents: payment.amountCents,
        aliquotaIva: profile.aliquotaIva,
        descrizione: describe(payment.subscription?.tier?.interval, payment.subscription?.tier?.name, payment.publication.name),
        periodo:
          payment.periodStart && payment.periodEnd
            ? { inizio: romeDate(payment.periodStart), fine: romeDate(new Date(payment.periodEnd.getTime() - 1000)) }
            : undefined,
        cedente: {
          kind: profile.kind === "COMPANY" ? "COMPANY" : "PERSON",
          denominazione: profile.denominazione,
          nome: profile.nome,
          cognome: profile.cognome,
          partitaIva: profile.partitaIva,
          codiceFiscale: profile.codiceFiscale,
          regimeFiscale: profile.regimeFiscale === "RF01" ? "RF01" : "RF19",
          indirizzo: profile.indirizzo,
          numeroCivico: profile.numeroCivico,
          cap: profile.cap,
          comune: profile.comune,
          provincia: profile.provincia,
          email: profile.email
        },
        cessionario: {
          denominazione: billing.ragioneSociale,
          codiceFiscale: billing.codiceFiscale,
          partitaIva: billing.partitaIva,
          codiceDestinatario: billing.sdi,
          pec: billing.pec,
          indirizzo: billing.indirizzo,
          cap: billing.cap,
          comune: billing.citta,
          provincia: billing.provincia
        }
      };
      const xml = generateFatturaPAXml(input);
      const regimeOrdinario = profile.regimeFiscale === "RF01";
      const taxCents = regimeOrdinario ? payment.amountCents - Math.round((payment.amountCents * 100) / (100 + profile.aliquotaIva)) : 0;
      await tx.fiscalProfile.update({ where: { id: profileId }, data: { numberingYear: year, nextNumber: number + 1 } });
      return tx.invoice.create({
        data: {
          publicationId: payment.publicationId,
          paymentId: payment.id,
          year,
          number,
          label: input.numero,
          progressivo,
          fileName: invoiceFileName(idTrasmittente, progressivo),
          xml,
          totalCents: payment.amountCents,
          taxCents,
          buyerName: billing.ragioneSociale
        },
        select: { id: true }
      });
    });
    return { status: "issued", invoiceId: invoice.id };
  } catch (err) {
    // Stesso pagamento elaborato due volte in parallelo: la fattura c'è già.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.invoice.findUnique({ where: { paymentId }, select: { id: true } });
      if (existing) return { status: "exists", invoiceId: existing.id };
    }
    console.error(`[fatture] pagamento ${paymentId} senza fattura:`, err instanceof Error ? err : new Error(String(err)));
    return { status: "skipped", reason: err instanceof Error ? err.message : "errore" };
  }
}

/** Dopo che i dati fiscali sono stati collegati all'abbonamento: fatture per gli incassi già arrivati. */
export async function issuePendingInvoices(subscriptionId: string): Promise<void> {
  const pending = await prisma.payment.findMany({
    where: { subscriptionId, invoice: null },
    orderBy: { paidAt: "asc" },
    select: { id: true }
  });
  for (const p of pending) await issueInvoice(p.id);
}

/** Tutte le fatture ancora da emettere di una pubblicazione (per esempio appena attivata la fatturazione). */
export async function issuePendingForPublication(publicationId: string, since: Date): Promise<number> {
  const pending = await prisma.payment.findMany({
    where: { publicationId, invoice: null, paidAt: { gte: since }, subscription: { billingInfo: { isNot: null } } },
    orderBy: { paidAt: "asc" },
    select: { id: true }
  });
  let issued = 0;
  for (const p of pending) if ((await issueInvoice(p.id)).status === "issued") issued++;
  return issued;
}
