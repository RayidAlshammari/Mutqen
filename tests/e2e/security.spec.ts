import { test, expect } from "@playwright/test";
import { as, login, DEMO } from "./helpers";

test("protected pages require the right role", async ({ page }) => {
  for (const path of ["/admin", "/admin/orders", "/dashboard", "/seller/onboarding", "/order/new?service=x"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  await login(page, DEMO.buyer);
  for (const path of ["/admin", "/admin/orders", "/seller/services", "/seller/profile"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard$/);
  }
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
  await page.goto(`/order/new?service=${href!.split("/")[2]}&tier=basic`);
  await page.fill("#brief", "طلب اختبار لخدمتي أنا نفسي للتحقق من الصلاحيات");
  await page.check("input[name=agree]");
  await page.click("button[type=submit]");
  await expect(page.getByText("ما تقدر تطلب خدمتك أنت.")).toBeVisible();

  await page.goto("/seller/profile");
  await page.fill("input[name=pf_title_0]", "عمل");
  await page.locator("input[name=pf_url_0]").evaluate((el: HTMLInputElement) => (el.type = "text"));
  await page.fill("input[name=pf_url_0]", "javascript:alert(1)");
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
  await expect(buyer.page.getByText("الإطلاق التجريبي قريب")).toHaveCount(0);
  await buyer.close();
});
