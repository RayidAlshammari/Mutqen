import { test, expect } from "@playwright/test";

test("visitor can browse the marketplace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("أيام، مو أسابيع");
  await expect(page.getByText("الإطلاق التجريبي قريب")).toBeVisible();

  await page.goto("/services?category=media");
  const cards = page.locator('a[href^="/services/s_"]');
  await expect(cards.first()).toBeVisible();

  await cards.first().click();
  await expect(page.getByRole("link", { name: /اطلب الباقة/ })).toBeVisible();

  await page.locator('a[href^="/freelancers/"]').first().click();
  await expect(page.getByText("موثّق AI").first()).toBeVisible();
});

test("services can be filtered by delivery time and tool", async ({ page }) => {
  await page.goto("/services?category=code&tool=n8n");
  const titles = await page.locator('a[href^="/services/s_"] h3').allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  for (const t of titles) expect(t).toMatch(/n8n|أتمتة|شات بوت/);
});

test("fees page shows the business model", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.getByText("إيراد متقن")).toBeVisible();
});
