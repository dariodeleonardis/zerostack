# Stato delle funzioni e audit esterno (2 ottobre 2026)

Due elenchi in un posto solo: le funzioni che oggi sono solo una facciata, e l'esito della verifica
punto per punto dell'audit statico esterno (`Audit-Bug-Report.pdf`, 2/10/2026). Ogni voce porta il file
che lo dimostra. Quando una voce si chiude, si scrive qui con la data e il commit.

## 1. Funzioni finte o incomplete

Gravità: **A** inganna chi la usa (soldi, dati, promesse); **B** visibile ma innocua; **C** solo interna.

| # | Funzione | Prova | Cosa sembra | Cosa fa davvero | Gravità | Stato |
|---|---|---|---|---|---|---|
| F1 | Note (`/notes`, barra in alto) | `app/notes/page.tsx:22`, `components/NoteComposer.tsx:19` | Feed con note e mi piace | Note scritte nel codice; "Invia" la mostra dopo 400 ms firmata sempre "Dario De Leonardis", sparisce al ricaricamento | A | tolta dalla navigazione e cancellata il 2/10 |
| F2 | Squadra e collaboratori (Studio) | `app/studio/team/page.tsx:15,29` | Un collaboratore e gli inviti | "Marco Rossi" inventato; l'invito non manda email e non salva | A | tolta dallo Studio e cancellata il 2/10 |
| F3 | API statistiche `/api/analytics/collect` | `route.ts:31` | Risponde "registrato" | Non salva niente; nessuna pagina la chiama | A | API cancellata il 2/10 (404) |
| F4 | API Satispay `/api/donations/satispay` | `route.ts:16` | Un pagamento | ID inventato, nessuna chiamata a Satispay; aperta a chiunque | A | API cancellata il 2/10 (404) |
| F5 | Trascrizione podcast `/api/podcasts/transcribe` | `lib/transcription.ts:61-66` | "Trascrizione completata" | Sempre lo stesso testo di esempio; ramo Whisper vuoto; senza accesso né quota | A | API cancellata il 2/10 (404); la libreria resta per Whisper |
| F6 | ActivityPub / WebFinger | `api/activitypub/users/[handle]/route.ts:29,39` | Account seguibile da Mastodon | Accetta qualsiasi nome, chiave pubblica finta, inbox/outbox inesistenti | A/B | WebFinger e attore cancellati il 2/10 (404) |
| F7 | Mance (TipJar) | `components/TipJar.tsx:62` | "Mancia inviata" | Successo dopo 600 ms senza addebito | A | tolta dalle pagine (98b5d79) e file cancellato il 2/10 |
| F8 | Posta (`/inbox`, barra in alto) | `app/inbox/page.tsx:8` | Gli articoli delle iscrizioni | Due articoli finti, link a pagine inesistenti, "Segna come letti" senza azione | B | tolta dalla navigazione e cancellata il 2/10 |
| F9 | Podcast (`/podcasts`, barra e piede) | `app/podcasts/page.tsx:24` | Elenco episodi | Due episodi finti con musica di esempio da soundhelix.com | B | tolta da barra e piede e cancellata il 2/10, con il lettore audio che usava solo lei |
| F10 | Mi piace sugli articoli | `p/[slug]/[postSlug]/page.tsx` | Contatore | Nessun modo di aggiungerne | B | contatore nascosto il 2/10 finché i mi piace non sono veri |
| F11 | Commenti | stesso file | Elenco commenti | Si leggono ma non si possono scrivere (nessuna API) | B | sezione mostrata solo se ci sono commenti (importati); il modulo resta da fare |
| F12 | Email di conferma abbonamento | `packages/email/src/SubscriptionConfirmationEmail.tsx:34` | Link al portale | Rimanda a `/account/billing`, che non esiste; il modello non è ancora usato | B | link corretto in /account/subscriptions il 2/10 |
| F13 | App mobile (`apps/mobile`) | `(tabs)/index.tsx:5` | App | Tutto con dati scritti nel codice; non pubblicizzata | C | aperta |

Funzioni verificate come vere: pagamenti e abbonamenti Stripe (Connect, webhook, SEPA asincrono), invio email
con i provider, worker (post programmati e newsletter), backup con cifratura, segnalazione errori, dominio
personalizzato, import da Substack, podcast dentro i post e feed RSS, statistiche dello Studio (conteggi veri),
fattura elettronica (XML vero; la trasmissione allo SdI la fa l'autore, e lo Studio lo dice), aspetto,
cookie, pagina di cortesia, amministrazione.

## 2. Audit esterno: verifica punto per punto

Avvertenza sul perimetro: l'audit ha letto `docker/docker-compose.yml` (sviluppo) e `dist/docker-compose.prod.yml`
(vecchia via di deploy con `dist/deploy.sh`). **La produzione gira su Coolify con `docker-compose.coolify.yml`**,
che l'audit non ha esaminato: per questo i tre "critici" non toccano il sito online. L'audit ha anche lasciato i
due compose con i fine riga cambiati: ripristinati con `git checkout` il 2/10.

| # | Voce dell'audit | Verifica | Esito |
|---|---|---|---|
| C1 | Segreti con valore di default nei compose | Vero in `docker/docker-compose.yml` (sviluppo). In produzione Coolify genera i segreti (`SERVICE_HEX_*`) e `dist/docker-compose.prod.yml` non ha default | Non tocca la produzione. 2/10: il compose di sviluppo dichiara in testa che è solo per lo sviluppo |
| C2 | Nessun volume per gli upload in produzione | Vero in `dist/docker-compose.prod.yml`. In Coolify c'è `zerostack-uploads:/data/uploads` | Chiuso il 2/10: via dist/ cancellata |
| C3 | Worker senza configurazione email | Vero in `dist/docker-compose.prod.yml`. In Coolify il worker ha `EMAIL_PROVIDER`, `EMAIL_FROM`, `APP_URL` | Chiuso il 2/10: via dist/ cancellata |
| A1 | Gara fra webhook Stripe sull'abbonamento | **Confermato**: `lib/stripe.ts:91` fa `findFirst` e poi `create`; `stripeSubscriptionId` ha solo un indice, non un vincolo unico. `checkout.session.completed` e `customer.subscription.created` insieme possono creare due righe. Gli incassi invece sono protetti (`stripeObjectId @unique`) | Chiuso il 2/10: stripeSubscriptionId unico (migrazione 20261002190000), upsert con ripresa su P2002, test con tre webhook in contemporanea |
| A2 | `clientIp()` legge il primo valore di X-Forwarded-For | Vero nel codice. Il Caddy di Coolify non si fida degli X-Forwarded-For in arrivo e li sostituisce con l'IP vero, quindi oggi non è sfruttabile | Chiuso il 2/10: si legge l ultimo valore, con test |
| A3 | Limite dei tentativi aperto senza Redis | Vero, è una scelta scritta nel codice (`lib/rate-limit.ts`): Redis caduto non deve bloccare tutti gli accessi | Chiuso il 2/10: senza Redis si conta in memoria, con test |
| A4 | Trascrizione aperta a chiunque | Confermato, e in più è finta (F5) | Chiuso il 2/10: API cancellata |
| A5 | Sale delle statistiche nel repository | Era vero | Chiuso il 2/10 (4a9dccf): sale da `ANALYTICS_SALT` o `NEXTAUTH_SECRET` |
| A6 | Satispay senza verifica | Confermato (F4) | Chiuso il 2/10: API cancellata |
| A7 | TipJar simulato | Confermato (F7) | Tolto dalle pagine il 2/10 |
| A8 | AudioPlayer rotto nell'app mobile | App mobile non in uso (F13) | Bassa priorità |
| A9 | Vincoli deboli sui mi piace | Confermato: `@@unique([userId, postId, noteId, commentId])` con colonne NULL, che Postgres non considera uguali, quindi i doppioni passano. Oggi nessuno scrive mi piace (F10) | Chiuso il 3/10: un vincolo unico per articolo, nota e commento (migrazione 20261003120000) |
| A10 | Metriche della dashboard finte | Non confermato sul web: Studio e pannello usano conteggi veri. Finte le pagine F1, F8, F9 e l'app mobile | Coperto dalla sezione 1 |
| A11 | Build dell'app mobile non configurata | Vero, app non in uso | Bassa priorità |
| A12 | Variabili numeriche del worker non controllate | Confermato: `Number(process.env.WORKER_POLL_SECONDS ...)` e `BACKUP_INTERVAL_HOURS`; un valore sbagliato dà NaN, e `setTimeout(NaN)` gira a vuoto senza pausa | Chiuso il 2/10: envNumber in packages/shared, errore all avvio con il nome della variabile |
| A13 | Backup mai provati in ripristino | Vero per i backup dell'app | Fatto il 2/10: dump ripristinato in un Postgres usa e getta, stesse righe della produzione in ogni tabella (vps/zs-prova-ripristino.sh). Restano: BACKUP_PASSPHRASE non impostata (file in chiaro) e nessuna copia fuori dal VPS |
| A14 | Passphrase GPG visibile nella riga di comando | Vero in `dist/backup-vps.sh:25`, script della vecchia via di deploy, non usato con Coolify | Chiuso il 2/10: script cancellato con la via dist/ |
| A15 | Script di deploy rotti | `dist/deploy.sh`, `update-vps.sh`: vecchia via, non usata | Chiuso il 2/10: via dist/ cancellata, si pubblica solo con Coolify |
| A16 | Lint rotto | Confermato: `next lint` senza configurazione ESLint | Chiuso il 2/10: eslint-config-next, tre errori corretti, lint in CI GitHub e sul VPS |
| A17 | Turbo morto, niente typecheck in pipeline | `turbo.json` inutile, vero. Il typecheck invece c'è: CI GitHub e CI sul VPS lanciano `npm run typecheck` | Chiuso il 2/10: turbo.json cancellato |
| Medi | Vincoli unici con colonne NULL, rinnovi a metà periodo, fusi orari, errori lato client | Generici, senza file: da verificare uno per uno quando si tocca l'area | Aperti |
| Bassi | `version: '3.8'`, commento "Next.js 15", `.env.production.example` incompleto, dipendenze doppie, `@next/swc` disallineato | Da verificare insieme alla pulizia della via `dist/` | Aperti |

Confermato anche quello che l'audit dà per sano: firme dei webhook Stripe e Resend, controlli di proprietà
sulle API, sanificazione dei contenuti, query parametrizzate, upload senza path traversal, password con scrypt.

## 3. Ordine di lavoro

Blocchi 1-4 **fatti il 2/10** (commit 33b7e77, dde50d4): onestà, soldi e dati, persistenza, strumenti.

## 4. Da fare: le funzioni vere (rimandate da Dario il 2/10, da riprendere)

In quest'ordine. Ognuna sostituisce una funzione finta tolta il 2/10 e torna in navigazione solo quando è vera,
con i suoi test.

| # | Funzione | Cosa serve | Note |
|---|---|---|---|
| T1 | **Commenti** | API per scrivere (solo utenti con accesso, abbonati se l'articolo è riservato), moderazione dell'autore (nascondi, elimina), limite di frequenza, sanificazione, notifica all'autore | **Fatto il 3/10**: risposte di un livello, nascondi/cancella, avviso all'autore, 10 ogni 10 minuti; test-comments.mjs |
| T2 | **Mi piace** | API metti/togli, contatore coerente | **Fatto il 3/10**: vincoli separati per articolo, nota e commento (A9 chiuso), contatore nella stessa transazione, prova con richieste in contemporanea; test in test-comments.mjs |
| T3 | **Posta del lettore** | `/inbox`: gli articoli delle pubblicazioni a cui è iscritto o abbonato, con "letto/non letto" | Serve un modello per lo stato di lettura |
| T4 | **Squadra** | Inviti per email ai collaboratori (`PublicationMember`), ruoli editor e collaboratore, accettazione, revoca | Rimettere la voce nello Studio |
| T5 | **Note** | Feed di note brevi dei creatori (`Note`), scrittura dallo Studio, mi piace e risposte | Dopo T2 |
| T6 | **Fediverso** | WebFinger e attore ActivityPub veri: chiavi per pubblicazione, inbox/outbox, firma delle richieste | Il più complesso fra quelli leggeri |
| T7 | **Mance** | Solo con un pagamento vero via Stripe (Checkout una tantum), commissione come gli abbonamenti | Il TipJar simulato è stato cancellato |
| T8 | **Podcast** | Pagina `/podcasts` con gli episodi veri dal database (`PodcastEpisode`) e il lettore audio | **In fondo per scelta di Dario (3/10):** l'audio pesa troppo per il VPS di oggi (2 vCPU, 4 GB, 78 GB di disco). Da fare con i file audio su uno storage esterno (`STORAGE_DRIVER=s3`), non sul server. I dati e il feed RSS ci sono già |
| T9 | **Trascrizione** | Whisper con chiave nel compose (servizio esterno, mai un modello sul VPS), quota per autore, solo per i propri episodi | Dopo T8, per lo stesso motivo. `lib/transcription.ts` oggi restituisce un testo d'esempio |

## 5. Altro in sospeso

Tutto quello che non è codice, o aspetta Dario o altri, sta in [IN-SOSPESO.md](IN-SOSPESO.md): è l'elenco permanente.
