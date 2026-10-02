# Stato delle funzioni e audit esterno (2 ottobre 2026)

Due elenchi in un posto solo: le funzioni che oggi sono solo una facciata, e l'esito della verifica
punto per punto dell'audit statico esterno (`Audit-Bug-Report.pdf`, 2/10/2026). Ogni voce porta il file
che lo dimostra. Quando una voce si chiude, si scrive qui con la data e il commit.

## 1. Funzioni finte o incomplete

Gravità: **A** inganna chi la usa (soldi, dati, promesse); **B** visibile ma innocua; **C** solo interna.

| # | Funzione | Prova | Cosa sembra | Cosa fa davvero | Gravità | Stato |
|---|---|---|---|---|---|---|
| F1 | Note (`/notes`, barra in alto) | `app/notes/page.tsx:22`, `components/NoteComposer.tsx:19` | Feed con note e mi piace | Note scritte nel codice; "Invia" la mostra dopo 400 ms firmata sempre "Dario De Leonardis", sparisce al ricaricamento | A | aperta |
| F2 | Squadra e collaboratori (Studio) | `app/studio/team/page.tsx:15,29` | Un collaboratore e gli inviti | "Marco Rossi" inventato; l'invito non manda email e non salva | A | aperta |
| F3 | API statistiche `/api/analytics/collect` | `route.ts:31` | Risponde "registrato" | Non salva niente; nessuna pagina la chiama | A | aperta |
| F4 | API Satispay `/api/donations/satispay` | `route.ts:16` | Un pagamento | ID inventato, nessuna chiamata a Satispay; aperta a chiunque | A | aperta |
| F5 | Trascrizione podcast `/api/podcasts/transcribe` | `lib/transcription.ts:61-66` | "Trascrizione completata" | Sempre lo stesso testo di esempio; ramo Whisper vuoto; senza accesso né quota | A | aperta |
| F6 | ActivityPub / WebFinger | `api/activitypub/users/[handle]/route.ts:29,39` | Account seguibile da Mastodon | Accetta qualsiasi nome, chiave pubblica finta, inbox/outbox inesistenti | A/B | aperta |
| F7 | Mance (TipJar) | `components/TipJar.tsx:62` | "Mancia inviata" | Successo dopo 600 ms senza addebito | A | tolta dalle pagine il 2/10 (98b5d79); il file resta, non usato |
| F8 | Posta (`/inbox`, barra in alto) | `app/inbox/page.tsx:8` | Gli articoli delle iscrizioni | Due articoli finti, link a pagine inesistenti, "Segna come letti" senza azione | B | aperta |
| F9 | Podcast (`/podcasts`, barra e piede) | `app/podcasts/page.tsx:24` | Elenco episodi | Due episodi finti con musica di esempio da soundhelix.com | B | aperta |
| F10 | Mi piace sugli articoli | `p/[slug]/[postSlug]/page.tsx` | Contatore | Nessun modo di aggiungerne | B | aperta |
| F11 | Commenti | stesso file | Elenco commenti | Si leggono ma non si possono scrivere (nessuna API) | B | aperta |
| F12 | Email di conferma abbonamento | `packages/email/src/SubscriptionConfirmationEmail.tsx:34` | Link al portale | Rimanda a `/account/billing`, che non esiste; il modello non è ancora usato | B | aperta |
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
| C1 | Segreti con valore di default nei compose | Vero in `docker/docker-compose.yml` (sviluppo). In produzione Coolify genera i segreti (`SERVICE_HEX_*`) e `dist/docker-compose.prod.yml` non ha default | Non tocca la produzione. Da fare: default solo per lo sviluppo, con avviso, oppure fail-fast |
| C2 | Nessun volume per gli upload in produzione | Vero in `dist/docker-compose.prod.yml`. In Coolify c'è `zerostack-uploads:/data/uploads` | Non tocca la produzione. La via `dist/` è da allineare o da togliere |
| C3 | Worker senza configurazione email | Vero in `dist/docker-compose.prod.yml`. In Coolify il worker ha `EMAIL_PROVIDER`, `EMAIL_FROM`, `APP_URL` | Come C2 |
| A1 | Gara fra webhook Stripe sull'abbonamento | **Confermato**: `lib/stripe.ts:91` fa `findFirst` e poi `create`; `stripeSubscriptionId` ha solo un indice, non un vincolo unico. `checkout.session.completed` e `customer.subscription.created` insieme possono creare due righe. Gli incassi invece sono protetti (`stripeObjectId @unique`) | Da correggere: vincolo unico e upsert |
| A2 | `clientIp()` legge il primo valore di X-Forwarded-For | Vero nel codice. Il Caddy di Coolify non si fida degli X-Forwarded-For in arrivo e li sostituisce con l'IP vero, quindi oggi non è sfruttabile | Da irrobustire (si legge l'ultimo valore, quello scritto dal proxy) |
| A3 | Limite dei tentativi aperto senza Redis | Vero, è una scelta scritta nel codice (`lib/rate-limit.ts`): Redis caduto non deve bloccare tutti gli accessi | Da migliorare: ripiego in memoria per accesso e recupero password |
| A4 | Trascrizione aperta a chiunque | Confermato, e in più è finta (F5) | Da spegnere finché non è vera |
| A5 | Sale delle statistiche nel repository | Era vero | Chiuso il 2/10 (4a9dccf): sale da `ANALYTICS_SALT` o `NEXTAUTH_SECRET` |
| A6 | Satispay senza verifica | Confermato (F4) | Da spegnere |
| A7 | TipJar simulato | Confermato (F7) | Tolto dalle pagine il 2/10 |
| A8 | AudioPlayer rotto nell'app mobile | App mobile non in uso (F13) | Bassa priorità |
| A9 | Vincoli deboli sui mi piace | Confermato: `@@unique([userId, postId, noteId, commentId])` con colonne NULL, che Postgres non considera uguali, quindi i doppioni passano. Oggi nessuno scrive mi piace (F10) | Da sistemare quando si costruiscono i mi piace |
| A10 | Metriche della dashboard finte | Non confermato sul web: Studio e pannello usano conteggi veri. Finte le pagine F1, F8, F9 e l'app mobile | Coperto dalla sezione 1 |
| A11 | Build dell'app mobile non configurata | Vero, app non in uso | Bassa priorità |
| A12 | Variabili numeriche del worker non controllate | Confermato: `Number(process.env.WORKER_POLL_SECONDS ...)` e `BACKUP_INTERVAL_HOURS`; un valore sbagliato dà NaN, e `setTimeout(NaN)` gira a vuoto senza pausa | Da correggere (validazione con errore all'avvio) |
| A13 | Backup mai provati in ripristino | Vero per i backup dell'app | Da fare: prova di ripristino sul VPS |
| A14 | Passphrase GPG visibile nella riga di comando | Vero in `dist/backup-vps.sh:25`, script della vecchia via di deploy, non usato con Coolify | Da correggere o togliere con la via `dist/` |
| A15 | Script di deploy rotti | `dist/deploy.sh`, `update-vps.sh`: vecchia via, non usata | Da decidere: togliere o rimettere a posto |
| A16 | Lint rotto | Confermato: `next lint` senza configurazione ESLint | Da sistemare (configurazione e passo in CI) |
| A17 | Turbo morto, niente typecheck in pipeline | `turbo.json` inutile, vero. Il typecheck invece c'è: CI GitHub e CI sul VPS lanciano `npm run typecheck` | Togliere `turbo.json` |
| Medi | Vincoli unici con colonne NULL, rinnovi a metà periodo, fusi orari, errori lato client | Generici, senza file: da verificare uno per uno quando si tocca l'area | Aperti |
| Bassi | `version: '3.8'`, commento "Next.js 15", `.env.production.example` incompleto, dipendenze doppie, `@next/swc` disallineato | Da verificare insieme alla pulizia della via `dist/` | Aperti |

Confermato anche quello che l'audit dà per sano: firme dei webhook Stripe e Resend, controlli di proprietà
sulle API, sanificazione dei contenuti, query parametrizzate, upload senza path traversal, password con scrypt.

## 3. Ordine di lavoro proposto

1. **Onestà**: togliere dalla navigazione F1, F2, F8, F9; spegnere le API F3, F4, F5 (risposta 404 o 501 onesta) e F6.
2. **Soldi e dati**: A1 (vincolo unico sugli abbonamenti), A12 (variabili del worker), A2 e A3.
3. **Persistenza**: A13 (prova di ripristino dei backup), via `dist/` da allineare o togliere (C1-C3, A14, A15).
4. **Strumenti**: A16 (lint), A17 (via turbo.json).
5. **Funzioni vere**: commenti e mi piace (con il vincolo giusto, A9), Podcast dal database, Posta del lettore,
   inviti alla squadra, Note, trascrizione con Whisper, Fediverso.
