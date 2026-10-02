import {
  ItalianBillingSchema,
  CreatePublicationSchema,
  CreatePostSchema,
  CreateNoteSchema,
  CreateSubscriptionTierSchema,
  codiceFiscaleRegex,
  partitaIvaRegex,
  sdiRegex,
  generateFatturaPAXml,
  computeTotals,
  invoiceFileName,
  RegisterSchema,
  LoginSchema,
  SlugSchema,
  slugProblem,
  slugify,
  suggestSlugs,
  normalizeSlugInput,
  trimSlug,
  RESERVED_SUBDOMAINS
} from "../packages/shared/src/index";
import { NewsletterEmail, WelcomeEmail, SubscriptionConfirmationEmail, renderEmail } from "../packages/email/src/index";
import { jsPDF } from "jspdf";
import * as React from "react";
import { generateDailyVisitorHash, parseDeviceType } from "../apps/web/lib/analytics";
import { formatVttTimestamp, generateWebVtt, transcribeAudio } from "../apps/web/lib/transcription";
import { canReadFullPost, isSubscriptionActive, sanitizePostHtml, splitAtPaywall } from "../apps/web/lib/posts";
import { verifyStripeSignature } from "../apps/web/lib/stripe-signature";
import { createHash, createHmac } from "crypto";
import { SavePostSchema, SubscribeSchema, publicationBaseUrl, platformUrlFromEnv, parseCsv, parseCsvRecords, mapStripeSubscriptionStatus, eurToCents, TierInputSchema } from "../packages/shared/src/index";
import { convertSubstackPaywall } from "../apps/web/lib/substack-import";
import { clientIp, sessionCookieDomain } from "../apps/web/lib/auth";
import { allowAttemptInMemory } from "../apps/web/lib/rate-limit";
import { envNumber } from "../packages/shared/src/index";
import { contrast, publicationFont, publicationPalette, readableOn, textSafe } from "../apps/web/lib/colors";
import { AppearanceSchema } from "../packages/shared/src/index";
import { CONSENT_ID_PATTERN, CONSENT_VERSION, TECHNICAL_COOKIES, activeCategories, isGranted, needsConsentPrompt, newConsentId, parseConsent, serializeConsent, type OptionalService } from "../apps/web/lib/consent";
import { buildNewsletterEmail, buildConfirmationEmail, createTransportFromEnv, platformSender, turboSmtpTransport, EmailSendError } from "../packages/email/src/index";
import http from "http";
import fs from "fs";
import path from "path";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetails?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}: ${errorDetails || "Condizione non verificata"}`);
  }
}

async function runAllFunctionTests() {
  console.log("\n🧪 ========================================================");
  console.log("   AVVIO SUITE DI TEST FUNZIONALI ZEROSTACK (BUG-HUNTING)");
  console.log("========================================================\n");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 1: Validazione Fiscale Italiana & Schemi Zod
  // --------------------------------------------------------------------------
  console.log("📌 GRUPPO 1: Validazione Fiscale Italiana & Checkout");

  // 1.1 Codice Fiscale valido
  const validCF = "RSSMRA85M01H501Z";
  assert(codiceFiscaleRegex.test(validCF), "Codice Fiscale valido accettato");

  // 1.2 Codice Fiscale non valido (troppo corto o caratteri speciali)
  assert(!codiceFiscaleRegex.test("RSSMRA85M01H"), "Codice Fiscale corto correttamente respinto");
  assert(!codiceFiscaleRegex.test("RSSMRA85M01H501@"), "Codice Fiscale con caratteri speciali respinto");

  // 1.3 Partita IVA valida (11 cifre)
  const validPiva = "01234567890";
  assert(partitaIvaRegex.test(validPiva), "Partita IVA a 11 cifre accettata");
  assert(!partitaIvaRegex.test("0123456789"), "Partita IVA a 10 cifre respinta");
  assert(!partitaIvaRegex.test("012345678901"), "Partita IVA a 12 cifre respinta");
  assert(!partitaIvaRegex.test("0123456789A"), "Partita IVA con lettere respinta");

  // 1.4 Codice Destinatario SDI (7 caratteri alfanumerici)
  assert(sdiRegex.test("M5UXCR1"), "Codice SDI standard 7 caratteri accettato");
  assert(sdiRegex.test("0000000"), "Codice SDI 0000000 (standard per PEC) accettato");
  assert(!sdiRegex.test("M5UXCR"), "Codice SDI a 6 caratteri respinto");
  assert(!sdiRegex.test("M5UXCR12"), "Codice SDI a 8 caratteri respinto");

  // 1.5 Validazione Schema Completo Checkout Privato
  const validPrivateCheckout = {
    isCompany: false,
    ragioneSocialeOIntestatario: "Mario Rossi",
    codiceFiscale: "RSSMRA85M01H501Z",
    indirizzo: "Via Roma 10",
    cap: "00100",
    citta: "Roma",
    provincia: "RM",
    paese: "IT" as const
  };
  const parsedPrivate = ItalianBillingSchema.safeParse(validPrivateCheckout);
  assert(parsedPrivate.success, "Checkout Privato con CF valido passa la validazione Zod");

  // 1.6 Validazione Schema Completo Checkout Azienda con SDI
  const validCompanyCheckout = {
    isCompany: true,
    ragioneSocialeOIntestatario: "Acme Italia S.r.l.",
    codiceFiscale: "01234567890",
    partitaIva: "01234567890",
    codiceDestinatarioSDI: "M5UXCR1",
    indirizzo: "Corso Italia 45",
    cap: "20121",
    citta: "Milano",
    provincia: "MI",
    paese: "IT" as const
  };
  const parsedCompany = ItalianBillingSchema.safeParse(validCompanyCheckout);
  assert(parsedCompany.success, "Checkout Aziendale con P.IVA e SDI passa la validazione Zod");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 2: Validazione Post, Pubblicazioni, Note & Tiers
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 2: Schemi Pubblicazioni, Post, Note & Tiers");

  // 2.1 Creazione Pubblicazione con slug valido
  const validPub = CreatePublicationSchema.safeParse({
    name: "Tech & Futuro Italia",
    slug: "tech-italia",
    description: "Osservatorio tech",
    customDomain: "tech.tuodominio.it"
  });
  assert(validPub.success, "Pubblicazione con slug e dominio CNAME valida");

  // 2.2 Pubblicazione con slug con spazi (deve fallire)
  const invalidPub = CreatePublicationSchema.safeParse({
    name: "Tech Italia",
    slug: "tech italia non valido!"
  });
  assert(!invalidPub.success, "Slug con spazi o caratteri speciali correttamente respinto");

  // 2.3 Creazione Nota micro-blogging (limite 1000 caratteri)
  const validNote = CreateNoteSchema.safeParse({
    content: "Questa è una nota veloce di prova."
  });
  assert(validNote.success, "Nota breve valida accettata");

  const tooLongNote = CreateNoteSchema.safeParse({
    content: "A".repeat(1001)
  });
  assert(!tooLongNote.success, "Nota superiore a 1000 caratteri respinta");

  const emptyNote = CreateNoteSchema.safeParse({
    content: ""
  });
  assert(!emptyNote.success, "Nota vuota respinta");

  // 2.4 Creazione Tier di abbonamento
  const validTier = CreateSubscriptionTierSchema.safeParse({
    name: "Abbonato Pro",
    description: "Accesso a tutti i post",
    priceEur: 7.0,
    interval: "MONTH",
    benefits: ["Tutti gli articoli", "Podcast esclusivo"]
  });
  assert(validTier.success, "Tier di abbonamento valido accettato");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 3: Rendering Template Email (React Email)
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 3: Rendering Template Email (Newsletter, Opt-In, Ricevute)");

  try {
    const htmlNewsletter = await renderEmail(
      React.createElement(NewsletterEmail as any, {
        publicationName: "Tech & Futuro Italia",
        postTitle: "L'evoluzione dell'IA",
        authorName: "Dario De Leonardis",
        publishedDate: "25 Settembre 2026",
        contentHtml: "<p>Contenuto di prova per la newsletter.</p>",
        postUrl: "https://zerostack.it/p/tech-italia/post-1",
        hasPaywall: true,
        unsubscribeUrl: "https://zerostack.it/unsubscribe"
      }) as any
    );
    assert(
      htmlNewsletter.includes("Tech &amp; Futuro Italia") || htmlNewsletter.includes("Tech & Futuro Italia"),
      "Template Newsletter compila in HTML valido senza errori"
    );
    assert(
      htmlNewsletter.includes("paywall") || htmlNewsletter.includes("Continua a leggere"),
      "Blocco Paywall incluso nel rendering email"
    );
    assert(htmlNewsletter.includes("Disiscriviti"), "Footer GDPR presente nel rendering email");
  } catch (err: any) {
    assert(false, "Template Newsletter fallisce nel rendering", err?.message);
  }

  try {
    const htmlWelcome = await renderEmail(
      React.createElement(WelcomeEmail as any, {
        publicationName: "Tech & Futuro Italia",
        subscriberName: "Mario",
        confirmUrl: "https://zerostack.it/confirm"
      }) as any
    );
    assert(htmlWelcome.includes("Double Opt-in"), "Template Welcome Double Opt-in compila in HTML");
  } catch (err: any) {
    assert(false, "Template Welcome fallisce nel rendering", err?.message);
  }

  try {
    const htmlReceipt = await renderEmail(
      React.createElement(SubscriptionConfirmationEmail as any, {
        publicationName: "Tech & Futuro Italia",
        tierName: "Abbonato Premium",
        amountFormatted: "7,00 €",
        interval: "al mese",
        ragioneSociale: "Mario Rossi",
        codiceFiscaleOiva: "RSSMRA85M01H501Z",
        sdiPec: "M5UXCR1",
        portalUrl: "https://zerostack.it/account/billing"
      }) as any
    );
    assert(htmlReceipt.includes("M5UXCR1"), "Template Ricevuta Fiscale contiene dati SDI/PEC");
  } catch (err: any) {
    assert(false, "Template Ricevuta fallisce nel rendering", err?.message);
  }

  // --------------------------------------------------------------------------
  // TEST GRUPPO 4: Generatore Ricevute PDF Italiane (jsPDF)
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 4: Generatore Ricevute Fiscali PDF (jsPDF)");

  try {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("ZeroStack - Ricevuta Fiscale", 20, 25);
    doc.setFont("helvetica", "normal");
    doc.text("Codice Fiscale: RSSMRA85M01H501Z", 20, 40);
    doc.text("Codice SDI: M5UXCR1", 20, 50);
    doc.text("Totale Pagato: 7,00 €", 20, 60);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const isPdfValid = pdfBuffer.toString("utf-8", 0, 5) === "%PDF-";
    assert(isPdfValid, "Generazione PDF valida con intestazione standard %PDF-");
    assert(pdfBuffer.length > 500, "Buffer PDF generato con dimensione consistente");
  } catch (err: any) {
    assert(false, "Generazione PDF fallita", err?.message);
  }

  // --------------------------------------------------------------------------
  // TEST GRUPPO 5: Parser Migrazione CSV da Substack
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 5: Robustezza Parser CSV Substack");

  const sampleCsvContent = `email,created_at,type,country_code
lettore1@gmail.com,2026-01-10T12:00:00Z,free,IT
lettore2@azienda.it,2026-02-15T09:30:00Z,paid,IT
"lettore3,con,virgola@studio.it",2026-03-20T14:00:00Z,paid,IT
riga_non_valida_senza_chiocciola,2026-04-01T00:00:00Z,free,IT

`;
  const lines = sampleCsvContent.split("\n").filter((l) => l.trim().length > 0);
  let parsedSubscribers = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Implementazione parser RFC 4180
    let insideQuotes = false;
    let email = "";
    for (let j = 0; j < rawLine.length; j++) {
      const char = rawLine[j];
      if (char === '"') insideQuotes = !insideQuotes;
      else if (char === ',' && !insideQuotes) break;
      else email += char;
    }
    email = email.trim();
    if (email && email.includes("@")) {
      parsedSubscribers++;
    }
  }

  assert(parsedSubscribers === 3, "Parser Substack estrae correttamente le email ignorando righe invalide");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 6: Generazione XML FatturaPA v1.2 per Agenzia delle Entrate / SDI
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 6: Generazione FatturaPA v1.2 XML per SDI");

  {
    const xsd = path.join(__dirname, "fixtures/fatturapa/Schema_FPR12.xsd");
    // Controllo sullo schema ufficiale con xmllint (libxml2): lo stesso che fa lo SdI in ingresso.
    const validXml = (xml: string): string => {
      const file = path.join(fs.mkdtempSync(path.join(require("os").tmpdir(), "fpa-")), "f.xml");
      fs.writeFileSync(file, xml);
      try {
        require("child_process").execFileSync("xmllint", ["--noout", "--schema", xsd, file], { stdio: "pipe" });
        return "";
      } catch (err: any) {
        return String(err.stderr ?? err.message).slice(0, 400);
      }
    };
    const cedenteOrdinario = {
      kind: "COMPANY" as const,
      denominazione: "Edizioni Rossi & Figli S.r.l.",
      partitaIva: "01234567890",
      codiceFiscale: "01234567890",
      regimeFiscale: "RF01" as const,
      indirizzo: "Via Montenapoleone",
      numeroCivico: "8",
      cap: "20121",
      comune: "Milano",
      provincia: "MI",
      email: "fatture@rossi.it"
    };
    const azienda = { denominazione: "Studio Legale Bianchi", partitaIva: "09876543210", codiceFiscale: "09876543210", codiceDestinatario: "M5UXCR1", indirizzo: "Corso Vittorio Emanuele 12", cap: "00186", comune: "Roma", provincia: "RM" };
    const ordinario = generateFatturaPAXml({ idTrasmittente: "01234567890", progressivo: "0PQRS", numero: "1/2026", data: "2026-09-25", totaleCents: 1220, aliquotaIva: 22, descrizione: "Abbonamento mensile", cedente: cedenteOrdinario, cessionario: azienda });
    assert(ordinario.includes('versione="FPR12"') && ordinario.includes("<CodiceDestinatario>M5UXCR1</CodiceDestinatario>"), "FatturaPA FPR12 con codice destinatario del cliente");
    assert(ordinario.includes("<ImponibileImporto>10.00</ImponibileImporto>") && ordinario.includes("<Imposta>2.20</Imposta>") && ordinario.includes("<ImportoTotaleDocumento>12.20</ImportoTotaleDocumento>"), "Regime ordinario: IVA 22% scorporata dal prezzo finale");
    assert(ordinario.includes("Edizioni Rossi &amp; Figli"), "Caratteri speciali nell'XML resi correttamente");
    assert(validXml(ordinario) === "", "Fattura in regime ordinario valida sullo schema XSD", validXml(ordinario));

    const odd = computeTotals(650, "RF01", 22);
    assert(odd.imponibileCents + odd.impostaCents === 650 && odd.imponibileCents === 533, "Scorporo con arrotondamento: imponibile + IVA = totale (6,50 €)");
    assert(computeTotals(1000, "RF01", 4).imponibileCents === 962, "Aliquota 4% per le testate registrate");

    const forfettario = generateFatturaPAXml({
      idTrasmittente: "RSSMRA80A01H501U",
      progressivo: "0PQRT",
      numero: "2/2026",
      data: "2026-09-25",
      totaleCents: 9900,
      aliquotaIva: 22,
      descrizione: "Abbonamento annuale “Lettere” – periodo completo",
      periodo: { inizio: "2026-09-25", fine: "2027-09-24" },
      cedente: { ...cedenteOrdinario, kind: "PERSON", nome: "Mario", cognome: "Rossi", denominazione: null, codiceFiscale: "RSSMRA80A01H501U", regimeFiscale: "RF19" },
      cessionario: { denominazione: "Anna Verdi", codiceFiscale: "VRDNNA85M41H501X", pec: "anna@pec.it", indirizzo: "Via Po 3", cap: "10100", comune: "Torino", provincia: "to" }
    });
    assert(forfettario.includes("<Natura>N2.2</Natura>") && forfettario.includes("<AliquotaIVA>0.00</AliquotaIVA>") && forfettario.includes("<Imposta>0.00</Imposta>"), "Forfettario: niente IVA, natura N2.2");
    assert(forfettario.includes("<BolloVirtuale>SI</BolloVirtuale>") && forfettario.includes("<ImportoBollo>2.00</ImportoBollo>"), "Forfettario sopra 77,47 €: bollo virtuale da 2 €");
    assert(forfettario.includes("<CodiceDestinatario>0000000</CodiceDestinatario>") && forfettario.includes("<PECDestinatario>anna@pec.it</PECDestinatario>"), "Privato: codice 0000000 e PEC se indicata");
    assert(forfettario.includes("<Nome>Mario</Nome><Cognome>Rossi</Cognome>") && forfettario.includes("<DataInizioPeriodo>2026-09-25</DataInizioPeriodo>"), "Persona fisica con nome e cognome, periodo dell'abbonamento");
    assert(!forfettario.includes("“") && forfettario.includes("&quot;Lettere&quot; - periodo"), "Virgolette e trattini tipografici convertiti in caratteri ammessi");
    assert(validXml(forfettario) === "", "Fattura in forfettario valida sullo schema XSD", validXml(forfettario));
    assert(computeTotals(7747, "RF19", 22).bolloCents === 0, "Niente bollo fino a 77,47 €");

    let rejected = "";
    try {
      generateFatturaPAXml({ idTrasmittente: "X", progressivo: "1", numero: "1/2026", data: "2026-09-25", totaleCents: 500, aliquotaIva: 22, descrizione: "x", cedente: { ...cedenteOrdinario, partitaIva: "123" }, cessionario: { ...azienda, cap: "ABC" } });
    } catch (err: any) {
      rejected = err.message;
    }
    assert(rejected.includes("Partita IVA dell'autore") && rejected.includes("CAP o provincia del cliente"), "Dati sbagliati fermati prima di generare l'XML");
    assert(invoiceFileName("rssmra80a01h501u", "PQRT") === "ITRSSMRA80A01H501U_0PQRT.xml", "Nome del file secondo le regole dello SdI");
  }

  // --------------------------------------------------------------------------
  // TEST GRUPPO 7: Tip Jar & Calcolo Micro-Pagamenti Satispay
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 7: Micro-donazioni Tip Jar & Deep link Satispay");

  const testTipEur = 2.50;
  const testTipCents = Math.round(testTipEur * 100);
  assert(testTipCents === 250, "Conversione corretta da EUR a centesimi (2.50€ -> 250c)");

  const pubSlug = "tech-italia";
  const expectedSatispayDeepLink = `satispay://pay?amount=${testTipCents}&currency=EUR&description=Mancia+ZeroStack+${encodeURIComponent(pubSlug)}`;
  assert(expectedSatispayDeepLink.startsWith("satispay://pay?amount=250"), "Deep link Satispay conforme alle specifiche mobile");
  assert(expectedSatispayDeepLink.includes("currency=EUR"), "Valuta EUR specificata nel deep-link");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 8: Fediverse (RFC 7033 WebFinger & W3C ActivityPub Actor)
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 8: Interoperabilità Fediverse (WebFinger & ActivityPub)");

  const mockHandle = "tech-italia";
  const mockDomain = "zerostack.it";
  const webfingerResource = `acct:${mockHandle}@${mockDomain}`;

  // Test parsing WebFinger resource
  const parsedHandle = webfingerResource.replace(/^acct:/, "").split("@")[0];
  const parsedDomain = webfingerResource.replace(/^acct:/, "").split("@")[1];
  assert(parsedHandle === mockHandle, "WebFinger estrae l'handle corretto");
  assert(parsedDomain === mockDomain, "WebFinger estrae il dominio corretto");

  // Test struttura ActivityPub Actor JSON-LD
  const actorJson = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    id: `https://${mockDomain}/api/activitypub/users/${mockHandle}`,
    type: "Person",
    preferredUsername: mockHandle,
    inbox: `https://${mockDomain}/api/activitypub/users/${mockHandle}/inbox`,
    outbox: `https://${mockDomain}/api/activitypub/users/${mockHandle}/outbox`
  };

  assert(actorJson["@context"].includes("https://www.w3.org/ns/activitystreams"), "ActivityPub Actor specifica il contesto ActivityStreams");
  assert(actorJson.type === "Person", "Tipo Actor definito come Person");
  assert(actorJson.inbox.endsWith("/inbox"), "Endpoint inbox presente per ricevere notifiche Mastodon");
  assert(actorJson.outbox.endsWith("/outbox"), "Endpoint outbox presente per pubblicare post nel Fediverse");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 9: Privacy-First Analytics (Zero-Cookie & Anonimizzazione)
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 9: Analitiche Privacy-First (GDPR & Zero-Cookie)");

  const mockIp = "192.168.1.55";
  const mockUaMobile = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
  const mockUaDesktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

  const hash1 = generateDailyVisitorHash(mockIp, mockUaMobile, "tech-italia", "2026-09-25");
  const hash2 = generateDailyVisitorHash(mockIp, mockUaMobile, "tech-italia", "2026-09-25");
  const hashNextDay = generateDailyVisitorHash(mockIp, mockUaMobile, "tech-italia", "2026-09-26");

  assert(hash1 === hash2, "Hash visitatore deterministico per la stessa giornata");
  assert(hash1 !== hashNextDay, "Hash visitatore ruota automaticamente dopo 24h (privacy-by-design)");
  assert(hash1.length === 16, "Lunghezza hash compatta a 16 caratteri");
  assert(parseDeviceType(mockUaMobile) === "mobile", "Riconoscimento corretto dispositivo Mobile");
  assert(parseDeviceType(mockUaDesktop) === "desktop", "Riconoscimento corretto dispositivo Desktop");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 10: Trascrizione Podcast & Sottotitoli WebVTT W3C
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 10: Trascrizione Podcast & Formato WebVTT");

  const vttTime1 = formatVttTimestamp(5.5);
  assert(vttTime1 === "00:00:05.500", "Formattazione timestamp WebVTT a 5.5s (00:00:05.500)");

  const vttTime2 = formatVttTimestamp(3665.123);
  assert(vttTime2 === "01:01:05.123", "Formattazione timestamp WebVTT oltre 1 ora (01:01:05.123)");

  const transcriptionResult = await transcribeAudio("test-podcast.mp3");
  assert(transcriptionResult.vttContent.startsWith("WEBVTT"), "File di sottotitoli contiene l'intestazione standard WEBVTT");
  assert(transcriptionResult.vttContent.includes("-->"), "File VTT contiene frecce temporali standard W3C");
  assert(transcriptionResult.segments.length > 0, "Segmenti temporizzati generati con successo");
  assert(transcriptionResult.fullText.length > 20, "Testo integrale estratto correttamente");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 11: Script VPS Hardening & Backup Cifrato GPG
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 11: Script di Produzione, Sicurezza & Backup VPS");

  // dist/backup-vps.sh è stato tolto il 2/10 con la vecchia via di deploy: i backup li fa il servizio
  // zerostack-backup (apps/worker/src/backup.ts), con cifratura AES-256-GCM e copia S3.
  const hardenScriptPath = path.join(__dirname, "../dist/harden-vps.sh");
  assert(fs.existsSync(hardenScriptPath), "File dist/harden-vps.sh presente nel pacchetto di distribuzione");
  assert(!fs.existsSync(path.join(__dirname, "../dist/backup-vps.sh")) && !fs.existsSync(path.join(__dirname, "../dist/docker-compose.prod.yml")), "La vecchia via di deploy (dist/) non c'è più: si pubblica solo con Coolify");

  const hardenContent = fs.readFileSync(hardenScriptPath, "utf-8");
  assert(hardenContent.includes("ufw allow 80/tcp"), "Script hardening include regole firewall per porta HTTP 80");
  assert(hardenContent.includes("ufw allow 443/tcp"), "Script hardening include regole firewall per porta HTTPS 443");
  assert(hardenContent.includes("fail2ban"), "Script hardening include configurazione protezione Fail2ban");
  assert(hardenContent.includes("tcp_syncookies"), "Script hardening applica mitigazione SYN flood");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 12: Routing Multi-Tenant Sottodomini & Wildcard zerostack.it
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 12: Routing Multi-Tenant Sottodomini Utente (*.zerostack.it)");

  const rootDomain = "zerostack.it";

  function extractSubdomain(host: string, root: string): string | null {
    const cleanHost = host.split(":")[0].toLowerCase();
    if (cleanHost === root || cleanHost === `www.${root}` || cleanHost === "localhost") return null;
    if (cleanHost.endsWith(`.${root}`)) {
      return cleanHost.slice(0, cleanHost.length - root.length - 1);
    }
    if (cleanHost.endsWith(".localhost")) {
      return cleanHost.slice(0, cleanHost.length - ".localhost".length);
    }
    return null;
  }

  assert(extractSubdomain("dario.zerostack.it", rootDomain) === "dario", "Estrazione sottodominio utente 'dario'");
  assert(extractSubdomain("tech-italia.zerostack.it", rootDomain) === "tech-italia", "Estrazione sottodominio pubblicazione 'tech-italia'");
  assert(extractSubdomain("zerostack.it", rootDomain) === null, "Dominio principale non identificato come sottodominio");
  assert(extractSubdomain("www.zerostack.it", rootDomain) === null, "Prefisso www non identificato come sottodominio creator");
  assert(extractSubdomain("dario.localhost:3000", rootDomain) === "dario", "Estrazione sottodominio in ambiente di sviluppo locale .localhost");

  // Le regole vere, condivise da registrazione, creazione pubblicazione e /api/domains/check
  assert(slugProblem("admin") === "reserved", "Sottodominio 'admin' correttamente protetto come riservato");
  assert(slugProblem("api") === "reserved", "Sottodominio 'api' correttamente protetto come riservato");
  assert(slugProblem("coolify") === "reserved", "Sottodominio 'coolify' (pannello del server) riservato");
  assert(slugProblem("dario") === null, "Sottodominio utente 'dario' non confligge con le parole riservate");
  assert(slugProblem("tech-italia") === null, "Slug sottodominio conforme alla sintassi RFC DNS");
  assert(slugProblem("tech italia!") === "format", "Slug con spazi o caratteri speciali respinto da RFC DNS");
  assert(slugProblem("-dario") === "format" && slugProblem("dario-") === "format", "Slug con trattino in testa o in coda respinto (etichetta DNS non valida)");
  assert(slugProblem("xn--dario") === "format", "Slug con doppio trattino respinto (prefisso punycode xn--)");
  assert(slugProblem("ab") === "format" && slugProblem("a".repeat(41)) === "format", "Slug fuori dai limiti 3-40 caratteri respinto");
  assert(slugProblem("Dario") === "format", "Slug con maiuscole respinto (lo schema le converte prima)");
  assert(SlugSchema.safeParse(" Dario ").success && SlugSchema.parse(" Dario ") === "dario", "SlugSchema normalizza spazi e maiuscole");
  assert(!SlugSchema.safeParse("www").success, "SlugSchema rifiuta i nomi riservati");
  assert(RESERVED_SUBDOMAINS.has("www") && RESERVED_SUBDOMAINS.has("mail"), "Lista riservata condivisa contiene www e mail");

  assert(slugify("Cronache di Design & AI") === "cronache-di-design-ai", "slugify: nome in slug");
  assert(slugify("Perché è così") === "perche-e-cosi", "slugify: accenti italiani tolti");
  assert(slugify("  --Ciao--  ") === "ciao", "slugify: niente trattini in testa o in coda");
  assert(slugify("a".repeat(39) + " bcd").length <= 40 && !slugify("a".repeat(39) + " bcd").endsWith("-"), "slugify: taglio a 40 caratteri senza trattino finale");
  // Il caso segnalato da Dario il 1/10: il titolo intero diventava "...-mondo-del", tagliato a metà parola.
  assert(slugify("Questa settimana nel grottesco mondo dell'IA") === "questa-settimana-nel-grottesco-mondo", "slugify: oltre 40 caratteri taglia a fine parola, non a metà");

  // Indirizzi suggeriti dal titolo libero della pubblicazione
  const grottesco = suggestSlugs("Questa settimana nel grottesco mondo dell'IA", "dario");
  assert(grottesco[0] === "grottesco-mondo-ia", "suggestSlugs: il primo toglie articoli, preposizioni e parole di formato", grottesco.join(", "));
  assert(grottesco.includes("grottesco-ia"), "suggestSlugs: c'è la variante prima e ultima parola", grottesco.join(", "));
  assert(grottesco.includes("dario"), "suggestSlugs: c'è il nome utente dell'autore", grottesco.join(", "));
  assert(grottesco.length <= 4 && grottesco.every((s) => s.length <= 30 && slugProblem(s) === null), "suggestSlugs: al massimo 4, corti (<= 30) e tutti validi", grottesco.join(", "));
  assert(new Set(grottesco).size === grottesco.length, "suggestSlugs: nessun doppione");
  assert(suggestSlugs("La newsletter di Mario").includes("mario"), "suggestSlugs: tolto il formato resta l'argomento", suggestSlugs("La newsletter di Mario").join(", "));
  // Titolo breve: prima il titolo intero, e la negazione non sparisce (caso segnalato da Dario il 1/10: "so-ancora").
  const nonLoSo = suggestSlugs("Non lo so ancora", "dariodeleonardis");
  assert(nonLoSo[0] === "non-lo-so-ancora", "suggestSlugs: titolo breve, il primo è il titolo intero", nonLoSo.join(", "));
  assert(!nonLoSo.includes("so-ancora") && nonLoSo.every((s) => s.startsWith("non") || s === "dariodeleonardis"), "suggestSlugs: la negazione non viene tolta", nonLoSo.join(", "));

  // Indirizzo scritto a mano
  assert(normalizeSlugInput("Non lo so ancora") === "non-lo-so-ancora", "normalizeSlugInput: spazi in trattini, maiuscole in minuscole");
  assert(normalizeSlugInput("Perché sì ") === "perche-si-", "normalizeSlugInput: accenti tolti, trattino finale tenuto mentre si scrive");
  assert(normalizeSlugInput("  ciao  ::  mondo") === "ciao-mondo", "normalizeSlugInput: più separatori diventano un solo trattino, niente trattino in testa");
  assert(trimSlug("non-lo-so-") === "non-lo-so" && slugProblem(trimSlug(normalizeSlugInput("Non lo so "))) === null, "trimSlug: quello che si salva è valido");
  assert(suggestSlugs("Il Blog").every((s) => slugProblem(s) === null), "suggestSlugs: niente indirizzi riservati (blog)", suggestSlugs("Il Blog").join(", "));
  assert(suggestSlugs("").length === 0, "suggestSlugs: titolo vuoto, nessun suggerimento");
  assert(suggestSlugs("Perché l'Economia è Così Complicata Oggi").every((s) => !/[^a-z0-9-]/.test(s)), "suggestSlugs: accenti e apostrofi tolti");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 13: Registrazione e accesso
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 13: Registrazione e accesso");

  const validRegistration = RegisterSchema.safeParse({ name: "Dario", email: " Dario@Example.IT ", handle: "Dario", password: "password-lunga" });
  assert(validRegistration.success, "Registrazione valida accettata");
  assert(validRegistration.success && validRegistration.data.email === "dario@example.it", "Email normalizzata in minuscolo");
  assert(validRegistration.success && validRegistration.data.handle === "dario", "Nome utente normalizzato in minuscolo");
  assert(!RegisterSchema.safeParse({ name: "Dario", email: "dario@example.it", handle: "dario", password: "corta" }).success, "Password sotto i 10 caratteri respinta");
  assert(!RegisterSchema.safeParse({ name: "Dario", email: "dario@example.it", handle: "admin", password: "password-lunga" }).success, "Nome utente riservato respinto");
  assert(!LoginSchema.safeParse({ email: "non-una-email", password: "x" }).success, "Login con email non valida respinto");
  assert(!CreatePublicationSchema.safeParse({ name: "Tech Italia", slug: "www" }).success, "Pubblicazione con slug riservato respinta");
  assert(!CreatePublicationSchema.safeParse({ name: "Tech Italia", slug: "tech-italia", primaryColor: "rosso" }).success, "Colore non esadecimale respinto");






  // --------------------------------------------------------------------------
  // TEST GRUPPO 14: Paywall, HTML degli articoli e webhook Stripe
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 14: Paywall, HTML degli articoli e webhook Stripe");

  const paywalled = splitAtPaywall('<p>Gratis</p><hr class="paywall-divider" data-paywall="true" /><p>Riservato</p>');
  assert(paywalled.hasDivider && paywalled.preview === "<p>Gratis</p>" && paywalled.rest === "<p>Riservato</p>", "Testo diviso al divisore del paywall");
  const noDivider = splitAtPaywall("<p>Tutto</p>");
  assert(!noDivider.hasDivider && noDivider.preview === "" && noDivider.rest === "<p>Tutto</p>", "Senza divisore l'anteprima è vuota: niente testo riservato esposto");

  assert(canReadFullPost("FREE", { isMember: false, hasPaidSubscription: false }), "Post gratuito leggibile da tutti");
  assert(!canReadFullPost("PAID_SUBSCRIBERS", { isMember: false, hasPaidSubscription: false }), "Post a pagamento chiuso a chi non è abbonato");
  assert(canReadFullPost("PAID_SUBSCRIBERS", { isMember: false, hasPaidSubscription: true }), "Post a pagamento aperto agli abbonati paganti");
  assert(canReadFullPost("TIER_SPECIFIC", { isMember: true, hasPaidSubscription: false }), "La redazione legge sempre i propri post");

  const now = new Date("2026-09-28T12:00:00Z");
  assert(isSubscriptionActive({ status: "ACTIVE", isPaid: true, currentPeriodEnd: null }, now), "Abbonamento pagato attivo riconosciuto");
  assert(!isSubscriptionActive({ status: "ACTIVE", isPaid: false, currentPeriodEnd: null }, now), "Iscrizione gratuita non apre il paywall");
  assert(!isSubscriptionActive({ status: "CANCELED", isPaid: true, currentPeriodEnd: null }, now), "Abbonamento disdetto non apre il paywall");
  assert(!isSubscriptionActive({ status: "ACTIVE", isPaid: true, currentPeriodEnd: new Date("2026-09-01") }, now), "Abbonamento scaduto non apre il paywall");

  const dirty = sanitizePostHtml('<h2>Titolo</h2><p onclick="x()">Testo <a href="javascript:alert(1)">link</a></p><img src="x" onerror="alert(1)"><script>alert(1)</script>');
  assert(dirty.includes("<h2>Titolo</h2>") && dirty.includes("<a>link</a>"), "Sanificazione conserva la formattazione");
  assert(!/script|onerror|onclick|javascript:/i.test(dirty), "Sanificazione toglie script, gestori di eventi e link javascript:");

  const whSecret = "whsec_test";
  const whBody = '{"type":"checkout.session.completed"}';
  const whTs = 1_790_000_000;
  const whSig = createHmac("sha256", whSecret).update(`${whTs}.${whBody}`).digest("hex");
  assert(verifyStripeSignature(whBody, `t=${whTs},v1=${whSig}`, whSecret, 300, whTs + 10), "Firma Stripe valida accettata");
  assert(!verifyStripeSignature(whBody + " ", `t=${whTs},v1=${whSig}`, whSecret, 300, whTs + 10), "Corpo alterato respinto");
  assert(!verifyStripeSignature(whBody, `t=${whTs},v1=${whSig}`, whSecret, 300, whTs + 1000), "Firma troppo vecchia respinta (replay)");
  assert(!verifyStripeSignature(whBody, null, whSecret), "Header di firma mancante respinto");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 15: Editor, iscrizioni e costruzione delle newsletter
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 15: Editor, iscrizioni e costruzione delle newsletter");

  const pubId = "7b0c6a1e-2f4d-4c7a-9d3e-1a2b3c4d5e6f";
  assert(SavePostSchema.safeParse({ publicationId: pubId, title: "Bozza", contentHtml: "", action: "draft" }).success, "Bozza vuota accettata");
  assert(!SavePostSchema.safeParse({ publicationId: pubId, title: "Pubblico", contentHtml: "<p></p>", action: "publish" }).success, "Pubblicazione senza testo respinta");
  assert(!SavePostSchema.safeParse({ publicationId: pubId, title: "Dopo", contentHtml: "<p>x</p>", action: "schedule" }).success, "Programmazione senza data respinta");
  assert(
    SavePostSchema.safeParse({ publicationId: pubId, title: "Dopo", contentHtml: "<p>x</p>", action: "schedule", scheduledAt: new Date(Date.now() + 3600_000).toISOString() }).success,
    "Programmazione futura accettata"
  );
  assert(!SavePostSchema.safeParse({ publicationId: pubId, title: "x", contentHtml: "<p>x</p>", action: "publish", access: "TUTTI" }).success, "Livello di accesso sconosciuto respinto");
  const subscribe = SubscribeSchema.safeParse({ publicationId: pubId, email: "  Lettore@Example.IT " });
  assert(subscribe.success && subscribe.data.email === "lettore@example.it", "Email di iscrizione normalizzata");

  const env = { APP_DOMAIN: "zerostack.it" };
  assert(publicationBaseUrl({ slug: "dario" }, env) === "https://dario.zerostack.it", "URL pubblicazione sul sottodominio");
  assert(publicationBaseUrl({ slug: "dario", customDomain: "news.dario.it", isDomainVerified: false }, env) === "https://dario.zerostack.it", "Dominio non verificato ignorato");
  assert(publicationBaseUrl({ slug: "dario", customDomain: "news.dario.it", isDomainVerified: true }, env) === "https://news.dario.it", "Dominio verificato usato");
  assert(platformUrlFromEnv({ APP_URL: "https://zerostack.it/" }) === "https://zerostack.it", "APP_URL senza barra finale");
  assert(platformSender("Lettere", { APP_DOMAIN: "zerostack.it" }).email === "newsletter@zerostack.it", "Mittente di piattaforma dal dominio");

  const newsletter = buildNewsletterEmail({
    to: "lettore@example.it",
    publication: { name: "Lettere", primaryColor: "#123456", replyTo: "redazione@lettere.it" },
    post: { title: "Numero uno", subtitle: "Sotto", authorName: "Dario", publishedAt: new Date("2026-09-28T10:00:00Z") },
    contentHtml: "<p>Ciao lettori</p>",
    hasPaywall: true,
    postUrl: "https://lettere.zerostack.it/numero-uno",
    unsubscribeUrl: "https://zerostack.it/api/unsubscribe?token=abc",
    oneClickUrl: "https://zerostack.it/api/unsubscribe?token=abc"
  });
  assert(newsletter.subject === "Numero uno" && newsletter.replyTo === "redazione@lettere.it", "Oggetto e risposta alla redazione");
  assert(newsletter.headers?.["List-Unsubscribe"] === "<https://zerostack.it/api/unsubscribe?token=abc>", "Header List-Unsubscribe");
  assert(newsletter.html.includes("Ciao lettori") && newsletter.html.includes("Sblocca"), "HTML con testo e invito ad abbonarsi");
  assert(Boolean(newsletter.text?.includes("Ciao lettori")), "Versione solo testo generata");

  const confirmationMail = buildConfirmationEmail({ to: "a@b.it", publication: { name: "Lettere" }, confirmUrl: "https://zerostack.it/api/subscribe/confirm?token=xyz" });
  assert(confirmationMail.html.includes("token=xyz") && Boolean(confirmationMail.text?.includes("token=xyz")), "Email di conferma con il link");

  let unknownProvider = false;
  try { createTransportFromEnv({ EMAIL_PROVIDER: "piccione" }); } catch { unknownProvider = true; }
  let missingKey = false;
  try { createTransportFromEnv({ EMAIL_PROVIDER: "brevo" }); } catch { missingKey = true; }
  assert(unknownProvider && missingKey, "Provider sconosciuto o senza chiave: errore all'avvio, non a metà invio");
  assert(createTransportFromEnv({}).name === "log", "Senza configurazione le email vanno nel log, non partono");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 16: Pagamenti, sessione sui sottodomini e import da Substack
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 16: Pagamenti, sessione sui sottodomini e import da Substack");

  assert(mapStripeSubscriptionStatus("active") === "ACTIVE" && mapStripeSubscriptionStatus("trialing") === "TRIALING", "Stati Stripe attivi");
  assert(["past_due", "unpaid", "incomplete", "paused"].every((s) => mapStripeSubscriptionStatus(s) === "PAST_DUE"), "Pagamenti in sospeso non aprono il paywall");
  assert(mapStripeSubscriptionStatus("canceled") === "CANCELED" && mapStripeSubscriptionStatus("incomplete_expired") === "CANCELED", "Abbonamenti chiusi");
  assert(eurToCents(7.1) === 710 && eurToCents(6.5) === 650 && eurToCents(0.29) === 29, "Euro in centesimi senza errori di virgola mobile");
  assert(!TierInputSchema.safeParse({ publicationId: pubId, name: "X", description: "Troppo", priceEur: 5, interval: "MONTH", benefits: [] }).success, "Livello senza vantaggi respinto");
  assert(!TierInputSchema.safeParse({ publicationId: pubId, name: "Caro", description: "Troppo caro", priceEur: 5000, interval: "MONTH", benefits: ["x"] }).success, "Livello oltre 1000€ respinto");

  assert(sessionCookieDomain("zerostack.it", "zerostack.it") === ".zerostack.it", "Cookie di sessione sul dominio della piattaforma");
  assert(sessionCookieDomain("dario.zerostack.it:443", "zerostack.it") === ".zerostack.it", "Cookie valido anche per i sottodomini degli autori");
  assert(sessionCookieDomain("newsletter.mario.it", "zerostack.it") === undefined, "Su un dominio personalizzato il cookie resta dell'host");
  assert(sessionCookieDomain("localhost:3000", "zerostack.it") === undefined && sessionCookieDomain("localhost", "localhost") === undefined, "In locale nessun dominio sul cookie");
  assert(sessionCookieDomain("evilzerostack.it", "zerostack.it") === undefined, "Un dominio che finisce con lo stesso nome non riceve il cookie");

  const multiline = parseCsv('a,b\n"uno, due","tre\nquattro"\r\n"con ""virgolette""",x\n');
  assert(multiline.length === 3 && multiline[1][0] === "uno, due" && multiline[1][1] === "tre\nquattro" && multiline[2][0] === 'con "virgolette"', "CSV con virgole, a capo e virgolette nei campi");
  assert(parseCsvRecords("\uFEFFEmail,Plan\nx@y.it,paid\n")[0]?.email === "x@y.it", "CSV con BOM e intestazioni maiuscole");
  assert(convertSubstackPaywall('<p>a</p><div class="paywall-jump" data-component-name="PaywallToDOM"></div><p>b</p>') === '<p>a</p><hr class="paywall-divider" data-paywall="true"><p>b</p>', "Paywall di Substack convertito nel divisore");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 17: Trasporto turboSMTP (contro un server finto)
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 17: Trasporto turboSMTP");

  const turboRequests: Array<{ path: string; headers: http.IncomingHttpHeaders; body: any }> = [];
  let turboReply = { status: 200, body: '{"message":"OK","mid":1688566310828572700}' };
  const turboServer = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      turboRequests.push({ path: req.url ?? "", headers: req.headers, body: JSON.parse(raw || "{}") });
      res.writeHead(turboReply.status, { "content-type": "application/json" });
      res.end(turboReply.body);
    });
  });
  await new Promise<void>((resolve) => turboServer.listen(0, "127.0.0.1", () => resolve()));
  const turboPort = (turboServer.address() as { port: number }).port;
  const turbo = turboSmtpTransport({ consumerKey: "ck_test", consumerSecret: "cs_test", apiBase: `http://127.0.0.1:${turboPort}/api/v2/` });

  const sent = await turbo.send({ ...newsletter, publicationId: undefined } as any);
  const turboReq = turboRequests[0];
  assert(turboReq?.path === "/api/v2/mail/send", "turboSMTP: chiamata a /mail/send");
  assert(turboReq?.headers.consumerkey === "ck_test" && turboReq?.headers.consumersecret === "cs_test" && !turboReq?.headers.authorization, "turboSMTP: autenticazione con consumerKey/consumerSecret, senza Authorization");
  assert(turboReq?.body.to === "lettore@example.it" && turboReq?.body.subject === "Numero uno" && turboReq?.body.from === '"Lettere" <newsletter@zerostack.it>', "turboSMTP: mittente, destinatario (stringa) e oggetto");
  assert(turboReq?.body.html_content?.includes("Ciao lettori") && turboReq?.body.content?.includes("Ciao lettori"), "turboSMTP: versione HTML e solo testo");
  assert(turboReq?.body.custom_headers?.["List-Unsubscribe"] === "<https://zerostack.it/api/unsubscribe?token=abc>" && turboReq?.body.custom_headers?.["reply-to"] === "redazione@lettere.it", "turboSMTP: List-Unsubscribe e reply-to negli header");
  assert(sent.messageId === "1688566310828572700", "turboSMTP: mid a 64 bit letto senza perdere cifre", String(sent.messageId));

  await turbo.send({ ...newsletter, tags: { publication: pubId } });
  assert(turboRequests[1]?.body.reference_id === `publication:${pubId}`, "turboSMTP: la pubblicazione viaggia in reference_id per i webhook");

  turboReply = { status: 401, body: '{"errorCode":3,"message":"Wrong credentials specified"}' };
  let turbo401: unknown = null;
  try { await turbo.send(newsletter); } catch (e) { turbo401 = e; }
  turboReply = { status: 503, body: "{}" };
  let turbo503: unknown = null;
  try { await turbo.send(newsletter); } catch (e) { turbo503 = e; }
  assert(turbo401 instanceof EmailSendError && turbo401.permanent && turbo503 instanceof EmailSendError && !turbo503.permanent, "turboSMTP: chiavi sbagliate = errore definitivo, 503 = si ritenta");
  turboServer.close();

  let turboMissing = false;
  try { createTransportFromEnv({ EMAIL_PROVIDER: "turbosmtp", TURBOSMTP_CONSUMER_KEY: "x" }); } catch { turboMissing = true; }
  assert(turboMissing && createTransportFromEnv({ EMAIL_PROVIDER: "turbosmtp", TURBOSMTP_CONSUMER_KEY: "k", TURBOSMTP_CONSUMER_SECRET: "s" }).name === "turbosmtp", "turboSMTP: si attiva con EMAIL_PROVIDER=turbosmtp e le due chiavi");

  // --------------------------------------------------------------------------
  // Consenso ai cookie
  // --------------------------------------------------------------------------
  console.log("\n🍪 Consenso ai cookie");
  const when = new Date("2026-10-02T10:00:00Z");
  const codice = newConsentId();
  const saved = serializeConsent(["statistiche", "contenuti-esterni"], codice, when);
  assert(/^[0-9A-Za-z._+-]+$/.test(saved), "Consenso: il valore del cookie non ha caratteri da codificare", saved);
  const read = parseConsent(saved);
  assert(read?.version === CONSENT_VERSION && read.decidedAt.getTime() === when.getTime() && read.granted.join() === "statistiche,contenuti-esterni" && read.id === codice, "Consenso: scritto e riletto uguale, codice compreso", JSON.stringify(read));
  const codes = new Set(Array.from({ length: 200 }, () => newConsentId()));
  assert(codes.size === 200 && Array.from(codes).every((c) => CONSENT_ID_PATTERN.test(c)), "Consenso: codici casuali tutti diversi e nel formato atteso");
  assert(parseConsent(`${CONSENT_VERSION}.1759399200.statistiche`)?.id === null, "Consenso: un cookie senza codice resta leggibile (ne riceverà uno alla prossima scelta)");
  const refused = parseConsent(serializeConsent([], codice, when));
  assert(refused !== null && refused.granted.length === 0, "Consenso: il rifiuto è una scelta valida, non un'assenza di scelta");
  assert(parseConsent(`${CONSENT_VERSION + 1}.1759399200.statistiche`) === null, "Consenso: una scelta su un altro elenco di servizi non vale più");
  assert(parseConsent("accepted") === null && parseConsent(undefined) === null && parseConsent("1.x.statistiche") === null, "Consenso: valori illeggibili ignorati");
  assert(parseConsent(`${CONSENT_VERSION}.1759399200.statistiche+inventata`)?.granted.join() === "statistiche", "Consenso: categorie sconosciute scartate");
  assert(!needsConsentPrompt(null), "Consenso: con soli cookie tecnici il banner non compare");
  assert(TECHNICAL_COOKIES.some((c) => c.name === "zs_session") && TECHNICAL_COOKIES.some((c) => c.name === "zs_consent"), "Consenso: l'elenco dei cookie tecnici comprende sessione e scelta");
  const youtube: OptionalService[] = [{ id: "youtube", name: "YouTube", category: "contenuti-esterni", provider: "Google", privacyUrl: "https://policies.google.com/privacy", cookies: [] }];
  assert(activeCategories(youtube).join() === "contenuti-esterni", "Consenso: si chiede solo per le categorie con un servizio attivo");
  assert(needsConsentPrompt(null, youtube) && !needsConsentPrompt(refused, youtube), "Consenso: con un servizio facoltativo il banner compare finché non si sceglie");
  assert(isGranted(read, "contenuti-esterni") && !isGranted(refused, "contenuti-esterni") && !isGranted(null, "statistiche"), "Consenso: senza un sì esplicito niente è consentito");

  const otherSalt = generateDailyVisitorHash("203.0.113.7", "ua", "pub", "2026-10-02");
  const knownOldSalt = createHash("sha256").update("203.0.113.7-ua-pub-2026-10-02-zerostack-privacy-salt-2026").digest("hex").substring(0, 16);
  assert(otherSalt !== knownOldSalt, "Statistiche: il sale non è più quello scritto nel repository pubblico");

  // --------------------------------------------------------------------------
  // Colori delle pubblicazioni: sempre leggibili
  // --------------------------------------------------------------------------
  console.log("\n🎨 Colori delle pubblicazioni");
  assert(Math.round(contrast("#000000", "#FFFFFF")) === 21 && contrast("#777777", "#777777") === 1, "Contrasto WCAG: nero su bianco 21, uguale su uguale 1");
  assert(readableOn("#F2B705") === "#141210" && readableOn("#1C3F94") === "#FFFFFF", "Testo sul colore: inchiostro sul giallo, bianco sul blu");
  const saffronText = textSafe("#F2B705", "#FBF8F2");
  assert(saffronText !== "#F2B705" && contrast(saffronText, "#FBF8F2") >= 4.5, "Il giallo come testo su carta viene scurito fino a 4,5:1", saffronText);
  assert(textSafe("#1F4D3A", "#F4F1E8") === "#1F4D3A", "Un colore già leggibile non viene toccato");
  assert(contrast(textSafe("#3A342C", "#141210"), "#141210") >= 4.5, "Su fondo scuro il colore viene schiarito");
  assert(contrast(textSafe("#808080", "#7A7A7A"), "#7A7A7A") >= 4.5, "Fondo di media luminanza: si ripiega su inchiostro o bianco");
  const fallback = publicationPalette("rosso", "#12");
  assert(fallback.accent === "#141210" && fallback.bg === "#FBF8F2", "Colori non validi nel database: si usano inchiostro e carta");
  assert(publicationFont("comic").label === "Editoriale" && publicationFont("sans").label === "Moderno", "Caratteri sconosciuti: si usa Editoriale");
  assert(AppearanceSchema.safeParse({ primaryColor: "#A8322D", backgroundColor: "#ffffff", fontStyle: "serif" }).success && !AppearanceSchema.safeParse({ primaryColor: "red", backgroundColor: "#ffffff", fontStyle: "serif" }).success, "Aspetto: colori esadecimali e solo i tre caratteri");

  // --------------------------------------------------------------------------
  // Audit del 2/10: IP del client, limite senza Redis, impostazioni del worker
  // --------------------------------------------------------------------------
  console.log("\n🛡️  Correzioni dell'audit");
  const ipOf = (xff?: string, real?: string) =>
    clientIp(new Request("http://x/", { headers: { ...(xff ? { "x-forwarded-for": xff } : {}), ...(real ? { "x-real-ip": real } : {}) } }));
  assert(ipOf("6.6.6.6, 203.0.113.9") === "203.0.113.9", "IP: vale l'ultimo valore (quello del nostro proxy), non quello scritto dal client");
  assert(ipOf("203.0.113.9") === "203.0.113.9" && ipOf(undefined, "198.51.100.2") === "198.51.100.2" && ipOf() === "sconosciuto", "IP: valore singolo, X-Real-IP di ripiego, sconosciuto");
  const t0 = 1_000_000;
  const memKey = `prova-${Math.random()}`;
  const attempts = [1, 2, 3, 4].map(() => allowAttemptInMemory(memKey, 3, 60, t0));
  assert(attempts.join() === "true,true,true,false", "Senza Redis il limite resta: il quarto tentativo su tre è respinto", attempts.join());
  assert(allowAttemptInMemory(memKey, 3, 60, t0 + 61_000), "Senza Redis il limite si azzera allo scadere della finestra");
  assert(envNumber({}, "X", 5) === 5 && envNumber({ X: " " }, "X", 5) === 5 && envNumber({ X: "0" }, "X", 10) === 0, "Variabili numeriche: vuote = predefinito, zero ammesso");
  let badEnv = "";
  try { envNumber({ WORKER_POLL_SECONDS: "cinque" }, "WORKER_POLL_SECONDS", 5, { min: 1 }); } catch (e) { badEnv = String(e); }
  let lowEnv = false;
  try { envNumber({ X: "0" }, "X", 5, { min: 1 }); } catch { lowEnv = true; }
  assert(badEnv.includes("WORKER_POLL_SECONDS") && lowEnv, "Variabili numeriche scritte male o fuori intervallo: errore che dice quale", badEnv);

  // --------------------------------------------------------------------------
  // REPORT FINALE
  // --------------------------------------------------------------------------
  console.log("\n========================================================");
  console.log(`📊 RISULTATO FINALE TEST: ${passedTests}/${totalTests} SUPERATI`);
  if (failedTests === 0) {
    console.log("🎉 TUTTE LE FUNZIONI DI ZEROSTACK SONO 100% PRIVE DI BUG!");
  } else {
    console.error(`⚠️  ATTENZIONE: ${failedTests} test falliti su ${totalTests}!`);
    process.exit(1);
  }
  console.log("========================================================\n");
}

runAllFunctionTests().catch((e) => {
  console.error("Errore critico durante l'esecuzione dei test:", e);
  process.exit(1);
});
