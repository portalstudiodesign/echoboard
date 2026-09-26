import { createMigratedDb, type Db } from "@/db/client";

/** A fresh, fully migrated in-memory Postgres per call — tests never share state. */
export function createTestDb(): Promise<Db> {
  return createMigratedDb("pglite://memory");
}
