#!/bin/sh

set -eu
umask 077

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-.env.local}"

if [ -z "${DATABASE_URL:-}" ] && [ -f "$BACKUP_ENV_FILE" ]; then
  DATABASE_URL=$(sed -n 's/^DATABASE_URL=//p' "$BACKUP_ENV_FILE" | head -n 1 | sed 's/^"//; s/"$//')
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "backup: DATABASE_URL is not set and not found in $BACKUP_ENV_FILE" >&2
  exit 1
fi

PG_URL=${DATABASE_URL%%\?*}

case "$BACKUP_KEEP_DAYS" in
  ''|*[!0-9]*) echo "backup: BACKUP_KEEP_DAYS must be a whole number" >&2; exit 1 ;;
esac

mkdir -p "$BACKUP_DIR"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FINAL="$BACKUP_DIR/fulcrum-$STAMP.dump"
PARTIAL="$FINAL.partial"

cleanup() { rm -f "$PARTIAL"; }
trap cleanup EXIT INT TERM

echo "backup: dumping to $FINAL"
pg_dump --format=custom --no-owner --no-privileges --file="$PARTIAL" "$PG_URL"

if ! pg_restore --list "$PARTIAL" >/dev/null 2>&1; then
  echo "backup: the archive was written but pg_restore cannot read it" >&2
  exit 1
fi

mv "$PARTIAL" "$FINAL"
trap - EXIT INT TERM

if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  gpg --batch --yes --trust-model always --encrypt \
      --recipient "$BACKUP_GPG_RECIPIENT" --output "$FINAL.gpg" "$FINAL"
  rm -f "$FINAL"
  FINAL="$FINAL.gpg"
  echo "backup: encrypted to $BACKUP_GPG_RECIPIENT"
fi

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$BACKUP_DIR" && sha256sum "$(basename "$FINAL")" > "$(basename "$FINAL").sha256")
else
  (cd "$BACKUP_DIR" && shasum -a 256 "$(basename "$FINAL")" > "$(basename "$FINAL").sha256")
fi

BYTES=$(wc -c < "$FINAL" | tr -d ' ')
echo "backup: wrote $FINAL ($BYTES bytes)"

if [ -n "${BACKUP_AFTER_CMD:-}" ]; then
  echo "backup: running BACKUP_AFTER_CMD"
  sh -c "$BACKUP_AFTER_CMD" sh "$FINAL"
fi

find "$BACKUP_DIR" -maxdepth 1 \( -name 'fulcrum-*.dump' -o -name 'fulcrum-*.dump.gpg' -o -name 'fulcrum-*.sha256' \) \
  -type f -mtime +"$BACKUP_KEEP_DAYS" -print -delete | sed 's/^/backup: pruned /'

echo "backup: done"
