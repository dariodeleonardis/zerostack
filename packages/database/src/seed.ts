import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Avvio seeding database ZeroStack...");

  // Pulizia iniziale (opzionale)
  await prisma.user.deleteMany({ where: { email: "dario@zerostack.it" } }).catch(() => {});

  // 1. Creazione Utente Creator Principale
  const author = await prisma.user.create({
    data: {
      email: "dario@zerostack.it",
      name: "Dario De Leonardis",
      handle: "dario",
      role: "ADMIN",
      passwordHash: "hash_demo_zerostack_2026",
      bio: "Fondatore di ZeroStack. Appassionato di software libero, publishing e sovranità digitale.",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
    }
  });

  // 2. Creazione Prima Pubblicazione Italiana: "Tech & Futuro Italia"
  const techPub = await prisma.publication.create({
    data: {
      ownerId: author.id,
      name: "Tech & Futuro Italia",
      slug: "tech-italia",
      description: "L'osservatorio indipendente su IA, creator economy e innovazione tecnologica in Italia.",
      primaryColor: "#0066FF",
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
      fromEmail: "redazione@techitalia.it",
      fromName: "Tech & Futuro Italia"
    }
  });

  // 3. Creazione Livelli di Abbonamento (Tiers)
  const tierPro = await prisma.tier.create({
    data: {
      publicationId: techPub.id,
      name: "Abbonato Premium",
      description: "Accesso a tutti gli articoli completi, podcast privati ed edizioni del venerdì.",
      priceCents: 700, // 7.00 EUR
      currency: "EUR",
      interval: "MONTH",
      benefits: [
        "Tutte le edizioni settimanali senza limitazioni",
        "Podcast audio esclusivo 'Dietro le Quinte'",
        "Accesso alla sezione commenti riservata",
        "Fattura elettronica con SDI / PEC valida in Italia"
      ]
    }
  });

  await prisma.tier.create({
    data: {
      publicationId: techPub.id,
      name: "Membro Fondatore",
      description: "Per chi desidera sostenere attivamente il giornalismo tecnologico indipendente.",
      priceCents: 12000, // 120.00 EUR
      currency: "EUR",
      interval: "YEAR",
      benefits: [
        "Tutti i vantaggi Premium per un anno",
        "Ringraziamento speciale in calce a ogni edizione",
        "Canale diretto con l'autore per proporre temi",
        "0% commissioni trattenute: 100% a supporto della redazione"
      ]
    }
  });

  // 4. Creazione Articolo Completo con Paywall Divider
  const post1 = await prisma.post.create({
    data: {
      publicationId: techPub.id,
      authorId: author.id,
      title: "Perché l'ecosistema creator italiano ha bisogno di un'alternativa a Substack",
      subtitle: "Commissioni al 10%, assenza di fatturazione elettronica e server oltreoceano: come riconquistare la sovranità dei propri lettori.",
      slug: "alternativa-italiana-a-substack",
      coverImageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
      access: "FREE",
      format: "ARTICLE",
      status: "PUBLISHED",
      publishedAt: new Date(),
      viewsCount: 1420,
      likesCount: 88,
      commentsCount: 14,
      contentHtml: `
        <p class="lead">Negli ultimi anni, Substack ha rivoluzionato il modo in cui scrittori e divulgatori monetizzano la propria penna. Tuttavia, per chi opera in Italia e in Europa, i limiti strutturali sono diventati insostenibili.</p>
        
        <h2>1. Il costo nascosto: 10% di commissioni a vita</h2>
        <p>Ogni creator che fattura 2.000€ al mese dona 200€ al mese (2.400€ l'anno!) a Substack, oltre alle normali tariffe di transazione di Stripe. Con una soluzione self-hosted su VPS come ZeroStack, il creator paga solo il costo server fisso (5-10€/mese) trattenendo il 100% degli utili.</p>

        <h2>2. Il labirinto fiscale italiano</h2>
        <p>In Italia, professionisti e aziende che si abbonano a una pubblicazione per aggiornamento professionale hanno diritto alla fattura elettronica con Codice Univoco SDI o PEC per dedurre il costo. Substack non ha mai implementato questi campi, costringendo i creator a compilare note a mano o perdere clienti B2B.</p>

        <!-- PAYWALL DIVIDER: Da questo punto in poi solo per abbonati paganti -->
        <hr class="paywall-divider" data-paywall="true" />

        <h2>3. Sovranità dei dati ed email deliverability</h2>
        <p>Quando invii 10.000 email tramite Substack, condividi gli indirizzi IP di invio con migliaia di altri autori sconosciuti. Con ZeroStack puoi collegare Brevo o Resend con il tuo dominio verificato DKIM, SPF e DMARC, garantendo che le tue comunicazioni non finiscano mai nello spam.</p>
      `
    }
  });

  // 5. Creazione Post Podcast
  const podcastPost = await prisma.post.create({
    data: {
      publicationId: techPub.id,
      authorId: author.id,
      title: "Podcast Ep. 01: L'evoluzione dell'AI applicata allo sviluppo web",
      subtitle: "Conversazione sulle novità dello sviluppo moderno e la nascita di ZeroStack.",
      slug: "podcast-ep-01-evoluzione-ai",
      coverImageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80",
      access: "FREE",
      format: "PODCAST",
      status: "PUBLISHED",
      publishedAt: new Date(),
      viewsCount: 950,
      likesCount: 65,
      contentHtml: "<p>In questa prima puntata esploriamo come costruire piattaforme moderne scalabili con architetture containerizzate.</p>"
    }
  });

  await prisma.podcastEpisode.create({
    data: {
      postId: podcastPost.id,
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      durationSeconds: 372,
      episodeNumber: 1,
      seasonNumber: 1,
      explicit: false,
      transcript: "Benvenuti alla prima puntata di Tech & Futuro Italia. Oggi parliamo di indipendenza tecnologica..."
    }
  });

  // 6. Creazione Note / Dispacci (Micro-post social)
  await prisma.note.create({
    data: {
      authorId: author.id,
      publicationId: techPub.id,
      content: "Abbiamo appena rilasciato la prima versione di ZeroStack! Completamente open-source, con supporto nativo a SDI, PEC e 0% commissioni. Cosa ne pensate?",
      likesCount: 42,
      restacksCount: 15,
      repliesCount: 6
    }
  });

  await prisma.note.create({
    data: {
      authorId: author.id,
      publicationId: techPub.id,
      content: "Un sondaggio rapido: quale provider email preferite per le vostre newsletter? Brevo (ex Sendinblue), Resend o Amazon SES?",
      likesCount: 19,
      restacksCount: 4,
      repliesCount: 8
    }
  });

  console.log("✅ Seeding completato con successo!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
