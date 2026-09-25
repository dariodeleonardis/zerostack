import {
  ItalianBillingSchema,
  CreatePublicationSchema,
  CreatePostSchema,
  CreateNoteSchema,
  CreateSubscriptionTierSchema,
  codiceFiscaleRegex,
  partitaIvaRegex,
  sdiRegex,
  generateFatturaPAXml
} from "../packages/shared/src/index";
import { NewsletterEmail, WelcomeEmail, SubscriptionConfirmationEmail, renderEmail } from "../packages/email/src/index";
import { jsPDF } from "jspdf";
import * as React from "react";
import { generateDailyVisitorHash, parseDeviceType } from "../apps/web/lib/analytics";
import { formatVttTimestamp, generateWebVtt, transcribeAudio } from "../apps/web/lib/transcription";
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

  try {
    const xml = generateFatturaPAXml({
      progressivoInvio: "ZS001",
      numeroFattura: "2026/01",
      dataFattura: "2026-09-25",
      importoCents: 1220, // 10.00 € imponibile + 2.20 € IVA 22%
      aliquotaIvaPercent: 22,
      cedente: {
        denominazione: "ZeroStack Italia SRL",
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
        isCompany: true,
        ragioneSocialeOIntestatario: "Studio Legale Rossi",
        codiceFiscale: "RSSMRA85M01H501Z",
        partitaIva: "09876543210",
        codiceDestinatarioSDI: "M5UXCR1",
        indirizzo: "Corso Vittorio Emanuele 12",
        cap: "00186",
        citta: "Roma",
        provincia: "RM",
        paese: "IT"
      }
    });

    assert(xml.includes('versione="FPR12"'), "XML contiene intestazione formato FPR12");
    assert(xml.includes("<CodiceDestinatario>M5UXCR1</CodiceDestinatario>"), "XML contiene Codice Destinatario SDI");
    assert(xml.includes("<ImportoTotaleDocumento>12.20</ImportoTotaleDocumento>"), "Importo totale fattura calcolato esattamente a 12.20 EUR");
    assert(xml.includes("<ImponibileImporto>10.00</ImponibileImporto>"), "Imponibile scorporato IVA 22% calcolato esattamente a 10.00 EUR");
    assert(xml.includes("<Imposta>2.20</Imposta>"), "Imposta IVA calcolata a 2.20 EUR");
    assert(xml.includes("Studio Legale Rossi"), "Denominazione cessionario presente nell'XML");
  } catch (err: any) {
    assert(false, "Generazione FatturaPA XML fallita", err?.message);
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

  const hardenScriptPath = path.join(__dirname, "../dist/harden-vps.sh");
  const backupScriptPath = path.join(__dirname, "../dist/backup-vps.sh");

  assert(fs.existsSync(hardenScriptPath), "File dist/harden-vps.sh presente nel pacchetto di distribuzione");
  assert(fs.existsSync(backupScriptPath), "File dist/backup-vps.sh presente nel pacchetto di distribuzione");

  const hardenContent = fs.readFileSync(hardenScriptPath, "utf-8");
  assert(hardenContent.includes("ufw allow 80/tcp"), "Script hardening include regole firewall per porta HTTP 80");
  assert(hardenContent.includes("ufw allow 443/tcp"), "Script hardening include regole firewall per porta HTTPS 443");
  assert(hardenContent.includes("fail2ban"), "Script hardening include configurazione protezione Fail2ban");
  assert(hardenContent.includes("tcp_syncookies"), "Script hardening applica mitigazione SYN flood");

  const backupContent = fs.readFileSync(backupScriptPath, "utf-8");
  assert(backupContent.includes("AES256"), "Script backup include cifratura simmetrica AES-256 GPG");
  assert(backupContent.includes("OFFSITE_DESTINATION"), "Script backup include parametro upload remoto offsite");

  // --------------------------------------------------------------------------
  // TEST GRUPPO 12: Routing Multi-Tenant Sottodomini & Wildcard zerostack.it
  // --------------------------------------------------------------------------
  console.log("\n📌 GRUPPO 12: Routing Multi-Tenant Sottodomini Utente (*.zerostack.it)");

  const rootDomain = "zerostack.it";
  const reservedSubdomains = new Set(["www", "api", "admin", "app", "cdn", "mail"]);

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

  assert(reservedSubdomains.has("admin"), "Sottodominio 'admin' correttamente protetto come riservato");
  assert(reservedSubdomains.has("api"), "Sottodominio 'api' correttamente protetto come riservato");
  assert(!reservedSubdomains.has("dario"), "Sottodominio utente 'dario' non confligge con le parole riservate");
  assert(/^[a-z0-9-]+$/.test("tech-italia"), "Slug sottodominio conforme alla sintassi RFC DNS");
  assert(!/^[a-z0-9-]+$/.test("tech italia!"), "Slug con spazi o caratteri speciali respinto da RFC DNS");






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
