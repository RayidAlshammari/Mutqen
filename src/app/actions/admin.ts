"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { notify } from "@/lib/notify";
import { cleanText } from "@/lib/ai";
import { MANAGED_FEE } from "@/lib/constants";

const { sellerProfile, managedRequest, service, brief } = schema;

export type AdminState = { error?: string; ok?: boolean } | undefined;

/** Approve or reject a freelancer waiting for review. A rejection always carries a reason the freelancer can act on. */
export async function reviewSellerAction(_: AdminState, formData: FormData): Promise<AdminState> {
  await requireRole("admin", "/admin");
  const userId = String(formData.get("userId") ?? "");
  const decision = formData.get("decision") === "approved" ? "approved" : "rejected";
  const note = cleanText(formData.get("note"), 500);
  if (decision === "rejected" && note.length < 10) return { error: "اكتب سبب الرفض بوضوح (10 أحرف على الأقل). المستقل يشوفه ويعدّل عليه." };
  const rows = await db
    .update(sellerProfile)
    .set({ status: decision, reviewedAt: new Date(), reviewNote: decision === "rejected" ? note : null, identityVerified: decision === "approved" })
    .where(and(eq(sellerProfile.userId, userId), eq(sellerProfile.status, "pending")))
    .returning({ id: sellerProfile.userId });
  if (!rows.length) return { error: "هذا الملف ما عاد بانتظار المراجعة." };
  await notify(
    userId,
    decision === "approved"
      ? { title: "تم توثيق ملفك ✓", body: "خدماتك الحين ظاهرة للعملاء. أضف حساب التحويل عشان تقبل أول طلب.", href: "/dashboard" }
      : { title: "ملفك يحتاج تعديل", body: `ملاحظة الفريق: ${note}`, href: "/seller/onboarding" },
  );
  revalidatePath("/admin");
  return { ok: true };
}

/** Take the badge back from a verified freelancer. Their services stop appearing; open orders continue. */
export async function revokeSellerAction(_: AdminState, formData: FormData): Promise<AdminState> {
  await requireRole("admin", "/admin/freelancers");
  const userId = String(formData.get("userId") ?? "");
  const note = cleanText(formData.get("note"), 500);
  if (note.length < 10) return { error: "اكتب سبب سحب التوثيق (10 أحرف على الأقل)." };
  const rows = await db
    .update(sellerProfile)
    .set({ status: "rejected", reviewedAt: new Date(), reviewNote: note })
    .where(and(eq(sellerProfile.userId, userId), eq(sellerProfile.status, "approved")))
    .returning({ id: sellerProfile.userId });
  if (!rows.length) return { error: "المستقل غير موثّق حالياً." };
  await notify(userId, { title: "تم سحب توثيق ملفك", body: `السبب: ${note}. طلباتك الجارية تكمل، وخدماتك ما تظهر لين تعيد التقديم.`, href: "/seller/onboarding" });
  revalidatePath("/admin/freelancers");
  revalidatePath("/admin");
  return { ok: true };
}

/** Managed service: the team proposes one freelancer and package; the client pays only if they agree. */
export async function offerManagedAction(_: AdminState, formData: FormData): Promise<AdminState> {
  await requireRole("admin", "/admin/managed");
  const id = String(formData.get("requestId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const tier = String(formData.get("tier") ?? "");
  const note = cleanText(formData.get("note"), 400) || null;
  const [m] = await db.select().from(managedRequest).where(eq(managedRequest.id, id)).limit(1);
  if (!m || !["new", "offered"].includes(m.status)) return { error: "الطلب غير متاح للترشيح." };
  const [row] = await db
    .select({ s: service, status: sellerProfile.status })
    .from(service)
    .innerJoin(sellerProfile, eq(sellerProfile.userId, service.sellerId))
    .where(eq(service.id, serviceId))
    .limit(1);
  const pkg = row?.s.packages.find((p) => p.tier === tier);
  if (!row || !row.s.active || row.status !== "approved" || !pkg) return { error: "اختر خدمة وباقة من مستقل موثّق." };
  await db.update(managedRequest).set({ status: "offered", offeredServiceId: serviceId, offeredTier: tier, note }).where(eq(managedRequest.id, id));
  const [b] = await db.select({ title: brief.structured }).from(brief).where(eq(brief.id, m.briefId)).limit(1);
  await notify(m.buyerId, {
    title: "رشّحنا لك مستقل لطلبك",
    body: `«${b?.title?.title ?? "طلبك"}»: ${pkg.price + MANAGED_FEE} ر.س شاملة رسوم الإدارة. راجع الترشيح ووافق عشان نبدأ.`,
    href: `/brief/${m.briefId}`,
  });
  revalidatePath("/admin/managed");
  return { ok: true };
}
