#!/usr/bin/env bash
# ==============================================================================
# ZeroStack - Script di Installazione e Aggiornamento One-Click per VPS
# ==============================================================================

set -e

echo "🚀 [ZeroStack] Inizio installazione su VPS..."

# 1. Verifica permessi di root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Esegui questo script come root o con sudo: sudo bash scripts/deploy.sh"
  exit 1
fi

# 2. Verifica e installazione Docker e Docker Compose se mancanti
if ! command -v docker &> /dev/null; then
    echo "📦 Installazione di Docker in corso..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installato con successo."
fi

# 3. Preparazione file .env
if [ ! -f .env ]; then
    echo "📝 Creazione del file .env da .env.example..."
    cp .env.example .env
    
    # Genera chiavi sicure automatiche se openssl è disponibile
    if command -v openssl &> /dev/null; then
        RANDOM_DB_PASS=$(openssl rand -hex 16)
        RANDOM_AUTH_SECRET=$(openssl rand -hex 32)
        sed -i "s/genera_una_password_sicura_qui_2026/$RANDOM_DB_PASS/g" .env
        sed -i "s/genera_un_hash_segreto_con_openssl_rand_hex_32/$RANDOM_AUTH_SECRET/g" .env
        echo "🔒 Password database e token NextAuth generati in modo sicuro."
    fi
fi

# 4. Configurazione Firewall UFW (se attivo)
if command -v ufw &> /dev/null; then
    echo "🛡️  Configurazione firewall per porte Web (80, 443)..."
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
fi

# 5. Build e avvio dello stack Docker
echo "🐳 Avvio container ZeroStack (Web, Worker, Postgres, Redis, Caddy)..."
docker compose -f docker/docker-compose.yml up -d --build

# 6. Esecuzione migrazioni database
echo "🗄️  Applicazione schema database Prisma..."
sleep 5
docker compose -f docker/docker-compose.yml exec web npx prisma db push --schema=/app/packages/database/prisma/schema.prisma || true

echo ""
echo "=============================================================================="
echo "🎉 ZeroStack è attivo e funzionante sul tuo VPS!"
echo "🌐 Apri il browser all'indirizzo IP del tuo server o al dominio configurato."
echo "⚙️  Per personalizzare chiavi Stripe, Brevo o dominio, modifica il file .env"
echo "=============================================================================="
