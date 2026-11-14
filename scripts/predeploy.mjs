// Runs before each build: applies pending migrations, so the database is never behind the code.
// On Vercel it runs for production deployments only. A preview build of another branch may
// share production's environment variables, and must never migrate that database.
// On a demo or staging environment (SEED_ON_DEPLOY=1) it also loads the sample data once;
// the seed refuses to run when accounts already exist.
import { execSync } from "node:child_process";

const onVercel = Boolean(process.env.VERCEL);
if (onVercel && process.env.VERCEL_ENV !== "production") {
  console.log(`predeploy: ${process.env.VERCEL_ENV} build, skipping migrations.`);
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log("predeploy: DATABASE_URL is not set, skipping migrations.");
  process.exit(0);
}
const run = (cmd) => execSync(cmd, { stdio: "inherit" });
run("npx tsx scripts/migrate.ts");
if (process.env.SEED_ON_DEPLOY === "1") run("npx tsx scripts/seed.ts");
