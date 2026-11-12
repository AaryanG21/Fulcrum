\set retention_days 180

BEGIN;

ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_no_delete;

DELETE FROM "AuditLog"
WHERE "createdAt" < (now() AT TIME ZONE 'utc') - (:'retention_days' || ' days')::interval;

ALTER TABLE "AuditLog" ENABLE TRIGGER audit_log_no_delete;

COMMIT;
