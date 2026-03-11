#!/bin/bash
# TMSA-Web Datenbank-Restore
# Verwendung: ./restore.sh <backup_file.sql.gz>

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Verwendung: $0 <backup_file.sql.gz>"
  echo ""
  echo "Verfügbare Backups:"
  ls -lh /data/backups/tmsa_backup_*.sql.gz 2>/dev/null || echo "  Keine Backups gefunden in /data/backups/"
  exit 1
fi

BACKUP_FILE="$1"
DB_URL="${DATABASE_URL:-postgresql://tmsa:tmsa2026@localhost:5432/tmsa}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[Restore] FEHLER: Datei nicht gefunden: $BACKUP_FILE"
  exit 1
fi

echo "[Restore] ⚠  WARNUNG: Dies überschreibt die aktuelle Datenbank!"
echo "[Restore] Backup: $BACKUP_FILE"
read -p "Fortfahren? (ja/nein) " -r CONFIRM

if [ "$CONFIRM" != "ja" ]; then
  echo "[Restore] Abgebrochen."
  exit 0
fi

echo "[Restore] Stelle Datenbank wieder her..."

# Datenbank leeren und wiederherstellen
gunzip -c "$BACKUP_FILE" | psql "$DB_URL" --quiet

echo "[Restore] ✓ Datenbank wiederhergestellt aus: $BACKUP_FILE"
echo "[Restore] Fertig."
