async function testLiveEndpoints() {
  console.log("\n🌐 ========================================================");
  console.log("   TEST DIRETTO SUGLI ENDPOINT DEL SERVER ZEROSTACK (PORT 3000)");
  console.log("========================================================\n");

  const baseUrl = "http://localhost:3000";
  let passed = 0;
  let failed = 0;

  async function check(name: string, path: string, options?: RequestInit, validator?: (res: Response, text: string) => boolean) {
    try {
      const res = await fetch(`${baseUrl}${path}`, options);
      const text = await res.text();
      const statusOk = res.status >= 200 && res.status < 400;
      const customOk = validator ? validator(res, text) : true;

      if (statusOk && customOk) {
        passed++;
        console.log(`  ✅ [${res.status}] ${name} (${path})`);
      } else {
        failed++;
        console.error(`  ❌ [${res.status}] ${name} (${path}) - Validazione fallita`);
      }
    } catch (err: any) {
      failed++;
      console.error(`  ❌ [ERR] ${name} (${path}): ${err?.message}`);
    }
  }

  // 1. Pagine Web Pubbliche
  console.log("📌 1. Test Pagine Portale Pubblico & Lettori:");
  await check("Homepage ZeroStack", "/");
  await check("Feed Lettore (La Tua Posta)", "/inbox");
  await check("Timeline Note & Dispacci", "/notes");
  await check("Catalogo Podcast", "/podcasts");
  await check("Lettore Articolo con Paywall", "/p/tech-italia/alternativa-italiana-a-substack");
  await check("Schermata Checkout Fiscale IT", "/checkout/premium-monthly");

  // 2. Pannello Creator & Switcher
  console.log("\n📌 2. Test Studio Creator & Gestione Multi-Tenant:");
  await check("Studio Creator Dashboard", "/studio");
  await check("Editor Nuovo Post / Newsletter", "/studio/posts/new");
  await check("Monetizzazione Stripe Connect & Tiers", "/studio/monetization");
  await check("Creazione Nuova Pubblicazione", "/studio/publications/new");
  await check("Squadra & Collaboratori", "/studio/team");

  // 3. Pannello SuperAdmin & Staff
  console.log("\n📌 3. Test Pannello SuperAdmin & Moderazione Staff:");
  await check("SuperAdmin Dashboard Globale", "/admin");
  await check("Gestione Utenti & Ruoli", "/admin/users");
  await check("Moderazione Pubblicazioni & Domini", "/admin/publications");
  await check("Impostazioni Piattaforma & Stripe", "/admin/settings");

  // 4. Profilo & Abbonamenti Utente
  console.log("\n📌 4. Test Area Personale Utente:");
  await check("Modifica Profilo Autore", "/account/profile");
  await check("Gestione Abbonamenti & Ricevute", "/account/subscriptions");

  // 5. API Endpoints
  console.log("\n📌 5. Test API Endpoints, RSS, PDF & Webhooks:");

  // 5.1 RSS 2.0 Feed
  await check("Feed RSS Pubblicazione", "/api/feed/tech-italia/rss", undefined, (res, text) => {
    return text.includes("<rss version=\"2.0\"") && text.includes("Tech &amp; Futuro Italia");
  });

  // 5.2 Podcast XML Feed
  await check("Feed Podcast Apple/Spotify", "/api/feed/tech-italia/podcast", undefined, (res, text) => {
    return text.includes("itunes:author") && text.includes("SoundHelix-Song-1.mp3");
  });

  // 5.3 Caddy SSL Domain Verification
  await check("Verifica Dominio SSL Caddy (localhost)", "/api/domains/check?domain=localhost", undefined, (res, text) => {
    return text.trim() === "OK";
  });

  // 5.4 Invio Newsletter API
  await check("Invio Newsletter Batch API", "/api/newsletter/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test Live Newsletter",
      contentHtml: "<p>Contenuto inviato dal test live.</p>",
      sendEmail: true
    })
  }, (res, text) => {
    return text.includes('"success":true');
  });

  // 5.5 Checkout Stripe API
  await check("Stripe Checkout Session API", "/api/checkout/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tierId: "premium-monthly",
      paymentMethod: "card",
      fiscalData: {
        isCompany: false,
        ragioneSocialeOIntestatario: "Mario Rossi",
        codiceFiscale: "RSSMRA85M01H501Z"
      }
    })
  }, (res, text) => {
    return text.includes('"success":true');
  });

  // 5.6 Generazione Ricevuta Fiscale PDF Stream
  await check("Download Ricevuta Fiscale PDF", "/api/receipts/pdf/sub_test_live_99", undefined, (res, text) => {
    const isPdf = res.headers.get("content-type")?.includes("application/pdf");
    const hasPdfHeader = text.startsWith("%PDF-");
    return !!isPdf && hasPdfHeader;
  });

  console.log("\n========================================================");
  console.log(`📊 RISULTATO TEST LIVE ENDPOINTS: ${passed}/${passed + failed} SUPERATI`);
  if (failed === 0) {
    console.log("🎉 TUTTI GLI ENDPOINT LIVE FUNZIONANO ALLA PERFEZIONE (0 ERRORI)!");
  } else {
    console.error(`⚠️  ATTENZIONE: ${failed} endpoint non hanno risposto come previsto.`);
    process.exit(1);
  }
  console.log("========================================================\n");
}

testLiveEndpoints();
