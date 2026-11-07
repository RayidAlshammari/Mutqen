import { test, expect } from "@playwright/test";
import { as, signUp, uniqueEmail, DEMO } from "./helpers";

test("client orders through the assistant, freelancer delivers, client revises, accepts and reviews", async ({ browser, page }) => {
  // 1. new client → assistant → order with simulated payment
  const email = uniqueEmail("client");
  await signUp(page, { name: "عميل اختبار", email });
  await page.goto(`/assistant?q=${encodeURIComponent("أبي 12 منشور انستقرام لكافيهي الجديد في حائل بلهجة قريبة")}`);
  await expect(page.getByText("طلبك بعد الترتيب")).toBeVisible({ timeout: 30_000 });

  // pick a service sold by the demo freelancer so we can log in as her
  const nouraCard = page.locator("div.flex.flex-col.gap-2", { hasText: "نورة العتيبي" }).first();
  await nouraCard.getByRole("link", { name: "اطلب بهذا الوصف" }).click();
  await page.waitForURL("**/order/new**");
  expect((await page.inputValue("#brief")).length).toBeGreaterThan(50);
  await page.check("input[name=agree]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/orders/**");
  const orderUrl = new URL(page.url()).pathname;
  await expect(page.getByText("تم الدفع وحجز المبلغ بنجاح")).toBeVisible();
  await expect(page.getByText("المبلغ محجوز لدى متقن")).toBeVisible();

  // 2. freelancer delivers
  const seller = await as(browser, DEMO.seller);
  await seller.page.goto(orderUrl);
  await seller.page.fill("#d-msg", "سلّمت المنشورات مع الكابشن، واستخدمت ChatGPT للمسودات وعدّلت النبرة يدوياً.");
  await seller.page.fill("#d-url", "https://drive.google.com/demo");
  await seller.page.getByRole("button", { name: "سلّم الطلب" }).click();
  await expect(seller.page.getByText("تم التسليم — بانتظار مراجعتك")).toBeVisible();

  // 3. client asks for a revision
  await page.reload();
  await page.fill("#r-msg", "ممتاز، بس نبي المنشور الثالث أقصر");
  await page.getByRole("button", { name: "اطلب تعديل" }).click();
  await expect(page.getByText("مطلوب تعديل").first()).toBeVisible();

  // 4. freelancer re-delivers
  await seller.page.reload();
  await seller.page.fill("#d-msg", "تم تعديل المنشور الثالث.");
  await seller.page.getByRole("button", { name: "سلّم الطلب" }).click();
  await expect(seller.page.getByText("تم التسليم — بانتظار مراجعتك")).toBeVisible();

  // 5. client accepts → funds released → review
  await page.reload();
  await page.getByRole("button", { name: /أوافق على التسليم/ }).click();
  await expect(page.getByText("تم تحويل المبلغ للمستقل")).toBeVisible();
  await page.getByRole("radio", { name: "5 من 5" }).click();
  await page.fill("textarea[name=comment]", "شغل سريع ومرتب");
  await page.getByRole("button", { name: "أرسل التقييم" }).click();
  await expect(page.getByText("تقييم العميل")).toBeVisible();

  // the money is released exactly once
  await expect(page.locator("ol span.text-stone-500", { hasText: /^تحويل المبلغ$/ })).toHaveCount(1);
  await seller.page.goto(orderUrl);
  await expect(seller.page.getByText("صافي أرباحك")).toBeVisible();
  await seller.close();
});
