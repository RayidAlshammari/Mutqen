"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { newId } from "@/lib/id";
import { structureBrief, type BriefResult } from "@/lib/ai";
import { matchServices, type ServiceCardData } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { clientIp, hit, LIMITS } from "@/lib/rate-limit";

export type WaitlistState = { ok?: boolean; error?: string } | undefined;

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email("اكتب بريد صحيح"),
  side: z.enum(["buyer", "seller"]),
  note: z.string().trim().max(300).optional(),
});

export async function joinWaitlistAction(_: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const parsed = waitlistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const rl = await hit(`waitlist:${await clientIp()}`, LIMITS.waitlist.limit, LIMITS.waitlist.window);
  if (!rl.ok) return { error: "محاولات كثيرة، جرّب بعد شوي." };
  await db
    .insert(schema.waitlist)
    .values({ id: newId("w_"), ...parsed.data })
    .onConflictDoNothing({ target: schema.waitlist.email });
  return { ok: true };
}

export type AssistantState =
  | { result?: BriefResult; matches?: ServiceCardData[]; error?: string; input?: string }
  | undefined;

export async function assistantAction(_: AssistantState, formData: FormData): Promise<AssistantState> {
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 8) return { error: "اكتب وصفاً أوضح لاحتياجك (جملة أو جملتين على الأقل).", input: text };
  if (text.length > 2000) return { error: "الوصف طويل جداً، اختصره في حدود 2000 حرف.", input: text };
  const user = await getCurrentUser();
  const rl = user
    ? await hit(`assistant:u:${user.id}`, LIMITS.assistantUser.limit, LIMITS.assistantUser.window)
    : await hit(`assistant:ip:${await clientIp()}`, LIMITS.assistantAnon.limit, LIMITS.assistantAnon.window);
  if (!rl.ok)
    return {
      error: user ? "وصلت الحد المسموح للمساعد هذي الساعة، جرّب بعد شوي." : "وصلت الحد المسموح للزوار. سجّل دخولك عشان تكمل استخدام المساعد.",
      input: text,
    };
  const result = await structureBrief(text);
  const matches = await matchServices(result.brief.category, [...result.keywords, ...result.brief.title.split(" ")]);
  return { result, matches, input: text };
}

export async function heroSearchAction(formData: FormData) {
  const q = String(formData.get("q") ?? "").trim();
  redirect(q ? `/assistant?q=${encodeURIComponent(q)}` : "/assistant");
}
