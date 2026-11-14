import { test, expect } from "@playwright/test";
import { as, buildBrief, chooseFreelancer, fillSignUp, pay, uniqueEmail, DEMO } from "./helpers";

const SELLERS: Record<string, string> = {
  noura: "نورة العتيبي",
  faisal: "فيصل القحطاني",
  reem: "ريم الزهراني",
  abdulaziz: "عبدالعزيز الحربي",
  lama: "لمى الدوسري",
  turki: "تركي العنزي",
  omar: "عمر الشهري",
  sara: "سارة المطيري",
  khaled: "خالد السبيعي",
};

test("visitor builds a brief, signs up at payment, and the order runs from acceptance to review", async ({ browser, page }) => {
  // 1. No account yet: one sentence → questions → summary → three recommended freelancers.
  await buildBrief(page, "أبي 12 منشور انستقرام لكافيهي الجديد في حائل بلهجة قريبة");
  await expect(page.getByText("معايير القبول").first()).toBeVisible();
  await expect(page.getByText("ليش رشّحناه").first()).toBeVisible();

  // 2. Choosing a freelancer asks for an account only now, and the brief survives sign-up.
  await chooseFreelancer(page, "نورة العتيبي");
  await page.waitForURL("**/signup**");
  await expect(page.getByText("ملخص طلبك محفوظ")).toBeVisible();
  await fillSignUp(page, { name: "عميل اختبار", email: uniqueEmail("client") });
  const orderUrl = await pay(page);
  await expect(page.getByText("انحجز المبلغ ✓")).toBeVisible();
  await expect(page.getByText("بانتظار قبول المستقل").first()).toBeVisible();

  // 3. The freelancer accepts and sends the first sample.
  const seller = await as(browser, DEMO.seller);
  await seller.page.goto(orderUrl);
  await seller.page.getByRole("button", { name: /أقبل الطلب/ }).click();
  await seller.page.getByLabel("وش في العيّنة؟").fill("أول منشورين عشان نعتمد النبرة قبل ما أكمل الباقي.");
  await seller.page.locator("input[name=url]").fill("https://drive.google.com/file/d/sample");
  await seller.page.getByRole("button", { name: "أرسل العيّنة للعميل" }).click();
  await expect(seller.page.getByText("العيّنة الأولى جاهزة للمراجعة").first()).toBeVisible();

  // 4. The client changes direction once (included), then approves the second sample.
  await page.reload();
  await page.getByLabel(/وش يتغيّر في الاتجاه/).fill("النبرة رسمية، نبيها أخف وأقرب للشباب.");
  await page.getByRole("button", { name: "اطلب تغيير الاتجاه" }).click();
  await expect(page.getByText("طلب تغيير الاتجاه")).toBeVisible();
  await seller.page.reload();
  await seller.page.getByLabel("وش في العيّنة؟").fill("عدّلت النبرة، هذي نسخة أخف.");
  await seller.page.locator("input[name=url]").fill("https://drive.google.com/file/d/sample2");
  await seller.page.getByRole("button", { name: "أرسل العيّنة للعميل" }).click();
  await expect(seller.page.getByText("العيّنة الأولى جاهزة للمراجعة").first()).toBeVisible();
  await page.reload();
  // The free change of direction is used up.
  await expect(page.getByRole("button", { name: "اطلب تغيير الاتجاه" })).toHaveCount(0);
  await page.getByRole("button", { name: /الاتجاه صح/ }).click();

  // 5. Full delivery, one revision inside the brief, second delivery.
  await seller.page.reload();
  await seller.page.getByLabel("رسالة التسليم").fill("سلّمت 12 منشور مع الكابشن حسب الملخص.");
  await seller.page.locator("input[name=url]").fill("https://drive.google.com/file/d/final");
  await seller.page.getByRole("button", { name: "سلّم الطلب" }).click();
  await expect(seller.page.getByText("بانتظار الاعتماد").first()).toBeVisible();
  await page.reload();
  // A revision names the acceptance criterion that wasn't met.
  await page.locator("input[name=criterion]").first().check();
  await page.getByLabel("وش يتعدّل").fill("المنشور الثالث ما يذكر موعد الافتتاح.");
  await page.getByRole("button", { name: "اطلب تعديل" }).click();
  await expect(page.getByText("مطلوب تعديل").first()).toBeVisible();
  await expect(page.getByText(/^المعيار: /).first()).toBeVisible();
  await seller.page.reload();
  await seller.page.getByLabel("رسالة التسليم").fill("أضفت الموعد للمنشور الثالث.");
  await seller.page.locator("input[name=url]").fill("https://drive.google.com/file/d/final2");
  await seller.page.getByRole("button", { name: "سلّم الطلب" }).click();
  await expect(seller.page.getByText("بانتظار الاعتماد").first()).toBeVisible();

  // 6. The client approves: money is released exactly once, then the review.
  await page.reload();
  await page.getByRole("button", { name: /أعتمد التسليم/ }).click();
  // Approval queues the payout; "transferred" is only said once the admin records the transfer.
  await expect(page.getByText("✓ اعتُمد مبلغ المستقل، وبيتحوّل في يوم التحويل القادم.")).toBeVisible();
  await page.getByRole("radio", { name: "5 من 5" }).click();
  await page.fill("textarea[name=comment]", "شغل سريع ومرتب");
  await page.getByRole("button", { name: "أرسل التقييم" }).click();
  await expect(page.getByText("شغل سريع ومرتب")).toBeVisible();
  await expect(page.locator("span.text-stone-500", { hasText: /^اعتماد مبلغ المستقل$/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "اطلبها مرة ثانية بنفس الملخص" })).toBeVisible();

  await seller.page.goto(orderUrl);
  await expect(seller.page.getByText("يوصلك", { exact: true })).toBeVisible();
  await seller.close();
});

test("client can cancel before the freelancer accepts and gets a full refund", async ({ browser }) => {
  const buyer = await as(browser, DEMO.buyer);
  await buildBrief(buyer.page, "أبي صفحة هبوط لدورة تدريبية مع نموذج تسجيل");
  await chooseFreelancer(buyer.page, "سارة المطيري", "أساسية");
  await pay(buyer.page);
  await buyer.page.getByRole("button", { name: "ألغِ واسترد المبلغ" }).click();
  await expect(buyer.page.getByText("↩︎ رجع المبلغ للعميل.")).toBeVisible();
  await buyer.close();
});

test("work outside the brief becomes a priced add-on the client accepts", async ({ browser }) => {
  // The seeded order where the freelancer (demo seller) is working on the full delivery.
  const seller = await as(browser, DEMO.seller);
  await seller.page.goto("/dashboard/orders");
  await seller.page.locator('a[href^="/orders/o_"]', { hasText: "متجر عبق للعطور" }).first().click();
  await seller.page.waitForURL("**/orders/o_*");
  const orderUrl = new URL(seller.page.url()).pathname;
  await seller.page.getByText("العميل طلب شي خارج الملخص؟").click();
  await seller.page.getByLabel("وصف العمل الإضافي").fill("4 سكربتات إضافية بنفس الأسلوب");
  await seller.page.getByLabel("السعر").fill("300");
  await seller.page.getByRole("button", { name: "أرسل العرض للعميل" }).click();
  await expect(seller.page.getByText("عرض عمل إضافي").first()).toBeVisible();
  await seller.close();

  const client = await as(browser, "abaq@mutqen.demo");
  await client.page.goto(orderUrl);
  await client.page.getByRole("button", { name: /وافق وادفع/ }).click();
  await client.page.waitForURL((u) => u.pathname.startsWith("/orders/o_") && u.pathname !== orderUrl);
  // The freelancer proposed it, so the add-on starts right away as its own order.
  await expect(client.page.getByText("قيد التنفيذ").first()).toBeVisible();
  await expect(client.page.getByText("عمل إضافي").first()).toBeVisible();
  await client.close();
});

test("a dispute pauses the order until the admin decides", async ({ browser }) => {
  const admin = await as(browser, DEMO.admin);
  await admin.page.goto("/admin");
  await admin.page.getByText("افتح الطلب واتخذ القرار").first().click();
  await admin.page.waitForURL("**/orders/o_*");
  await admin.page.getByLabel("القرار", { exact: true }).selectOption("partial");
  await admin.page.getByLabel("المبلغ المسترد").fill("300");
  await admin.page.getByLabel("سبب القرار").fill("العيّنة تغطي خطوة من ثلاث. يرجع للعميل جزء من المبلغ ويكمل المستقل الباقي.");
  await admin.page.getByRole("button", { name: "اعتمد القرار" }).click();
  await expect(admin.page.getByText("قرار متقن").first()).toBeVisible();
  await admin.page.goto("/admin");
  await expect(admin.page.getByText("ما فيه خلافات مفتوحة")).toBeVisible();
  await admin.close();
});

test("managed service: the team proposes a freelancer and the client pays with the fixed fee", async ({ browser }) => {
  const admin = await as(browser, DEMO.admin);
  await admin.page.goto("/admin/managed");
  // Remember which freelancer the team proposes, to log in as them below.
  const picked = await admin.page.locator("select option:checked").first().textContent();
  const sellerKey = Object.entries(SELLERS).find(([, name]) => picked?.includes(name))?.[0];
  expect(sellerKey, `proposed freelancer: ${picked}`).toBeTruthy();
  await admin.page.getByLabel("سبب الترشيح").fill("سلّم طلبات مشابهة في الموعد وباقته ضمن الميزانية.");
  await admin.page.getByRole("button", { name: "أرسل الترشيح للعميل" }).click();
  await expect(admin.page.getByText("وصل الترشيح للعميل ✓")).toBeVisible();
  await admin.close();

  const client = await as(browser, "munira@mutqen.demo");
  await client.page.goto("/notifications");
  await client.page.getByRole("button", { name: /رشّحنا لك مستقل/ }).click();
  await client.page.waitForURL("**/brief/b_*");
  await expect(client.page.getByText("رسوم إدارة الطلب")).toBeVisible();
  await client.page.getByRole("link", { name: "وافق وادفع" }).click();
  const orderUrl = await pay(client.page);
  await expect(client.page.getByText("بانتظار قبول المستقل").first()).toBeVisible();

  // On a managed order the team checks the sample before the client sees it.
  const seller = await as(browser, sellerKey === "noura" ? DEMO.seller : `${sellerKey}@mutqen.demo`);
  await seller.page.goto(orderUrl);
  await seller.page.getByRole("button", { name: /أقبل الطلب/ }).click();
  await seller.page.getByLabel("وش في العيّنة؟").fill("أول سيناريو للبوت على أسئلتكم الحقيقية.");
  await seller.page.locator("input[name=url]").fill("https://drive.google.com/file/d/managed-sample");
  await seller.page.getByRole("button", { name: "أرسل العيّنة للعميل" }).click();
  await expect(seller.page.getByText("وصل شغلك لفريق متقن").first()).toBeVisible();
  await seller.close();

  await client.page.reload();
  await expect(client.page.getByText("فريق متقن يراجع الشغل").first()).toBeVisible();
  await expect(client.page.getByText("managed-sample")).toHaveCount(0);
  await expect(client.page.getByRole("button", { name: /الاتجاه صح/ })).toHaveCount(0);

  const team = await as(browser, DEMO.admin);
  await team.page.goto(orderUrl);
  await team.page.getByRole("button", { name: "اعتمد المراجعة" }).click();
  await expect(team.page.getByText("مراجعة فريق متقن").first()).toBeVisible();
  await team.close();

  await client.page.reload();
  await expect(client.page.getByText("managed-sample").first()).toBeVisible();
  await expect(client.page.getByRole("button", { name: /الاتجاه صح/ })).toBeVisible();
  await client.close();
});
