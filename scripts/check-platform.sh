#!/usr/bin/env bash
# Controlla che il dominio della piattaforma sia pronto: DNS del dominio, wildcard per i sottodomini
# degli autori, HTTPS e risposta dell'app. Si lancia da qualsiasi computer con curl (e dig, se c'è):
#   bash scripts/check-platform.sh zerostack.it [slug-di-una-pubblicazione-esistente]
set -uo pipefail

ROOT="${1:-zerostack.it}"
SLUG="${2:-}"
RANDOM_LABEL="verifica-$(date +%s)"
ok=0; ko=0
pass() { echo "  ✅ $1"; ok=$((ok+1)); }
fail() { echo "  ❌ $1"; ko=$((ko+1)); }

# Risoluzione: dig se installato, altrimenti DNS-over-HTTPS di Google.
resolve() {
  if command -v dig >/dev/null; then
    dig +short A "$1" | grep -E '^[0-9.]+$' | sort | tr '\n' ' '
  else
    curl -s --max-time 10 "https://dns.google/resolve?name=$1&type=A" |
      grep -oE '"data":"[0-9.]+"' | cut -d'"' -f4 | sort | tr '\n' ' '
  fi
}

echo "🔎 DNS"
ROOT_IP=$(resolve "$ROOT")
[ -n "$ROOT_IP" ] && pass "$ROOT → $ROOT_IP" || fail "$ROOT non risolve: manca il record A verso il server"
WWW_IP=$(resolve "www.$ROOT")
[ -n "$WWW_IP" ] && pass "www.$ROOT → $WWW_IP" || fail "www.$ROOT non risolve"
WILD_IP=$(resolve "$RANDOM_LABEL.$ROOT")
if [ -z "$WILD_IP" ]; then
  fail "*.$ROOT non risolve ($RANDOM_LABEL.$ROOT): manca il record wildcard, i sottodomini degli autori non funzionano"
elif [ "$WILD_IP" = "$ROOT_IP" ]; then
  pass "*.$ROOT → $WILD_IP (stesso server del dominio principale)"
else
  fail "*.$ROOT → $WILD_IP, diverso da $ROOT ($ROOT_IP): controlla che punti al server ZeroStack"
fi

echo "🔒 HTTPS e applicazione"
code=$(curl -s -o /dev/null --max-time 20 -w "%{http_code}" "https://$ROOT/")
[ "$code" = "200" ] && pass "https://$ROOT risponde 200 con certificato valido" || fail "https://$ROOT risponde $code (000 = non raggiungibile o certificato non valido)"
code=$(curl -s -o /dev/null --max-time 20 -w "%{http_code}" "https://$ROOT/api/domains/check?domain=$ROOT")
[ "$code" = "200" ] && pass "L'app risponde a /api/domains/check" || fail "/api/domains/check risponde $code"
code=$(curl -s -o /dev/null --max-time 20 -w "%{http_code}" "https://$ROOT/api/domains/check?domain=$RANDOM_LABEL.$ROOT")
[ "$code" = "403" ] && pass "Un sottodominio senza pubblicazione non riceve certificati (403)" || fail "Un sottodominio inesistente risponde $code invece di 403"

if [ -n "$SLUG" ]; then
  code=$(curl -s -o /dev/null --max-time 20 -w "%{http_code}" "https://$ROOT/api/domains/check?domain=$SLUG.$ROOT")
  [ "$code" = "200" ] && pass "$SLUG.$ROOT è autorizzato al certificato" || fail "$SLUG.$ROOT: /api/domains/check risponde $code (la pubblicazione esiste?)"
  # Primo accesso: Caddy chiede il certificato a Let's Encrypt, può servire qualche secondo.
  code=$(curl -s -o /dev/null --max-time 60 -w "%{http_code}" "https://$SLUG.$ROOT/")
  [ "$code" = "200" ] && pass "https://$SLUG.$ROOT risponde 200 con certificato valido" || fail "https://$SLUG.$ROOT risponde $code"
fi

echo
echo "📊 $ok controlli superati, $ko falliti"
[ "$ko" -eq 0 ]
