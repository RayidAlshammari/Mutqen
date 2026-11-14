"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId } from "@/lib/id";
import { getCurrentUser } from "@/lib/session";
import { clientIp, hit, LIMITS } from "@/lib/rate-limit";
import { composeBrief, missingRequired, startBrief, QUESTION_BANK } from "@/lib/brief";
import type { Category } from "@/db/schema";
import { ensureBriefKey, loadOwnBrief } from "@/lib/brief-access";
import { cleanText } from "@/lib/ai";
import { httpUrl } from "@/lib/validation";
import { notifyAdmins } from "@/lib/notify";

const { brief, managedRequest, service } = schema;

export type BriefState = { error?: string; ok?: boolean; input?: string } | undefined;

async function limited() {
  const user = await getCurrentUser();
  const rl = user
    ? await hit(`assistant:u:${user.id}`, LIMITS.assistantUser.limit, LIMITS.assistantUser.window)
    : await hit(`assistant:ip:${await clientIp()}`, LIMITS.assistantAnon.limit, LIMITS.assistantAnon.window);
  return { user, ok: rl.ok };
}

/* ───────────── 1. One sentence in, the right questions out ───────────── */

export async function startBriefAction(_: BriefState, formData: FormData): Promise<BriefState> {
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 8) return { error: "اكتب احتياجك في جملة على الأقل، مثل: أبي شعار لمقهى جديد.", input: text };
  if (text.length > 2000) return { error: "الوصف طويل. اختصره في حدود 2000 حرف، والتفاصيل نسألك عنها بعدين.", input: text };
  const { user, ok } = await limited();
  if (!ok) return { error: user ? "وصلت الحد المسموح هذي الساعة. جرّب بعد شوي." : "وصلت الحد المسموح للزوار. سجّل دخولك وكمّل.", input: text };

  // Started from a service page: keep the service so we return the client to it.
  let serviceId: string | null = null;
  let tier: string | null = null;
  let forced: Category | null = null;
  const sid = String(formData.get("serviceId") ?? "");
  if (sid) {
    const [s] = await db.select({ id: service.id, category: service.category }).from(service).where(eq(service.id, sid)).limit(1);
    if (s) {
      serviceId = s.id;
      forced = s.category;
      const t = String(formData.get("tier") ?? "");
      tier = ["basic", "standard", "premium"].includes(t) ? t : null;
    }
  }

  let started = await startBrief(text);
  // The chosen service decides the category, whatever the wording suggests.
  if (forced && started.category !== forced) started = { category: forced, questions: QUESTION_BANK[forced], source: "fallback" };
  const id = newId("b_");
  await db.insert(brief).values({
    id,
    ownerId: user && user.role !== "admin" ? user.id : null,
    ownerKey: await ensureBriefKey(),
    input: text,
    category: started.category,
    questions: started.questions,
    serviceId,
    tier,
  });
  redirect(`/brief/${id}`);
}

/* ───────────── 2. Answers in, a brief a freelancer can execute out ───────────── */

const asset = z.object({ label: z.string().trim().min(1).max(80), url: httpUrl() });
const composeSchema = z.object({
  answers: z.array(z.object({ id: z.string().max(40), a: z.string().trim().max(600) })).max(8),
  style: z.array(z.string().trim().max(40)).max(6),
  colors: z.array(z.string().trim().max(60)).max(3),
  references: z.array(httpUrl("رابط المرجع لازم يبدأ بـ https://")).max(4),
  assets: z.array(asset).max(8),
});

export async function composeBriefAction(briefId: string, payload: unknown): Promise<BriefState> {
  const own = await loadOwnBrief(briefId);
  if (!own) return { error: "الملخص غير موجود." };
  if (own.brief.status === "ordered") return { error: "هذا الملخص انطلب عليه. ابدأ ملخص جديد." };
  const parsed = composeSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { ok } = await limited();
  if (!ok) return { error: "وصلت الحد المسموح هذي الساعة. جرّب بعد شوي." };

  const answers = own.brief.questions
    .map((q) => ({ id: q.id, q: q.q, a: cleanText(parsed.data.answers.find((x) => x.id === q.id)?.a ?? "", 600) }))
    .filter((x) => x.a);
  // Briefs made before required questions existed carry no flag: fall back to the bank's.
  const bank = QUESTION_BANK[own.brief.category];
  const questions = own.brief.questions.map((q) => ({ ...q, required: q.required ?? bank.find((b) => b.id === q.id)?.required }));
  const missing = missingRequired(questions, Object.fromEntries(answers.map((a) => [a.id, a.a])));
  if (missing.length) return { error: `جاوب على: ${missing.join("، ")}. إذا ما تدري اختر «ما أدري، اقترحوا علي».` };

  const { brief: structured } = await composeBrief({
    input: own.brief.input,
    category: own.brief.category,
    answers,
    style: parsed.data.style,
    colors: parsed.data.colors,
    references: parsed.data.references,
    assets: parsed.data.assets,
  });
  await db.update(brief).set({ structured, status: "ready", updatedAt: new Date() }).where(eq(brief.id, briefId));
  revalidatePath(`/brief/${briefId}`);
  return { ok: true };
}

/* ───────────── 3. The client can correct the summary before anyone sees it ───────────── */

const lines = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "")
    .split("\n")
    .map((l) => cleanText(l.replace(/^[-•✓\s]+/, ""), 300))
    .filter(Boolean)
    .slice(0, max);

export async function updateSummaryAction(_: BriefState, formData: FormData): Promise<BriefState> {
  const id = String(formData.get("briefId") ?? "");
  const own = await loadOwnBrief(id);
  if (!own?.brief.structured) return { error: "الملخص غير موجود." };
  if (own.brief.status === "ordered") return { error: "هذا الملخص انطلب عليه وما يتعدل. التغيير بعد الطلب يتم داخل صفحة الطلب." };
  const title = cleanText(formData.get("title"), 120);
  const goal = cleanText(formData.get("goal"), 600);
  const deliverables = lines(formData.get("deliverables"), 8);
  const acceptance = lines(formData.get("acceptance"), 6);
  if (title.length < 4) return { error: "اكتب عنوان واضح للطلب." };
  if (deliverables.length < 1) return { error: "اكتب مخرج واحد على الأقل (سطر لكل مخرج)." };
  if (acceptance.length < 1) return { error: "اكتب معيار قبول واحد على الأقل (سطر لكل معيار)." };
  await db
    .update(brief)
    .set({ structured: { ...own.brief.structured, title, goal, deliverables, acceptance }, updatedAt: new Date() })
    .where(eq(brief.id, id));
  revalidatePath(`/brief/${id}`);
  return { ok: true };
}

export async function reopenBriefAction(formData: FormData) {
  const id = String(formData.get("briefId") ?? "");
  const own = await loadOwnBrief(id);
  if (own && ["ready", "draft"].includes(own.brief.status)) {
    await db.update(brief).set({ status: "draft", updatedAt: new Date() }).where(eq(brief.id, id));
  }
  redirect(`/brief/${id}`);
}

/* ───────────── 4. "Let Mutqen run it": the team picks the freelancer and follows the order ───────────── */

export async function requestManagedAction(_: BriefState, formData: FormData): Promise<BriefState> {
  const id = String(formData.get("briefId") ?? "");
  const own = await loadOwnBrief(id);
  if (!own?.brief.structured) return { error: "كمّل الملخص أول." };
  if (!own.user) redirect(`/signup?next=${encodeURIComponent(`/brief/${id}#managed`)}`);
  if (own.user.role !== "buyer") return { error: "الخدمة المُدارة للعملاء فقط." };
  if (own.brief.status !== "ready") return { error: "هذا الملخص عليه طلب قائم." };
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const budget = budgetRaw ? Number(budgetRaw) : null;
  if (budget !== null && (!Number.isFinite(budget) || budget < 50 || budget > 100000)) return { error: "اكتب ميزانية بين 50 و 100,000 ريال، أو اتركها فاضية." };
  const note = cleanText(formData.get("note"), 400) || null;
  await db.transaction(async (tx) => {
    await tx.insert(managedRequest).values({ id: newId("m_"), briefId: id, buyerId: own.user!.id, budget: budget === null ? null : Math.round(budget), note });
    await tx.update(brief).set({ status: "managed", updatedAt: new Date() }).where(eq(brief.id, id));
  });
  await notifyAdmins({ title: "طلب خدمة مُدارة جديد", body: own.brief.structured.title, href: "/admin/managed" });
  revalidatePath(`/brief/${id}`);
  return { ok: true };
}

export async function cancelManagedAction(formData: FormData) {
  const id = String(formData.get("briefId") ?? "");
  const own = await loadOwnBrief(id);
  if (own?.user && own.brief.status === "managed") {
    await db.transaction(async (tx) => {
      await tx.update(managedRequest).set({ status: "cancelled" }).where(eq(managedRequest.briefId, id));
      await tx.update(brief).set({ status: "ready", updatedAt: new Date() }).where(eq(brief.id, id));
    });
  }
  redirect(`/brief/${id}`);
}

/* ───────────── 5. Order the same thing again without rebuilding the brief ───────────── */

export async function reorderBriefAction(formData: FormData) {
  const id = String(formData.get("briefId") ?? "");
  const own = await loadOwnBrief(id);
  if (!own?.user || !own.brief.structured) redirect("/brief");
  const copy = newId("b_");
  await db.insert(brief).values({
    id: copy,
    ownerId: own.user.id,
    input: own.brief.input,
    category: own.brief.category,
    questions: own.brief.questions,
    structured: own.brief.structured,
    status: "ready",
    serviceId: String(formData.get("serviceId") ?? "") || own.brief.serviceId,
  });
  redirect(`/brief/${copy}`);
}
