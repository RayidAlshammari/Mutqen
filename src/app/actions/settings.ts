"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { authenticaEnabled, sendOtp, verifyOtp } from "@/lib/authentica";
import { isSaudiCr, isSaudiVat, normaliseSaudiIban, normaliseSaudiPhone } from "@/lib/validation";

export type PhoneState = { step?: "sent" | "verified"; phone?: string; error?: string } | undefined;

export async function phoneAction(prev: PhoneState, formData: FormData): Promise<PhoneState> {
  const user = await requireUser("/dashboard/settings");
  if (!authenticaEnabled()) return { error: "التحقق من الجوال غير مفعّل في هذه البيئة." };
  const intent = String(formData.get("intent"));

  if (intent === "send") {
    const phone = normaliseSaudiPhone(String(formData.get("phone") ?? ""));
    if (!phone) return { error: "اكتب رقم جوال سعودي صحيح مثل 05XXXXXXXX" };
    const r = await sendOtp(phone);
    if (!r.ok) return { error: "تعذر إرسال الرمز، حاول بعد قليل." };
    return { step: "sent", phone };
  }

  if (intent === "verify") {
    const phone = prev?.phone;
    const otp = String(formData.get("otp") ?? "").replace(/\D/g, "");
    if (!phone || otp.length < 4) return { ...prev, error: "اكتب الرمز المرسل" };
    const r = await verifyOtp(phone, otp);
    if (!r.ok) return { ...prev, error: "الرمز غير صحيح أو منتهي." };
    await db.update(schema.user).set({ phone, phoneVerified: true }).where(eq(schema.user.id, user.id));
    revalidatePath("/dashboard/settings");
    return { step: "verified", phone };
  }
  return prev;
}

/* ───────────── Seller payouts ───────────── */

export type SaveState = { ok?: boolean; error?: string } | undefined;

export async function savePayoutAction(_: SaveState, formData: FormData): Promise<SaveState> {
  const user = await requireUser("/dashboard/settings");
  if (user.role !== "seller") return { error: "غير مصرح." };
  const payoutName = String(formData.get("payoutName") ?? "").trim();
  if (payoutName.length < 3 || payoutName.length > 80) return { error: "اكتب اسم صاحب الحساب كما في البنك." };
  const iban = normaliseSaudiIban(String(formData.get("iban") ?? ""));
  if (!iban) return { error: "رقم الآيبان غير صحيح. لازم يبدأ بـ SA ويتكون من 24 خانة." };
  const res = await db
    .update(schema.sellerProfile)
    .set({ payoutName, iban })
    .where(eq(schema.sellerProfile.userId, user.id))
    .returning({ id: schema.sellerProfile.userId });
  if (!res.length) return { error: "كمّل ملفك كمستقل أولاً." };
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/* ───────────── Client billing details ───────────── */

export async function saveBillingAction(_: SaveState, formData: FormData): Promise<SaveState> {
  const user = await requireUser("/dashboard/settings");
  const companyName = String(formData.get("companyName") ?? "").trim().slice(0, 120) || null;
  const vatNumber = String(formData.get("vatNumber") ?? "").replace(/\s+/g, "") || null;
  const crNumber = String(formData.get("crNumber") ?? "").replace(/\s+/g, "") || null;
  const city = String(formData.get("city") ?? "").trim().slice(0, 40) || null;
  if (vatNumber && !isSaudiVat(vatNumber)) return { error: "الرقم الضريبي لازم يكون 15 رقم، يبدأ وينتهي بالرقم 3." };
  if (crNumber && !isSaudiCr(crNumber)) return { error: "رقم السجل التجاري لازم يكون 10 أرقام." };
  const values = { companyName, vatNumber, crNumber, city, updatedAt: new Date() };
  await db
    .insert(schema.billingProfile)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: schema.billingProfile.userId, set: values });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
