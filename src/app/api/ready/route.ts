import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Readiness {
  database: boolean;
  migrations: boolean;
}

const CACHE_MS = 2_000;
let cachedAt = 0;

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
  `;
  return new Set(rows.map((row) => row.migration_name));
}

async function migrationsOnDisk(): Promise<string[] | null> {
  try {
    const entries = await readdir(join(process.cwd(), "prisma", "migrations"), {
      withFileTypes: true,
    });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return null;
  }
}

async function check(): Promise<Readiness> {
  let database = false;
  let migrations = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    return { database: false, migrations: false };
  }

  try {
    const applied = await appliedMigrations();
    const onDisk = await migrationsOnDisk();
    migrations =
      onDisk === null
        ? applied.size > 0
        : onDisk.every((name) => applied.has(name));
  } catch {
    migrations = false;
  }

  return { database, migrations };
}

export async function GET() {
  const now = Date.now();

  if (now - cachedAt < CACHE_MS) {
    const response = apiOk({ status: "ready" });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const checks = await check();
  const ready = checks.database && checks.migrations;

  if (ready) cachedAt = now;

  const response = ready
    ? apiOk({ status: "ready", checks })
    : apiError(503, "not_ready", "This instance cannot serve requests yet.", checks);

  response.headers.set("Cache-Control", "no-store");
  return response;
}
