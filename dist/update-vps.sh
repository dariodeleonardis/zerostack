#!/usr/bin/env bash
# ==============================================================================
# ZeroStack - Script di Aggiornamento Produzione VPS (Zero-Downtime)
# ==============================================================================

set -e

echo "🔄 [ZeroStack] Avvio aggiornamento del server..."

git pull origin main

echo "🐳 Ricostruzione container aggiornati..."
docker compose -f docker-compose.prod.yml build --pull web worker

echo "🗄️  Migrazioni database (se falliscono il sito resta sulla versione precedente)..."
docker compose -f docker-compose.prod.yml run --rm --no-deps worker node packages/database/scripts/migrate.mjs

echo "🚀 Riavvio controllato dei servizi..."
docker compose -f docker-compose.prod.yml up -d --no-deps web worker

echo "✅ Aggiornamento completato con successo!"
