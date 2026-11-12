import { expect, type Browser, type Page } from "@playwright/test";

// The local seed uses this password when SEED_PASSWORD is not set (never on a hosted database).
export const DEMO_PASSWORD = "local-dev-only";
export const DEMO = {
  buyer: "buyer@mutqen.demo",
  seller: "seller@mutqen.demo",
  admin: "admin@mutqen.demo",
};

export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** A fresh, logged-in page in its own browser context (separate cookies). */
export async function as(browser: Browser, email: string, password = DEMO_PASSWORD) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email, password);
  return { page, close: () => context.close() };
}

export async function fillSignUp(page: Page, opts: { name: string; email: string }) {
  await page.fill("#name", opts.name);
  await page.fill("#email", opts.email);
  await page.fill("#password", "password123");
  await page.click("button[type=submit]");
}

export async function signUp(page: Page, opts: { name: string; email: string; seller?: boolean }) {
  await page.goto(opts.seller ? "/signup?as=seller" : "/signup");
  await fillSignUp(page, opts);
  await page.waitForURL(opts.seller ? "**/seller/onboarding" : "**/dashboard");
}

export const uniqueEmail = (prefix: string) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}@test.sa`;

/** Walks the guided brief from one sentence to the finished summary. */
export async function buildBrief(page: Page, sentence: string, start = "/brief") {
  await page.goto(start);
  await page.fill("#need", sentence);
  await page.getByRole("button", { name: "التالي" }).click();
  await page.waitForURL("**/brief/b_*");
  const questions = page.locator("fieldset");
  await expect(questions.first()).toBeVisible();
  for (let i = 0; i < (await questions.count()); i++) {
    const q = questions.nth(i);
    const chips = q.locator("button[aria-pressed]");
    if (await chips.count()) await chips.first().click();
    else await q.locator("textarea").fill("مقهى مختص في حائل، عملاؤنا شباب وعائلات");
  }
  // Remaining steps (look, files) are optional: keep going until the summary is written.
  for (let i = 0; i < 3; i++) {
    const compose = page.getByRole("button", { name: "جهّز الملخص" });
    if (await compose.isVisible()) {
      await compose.click();
      break;
    }
    await page.getByRole("button", { name: "التالي" }).click();
  }
  await expect(page.getByText("هذا اللي بيشتغل منه المستقل")).toBeVisible({ timeout: 30_000 });
  return new URL(page.url()).pathname;
}

/** From the brief summary: choose a recommended freelancer's package and land on checkout (or sign-up). */
export async function chooseFreelancer(page: Page, name: string, tierLabel = "متقدمة") {
  const card = page.locator("div.rounded-2xl", { hasText: name }).filter({ has: page.locator('a[href*="/order/new"]') }).last();
  await card.locator('a[href*="/order/new"]', { hasText: tierLabel }).click();
}

export async function pay(page: Page) {
  await page.waitForURL("**/order/new**");
  await page.check("input[name=agree]");
  await page.getByRole("button", { name: /ادفع/ }).click();
  await page.waitForURL("**/orders/o_*");
  return new URL(page.url()).pathname;
}

export async function expectNoServerError(page: Page) {
  await expect(page.locator("text=Application error")).toHaveCount(0);
}
