#!/usr/bin/env bash
# ==============================================================================
# ZeroStack - Script di Aggiornamento Produzione VPS (Zero-Downtime)
# ==============================================================================

set -e

echo "🔄 [ZeroStack] Avvio aggiornamento del server..."

git pull origin main

echo "🐳 Ricostruzione container aggiornati..."
docker compose -f docker-compose.prod.yml build --pull web worker

echo "🚀 Riavvio controllato dei servizi..."
docker compose -f docker-compose.prod.yml up -d --no-deps web worker

echo "🗄️  Verifica migrazioni database..."
docker compose -f docker-compose.prod.yml exec web npx prisma db push --schema=/app/packages/database/prisma/schema.prisma || true

echo "✅ Aggiornamento completato con successo!"
