import { mkdirSync } from "node:fs";
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
    if (target !== "memory") mkdirSync(dirname(target), { recursive: true });
    const client = target === "memory" ? new PGlite() : new PGlite(target);
    return { driver: "pglite", db: drizzlePglite({ client, schema, casing: "snake_case" }) };
  }
  const client = postgres(url, { max: 5, prepare: false });
  return { driver: "postgres", db: drizzlePostgres({ client, schema, casing: "snake_case" }) };
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

// Next.js dev re-evaluates modules on reload; keep one connection per process.
const globalForDb = globalThis as unknown as { __echoboardDb?: Db };

export const db: Db = globalForDb.__echoboardDb ?? createDb(databaseUrl());
if (process.env.NODE_ENV !== "production") globalForDb.__echoboardDb = db;
