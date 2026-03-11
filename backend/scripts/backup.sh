#!/bin/bash
# TMSA-Web Datenbank-Backup
# Verwendung: ./backup.sh [BACKUP_DIR]
# Cron: 0 2 * * * /path/to/backup.sh /path/to/backups

set -euo pipefail

BACKUP_DIR="${1:-/data/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_URL="${DATABASE_URL:-postgresql://tmsa:tmsa2026@localhost:5432/tmsa}"

# Verzeichnis erstellen
mkdir -p "$BACKUP_DIR"

# Dateiname
BACKUP_FILE="$BACKUP_DIR/tmsa_backup_${TIMESTAMP}.sql.gz"

echo "[Backup] Starte Datenbank-Backup..."
echo "[Backup] Ziel: $BACKUP_FILE"

# pg_dump mit gzip-Kompression
pg_dump "$DB_URL" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

# Dateigröße
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[Backup] ✓ Backup erstellt: $BACKUP_FILE ($SIZE)"

# Alte Backups aufräumen (älter als 30 Tage)
DELETED=$(find "$BACKUP_DIR" -name "tmsa_backup_*.sql.gz" -mtime +30 -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[Backup] $DELETED alte Backup(s) gelöscht (>30 Tage)"
fi

echo "[Backup] Fertig."
