"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { safeNextPath as safeNext } from "@/lib/validation";

export type FormState = { error?: string } | undefined;


function authErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/already exists|exist/i.test(msg)) return "هذا البريد مسجل مسبقاً، جرّب تسجيل الدخول.";
  if (/invalid email or password|invalid password|credentials/i.test(msg)) return "البريد أو كلمة المرور غير صحيحة.";
  if (/password.*short|too short/i.test(msg)) return "كلمة المرور قصيرة، استخدم 8 أحرف على الأقل.";
  return "تعذر إكمال العملية، حاول مرة أخرى.";
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "اكتب اسمك").max(60),
  email: z.string().trim().toLowerCase().email("البريد غير صحيح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(128),
  role: z.enum(["buyer", "seller"]),
});

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, role } = parsed.data;
  let userId: string;
  try {
    const res = await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
    userId = res.user.id;
  } catch (e) {
    return { error: authErrorMessage(e) };
  }
  if (role === "seller") {
    await db.update(schema.user).set({ role: "seller" }).where(eq(schema.user.id, userId));
  }
  const next = safeNext(formData.get("next"));
  redirect(role === "seller" ? "/seller/onboarding" : next ?? "/dashboard");
}

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("البريد غير صحيح"),
  password: z.string().min(1, "اكتب كلمة المرور"),
});

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    return { error: authErrorMessage(e) };
  }
  redirect(safeNext(formData.get("next")) ?? "/dashboard");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
