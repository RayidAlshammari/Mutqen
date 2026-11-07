import * as schema from "./schema";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";

/**
 * Production: set DATABASE_URL (Neon / Supabase Postgres).
 * Local development without Postgres: an embedded PGlite database in ./.pglite
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false, max: 5 });
    return drizzlePostgres(client, { schema });
  }
  const client = new PGlite(process.env.PGLITE_DIR ?? "./.pglite");
  return drizzlePglite(client, { schema });
}

type Db = ReturnType<typeof drizzlePostgres<typeof schema>>;

const globalForDb = globalThis as unknown as { __mutqenDb?: Db };

// One instance per process: Next.js may load this module from several bundles
// (pages, server actions, route handlers). PGlite in particular must never be opened twice.
// Both drivers expose the same query API; we type against the postgres-js variant.
export const db: Db = (globalForDb.__mutqenDb ??= createDb() as unknown as Db);

export { schema };
