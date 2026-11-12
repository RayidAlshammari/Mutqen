"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { newId } from "@/lib/id";
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

export async function heroSearchAction(formData: FormData) {
  const q = String(formData.get("q") ?? "").trim();
  redirect(q ? `/brief?q=${encodeURIComponent(q)}` : "/brief");
}
