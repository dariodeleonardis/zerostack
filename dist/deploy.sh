#!/usr/bin/env bash
# ==============================================================================
# ZeroStack - Script di Deploy Produzione per VPS
# ==============================================================================

set -e

echo "🚀 [ZeroStack Dist] Avvio installazione di produzione..."

if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Esegui come root o con sudo: sudo bash deploy.sh"
  exit 1
fi

# 1. Verifica e installazione Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Installazione Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 2. File .env
if [ ! -f .env ]; then
    echo "📝 Creazione file .env..."
    cp .env.production.example .env
    DB_PASS=$(openssl rand -hex 16)
    AUTH_SECRET=$(openssl rand -hex 32)
    sed -i "s/imposta_password_robusta_qui/$DB_PASS/g" .env
    sed -i "s/genera_con_openssl_rand_hex_32/$AUTH_SECRET/g" .env
fi

# 3. Avvio stack di produzione
echo "🐳 Avvio container Docker di produzione..."
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres redis

# 4. Migrazioni database, prima di avviare il sito: se falliscono ci si ferma qui
echo "🗄️  Applicazione migrazioni database..."
docker compose -f docker-compose.prod.yml run --rm --no-deps worker node packages/database/scripts/migrate.mjs
docker compose -f docker-compose.prod.yml up -d

echo "✅ ZeroStack Produzione è attivo!"
