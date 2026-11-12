// Runs on the hosting platform before each build: applies pending migrations, so the
// database is never behind the code. On a demo or staging environment (SEED_ON_DEPLOY=1)
// it also loads the sample data once; the seed refuses to run when accounts already exist.
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("predeploy: DATABASE_URL is not set, skipping migrations.");
  process.exit(0);
}
const run = (cmd) => execSync(cmd, { stdio: "inherit" });
run("npx tsx scripts/migrate.ts");
if (process.env.SEED_ON_DEPLOY === "1") run("npx tsx scripts/seed.ts");
