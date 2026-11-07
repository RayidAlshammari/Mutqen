import { test, expect } from "@playwright/test";
import { as, signUp, uniqueEmail, DEMO } from "./helpers";

const ANSWER =
  "(1) البرومبت: اكتب 3 منشورات إطلاق لمقهى رَوْق في حائل بنبرة قريبة من الشباب مع هاشتاقات محلية. استخدمت ChatGPT للمسودة الأولى ثم Claude لتحسين الصياغة. (2) المنشورات النهائية… (3) عدّلت الكلمات لتناسب اللهجة المحلية، وحذفت المبالغات، وراجعت الجودة والتزام الأنظمة الإعلانية السعودية، واختبرت قراءة المنشورات مع اثنين من الأصدقاء.";

test("freelancer verifies in one field, can only sell there, and admin approves", async ({ browser, page }) => {
  await signUp(page, { name: "مستقل اختبار", email: uniqueEmail("fl"), seller: true });

  await page.fill("#headline", "كاتب محتوى بالذكاء الاصطناعي");
  // verification task in the content field (default tab), submitted without picking any AI tool
  await page.fill("#verificationAnswer", ANSWER);
  await page.getByRole("button", { name: "احفظ وأرسل للتقييم" }).click();
  await expect(page.getByText("اختر أداة واحدة على الأقل")).toBeVisible();
  // what the freelancer typed is kept after a server-side validation error
  await expect(page.locator("#headline")).toHaveValue("كاتب محتوى بالذكاء الاصطناعي");
  await expect(page.locator("#verificationAnswer")).toHaveValue(ANSWER);

  await page.locator('label:has(input[value="ChatGPT"])').click();
  await page.getByRole("button", { name: "احفظ وأرسل للتقييم" }).click();
  await page.waitForURL("**/seller/profile");
  await expect(page.getByText("بانتظار المراجعة")).toBeVisible();
  await expect(page.getByText("مجالك الموثّق")).toBeVisible();

  // service form only offers the verified field
  await page.goto("/seller/services/new");
  const options = await page.locator("#category option").allTextContents();
  expect(options).toHaveLength(1);
  expect(options[0]).toContain("المحتوى");

  // admin approves
  const admin = await as(browser, DEMO.admin);
  await admin.page.goto("/admin");
  const card = admin.page.locator("div.rounded-2xl", { hasText: "مستقل اختبار" }).last();
  await card.getByRole("button", { name: "✓ وثّق" }).click();
  await expect(admin.page.locator("text=مستقل اختبار")).toHaveCount(0);
  await admin.close();

  await page.goto("/seller/profile");
  await expect(page.getByRole("link", { name: "عرض ملفي العام" })).toBeVisible();
});
