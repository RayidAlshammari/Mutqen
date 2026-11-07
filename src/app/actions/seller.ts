"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Category, ServicePackage } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { gradeVerification, VERIFICATION_TASKS } from "@/lib/ai";
import { ALL_AI_TOOLS, CATEGORY_KEYS } from "@/lib/constants";
import { newId } from "@/lib/id";
import { httpUrl } from "@/lib/validation";
import { hit, LIMITS } from "@/lib/rate-limit";

const { sellerProfile, service } = schema;

export type SellerState = { error?: string; ok?: boolean; score?: number; feedback?: string; passed?: boolean } | undefined;

const catEnum = z.enum(CATEGORY_KEYS as [Category, ...Category[]]);

const profileFields = {
  displayName: z.string().trim().min(2, "اكتب اسمك الظاهر").max(60),
  headline: z.string().trim().min(5, "اكتب وصف مختصر لتخصصك").max(90),
  bio: z.string().trim().max(1500).default(""),
  city: z.string().trim().max(40).optional(),
  freelanceDocNumber: z.string().trim().max(30).optional(),
  aiTools: z.array(z.string().max(40)).min(1, "اختر أداة واحدة على الأقل").max(15),
  portfolio: z
    .array(z.object({ title: z.string().trim().min(1).max(80), url: httpUrl("رابط العمل السابق لازم يبدأ بـ https://").optional().or(z.literal("")) }))
    .max(5)
    .default([]),
};

const profileOnlySchema = z.object(profileFields);
const onboardingSchema = z.object({
  ...profileFields,
  verificationCategory: catEnum,
  verificationAnswer: z.string().trim().min(120, "إجابة المهمة قصيرة؛ اشرح خطواتك بتفصيل (120 حرف على الأقل)").max(6000),
});

function readProfile(formData: FormData) {
  const portfolio = [0, 1, 2]
    .map((i) => ({ title: String(formData.get(`pf_title_${i}`) ?? ""), url: String(formData.get(`pf_url_${i}`) ?? "") }))
    .filter((p) => p.title.trim());
  const extraTools = String(formData.get("otherTools") ?? "")
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    displayName: formData.get("displayName"),
    headline: formData.get("headline"),
    bio: formData.get("bio") ?? "",
    city: formData.get("city") || undefined,
    freelanceDocNumber: formData.get("freelanceDocNumber") || undefined,
    aiTools: [...formData.getAll("aiTools").map(String).filter((t) => ALL_AI_TOOLS.includes(t)), ...extraTools],
    portfolio,
  };
}

function profileValues(d: z.infer<typeof profileOnlySchema>) {
  return {
    displayName: d.displayName,
    headline: d.headline,
    bio: d.bio,
    city: d.city ?? null,
    freelanceDocNumber: d.freelanceDocNumber ?? null,
    aiTools: Array.from(new Set(d.aiTools)),
    portfolio: d.portfolio.map((p) => ({ title: p.title, url: p.url || undefined })),
  };
}

export async function submitOnboardingAction(_: SellerState, formData: FormData): Promise<SellerState> {
  const user = await requireRole("seller", "/seller/onboarding");
  const existing = await db.select().from(sellerProfile).where(eq(sellerProfile.userId, user.id)).limit(1);
  if (existing[0]?.status === "pending") return { error: "ملفك قيد المراجعة حالياً." };
  if (existing[0]?.status === "approved") return { error: "ملفك موثّق مسبقاً." };

  const parsed = onboardingSchema.safeParse({
    ...readProfile(formData),
    verificationCategory: formData.get("verificationCategory"),
    verificationAnswer: formData.get("verificationAnswer"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const rl = await hit(`verify:${user.id}`, LIMITS.verification.limit, LIMITS.verification.window);
  if (!rl.ok) return { error: "استنفدت محاولات التقييم المسموحة هذي الساعة. راجع إجابتك وجرّب بعد شوي." };

  const grade = await gradeVerification(d.verificationCategory, d.verificationAnswer, d.aiTools);
  const values = {
    ...profileValues(d),
    // A freelancer can only sell in the field they were verified in.
    categories: [d.verificationCategory],
    verificationCategory: d.verificationCategory,
    verificationTask: VERIFICATION_TASKS[d.verificationCategory],
    verificationAnswer: d.verificationAnswer,
    verificationScore: grade.score,
    verificationFeedback: grade.feedback,
    status: grade.passed ? "pending" : "draft",
  };
  await db
    .insert(sellerProfile)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: sellerProfile.userId, set: values });

  revalidatePath("/seller/onboarding");
  revalidatePath("/dashboard");
  return { ok: true, score: grade.score, feedback: grade.feedback, passed: grade.passed };
}

/** Edit the public profile after onboarding. Does not touch verification or status. */
export async function updateSellerProfileAction(_: SellerState, formData: FormData): Promise<SellerState> {
  const user = await requireRole("seller", "/seller/profile");
  const existing = await db.select({ s: sellerProfile.status }).from(sellerProfile).where(eq(sellerProfile.userId, user.id)).limit(1);
  if (!existing.length) return { error: "كمّل التوثيق أولاً." };
  const parsed = profileOnlySchema.safeParse(readProfile(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.update(sellerProfile).set(profileValues(parsed.data)).where(eq(sellerProfile.userId, user.id));
  revalidatePath("/seller/profile");
  revalidatePath(`/freelancers/${user.id}`);
  return { ok: true };
}

/* ───────────── Services ───────────── */

const pkgSchema = z.object({
  name: z.string().trim().min(2).max(30),
  price: z.coerce.number().int().min(50, "أقل سعر 50 ر.س").max(100000),
  deliveryDays: z.coerce.number().int().min(1).max(60),
  revisions: z.coerce.number().int().min(0).max(10),
  features: z.array(z.string().trim().min(1).max(120)).min(1, "أضف ميزة واحدة على الأقل لكل باقة").max(8),
});

const serviceSchema = z.object({
  title: z.string().trim().min(10, "العنوان قصير").max(110),
  description: z.string().trim().min(60, "الوصف قصير؛ اشرح وش يستلم العميل وكيف تشتغل (60 حرف على الأقل)").max(4000),
  category: catEnum,
  aiTools: z.array(z.string().max(40)).min(1, "اختر الأدوات اللي تستخدمها في هذي الخدمة").max(10),
});

const TIERS = [
  ["basic", "أساسية"],
  ["standard", "متقدمة"],
  ["premium", "شاملة"],
] as const;

export async function createServiceAction(_: SellerState, formData: FormData): Promise<SellerState> {
  const user = await requireRole("seller", "/seller/services/new");
  const profile = await db.select({ categories: sellerProfile.categories }).from(sellerProfile).where(eq(sellerProfile.userId, user.id)).limit(1);
  if (!profile.length) return { error: "كمّل ملفك كمستقل أولاً." };

  const base = serviceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    aiTools: formData.getAll("aiTools"),
  });
  if (!base.success) return { error: base.error.issues[0].message };
  if (!profile[0].categories.includes(base.data.category))
    return { error: "تقدر تنشر خدمات في المجال اللي توثّقت فيه فقط." };

  const packages: ServicePackage[] = [];
  for (const [tier, defName] of TIERS) {
    const p = pkgSchema.safeParse({
      name: formData.get(`${tier}_name`) || defName,
      price: formData.get(`${tier}_price`),
      deliveryDays: formData.get(`${tier}_days`),
      revisions: formData.get(`${tier}_revisions`),
      features: String(formData.get(`${tier}_features`) ?? "")
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    });
    if (!p.success) return { error: `باقة ${defName}: ${p.error.issues[0].message}` };
    packages.push({ tier, ...p.data });
  }
  for (let i = 1; i < packages.length; i++)
    if (packages[i].price < packages[i - 1].price) return { error: "رتّب الأسعار تصاعدياً: الأساسية ≤ المتقدمة ≤ الشاملة." };

  const id = newId("s_");
  await db.insert(service).values({
    id,
    sellerId: user.id,
    ...base.data,
    packages,
    minPrice: Math.min(...packages.map((p) => p.price)),
    minDeliveryDays: Math.min(...packages.map((p) => p.deliveryDays)),
  });
  revalidatePath("/seller/services");
  redirect(`/services/${id}`);
}

export async function toggleServiceAction(serviceId: string) {
  const user = await requireRole("seller");
  const [s] = await db.select().from(service).where(and(eq(service.id, serviceId), eq(service.sellerId, user.id))).limit(1);
  if (!s) return;
  await db.update(service).set({ active: !s.active }).where(eq(service.id, serviceId));
  revalidatePath("/seller/services");
}
