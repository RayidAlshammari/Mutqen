import { test, expect, type Page } from "@playwright/test";
import { as, signUp, uniqueEmail, DEMO } from "./helpers";

const ANSWER =
  "(1) البرومبت: اكتب 3 منشورات إطلاق لمقهى رَوْق في حائل بنبرة قريبة من الشباب مع هاشتاقات محلية. استخدمت ChatGPT للمسودة الأولى ثم Claude لتحسين الصياغة. (2) عدّلت الكلمات لتناسب اللهجة المحلية، وحذفت المبالغات، وراجعت الجودة والتزام الأنظمة الإعلانية السعودية. (3) اختبرت قراءة المنشورات مع اثنين من أهل حائل.";

// The platform rule is the second option in the first two scenarios and the third in the last two.
const RIGHT = [1, 1, 2, 2];

async function answerQuiz(page: Page, picks: number[]) {
  const scenarios = page.locator("fieldset", { has: page.locator("input[type=radio]") });
  for (let i = 0; i < picks.length; i++) await scenarios.nth(i).locator("input[type=radio]").nth(picks[i]).check();
}

test("freelancer onboarding: test with a real deliverable, conduct quiz, rejection with a reason, then approval", async ({ browser, page }) => {
  const name = `مستقل اختبار ${Date.now() % 10000}`;
  await signUp(page, { name, email: uniqueEmail("fl"), seller: true });

  await page.fill("#displayName", name);
  await page.fill("#headline", "كاتب محتوى بالذكاء الاصطناعي");
  await page.fill("#nationalId", "1012345678");
  await page.fill("#verificationAnswer", ANSWER);
  await page.locator("input[name=verificationUrl]").fill("https://drive.google.com/file/d/test-task");
  await answerQuiz(page, RIGHT);

  // Submitted without any AI tool: the server refuses and nothing typed is lost.
  await page.getByRole("button", { name: "أرسل للتقييم" }).click();
  await expect(page.getByText("اختر أداة واحدة على الأقل")).toBeVisible();
  await expect(page.locator("#headline")).toHaveValue("كاتب محتوى بالذكاء الاصطناعي");
  await expect(page.locator("#verificationAnswer")).toHaveValue(ANSWER);

  // Two wrong answers on the conduct quiz keep the profile out of review.
  await page.locator('label:has(input[value="ChatGPT"])').click();
  await answerQuiz(page, [0, 0, 2, 2]);
  await page.getByRole("button", { name: "أرسل للتقييم" }).click();
  await expect(page.getByText("تحتاج تحسين قبل ما يروح ملفك للمراجعة")).toBeVisible();
  await page.goto("/seller/services/new");
  await expect(page).toHaveURL(/\/seller\/onboarding/);

  // Passing both sends it to the team.
  await answerQuiz(page, RIGHT);
  await page.getByRole("button", { name: "أرسل للتقييم" }).click();
  await page.waitForURL("**/seller/profile");
  await expect(page.getByText("بانتظار المراجعة")).toBeVisible();
  await expect(page.getByText("مجالك الموثّق")).toBeVisible();

  // The service form only offers the verified field.
  await page.goto("/seller/services/new");
  const options = await page.locator("#category option").allTextContents();
  expect(options).toHaveLength(1);
  expect(options[0]).toContain("المحتوى");

  // Admin cannot reject without a reason; with one, the freelancer sees it.
  const admin = await as(browser, DEMO.admin);
  await admin.page.goto("/admin");
  const card = admin.page.locator("div.rounded-2xl", { hasText: name }).last();
  await expect(card.getByText("••••••5678")).toBeVisible();
  await card.getByRole("button", { name: "ارفض مع السبب" }).click();
  await expect(card.getByText("اكتب سبب الرفض بوضوح")).toBeVisible();
  await card.getByLabel("ملاحظة للمستقل").fill("الرابط المرفوع ما يفتح. ارفع ناتج المهمة برابط عام.");
  await card.getByRole("button", { name: "ارفض مع السبب" }).click();
  await expect(admin.page.getByText(name)).toHaveCount(0);

  await page.goto("/seller/onboarding");
  await expect(page.getByText("الرابط المرفوع ما يفتح")).toBeVisible();
  await page.locator("input[name=verificationUrl]").fill("https://drive.google.com/file/d/test-task-public");
  await answerQuiz(page, RIGHT);
  await page.getByRole("button", { name: "أرسل للتقييم" }).click();
  await page.waitForURL("**/seller/profile");

  await admin.page.goto("/admin");
  await admin.page.locator("div.rounded-2xl", { hasText: name }).last().getByRole("button", { name: "✓ وثّق" }).click();
  await expect(admin.page.getByText(name)).toHaveCount(0);

  // Approved: notified, public profile is live, and asked for a payout account.
  await page.goto("/notifications");
  await expect(page.getByText("تم توثيق ملفك ✓")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("أضف حساب التحويل")).toBeVisible();
  await page.goto("/seller/profile");
  await expect(page.getByRole("link", { name: "عرض ملفي العام" })).toBeVisible();

  // The badge can be taken back, with a reason.
  await admin.page.goto("/admin/freelancers");
  const row = admin.page.locator("li", { hasText: name });
  await row.getByRole("button", { name: "اسحب التوثيق" }).click();
  await row.getByLabel("سبب سحب التوثيق").fill("تعامل مع عميل خارج المنصة.");
  await row.getByRole("button", { name: "أكّد السحب" }).click();
  await expect(admin.page.getByText(name)).toHaveCount(0);
  await admin.close();
  await page.goto("/seller/services/new");
  await expect(page).toHaveURL(/\/seller\/onboarding/);
});
