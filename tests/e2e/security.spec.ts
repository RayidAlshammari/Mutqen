import { test, expect } from "@playwright/test";
import { as, buildBrief, login, DEMO } from "./helpers";

test("protected pages require the right role", async ({ page }) => {
  for (const path of ["/admin", "/admin/orders", "/admin/managed", "/admin/freelancers", "/dashboard", "/notifications", "/seller/onboarding"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  await login(page, DEMO.buyer);
  for (const path of ["/admin", "/admin/orders", "/admin/managed", "/admin/freelancers", "/seller/services", "/seller/profile"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard$/);
  }
});

test("a brief belongs to the browser or account that created it", async ({ browser, page }) => {
  const path = await buildBrief(page, "أبي شعار لمقهى مختص جديد في حائل");
  const other = await browser.newContext();
  const stranger = await other.newPage();
  expect((await stranger.goto(path))?.status()).toBe(404);
  await other.close();
  const buyer = await as(browser, DEMO.buyer);
  expect((await buyer.page.goto(path))?.status()).toBe(404);
  // Checkout refuses a brief that is not yours.
  expect((await buyer.page.goto(`/order/new?brief=${path.split("/")[2]}&service=s_missing&tier=basic`))?.status()).toBe(404);
  await buyer.close();
});

test("ordering without a brief sends the client to build one", async ({ page }) => {
  await page.goto("/services?category=content");
  const href = await page.locator('a[href^="/services/s_"]').first().getAttribute("href");
  await page.goto(`/order/new?service=${href!.split("/")[2]}&tier=basic`);
  await expect(page).toHaveURL(/\/brief\?service=s_/);
});

test("a client cannot open someone else's order", async ({ browser }) => {
  const admin = await as(browser, DEMO.admin);
  await admin.page.goto("/admin/orders");
  const rows = admin.page.locator("tbody tr");
  let foreign: string | null = null;
  for (let i = 0; i < (await rows.count()); i++) {
    if (!(await rows.nth(i).innerText()).includes("مقهى رَوْق")) {
      foreign = await rows.nth(i).locator("a").first().getAttribute("href");
      break;
    }
  }
  await admin.close();
  expect(foreign).toBeTruthy();
  const buyer = await as(browser, DEMO.buyer);
  const res = await buyer.page.goto(foreign!);
  expect(res?.status()).toBe(404);
  await buyer.close();
});

test("freelancer cannot order their own service or save script links", async ({ page }) => {
  await login(page, DEMO.seller);
  await page.goto("/seller/services");
  const href = await page.locator('a[href^="/services/s_"]').first().getAttribute("href");
  await buildBrief(page, "أبي منشورات انستقرام لمحل حلويات", `/brief?service=${href!.split("/")[2]}&tier=basic`);
  // Her own services are never recommended to her, and the direct link is refused.
  await expect(page.locator(`a[href*="service=${href!.split("/")[2]}"]`)).toHaveCount(0);
  await page.goto(`/order/new?brief=${new URL(page.url()).pathname.split("/")[2]}&service=${href!.split("/")[2]}&tier=basic`);
  await expect(page.getByText("ما تقدر تطلب خدمتك أنت.")).toBeVisible();

  await page.goto("/seller/profile");
  await page.fill("input[name=pf_title_3]", "عمل");
  await page.fill("input[name=pf_url_3]", "javascript:alert(1)");
  await page.getByRole("button", { name: "احفظ التعديلات" }).click();
  await expect(page.getByText(/لازم يبدأ بـ https/)).toBeVisible();
});

test("settings validate IBAN and VAT numbers", async ({ browser }) => {
  const seller = await as(browser, DEMO.seller);
  await seller.page.goto("/dashboard/settings");
  await seller.page.fill("#payoutName", "نورة العتيبي");
  await seller.page.fill("#iban", "SA00 1234");
  await seller.page.getByRole("button", { name: "احفظ بيانات التحويل" }).click();
  await expect(seller.page.getByText("رقم الآيبان غير صحيح")).toBeVisible();
  await seller.page.fill("#iban", "SA03 8000 0000 6080 1016 7519");
  await seller.page.getByRole("button", { name: "احفظ بيانات التحويل" }).click();
  await expect(seller.page.getByText("تم الحفظ ✓")).toBeVisible();
  await seller.close();

  const buyer = await as(browser, DEMO.buyer);
  await buyer.page.goto("/dashboard/settings");
  await buyer.page.fill("#vatNumber", "123");
  await buyer.page.getByRole("button", { name: "احفظ بيانات الفاتورة" }).click();
  await expect(buyer.page.getByText("الرقم الضريبي لازم")).toBeVisible();
  await buyer.close();
});

test("each role lands where it works", async ({ browser }) => {
  const admin = await as(browser, DEMO.admin);
  await admin.page.goto("/");
  await expect(admin.page).toHaveURL(/\/admin$/);
  await admin.close();

  const seller = await as(browser, DEMO.seller);
  await seller.page.goto("/");
  await expect(seller.page).toHaveURL(/\/dashboard$/);
  await seller.close();

  const buyer = await as(browser, DEMO.buyer);
  await buyer.page.goto("/");
  await expect(buyer.page.getByRole("heading", { level: 1 })).toContainText("بجملة وحدة");
  await buyer.close();
});
