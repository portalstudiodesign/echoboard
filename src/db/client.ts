import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

type Connection =
  | { driver: "pglite"; db: PgliteDatabase<Schema> }
  | { driver: "postgres"; db: PostgresJsDatabase<Schema> };

const migrationsFolder = "./drizzle";

/**
 * DATABASE_URL decides the driver:
 * - `postgres://…` / `postgresql://…` → a real Postgres server (Neon in production)
 * - `pglite://<dir>` → embedded Postgres persisted to <dir> (local development)
 * - `pglite://memory` → throwaway in-memory Postgres (tests)
 */
function connect(url: string): Connection {
  if (url.startsWith("pglite://")) {
    const target = url.slice("pglite://".length);
    if (target === "memory") return { driver: "pglite", db: drizzlePglite({ client: new PGlite(), schema, casing: "snake_case" }) };
    mkdirSync(dirname(target), { recursive: true });
    lockDataDirectory(target);
    return { driver: "pglite", db: drizzlePglite({ client: new PGlite(target), schema, casing: "snake_case" }) };
  }
  // prepare: false for poolers like Neon's; notices ("schema already exists, skipping") are noise.
  const client = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  return { driver: "postgres", db: drizzlePostgres({ client, schema, casing: "snake_case" }) };
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * PGlite is single-process: two processes opening the same directory corrupt it.
 * A pid lockfile turns that into a clear error instead of a broken local database.
 */
function lockDataDirectory(directory: string) {
  const lockFile = `${directory}.lock`;
  const ownPid = String(process.pid);
  try {
    writeFileSync(lockFile, ownPid, { flag: "wx" });
  } catch {
    const holder = Number(readFileSync(lockFile, "utf8"));
    if (holder !== process.pid && processIsAlive(holder)) {
      throw new Error(
        `The local database (${directory}) is in use by process ${holder}. ` +
          "Stop the other dev server or script first — PGlite supports one process at a time.",
      );
    }
    writeFileSync(lockFile, ownPid); // stale lock from a process that has exited
  }
  process.once("exit", () => {
    try {
      if (readFileSync(lockFile, "utf8") === ownPid) unlinkSync(lockFile);
    } catch {
      // already gone
    }
  });
}

export function createDb(url: string): Db {
  return connect(url).db;
}

/** Opens the database and applies every pending migration in ./drizzle. */
export async function createMigratedDb(url: string): Promise<Db> {
  const connection = connect(url);
  if (connection.driver === "pglite") await migratePglite(connection.db, { migrationsFolder });
  else await migratePostgres(connection.db, { migrationsFolder });
  return connection.db;
}

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "pglite://.data/pglite";
}

// One connection per process, opened on first use — importing this module (as `next build`
// does in several workers at once) never touches the database. Kept on globalThis because
// Next.js dev re-evaluates modules on reload.
const globalForDb = globalThis as unknown as { __echoboardDb?: Db };

function sharedDb(): Db {
  return (globalForDb.__echoboardDb ??= createDb(databaseUrl()));
}

export const db: Db = new Proxy({} as Db, {
  get(_, property) {
    const instance = sharedDb();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
