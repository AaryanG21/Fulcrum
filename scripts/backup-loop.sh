#!/bin/sh

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
RESTORE_TEST_EVERY="${RESTORE_TEST_EVERY:-7}"
i=0

while true; do
  if ! sh /app/scripts/backup-db.sh; then
    echo "backup-loop: BACKUP FAILED" >&2
  fi

  if [ $((i % RESTORE_TEST_EVERY)) -eq 0 ]; then
    if ! sh /app/scripts/restore-test.sh; then
      echo "backup-loop: RESTORE TEST FAILED" >&2
    fi
  fi

  i=$((i + 1))
  sleep "$BACKUP_INTERVAL_SECONDS"
done
