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
| **Fatturazione Elettronica** | Nessun supporto a SDI / PEC / Codice Fiscale | **Nativa per l'Italia**: campi Codice Fiscale, P.IVA, SDI a 7 caratteri e PEC |
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
    └── import-substack.ts      # Strumento di migrazione 1-click da export CSV di Substack
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

## 🔄 Migrazione 1-Click da Substack

Se hai già una pubblicazione su Substack, esporta l'archivio dalle impostazioni di Substack e importa gli iscritti in ZeroStack con un singolo comando:

```bash
npx ts-node scripts/import-substack.ts tech-italia ./subscribers.csv
```

---

## 🔐 Configurazione Fiscale Italiana & Pagamenti (Stripe)

1. Apri il file `.env` sul tuo VPS.
2. Inserisci le tue credenziali **Stripe** (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`).
3. Quando un lettore si abbona selezionando "Azienda / P.IVA", il sistema valida il **Codice Fiscale**, la **Partita IVA** (11 cifre) e raccoglie il **Codice Destinatario SDI** (7 caratteri) o l'indirizzo **PEC**, salvandoli per la fatturazione elettronica.

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
