import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a production build with a throwaway embedded database
 * (./.pglite-e2e), migrated and seeded fresh on every run. Build first: `npm run build`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure", locale: "ar-SA" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run db:migrate && npm run db:reset && npx next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      PGLITE_DIR: "./.pglite-e2e",
      DATABASE_URL: "",
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-in-production-000",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "",
    },
  },
});
