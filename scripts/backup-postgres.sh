#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/vitcrm}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/vitcrm-$STAMP.dump"
VERIFY_DIR="$(mktemp -d)"
trap 'rm -rf "$VERIFY_DIR"' EXIT
umask 077
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$FILE"
pg_restore --list "$FILE" > "$VERIFY_DIR/contents.list"
test -s "$VERIFY_DIR/contents.list"
find "$BACKUP_DIR" -type f -name 'vitcrm-*.dump' -mtime "+$RETENTION_DAYS" -delete
printf 'Created and verified backup: %s\n' "$FILE"
