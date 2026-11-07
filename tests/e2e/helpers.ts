import { expect, type Browser, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Mutqen2026!";
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

export async function signUp(page: Page, opts: { name: string; email: string; seller?: boolean }) {
  await page.goto(opts.seller ? "/signup?as=seller" : "/signup");
  await page.fill("#name", opts.name);
  await page.fill("#email", opts.email);
  await page.fill("#password", "password123");
  await page.click("button[type=submit]");
  await page.waitForURL(opts.seller ? "**/seller/onboarding" : "**/dashboard");
}

export const uniqueEmail = (prefix: string) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}@test.sa`;

export async function expectNoServerError(page: Page) {
  await expect(page.locator("text=Application error")).toHaveCount(0);
}
