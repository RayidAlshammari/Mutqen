import "dotenv/config";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: 1, prepare: false });
    await migratePostgres(drizzlePostgres(client), { migrationsFolder: "./drizzle" });
    await client.end();
    console.log("✓ migrated Postgres");
  } else {
    const client = new PGlite(process.env.PGLITE_DIR ?? "./.pglite");
    await migratePglite(drizzlePglite(client), { migrationsFolder: "./drizzle" });
    await client.close();
    console.log("✓ migrated local PGlite (.pglite)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
