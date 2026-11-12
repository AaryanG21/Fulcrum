#!/bin/sh

set -eu
umask 077

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-.env.local}"

if [ -z "${DATABASE_URL:-}" ] && [ -f "$BACKUP_ENV_FILE" ]; then
  DATABASE_URL=$(sed -n 's/^DATABASE_URL=//p' "$BACKUP_ENV_FILE" | head -n 1 | sed 's/^"//; s/"$//')
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "restore-test: DATABASE_URL is not set and not found in $BACKUP_ENV_FILE" >&2
  exit 1
fi
LIVE_URL=${DATABASE_URL%%\?*}

if [ "${1:-}" ]; then
  ARCHIVE=$1
else
  ARCHIVE=$(ls -1t "$BACKUP_DIR"/fulcrum-*.dump "$BACKUP_DIR"/fulcrum-*.dump.gpg 2>/dev/null | head -n 1 || true)
fi
if [ -z "${ARCHIVE:-}" ] || [ ! -f "$ARCHIVE" ]; then
  echo "restore-test: no archive found (looked in $BACKUP_DIR)" >&2
  exit 1
fi

LIVE_DB=$(printf '%s' "$LIVE_URL" | sed 's|.*/||')
TEST_DB="fulcrum_restore_test_$(date -u +%Y%m%d%H%M%S)_$$"
TEST_URL=$(printf '%s' "$LIVE_URL" | sed "s|/[^/]*\$|/$TEST_DB|")

case "$TEST_DB" in
  fulcrum_restore_test_*) : ;;
  *) echo "restore-test: refusing — unexpected scratch database name" >&2; exit 1 ;;
esac
if [ "$TEST_DB" = "$LIVE_DB" ]; then
  echo "restore-test: refusing — scratch and live database names match" >&2
  exit 1
fi

WORK=$(mktemp -d)
FAILS=0
pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; FAILS=$((FAILS + 1)); }

cleanup() {
  psql "$LIVE_URL" -q -tA -c "DROP DATABASE IF EXISTS \"$TEST_DB\"" >/dev/null 2>&1 || \
    echo "restore-test: WARNING could not drop scratch database $TEST_DB — remove it by hand" >&2
  rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

echo "restore-test: archive  $ARCHIVE"

DUMP=$ARCHIVE
case "$ARCHIVE" in
  *.gpg)
    echo "restore-test: decrypting (needs the private key for the recipient)"
    gpg --batch --yes --decrypt --output "$WORK/archive.dump" "$ARCHIVE"
    DUMP="$WORK/archive.dump"
    ;;
esac

if [ -f "$ARCHIVE.sha256" ]; then
  EXPECT=$(cut -d' ' -f1 "$ARCHIVE.sha256")
  if command -v sha256sum >/dev/null 2>&1; then GOT=$(sha256sum "$ARCHIVE" | cut -d' ' -f1); else GOT=$(shasum -a 256 "$ARCHIVE" | cut -d' ' -f1); fi
  if [ "$EXPECT" = "$GOT" ]; then pass "checksum matches"; else fail "checksum does NOT match — the archive is corrupt or was altered"; fi
fi

echo "restore-test: creating scratch database $TEST_DB"
psql "$LIVE_URL" -q -tA -c "CREATE DATABASE \"$TEST_DB\"" >/dev/null

echo "restore-test: restoring"
if pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TEST_URL" "$DUMP" 2>"$WORK/restore.err"; then
  pass "pg_restore completed with no errors"
else
  fail "pg_restore reported errors:"
  sed 's/^/        /' "$WORK/restore.err" | head -20
fi

q_live() { psql "$LIVE_URL" -tA -c "$1"; }
q_test() { psql "$TEST_URL" -tA -c "$1"; }

MISSING=""
for t in $(q_live "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"); do
  EXISTS=$(q_test "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='$t'" 2>/dev/null || echo 0)
  [ "$EXISTS" = "1" ] || MISSING="$MISSING $t"
done
if [ -z "$MISSING" ]; then pass "every table in the live database exists in the restore"; else fail "tables missing from the restore:$MISSING"; fi

EXPECTED_MIGRATIONS=$(ls -1d prisma/migrations/*/ 2>/dev/null | wc -l | tr -d ' ')
GOT_MIGRATIONS=$(q_test "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL" 2>/dev/null || echo 0)
if [ "$EXPECTED_MIGRATIONS" -gt 0 ]; then
  if [ "$GOT_MIGRATIONS" -ge "$EXPECTED_MIGRATIONS" ]; then
    pass "migration history complete ($GOT_MIGRATIONS applied, $EXPECTED_MIGRATIONS in the repo)"
  else
    fail "migration history incomplete ($GOT_MIGRATIONS applied, $EXPECTED_MIGRATIONS in the repo) — the backup predates the current schema"
  fi
fi

TRIGGERS=$(q_test "SELECT count(*) FROM pg_trigger WHERE tgrelid = '\"AuditLog\"'::regclass AND NOT tgisinternal" 2>/dev/null || echo 0)
if [ "$TRIGGERS" -ge 3 ]; then
  pass "AuditLog append-only triggers present ($TRIGGERS)"
else
  fail "AuditLog has $TRIGGERS triggers; expected at least 3 — the restore lost its append-only protection"
fi
HAS_ROWS=$(q_test 'SELECT count(*) FROM "AuditLog"' 2>/dev/null || echo 0)
if [ "$HAS_ROWS" -gt 0 ]; then
  if psql "$TEST_URL" -q -tA -c "UPDATE \"AuditLog\" SET action = action WHERE id = (SELECT id FROM \"AuditLog\" LIMIT 1)" 2>&1 | grep -qi 'append-only'; then
    pass "an UPDATE on the restored AuditLog is rejected"
  else
    fail "an UPDATE on the restored AuditLog was NOT rejected"
  fi
fi

echo
printf '  %-18s %10s %10s\n' "table" "restored" "live now"
TOTAL_RESTORED=0
TOTAL_LIVE=0
for t in User Domain ScanResult RefreshToken BackupCode AuditLog LoginAttempt; do
  R=$(q_test "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo 0)
  L=$(q_live "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo 0)
  printf '  %-18s %10s %10s\n' "$t" "$R" "$L"
  TOTAL_RESTORED=$((TOTAL_RESTORED + R))
  TOTAL_LIVE=$((TOTAL_LIVE + L))
done
echo "  (rows differ if the live database has changed since the backup was taken)"
echo
if [ "$TOTAL_LIVE" -gt 0 ] && [ "$TOTAL_RESTORED" -eq 0 ]; then
  fail "the restore is EMPTY but the live database is not"
else
  pass "restored data is present"
fi

echo
if [ "$FAILS" -eq 0 ]; then
  echo "restore-test: PASSED — this backup can be restored"
else
  echo "restore-test: FAILED ($FAILS check(s)) — do NOT rely on this backup" >&2
  exit 1
fi
