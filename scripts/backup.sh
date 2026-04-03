#!/bin/bash
# Automated PostgreSQL backup for VitaBalance
# Usage: ./scripts/backup.sh
# Cron: 0 3 * * * /home/stailfx/vita-balance/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/stailfx/vita-balance/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-vita-postgres}"
DB_NAME="${DB_NAME:-vitamin_db}"
DB_USER="${DB_USER:-vitamin_user}"
KEEP_DAYS="${KEEP_DAYS:-14}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/vita_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup successful: $BACKUP_FILE ($SIZE)"
else
    echo "[$(date)] ERROR: Backup file is empty or missing!" >&2
    exit 1
fi

# Clean up old backups
DELETED=$(find "$BACKUP_DIR" -name "vita_*.sql.gz" -mtime +"$KEEP_DAYS" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[$(date)] Cleaned up $DELETED old backup(s)"
fi

echo "[$(date)] Done."
