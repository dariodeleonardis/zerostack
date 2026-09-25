#!/usr/bin/env bash
# ==============================================================================
# ZeroStack - Script di Backup Automatico VPS (PostgreSQL, Media, Cifratura GPG)
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/zerostack}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${RETENTION_DAYS:-14}"
GPG_PASSPHRASE="${GPG_PASSPHRASE:-}"
OFFSITE_DESTINATION="${OFFSITE_DESTINATION:-}" # es. user@remote.backup.server:/backups/ o s3://mio-bucket/backups

mkdir -p "$BACKUP_DIR"

echo "💾 [ZeroStack] Inizio backup database PostgreSQL..."
DUMP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U "${POSTGRES_USER:-zerostack}" "${POSTGRES_DB:-zerostack}" | gzip > "$DUMP_FILE"

FINAL_FILE="$DUMP_FILE"

# Cifratura simmetrica AES-256 GPG se definita la passphrase
if [ -n "$GPG_PASSPHRASE" ]; then
  echo "🔒 [ZeroStack] Cifratura file di backup con GPG AES-256..."
  gpg --batch --yes --passphrase "$GPG_PASSPHRASE" --symmetric --cipher-algo AES256 -o "$DUMP_FILE.gpg" "$DUMP_FILE"
  rm -f "$DUMP_FILE"
  FINAL_FILE="$DUMP_FILE.gpg"
  echo "🔐 File cifrato: $FINAL_FILE"
fi

# Caricamento offsite opzionale (Cloudflare R2, AWS S3, o server SSH remoto)
if [ -n "$OFFSITE_DESTINATION" ]; then
  echo "☁️ [ZeroStack] Upload offsite verso $OFFSITE_DESTINATION..."
  if [[ "$OFFSITE_DESTINATION" == s3://* ]]; then
    aws s3 cp "$FINAL_FILE" "$OFFSITE_DESTINATION"
  else
    rsync -avz -e ssh "$FINAL_FILE" "$OFFSITE_DESTINATION"
  fi
  echo "🚀 Offsite upload completato."
fi

# Rotazione locale: elimina backup più vecchi di RETENTION_DAYS
echo "🧹 [ZeroStack] Rotazione: eliminazione backup più vecchi di $RETENTION_DAYS giorni..."
find "$BACKUP_DIR" -type f \( -name "db_backup_*.sql.gz" -o -name "db_backup_*.sql.gz.gpg" \) -mtime "+$RETENTION_DAYS" -delete

echo "✅ [ZeroStack] Procedura di backup completata con successo: $FINAL_FILE"
