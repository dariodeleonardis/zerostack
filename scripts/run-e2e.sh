#!/usr/bin/env bash
# Avvia il server web già compilato con un ambiente di prova e fa girare tutte le suite di test.
# Richiede Postgres (DATABASE_URL, schema e seed già applicati) e Redis (REDIS_URL).
#   npm run build --workspace=@zerostack/web && bash scripts/run-e2e.sh
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DATABASE_URL:?serve DATABASE_URL}"
: "${REDIS_URL:?serve REDIS_URL}"
WORK="${E2E_WORKDIR:-$(mktemp -d)}"
PORT="${E2E_PORT:-3000}"

export APP_DOMAIN=zerostack.it
export APP_URL="http://localhost:${PORT}"
export ZS_BASE_URL="$APP_URL"
export EMAIL_PROVIDER=log
export EMAIL_LOG_DIR="$WORK/mail"
export ZS_FAKE_DNS_FILE="$WORK/dns.json"
export UPLOAD_DIR="$WORK/uploads"
export STRIPE_SECRET_KEY=sk_test_zs
export STRIPE_API_BASE=http://127.0.0.1:12111
export STRIPE_WEBHOOK_SECRET=whsec_zs_test
export EMAIL_WEBHOOK_TOKEN=zs_email_test
export RESEND_WEBHOOK_SECRET=whsec_dGVzdC1zZWdyZXRvLXJlc2VuZA==
echo '{}' > "$ZS_FAKE_DNS_FILE"

# Un server rimasto acceso da un giro precedente farebbe passare (o fallire) i test per conto suo.
if curl -s -o /dev/null "$APP_URL/api/auth/me"; then
  echo "La porta $PORT è già occupata: ferma il server che la usa (o imposta E2E_PORT)" >&2
  exit 1
fi

# Next direttamente con node, senza npx: così il PID è quello del server e alla fine si ferma davvero.
(cd apps/web && exec node ../../node_modules/next/dist/bin/next start -p "$PORT") > "$WORK/web.log" 2>&1 &
WEB_PID=$!
trap 'kill $WEB_PID 2>/dev/null || true; wait $WEB_PID 2>/dev/null || true' EXIT

for i in $(seq 1 60); do
  curl -s -o /dev/null "$APP_URL/api/auth/me" && break
  if [ "$i" -eq 60 ] || ! kill -0 "$WEB_PID" 2>/dev/null; then
    echo "Il server web non è partito:" >&2
    tail -30 "$WORK/web.log" >&2
    exit 1
  fi
  sleep 1
done

# Tutte le suite registrano utenti dallo stesso IP: tra una e l'altra si azzerano i limiti di Redis.
flush() { node -e "const R=require('ioredis');const r=new R(process.env.REDIS_URL);r.flushall().then(()=>r.quit())"; }

failed=0
for suite in \
  "npx tsx scripts/test-functions.ts" \
  "npx tsx scripts/test-endpoints.ts" \
  "node scripts/test-onboarding.mjs" \
  "node scripts/test-newsletter.mjs" \
  "node scripts/test-payments.mjs" \
  "node scripts/test-import.mjs" \
  "node scripts/test-foundations.mjs" \
  "node scripts/test-launch.mjs"; do
  flush
  echo "::group::$suite"
  if ! $suite; then failed=1; echo "❌ $suite"; fi
  echo "::endgroup::"
done

if [ "$failed" -ne 0 ]; then
  echo "--- ultime righe del log del server ---"
  tail -50 "$WORK/web.log"
  exit 1
fi
echo "✅ Tutte le suite superate"
