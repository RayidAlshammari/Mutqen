import { test, expect } from "@playwright/test";

test("visitor can browse the marketplace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("بجملة وحدة");
  // A live product has no waiting list and no prototype wording.
  await expect(page.getByText("الإطلاق التجريبي")).toHaveCount(0);
  await expect(page.getByText("نموذج أولي")).toHaveCount(0);

  await page.goto("/services?category=media");
  const cards = page.locator('a[href^="/services/s_"]');
  await expect(cards.first()).toBeVisible();

  await cards.first().click();
  // Ordering from a service page goes through the guided brief.
  await expect(page.getByRole("link", { name: /اطلب الباقة/ })).toHaveAttribute("href", /^\/brief\?service=s_/);

  await page.locator('a[href^="/freelancers/"]').first().click();
  await expect(page.getByText("موثّق AI").first()).toBeVisible();
  await expect(page.getByText("سجله على متقن")).toBeVisible();
});

test("services can be filtered by delivery time and tool", async ({ page }) => {
  await page.goto("/services?category=code&tool=n8n");
  const titles = await page.locator('a[href^="/services/s_"] h3').allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  for (const t of titles) expect(t).toMatch(/n8n|أتمتة|شات بوت/);
});

test("fees, guarantees, terms and privacy are public", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.getByText("إيراد متقن")).toBeVisible();
  await expect(page.getByText("وش يضمن حقك")).toBeVisible();
  for (const path of ["/terms", "/privacy", "/forgot-password"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
  }
});

test("old assistant links land on the brief builder", async ({ page }) => {
  await page.goto("/assistant?q=" + encodeURIComponent("أبي شعار لمقهى"));
  await expect(page).toHaveURL(/\/brief\?q=/);
  await expect(page.locator("#need")).toHaveValue("أبي شعار لمقهى");
});
