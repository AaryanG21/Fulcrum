import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers scripts/backup-db.sh and scripts/restore-test.sh. These need a real
 * Postgres and permission to CREATE DATABASE, so they belong in an
 * integration run, not the default suite. Run them against a throwaway
 * database, never the live one.
 */

describe("backup-db.sh", () => {
  it("writes an archive that pg_restore can list, plus a checksum", () => {
    // TODO
  });

  it("exits non-zero and leaves no .partial file when pg_dump fails", () => {
    // TODO: a half-written archive must never look like a good one
  });

  it("creates the archive with mode 600", () => {
    // TODO: it contains password hashes
  });

  it("prunes archives older than BACKUP_KEEP_DAYS and nothing else", () => {
    // TODO
  });

  it("rejects a non-numeric BACKUP_KEEP_DAYS", () => {
    // TODO
  });

  it("strips Prisma's ?schema= parameter before connecting", () => {
    // TODO: libpq rejects it
  });

  it("runs BACKUP_AFTER_CMD with the finished file as $1", () => {
    // TODO
  });

  it("encrypts to BACKUP_GPG_RECIPIENT when set and removes the plaintext", () => {
    // TODO
  });
});

describe("restore-test.sh", () => {
  it("passes for a good archive and drops its scratch database", () => {
    // TODO
  });

  it("FAILS, exits non-zero and still drops the scratch database for a corrupted archive", () => {
    // TODO: truncate a copy of a real archive
  });

  it("fails when the archive's checksum does not match", () => {
    // TODO
  });

  it("fails when the AuditLog append-only triggers did not survive", () => {
    // TODO: the property a backup could silently lose
  });

  it("fails when the restore is empty but the live database is not", () => {
    // TODO
  });

  it("refuses to run if the scratch name could ever equal the live database", () => {
    // TODO
  });

  it("never writes to the live database", () => {
    // TODO
  });
});
