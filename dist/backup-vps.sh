#!/usr/bin/env bash
# ==============================================================================
# ZeroStack - Script di Backup Automatico VPS (PostgreSQL & Allegati)
# ==============================================================================

set -e

BACKUP_DIR="/var/backups/zerostack"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "💾 [ZeroStack] Creazione backup database PostgreSQL in corso..."
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U zerostack zerostack | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Mantiene solo gli ultimi 14 giorni di backup per non saturare il disco VPS
find "$BACKUP_DIR" -type f -name "db_backup_*.sql.gz" -mtime +14 -delete

echo "✅ Backup completato con successo: $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
