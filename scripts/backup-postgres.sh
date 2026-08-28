#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/vitcrm}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/vitcrm-$STAMP.dump"
umask 077
pg_dump "$DATABASE_URL" --format=custom --file="$FILE"
find "$BACKUP_DIR" -type f -name 'vitcrm-*.dump' -mtime "+$RETENTION_DAYS" -delete
printf 'Created backup: %s\n' "$FILE"
