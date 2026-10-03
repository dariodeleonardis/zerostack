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
      const statusOk = validator ? true : (res.status >= 200 && res.status < 400);
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

  // Le aree riservate, visitate senza sessione, rimandano al login dal server.
  const toLogin = (res: Response) => res.status === 307 && (res.headers.get("location") ?? "").includes("/login?next=");

  // 1. Pagine Web Pubbliche
  console.log("📌 1. Test Pagine Portale Pubblico & Lettori:");
  await check("Homepage ZeroStack", "/");
  // Posta, Note e Podcast erano pagine con contenuti finti: tolte il 2/10, tornano quando sono vere.
  await check("Posta senza sessione -> login", "/inbox", { redirect: "manual" }, toLogin);
  await check("Note finte rimosse -> 404", "/notes", undefined, (res) => res.status === 404);
  await check("Podcast finti rimossi -> 404", "/podcasts", undefined, (res) => res.status === 404);
  await check("Home Pubblicazione / Sottodominio", "/p/tech-italia");
  await check("Lettore Articolo dal database", "/p/tech-italia/alternativa-italiana-a-substack", undefined, (res, text) =>
    res.status === 200 && text.includes("Sovranità dei dati") && !text.includes("paywall-divider"));
  await check("Articolo inesistente -> 404", "/p/tech-italia/articolo-che-non-esiste", undefined, (res) => res.status === 404);
  await check("Checkout di un piano inesistente -> 404", "/checkout/premium-monthly", undefined, (res) => res.status === 404);

  // 2. Pannello Creator & Switcher
  console.log("\n📌 2. Test Studio Creator & Gestione Multi-Tenant:");
  await check("Studio Creator Dashboard senza sessione -> login", "/studio", { redirect: "manual" }, toLogin);
  await check("Editor Nuovo Post / Newsletter senza sessione -> login", "/studio/posts/new", { redirect: "manual" }, toLogin);
  await check("Monetizzazione Stripe Connect & Tiers senza sessione -> login", "/studio/monetization", { redirect: "manual" }, toLogin);
  await check("Creazione Nuova Pubblicazione senza sessione -> login", "/studio/publications/new", { redirect: "manual" }, toLogin);
  await check("Squadra senza accesso -> login", "/studio/team", { redirect: "manual" }, toLogin);

  // 3. Pannello SuperAdmin & Staff
  console.log("\n📌 3. Test Pannello SuperAdmin & Moderazione Staff:");
  await check("SuperAdmin Dashboard Globale senza sessione -> login", "/admin", { redirect: "manual" }, toLogin);
  await check("Gestione Utenti & Ruoli senza sessione -> login", "/admin/users", { redirect: "manual" }, toLogin);
  await check("Moderazione Pubblicazioni & Domini senza sessione -> login", "/admin/publications", { redirect: "manual" }, toLogin);

  // 4. Profilo & Abbonamenti Utente
  console.log("\n📌 4. Test Area Personale Utente:");
  await check("Modifica Profilo Autore senza sessione -> login", "/account/profile", { redirect: "manual" }, toLogin);
  await check("Gestione Abbonamenti & Ricevute senza sessione -> login", "/account/subscriptions", { redirect: "manual" }, toLogin);

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

  // 5.3 Caddy SSL Domain Verification (zerostack.it & *.zerostack.it)
  await check("Verifica Dominio SSL Caddy (localhost)", "/api/domains/check?domain=localhost", undefined, (res, text) => {
    return text.trim() === "OK";
  });
  await check("Verifica Dominio Principale (zerostack.it)", "/api/domains/check?domain=zerostack.it", undefined, (res, text) => {
    return res.status === 200 && text.trim() === "OK";
  });
  await check("Verifica Sottodominio Pubblicazione (tech-italia.zerostack.it)", "/api/domains/check?domain=tech-italia.zerostack.it", undefined, (res, text) => {
    return res.status === 200 && text.trim() === "OK";
  });
  // "dario" nel seed è un nome utente, non lo slug di una pubblicazione: la pagina darebbe 404,
  // quindi niente certificato (sprecherebbe la quota settimanale di Let's Encrypt).
  await check("Rifiuto Sottodominio di un Utente senza Pubblicazione (dario.zerostack.it)", "/api/domains/check?domain=dario.zerostack.it", undefined, (res, text) => {
    return res.status === 403;
  });
  await check("Rifiuto Sottodominio Riservato di Sistema (admin.zerostack.it)", "/api/domains/check?domain=admin.zerostack.it", undefined, (res, text) => {
    return res.status === 403;
  });
  await check("Rifiuto Sottodominio Sconosciuto", "/api/domains/check?domain=sconosciuto9999.zerostack.it", undefined, (res, text) => {
    return res.status === 403;
  });

  // 5.4 Salvataggio post dallo studio: senza sessione niente
  await check("Salvataggio post senza sessione -> 401", "/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicationId: "00000000-0000-0000-0000-000000000000", title: "x", contentHtml: "<p>x</p>", action: "draft" })
  }, (res) => res.status === 401);

  // 5.5 Checkout Stripe API
  await check("Checkout Stripe senza sessione -> 401", "/api/checkout/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tierId: "premium-monthly" })
  }, (res) => res.status === 401);

  await check("Webhook Stripe senza firma respinto", "/api/stripe/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "checkout.session.completed" })
  }, (res) => res.status === 400 || res.status === 503);

  // 5.6 Le ricevute e le fatture finte (dati inventati, senza login) sono state tolte:
  // tornano con la fatturazione vera verso lo SdI.
  await check("Ricevuta PDF finta rimossa -> 404", "/api/receipts/pdf/sub_test_live_99", undefined, (res) => res.status === 404);
  await check("FatturaPA XML finta rimossa -> 404", "/api/invoices/sub_test_live_99/fatturapa.xml", undefined, (res) => res.status === 404);

  await check("Stripe Connect senza sessione -> 401", "/api/stripe/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicationId: "x" })
  }, (res) => res.status === 401);

  // API finte tolte il 2/10 (vedi docs/STATO-FUNZIONI-E-AUDIT.md): Satispay con ID inventati,
  // statistiche che non salvavano, trascrizione con testo d'esempio, Fediverso con chiave finta.
  const post = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
  await check("Satispay finto rimosso -> 404", "/api/donations/satispay", post, (res) => res.status === 404);
  await check("Statistiche finte rimosse -> 404", "/api/analytics/collect", post, (res) => res.status === 404);
  await check("Trascrizione finta rimossa -> 404", "/api/podcasts/transcribe", post, (res) => res.status === 404);
  await check("WebFinger finto rimosso -> 404", "/.well-known/webfinger?resource=acct:tech-italia@localhost", undefined, (res) => res.status === 404);
  await check("Attore ActivityPub finto rimosso -> 404", "/api/activitypub/users/tech-italia", undefined, (res) => res.status === 404);

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
