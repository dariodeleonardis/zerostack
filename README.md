# ZeroStack 🚀
### La piattaforma di Newsletter, Blogging, Podcast & Community indipendente per l'Italia

[![ZeroStack CI](https://github.com/dariodeleonardis/zerostack/actions/workflows/ci.yml/badge.svg)](https://github.com/dariodeleonardis/zerostack/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker/docker-compose.yml)
[![Mobile App](https://img.shields.io/badge/Mobile%20App-Expo%20%7C%20React%20Native-000020?logo=expo&logoColor=white)](apps/mobile)

**ZeroStack** è il clone open-source avanzato di **Substack**, progettato specificamente per creator, giornalisti, case editrici e aziende del mercato italiano ed europeo. È pronto per essere installato su qualsiasi **VPS** (Hetzner, OVH, DigitalOcean, AWS, ecc.) con **Docker** e include un'**app mobile dedicata** in React Native / Expo.

---

## 🇮🇹 Perché ZeroStack supera i limiti noti di Substack

| Funzionalità | Substack Tradizionale | ZeroStack (Il Tuo Competitor) |
|---|---|---|
| **Commissioni Piattaforma** | **10% fisso trattenuto** su tutti gli abbonati | **0% commissioni** (100% dell'incasso va a te via Stripe) |
| **Fatturazione Elettronica** | Nessun supporto a SDI / PEC / Codice Fiscale | **Dati fiscali italiani**: Codice Fiscale, P.IVA, SDI e PEC raccolti al checkout (l'invio allo SdI è in lavorazione) |
| **Domini Personalizzati** | Costo una tantum di **$50** per dominio | **Gratuiti e illimitati**: Caddy gestisce SSL Let's Encrypt on-demand |
| **Email Deliverability** | IP condivisi con milioni di utenti | **Provider indipendente**: Brevo (server UE), Resend o proprio SMTP con DKIM |
| **Piani & Paywall** | Solo Mensile, Annuale, Fondatore | **Tier personalizzati illimitati**, paywall dinamico a divisore |
| **Podcast & Audio** | Player basilare | **Player audio continuo**, controllo velocità (1x-2x), feed RSS Apple/Spotify |
| **Social / Microblogging** | Substack Notes chiuso | **Note & Dispacci** integrati (timeline in tempo reale) |
| **App Mobile Dedicata** | Proprietaria Substack | **App Mobile Dedicata** (Expo / React Native) per iOS, Android e Web PWA |
| **Privacy & Hosting** | Server US con tracciamento | **GDPR Nativo**: server in UE, cookie banner essenziale, double opt-in |

---

## 🏗️ Architettura del Progetto (Monorepo)

```text
zerostack/
├── apps/
│   ├── web/                    # Next.js 15 App Router (Studio Creator, Reader, Checkout, API)
│   ├── worker/                 # Invio newsletter e uscita dei post programmati (coda nel database)
│   └── mobile/                 # App Mobile Dedicata Expo / React Native (Feed, Note, Podcasts)
├── packages/
│   ├── database/               # PostgreSQL + Schema Prisma con dati di seed italiani
│   ├── email/                  # Template email responsive (React Email) per newsletter e transazioni
│   └── shared/                 # Tipi TypeScript, validazione Zod e dizionario i18n italiano
├── docker/
│   ├── docker-compose.yml      # Stack VPS completo (Web, Worker, Postgres, Redis, Caddy)
│   ├── Dockerfile.web          # Immagine Next.js standalone ottimizzata
│   ├── Dockerfile.worker       # Background worker per l'invio asincrono delle newsletter
│   └── Caddyfile               # Reverse proxy con emissione SSL automatica
└── scripts/
    ├── deploy.sh               # Installatore e gestore aggiornamenti 1-click per VPS
    └── import-substack.ts      # Import da riga di comando dell'export di Substack (ZIP o CSV)
```

---

## ⚡ Guida Rapida: Avvio su VPS con 1 Comando

Per installare ZeroStack sul tuo server VPS Linux (Ubuntu / Debian):

```bash
# Clona il repository sul tuo server
git clone https://github.com/dariodeleonardis/zerostack.git
cd zerostack

# Avvia lo script di installazione automatica (installa Docker se manca, crea .env e avvia i container)
sudo bash scripts/deploy.sh
```

I container avviati includono:
* **Web (Next.js)** su porta interna `3000`
* **Caddy** su porte `80` e `443` con certificati HTTPS emessi in automatico
* **PostgreSQL 16** con dati persistenti
* **Redis 7** per code e cache
* **Worker asincrono** per non bloccare l'invio delle email

---

## 📱 Avvio dell'App Mobile Dedicata (Expo / React Native)

L'app mobile permette ai lettori di consultare la posta, leggere le note e ascoltare podcast con il mini-player integrato:

```bash
cd apps/mobile
npm install
npm run android   # Per emulatore o dispositivo Android
npm run ios       # Per simulatore iOS (su macOS)
npm run web       # Per testare l'app come Progressive Web App (PWA)
```

---

## 📬 Newsletter: scrittura, iscrizioni e invio

Il giro completo funziona così:

1. **Scrittura** – in `/studio/posts/new` l'editor (TipTap) salva bozze, programma l'uscita o pubblica subito. Il pulsante *Inserisci paywall* mette il divisore: sopra lo leggono tutti, sotto solo gli abbonati paganti (e la redazione).
2. **Iscrizione con doppia conferma** – il modulo della pagina pubblica chiama `POST /api/subscribe`, che spedisce subito l'email con il link di conferma (valido 7 giorni). Solo chi conferma diventa `ACTIVE`.
3. **Invio** – pubblicare con *Invia per email* crea una campagna. Il **worker** (`apps/worker`) la prende dal database e spedisce a ogni iscritto attivo, al ritmo di `EMAIL_RATE_PER_SECOND`. Ogni destinatario ha una riga `EmailDelivery`: se il worker si ferma, riparte da dove era e nessuno riceve due copie. Il worker pubblica anche i post programmati arrivati alla loro ora.
4. **Disiscrizione** – ogni email ha il link in fondo e gli header `List-Unsubscribe` / `List-Unsubscribe-Post` per la disiscrizione a un clic dai client di posta (richiesta da Gmail e Yahoo per gli invii in massa).

Configurazione (uguale per web e worker):

| Variabile | Valore |
|---|---|
| `EMAIL_PROVIDER` | `brevo`, `resend`, `turbosmtp`, `smtp` oppure `log` (nessun invio, solo registro: il default) |
| `BREVO_API_KEY` / `RESEND_API_KEY` / `TURBOSMTP_CONSUMER_KEY` + `TURBOSMTP_CONSUMER_SECRET` / `SMTP_*` | Credenziali del provider scelto |
| `TURBOSMTP_API_BASE` | Solo turboSMTP: di default `https://api.eu.turbo-smtp.com/api/v2` (infrastruttura europea) |
| `EMAIL_FROM` | Mittente di piattaforma, su un dominio verificato presso il provider (SPF, DKIM, DMARC). Il nome visualizzato è quello della pubblicazione |
| `APP_URL` | Indirizzo pubblico della piattaforma: serve per i link di conferma e disiscrizione |
| `EMAIL_RATE_PER_SECOND` | Ritmo di invio del worker (default 10) |

**Rimbalzi e segnalazioni di spam.** Un indirizzo che rimbalza in modo definitivo viene fermato su tutte le pubblicazioni; chi segna una newsletter come spam viene disiscritto da quella pubblicazione. Configura il webhook del provider:

- Brevo (*Transactional → Settings → Webhook*): URL `https://<tuo-dominio>/api/email/webhook/brevo?token=<EMAIL_WEBHOOK_TOKEN>`, eventi *Hard bounce*, *Invalid email*, *Spam*;
- turboSMTP (*Event Webhook* nel pannello): URL `https://<tuo-dominio>/api/email/webhook/turbosmtp?token=<EMAIL_WEBHOOK_TOKEN>`, eventi *Bounced*, *Spam report* e *Unsubscribed*. Le coppie consumerKey/consumerSecret si creano dal pannello o dall'API `user/consumerKeys` di turboSMTP;
- Resend (*Webhooks*): URL `https://<tuo-dominio>/api/email/webhook/resend`, eventi `email.bounced` ed `email.complained`; il segreto di firma va in `RESEND_WEBHOOK_SECRET`.

In sviluppo: `EMAIL_PROVIDER=log EMAIL_LOG_DIR=/tmp/zs-mail` scrive ogni email in un file JSON, e `npm run once --workspace=@zerostack/worker` fa un solo giro del worker. Il test end to end `scripts/test-newsletter.mjs` usa proprio questo.

---

## 🛡️ Account, file caricati, privacy e amministrazione

- **Verifica email**: alla registrazione parte un link di conferma (valido 48 ore). Finché l'indirizzo non è confermato si scrive e si pubblica, ma non si mandano newsletter né si collega Stripe; il banner nello Studio permette di rinviare il link. Gli account creati prima di questa versione risultano non confermati: basta usare *Rinvia il link* (oppure impostare `emailVerified` a mano nel database).
- **File caricati** (immagini nel testo, copertine, audio dei podcast): il tipo si riconosce dai primi byte, SVG e HTML sono rifiutati; immagini fino a 10 MB, audio fino a 150 MB. Con `STORAGE_DRIVER=local` (predefinito) i file finiscono in `UPLOAD_DIR` (nei container `/data/uploads`, su un volume) e si servono da `/api/media/...`; con `STORAGE_DRIVER=s3` vanno su qualsiasi storage compatibile S3 (Cloudflare R2, Scaleway, AWS, MinIO) con `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL` ed eventualmente `S3_ENDPOINT`, `S3_REGION`, `S3_FORCE_PATH_STYLE`.
- **Profilo e GDPR**: in *Account → Profilo* si cambiano nome, bio e password, si scaricano tutti i propri dati in JSON e si cancella l'account (password + scrivere `ELIMINA`). La cancellazione chiude gli abbonamenti Stripe del lettore, toglie le iscrizioni alle newsletter e i file caricati; chi ha abbonati paganti deve prima gestirli.
- **Pagine legali**: `/privacy`, `/termini`, `/cookie`, raggiungibili anche dai sottodomini. I dati del titolare arrivano da `LEGAL_ENTITY_NAME`, `LEGAL_VAT_NUMBER`, `LEGAL_ADDRESS`, `LEGAL_CONTACT_EMAIL`, `LEGAL_UPDATED_AT`: finché mancano la pagina mostra "[da completare]". Il testo è una base: va fatto rivedere da un legale prima del lancio.
- **Pannello admin** (`/admin`, solo ADMIN e SUPERADMIN): numeri della piattaforma e controllo della configurazione, ricerca utenti e pubblicazioni, sospensione (un utente sospeso viene disconnesso e non entra più; una pubblicazione sospesa sparisce da pagina, feed, dominio e invii). Solo un SUPERADMIN cambia i ruoli.

---

## 🧪 Test

```bash
npm run typecheck
npm run build --workspace=@zerostack/web
DATABASE_URL=... REDIS_URL=... npm run test:e2e   # avvia il server e fa girare tutte le suite
```

`scripts/run-e2e.sh` usa un ambiente di prova completo: email su file, Stripe finto (`scripts/lib/stripe-mock.mjs`), DNS finto per la verifica dei domini. La CI di GitHub fa lo stesso su ogni pull request, con Postgres e Redis come servizi.

## 🔄 Migrazione 1-Click da Substack

Su Substack apri *Impostazioni → Esporta* e scarica lo ZIP. Poi, in ZeroStack, *Studio → Importa da Substack* e carica il file:

- **iscritti**: arrivano già attivi (avevano confermato su Substack), senza email di conferma. Chi su Substack non riceveva più email viene saltato; chi si era disiscritto da ZeroStack resta disiscritto;
- **articoli**: pubblicati con la data originale, bozze come bozze, e il paywall di Substack diventa il divisore di ZeroStack. L'import non spedisce nessuna newsletter;
- si può ripetere: niente doppioni.

Gli abbonati a pagamento di Substack vengono importati come iscritti: il loro abbonamento resta su Substack finché non si abbonano sul tuo nuovo piano, e il resoconto dell'import dice quanti sono.

Da riga di comando: `npx tsx scripts/import-substack.ts <slug-pubblicazione> <export.zip | iscritti.csv>`.

---

## 🌐 Sottodomini degli autori e dominio personalizzato

**I sottodomini sono automatici.** Quando un autore crea la pubblicazione `dario`, `dario.zerostack.it` funziona subito: l'autore non fa niente. Serve solo una configurazione della piattaforma, una volta per tutte, nel DNS di `zerostack.it`:

| Tipo | Nome | Valore |
|---|---|---|
| A | `zerostack.it` | IP del server |
| A (o CNAME) | `www` | IP del server (o `zerostack.it`) |
| A | `*` (wildcard) | IP del server |

Al primo accesso a un sottodominio Caddy chiede a `/api/domains/check` se la pubblicazione esiste e solo allora ottiene il certificato da Let's Encrypt. Per controllare che dominio, wildcard, HTTPS e app siano a posto:

```bash
bash scripts/check-platform.sh zerostack.it tech-italia
```

Nota sui volumi: Let's Encrypt emette al massimo 50 certificati a settimana per dominio registrato. Oltre qualche decina di nuove pubblicazioni a settimana conviene un certificato wildcard `*.zerostack.it` (sfida DNS-01, richiede Caddy con il plugin del provider DNS).

**Dominio personalizzato (facoltativo).** Chi vuole può aggiungere un dominio suo (gratis). In *Studio → Dominio personalizzato* l'autore scrive il dominio e riceve due record da aggiungere nel DNS: un **CNAME** verso `slug.<tuo-dominio>` e un **TXT** `_zerostack.<dominio>` con il valore di verifica. Con *Verifica ora* ZeroStack legge il TXT: solo dopo la verifica Caddy emette il certificato HTTPS e il dominio mostra la pubblicazione. Cambiare dominio fa ripartire la verifica da capo.

## 💳 Abbonamenti a pagamento (Stripe Connect)

Ogni pubblicazione incassa sul **proprio** conto Stripe (Connect Express, pagamenti diretti): ZeroStack non trattiene nulla, restano solo le commissioni di Stripe.

**Una volta, per la piattaforma:**

1. Su Stripe attiva **Connect** e copia la chiave segreta in `STRIPE_SECRET_KEY`.
2. In *Sviluppatori → Webhook* aggiungi l'endpoint `https://<tuo-dominio>/api/stripe/webhook` **in ascolto degli eventi dei conti collegati** con: `account.updated`, `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Il suo segreto va in `STRIPE_CONNECT_WEBHOOK_SECRET` (se usi un endpoint unico, in `STRIPE_WEBHOOK_SECRET`). Senza segreto il webhook rifiuta tutto.

**Per ogni autore**, in *Studio → Monetizzazione*: *Collega Stripe* (procedura guidata di Stripe: dati, documento, IBAN), poi *Nuovo livello* (mensile, annuale o una tantum). Il prezzo su Stripe viene creato alla prima vendita.

**Per il lettore**: dal paywall o dalla pagina della pubblicazione si arriva al checkout su `zerostack.it/checkout/...` (serve un account), si inseriscono facoltativamente i dati per la fattura (codice fiscale, P.IVA, SDI o PEC, validati e salvati: la piattaforma non emette ancora fatture, quindi per ora le fa l'autore con il proprio gestionale) e si paga sulla pagina di Stripe: carta, Apple/Google Pay, SEPA. L'abbonamento si attiva quando arriva il webhook; da *I miei abbonamenti* si disdice (a fine periodo) o si riattiva. Chi paga diventa anche iscritto alla newsletter e la riceve completa.

La sessione vale su `zerostack.it` e su tutti i sottodomini `*.zerostack.it`, quindi un abbonato legge gli articoli completi anche sul sottodominio della pubblicazione. Sui domini personalizzati la sessione non arriva: lì gli articoli a pagamento si leggono dall'indirizzo `slug.zerostack.it`.

---

## 🚀 Caricamento su GitHub

Per collegare e caricare questo repository sul tuo account GitHub:

1. Crea una nuova repository vuota su [github.com/new](https://github.com/new) con il nome `zerostack`.
2. Esegui questi comandi nel terminale:

```bash
git remote add origin https://github.com/dariodeleonardis/zerostack.git
git branch -M main
git push -u origin main
```

---

## 📄 Licenza

Rilasciato sotto licenza MIT. Libero per uso personale e commerciale.
Sviluppato con passione da **Dario De Leonardis**.
