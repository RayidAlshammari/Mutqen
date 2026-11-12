"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, avg, count, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { OPEN_ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ACCEPT_HOURS, MANAGED_FEE, REVISION_DAYS, computeFees } from "@/lib/constants";
import { newId } from "@/lib/id";
import { httpUrl } from "@/lib/validation";
import { hit, LIMITS } from "@/lib/rate-limit";
import { DAY, acceptDeadline, approveSample, completeOrder, refundUnaccepted, sampleDays } from "@/lib/order-lifecycle";
import { holdPayment } from "@/lib/payments";
import { notify, notifyAdmins } from "@/lib/notify";

const { order, orderEvent, service, review, sellerProfile, brief, managedRequest } = schema;

export type ActionState = { error?: string; ok?: boolean } | undefined;

/* ───────────── Create order (payment is held, the freelancer has 24h to accept) ───────────── */

const createSchema = z.object({
  serviceId: z.string().min(1),
  tier: z.enum(["basic", "standard", "premium"]),
  briefId: z.string().min(1, "ملخص الطلب مفقود. ارجع وكمّل الملخص."),
  managedRequestId: z.string().optional(),
  paymentMethod: z.enum(["mada", "applepay", "card"]),
  agree: z.literal("on", { message: "لازم توافق على شروط حجز المبلغ" }),
});

export async function createOrderAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const rl = await hit(`orders:${user.id}`, LIMITS.orders.limit, LIMITS.orders.window);
  if (!rl.ok) return { error: "أنشأت طلبات كثيرة خلال ساعة. حاول بعد شوي." };
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { serviceId, tier, briefId, paymentMethod, managedRequestId } = parsed.data;

  const [b] = await db.select().from(brief).where(eq(brief.id, briefId)).limit(1);
  if (user.role === "admin") return { error: "حساب الإدارة ما يطلب خدمات." };
  if (!b || !b.structured || b.ownerId !== user.id) return { error: "ملخص الطلب غير موجود." };
  if (b.status === "ordered") return { error: "هذا الملخص انطلب عليه من قبل. افتح طلباتك." };

  const [row] = await db
    .select({ s: service, sellerStatus: sellerProfile.status })
    .from(service)
    .innerJoin(sellerProfile, eq(sellerProfile.userId, service.sellerId))
    .where(eq(service.id, serviceId))
    .limit(1);
  if (!row || !row.s.active || row.sellerStatus !== "approved") return { error: "الخدمة غير متاحة حالياً." };
  if (row.s.sellerId === user.id) return { error: "ما تقدر تطلب خدمتك أنت." };
  const pkg = row.s.packages.find((p) => p.tier === tier);
  if (!pkg) return { error: "الباقة غير موجودة." };

  // "Let Mutqen run it": only the offer the team made for this client can be paid as managed.
  let managed = false;
  if (managedRequestId) {
    const [m] = await db.select().from(managedRequest).where(eq(managedRequest.id, managedRequestId)).limit(1);
    if (!m || m.buyerId !== user.id || m.status !== "offered" || m.offeredServiceId !== serviceId || m.offeredTier !== tier) {
      return { error: "عرض الخدمة المُدارة غير صالح." };
    }
    managed = true;
  }

  // Repeat work with the same client earns the freelancer a lower commission.
  const [{ n: completedTogether }] = await db
    .select({ n: count() })
    .from(order)
    .where(and(eq(order.buyerId, user.id), eq(order.sellerId, row.s.sellerId), eq(order.status, "completed")));
  const fees = computeFees(pkg.price, Number(completedTogether));
  const managedFee = managed ? MANAGED_FEE : 0;
  const id = newId("o_");
  const payment = await holdPayment({ amount: fees.total + managedFee, method: paymentMethod, orderId: id });
  const sb = b.structured;
  const briefText = [sb.title, sb.goal].filter(Boolean).join("\n");

  await db.transaction(async (tx) => {
    await tx.insert(order).values({
      id,
      serviceId,
      buyerId: user.id,
      sellerId: row.s.sellerId,
      packageTier: pkg.tier,
      packageName: pkg.name,
      price: fees.price,
      buyerFee: 0,
      platformCommission: fees.platformCommission,
      sellerEarning: fees.sellerEarning,
      brief: briefText,
      structuredBrief: sb,
      briefId,
      status: "awaiting_acceptance",
      stage: "sample",
      paymentRef: payment.ref,
      revisionsLeft: pkg.revisions,
      deliveryDays: pkg.deliveryDays,
      acceptBy: acceptDeadline(),
      managed,
      managedFee,
    });
    await tx.insert(orderEvent).values([
      { id: newId("e_"), orderId: id, actorId: user.id, type: "created", message: briefText },
      {
        id: newId("e_"),
        orderId: id,
        actorId: null,
        type: "payment_held",
        message: `انحجز ${fees.total + managedFee} ر.س لدى متقن (مرجع ${payment.ref}). ما يتحوّل للمستقل إلا بعد ما تعتمد التسليم.`,
      },
    ]);
    await tx.update(brief).set({ status: "ordered", ownerId: user.id, updatedAt: new Date() }).where(eq(brief.id, briefId));
    if (managedRequestId) await tx.update(managedRequest).set({ status: "accepted", orderId: id }).where(eq(managedRequest.id, managedRequestId));
    await tx.update(service).set({ ordersCount: sql`${service.ordersCount} + 1` }).where(eq(service.id, serviceId));
  });

  await notify(row.s.sellerId, {
    title: "وصلك طلب جديد",
    body: `«${sb.title}» — اقبله أو اسأل العميل خلال ${ACCEPT_HOURS} ساعة.`,
    href: `/orders/${id}`,
  });
  if (managed) await notifyAdmins({ title: "طلب مُدار انطلق", body: sb.title, href: `/orders/${id}` });

  redirect(`/orders/${id}?new=1`);
}

/* ───────────── Helpers ───────────── */

async function loadOrderFor(orderId: string) {
  const user = await requireUser(`/orders/${orderId}`);
  const [o] = await db.select().from(order).where(eq(order.id, orderId)).limit(1);
  if (!o) return { user, o: null as null };
  const isBuyer = o.buyerId === user.id;
  const isSeller = o.sellerId === user.id;
  const isAdmin = user.role === "admin";
  return { user, o, isBuyer, isSeller, isAdmin };
}

const msgSchema = z.string().trim().min(2, "اكتب رسالة").max(3000);
const requiredUrl = httpUrl("حط رابط العمل (يبدأ بـ https://)");

/**
 * Every transition is one conditional UPDATE: it only matches while the order is still in
 * the expected state, so double clicks or two open tabs can never apply it twice.
 */
class StaleOrderError extends Error {}
const STALE = "حالة الطلب تغيّرت، حدّث الصفحة.";
const done = (orderId: string): ActionState => {
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
};
const staleOr = (e: unknown, message = STALE): ActionState => {
  if (e instanceof StaleOrderError) return { error: message };
  throw e;
};

/* ───────────── Freelancer accepts or declines ───────────── */

export async function acceptOrderAction(orderId: string): Promise<void> {
  const { user, o, isSeller } = await loadOrderFor(orderId);
  if (!o || !isSeller) return;
  const now = Date.now();
  const moved = await db.transaction(async (tx) => {
    const rows = await tx
      .update(order)
      .set({
        status: "in_progress",
        stage: "sample",
        acceptedAt: new Date(now),
        // The clock starts when the freelancer accepts, not when the client pays.
        dueAt: new Date(now + o.deliveryDays * DAY),
        sampleDueAt: new Date(now + sampleDays(o.deliveryDays) * DAY),
      })
      .where(and(eq(order.id, orderId), eq(order.status, "awaiting_acceptance")))
      .returning({ id: order.id });
    if (!rows.length) return false;
    await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "accepted", message: "قبل المستقل الطلب وبدأ العمل. أول شي يوصلك: عيّنة أولى تعتمد منها الاتجاه." });
    return true;
  });
  if (moved) await notify(o.buyerId, { title: "المستقل قبل طلبك", body: "بدأ العمل، وبتوصلك عيّنة أولى قريب.", href: `/orders/${orderId}` });
  revalidatePath(`/orders/${orderId}`);
}

export async function declineOrderAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isSeller } = await loadOrderFor(orderId);
  if (!o || !isSeller) return { error: "غير مصرح." };
  const reason = msgSchema.safeParse(formData.get("message"));
  if (!reason.success) return { error: "اكتب للعميل سبب الاعتذار." };
  const ok = await refundUnaccepted(orderId, user.id, `اعتذر المستقل عن الطلب: ${reason.data}`);
  return ok ? done(orderId) : { error: STALE };
}

/* ───────────── First sample ───────────── */

export async function deliverSampleAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isSeller } = await loadOrderFor(orderId);
  if (!o || !isSeller) return { error: "غير مصرح." };
  const message = msgSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: message.error.issues[0].message };
  const url = requiredUrl.safeParse(formData.get("url") ?? "");
  if (!url.success) return { error: url.error.issues[0].message };
  try {
    await db.transaction(async (tx) => {
      const moved = await tx
        .update(order)
        .set({ status: "sample_review", sampleDeliveredAt: new Date() })
        .where(and(eq(order.id, orderId), eq(order.status, "in_progress"), eq(order.stage, "sample")))
        .returning({ id: order.id });
      if (!moved.length) throw new StaleOrderError();
      await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "sample_delivered", message: message.data, attachmentUrl: url.data });
    });
  } catch (e) {
    return staleOr(e, "ما يمكن تسليم العيّنة في هذي المرحلة.");
  }
  await notify(o.buyerId, { title: "العيّنة الأولى جاهزة", body: "شوفها واعتمد الاتجاه، أو قل وش يتغيّر قبل ما يكمّل المستقل.", href: `/orders/${orderId}` });
  return done(orderId);
}

export async function approveSampleAction(orderId: string): Promise<void> {
  const { user, o, isBuyer } = await loadOrderFor(orderId);
  if (!o || !isBuyer) return;
  await approveSample(orderId, user.id, "اعتمد العميل اتجاه العيّنة.");
  revalidatePath(`/orders/${orderId}`);
}

export async function requestSampleChangeAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isBuyer } = await loadOrderFor(orderId);
  if (!o || !isBuyer) return { error: "غير مصرح." };
  const message = msgSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: "اكتب وش تبي يتغيّر في الاتجاه." };
  const extra = sampleDays(o.deliveryDays) * DAY;
  try {
    await db.transaction(async (tx) => {
      const moved = await tx
        .update(order)
        .set({
          status: "in_progress",
          stage: "sample",
          sampleChangesLeft: sql`${order.sampleChangesLeft} - 1`,
          sampleDueAt: new Date(Date.now() + extra),
          // Changing direction costs time; the final deadline moves by the same amount.
          dueAt: o.dueAt ? new Date(o.dueAt.getTime() + extra) : null,
        })
        .where(and(eq(order.id, orderId), eq(order.status, "sample_review"), gt(order.sampleChangesLeft, 0)))
        .returning({ id: order.id });
      if (!moved.length) throw new StaleOrderError();
      await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "sample_change", message: message.data });
    });
  } catch (e) {
    return staleOr(e, "تغيير الاتجاه المشمول استُخدم. اعتمد العيّنة، أو اضغط «عندي مشكلة».");
  }
  await notify(o.sellerId, { title: "العميل طلب تغيير الاتجاه", body: message.data.slice(0, 200), href: `/orders/${orderId}` });
  return done(orderId);
}

/* ───────────── Full delivery ───────────── */

export async function deliverOrderAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isSeller } = await loadOrderFor(orderId);
  if (!o || !isSeller) return { error: "غير مصرح." };
  const message = msgSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: message.error.issues[0].message };
  const url = requiredUrl.safeParse(formData.get("url") ?? "");
  if (!url.success) return { error: url.error.issues[0].message };
  try {
    await db.transaction(async (tx) => {
      const moved = await tx
        .update(order)
        .set({ status: "delivered", deliveredAt: new Date() })
        .where(
          and(
            eq(order.id, orderId),
            or(and(eq(order.status, "in_progress"), eq(order.stage, "full")), eq(order.status, "revision_requested")),
          ),
        )
        .returning({ id: order.id });
      if (!moved.length) throw new StaleOrderError();
      await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "delivered", message: message.data, attachmentUrl: url.data });
    });
  } catch (e) {
    return staleOr(e, "ما يمكن التسليم في هذي المرحلة.");
  }
  await notify(o.buyerId, { title: "وصلك التسليم الكامل", body: "راجعه واعتمده، أو اطلب تعديل ضمن الملخص.", href: `/orders/${orderId}` });
  return done(orderId);
}

/* ───────────── Client: revision within the brief ───────────── */

export async function requestRevisionAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isBuyer } = await loadOrderFor(orderId);
  if (!o || !isBuyer) return { error: "غير مصرح." };
  if (o.revisionsLeft <= 0) return { error: "استنفدت التعديلات المشمولة في الباقة." };
  const message = msgSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: message.error.issues[0].message };
  try {
    await db.transaction(async (tx) => {
      const moved = await tx
        .update(order)
        .set({
          status: "revision_requested",
          revisionsLeft: sql`${order.revisionsLeft} - 1`,
          // A revision gets its own clear deadline, so the order can never hang here.
          dueAt: new Date(Date.now() + REVISION_DAYS * DAY),
        })
        .where(and(eq(order.id, orderId), eq(order.status, "delivered"), gt(order.revisionsLeft, 0)))
        .returning({ id: order.id });
      if (!moved.length) throw new StaleOrderError();
      await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "revision_requested", message: message.data });
    });
  } catch (e) {
    return staleOr(e);
  }
  await notify(o.sellerId, { title: "العميل طلب تعديل", body: message.data.slice(0, 200), href: `/orders/${orderId}` });
  return done(orderId);
}

/* ───────────── Client approves → funds released ───────────── */

export async function approveDeliveryAction(orderId: string): Promise<void> {
  const { user, o, isBuyer } = await loadOrderFor(orderId);
  if (!o || !isBuyer) return;
  await completeOrder(orderId, user.id, "اعتمد العميل التسليم.");
  revalidatePath(`/orders/${orderId}`);
}

/* ───────────── Extra work outside the brief = a linked order with its own price ───────────── */

const addonSchema = z.object({
  title: z.string().trim().min(5, "اكتب وش يشمل العمل الإضافي").max(300),
  price: z.coerce.number().int().min(20, "أقل سعر 20 ر.س").max(100000),
  days: z.coerce.number().int().min(1).max(60),
});

export async function offerAddonAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isSeller } = await loadOrderFor(orderId);
  if (!o || !isSeller) return { error: "غير مصرح." };
  if (!OPEN_ORDER_STATUSES.includes(o.status) || o.status === "awaiting_acceptance") return { error: "الطلب مو في مرحلة تسمح بعرض إضافي." };
  const parsed = addonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.insert(orderEvent).values({
    id: newId("e_"),
    orderId,
    actorId: user.id,
    type: "addon_offer",
    message: parsed.data.title,
    data: { price: parsed.data.price, days: parsed.data.days, accepted: false },
  });
  await notify(o.buyerId, { title: "عرض لعمل إضافي", body: `${parsed.data.title} — ${parsed.data.price} ر.س`, href: `/orders/${orderId}` });
  return done(orderId);
}

export async function acceptAddonAction(orderId: string, eventId: string): Promise<void> {
  const { user, o, isBuyer } = await loadOrderFor(orderId);
  if (!o || !isBuyer) return;
  const [ev] = await db.select().from(orderEvent).where(and(eq(orderEvent.id, eventId), eq(orderEvent.orderId, orderId), eq(orderEvent.type, "addon_offer"))).limit(1);
  const data = ev?.data as { price?: number; days?: number; accepted?: boolean } | null;
  if (!ev || !data || data.accepted || typeof data.price !== "number" || typeof data.days !== "number") return;
  const [{ n }] = await db.select({ n: count() }).from(order).where(and(eq(order.buyerId, o.buyerId), eq(order.sellerId, o.sellerId), eq(order.status, "completed")));
  const fees = computeFees(data.price, Number(n));
  const id = newId("o_");
  const payment = await holdPayment({ amount: fees.total, method: "mada", orderId: id });
  const now = Date.now();
  const title = `عمل إضافي: ${ev.message}`;
  const created = await db.transaction(async (tx) => {
    // Mark the offer as taken first; a second click finds it already accepted.
    const taken = await tx
      .update(orderEvent)
      .set({ data: { ...data, accepted: true, orderId: id } })
      .where(and(eq(orderEvent.id, eventId), sql`coalesce((${orderEvent.data}->>'accepted')::boolean, false) = false`))
      .returning({ id: orderEvent.id });
    if (!taken.length) return false;
    await tx.insert(order).values({
      id,
      serviceId: o.serviceId,
      buyerId: o.buyerId,
      sellerId: o.sellerId,
      packageTier: o.packageTier,
      packageName: "عمل إضافي",
      price: fees.price,
      buyerFee: 0,
      platformCommission: fees.platformCommission,
      sellerEarning: fees.sellerEarning,
      brief: title,
      structuredBrief: { title, category: o.structuredBrief?.category ?? "content", goal: ev.message ?? "", deliverables: [ev.message ?? ""] },
      parentOrderId: orderId,
      // The freelancer proposed it, so there is nothing to accept and no sample step.
      status: "in_progress",
      stage: "full",
      paymentRef: payment.ref,
      revisionsLeft: 1,
      sampleChangesLeft: 0,
      deliveryDays: data.days!,
      acceptedAt: new Date(now),
      dueAt: new Date(now + data.days! * DAY),
    });
    await tx.insert(orderEvent).values([
      { id: newId("e_"), orderId: id, actorId: user.id, type: "created", message: title },
      { id: newId("e_"), orderId: id, actorId: null, type: "payment_held", message: `انحجز ${fees.total} ر.س لدى متقن (مرجع ${payment.ref}).` },
    ]);
    return true;
  });
  if (!created) return;
  await notify(o.sellerId, { title: "العميل وافق على العمل الإضافي", body: title, href: `/orders/${id}` });
  redirect(`/orders/${id}?new=1`);
}

/* ───────────── "I have a problem": pauses every timer and hands the order to the team ───────────── */

const DISPUTABLE: OrderStatus[] = ["in_progress", "sample_review", "delivered", "revision_requested"];

export async function openDisputeAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isBuyer } = await loadOrderFor(orderId);
  if (!o || !isBuyer) return { error: "غير مصرح." };
  const reason = z.string().trim().min(10, "اشرح المشكلة بجملة أو جملتين").max(2000).safeParse(formData.get("message"));
  if (!reason.success) return { error: reason.error.issues[0].message };
  try {
    await db.transaction(async (tx) => {
      const moved = await tx
        .update(order)
        .set({ status: "disputed", disputeReason: reason.data, disputePrevStatus: o.status })
        .where(and(eq(order.id, orderId), inArray(order.status, DISPUTABLE)))
        .returning({ id: order.id });
      if (!moved.length) throw new StaleOrderError();
      await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "disputed", message: reason.data });
    });
  } catch (e) {
    return staleOr(e);
  }
  await notifyAdmins({ title: "مشكلة في طلب تحتاج قرارك", body: reason.data.slice(0, 200), href: `/orders/${orderId}` });
  await notify(o.sellerId, { title: "العميل رفع مشكلة لفريق متقن", body: "توقّف العدّاد. بنراجع ونرجع لكم.", href: `/orders/${orderId}` });
  return done(orderId);
}

const resolveSchema = z.object({
  decision: z.enum(["resume", "refund", "partial"]),
  amount: z.coerce.number().int().min(0).optional(),
  note: z.string().trim().min(5, "اكتب سبب القرار للطرفين").max(1000),
});

export async function resolveDisputeAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isAdmin } = await loadOrderFor(orderId);
  if (!o || !isAdmin) return { error: "غير مصرح." };
  const parsed = resolveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { decision, note } = parsed.data;
  const disputed = and(eq(order.id, orderId), eq(order.status, "disputed"));
  let summary = "";
  try {
    await db.transaction(async (tx) => {
      if (decision === "resume") {
        const prev = o.disputePrevStatus ?? "in_progress";
        const fresh = new Date();
        const moved = await tx
          .update(order)
          .set({
            status: prev,
            // Timers restart from the decision, so nobody loses time to the review.
            ...(prev === "delivered" ? { deliveredAt: fresh } : {}),
            ...(prev === "sample_review" ? { sampleDeliveredAt: fresh } : {}),
            ...(prev === "in_progress" || prev === "revision_requested" ? { dueAt: new Date(Date.now() + REVISION_DAYS * DAY) } : {}),
          })
          .where(disputed)
          .returning({ id: order.id });
        if (!moved.length) throw new StaleOrderError();
        summary = `قرار متقن: يكمل الطلب. ${note}`;
      } else if (decision === "refund") {
        const moved = await tx.update(order).set({ status: "cancelled", refundAmount: o.price + o.managedFee }).where(disputed).returning({ id: order.id });
        if (!moved.length) throw new StaleOrderError();
        summary = `قرار متقن: إلغاء واسترداد كامل (${o.price + o.managedFee} ر.س) للعميل. ${note}`;
      } else {
        const amount = parsed.data.amount ?? 0;
        if (amount <= 0 || amount >= o.price) throw new Error("PARTIAL_RANGE");
        // The freelancer is paid for the part that stands; commission is taken on that part only.
        const kept = o.price - amount;
        const rate = o.platformCommission / o.price;
        const commission = Math.round(kept * rate);
        const moved = await tx
          .update(order)
          .set({ status: "completed", completedAt: new Date(), refundAmount: amount, platformCommission: commission, sellerEarning: kept - commission })
          .where(disputed)
          .returning({ id: order.id });
        if (!moved.length) throw new StaleOrderError();
        summary = `قرار متقن: استرداد جزئي ${amount} ر.س للعميل، و${kept - commission} ر.س للمستقل. ${note}`;
      }
      await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "dispute_resolved", message: summary });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "PARTIAL_RANGE") return { error: "مبلغ الاسترداد الجزئي لازم يكون أقل من سعر الطلب وأكبر من صفر." };
    return staleOr(e);
  }
  for (const uid of [o.buyerId, o.sellerId]) await notify(uid, { title: "صدر قرار متقن في المشكلة", body: summary.slice(0, 200), href: `/orders/${orderId}` });
  revalidatePath("/admin");
  return done(orderId);
}

/* ───────────── Cancel & refund ───────────── */

/**
 * Client: before the freelancer accepts, or once the freelancer is past the deadline
 * (first work or a requested revision). Admin: any order that is still open.
 */
export async function cancelOrderAction(orderId: string): Promise<void> {
  const { user, o, isBuyer, isAdmin } = await loadOrderFor(orderId);
  if (!o || !(isBuyer || isAdmin)) return;
  const where = isAdmin
    ? and(eq(order.id, orderId), inArray(order.status, OPEN_ORDER_STATUSES))
    : and(
        eq(order.id, orderId),
        eq(order.buyerId, user.id),
        or(eq(order.status, "awaiting_acceptance"), and(inArray(order.status, ["in_progress", "revision_requested"]), lt(order.dueAt, new Date()))),
      );
  let cancelled = false;
  await db.transaction(async (tx) => {
    const moved = await tx.update(order).set({ status: "cancelled", refundAmount: o.price + o.managedFee }).where(where).returning({ id: order.id });
    if (!moved.length) return;
    cancelled = true;
    await tx.insert(orderEvent).values({
      id: newId("e_"),
      orderId,
      actorId: user.id,
      type: "cancelled",
      message: `أُلغي الطلب ورجع المبلغ كامل (${o.price + o.buyerFee + o.managedFee} ر.س) للعميل.`,
    });
  });
  if (cancelled) {
    await notify(o.sellerId, { title: "أُلغي الطلب", body: "رجع المبلغ للعميل.", href: `/orders/${orderId}` });
    if (isAdmin) await notify(o.buyerId, { title: "أُلغي طلبك ورجع المبلغ", href: `/orders/${orderId}` });
  }
  revalidatePath(`/orders/${orderId}`);
}

/* ───────────── Messages ───────────── */

export async function sendMessageAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isBuyer, isSeller, isAdmin } = await loadOrderFor(orderId);
  if (!o || !(isBuyer || isSeller || isAdmin)) return { error: "غير مصرح." };
  if (["completed", "cancelled"].includes(o.status)) return { error: "الطلب مغلق." };
  const message = msgSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: message.error.issues[0].message };
  await db.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "message", message: message.data });
  const others = [o.buyerId, o.sellerId].filter((id) => id !== user.id);
  for (const uid of others) await notify(uid, { title: isAdmin ? "رسالة من فريق متقن" : "رسالة جديدة في طلبك", body: message.data.slice(0, 200), href: `/orders/${orderId}` });
  return done(orderId);
}

/* ───────────── Review ───────────── */

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "اختر التقييم").max(5),
  comment: z.string().trim().max(1000).optional().default(""),
});

export async function submitReviewAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isBuyer } = await loadOrderFor(orderId);
  if (!o || !isBuyer || o.status !== "completed") return { error: "التقييم متاح بعد اكتمال الطلب." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const existing = await db.select({ id: review.id }).from(review).where(eq(review.orderId, orderId)).limit(1);
  if (existing.length) return { error: "قيّمت هذا الطلب مسبقاً." };
  await db.transaction(async (tx) => {
    await tx.insert(review).values({
      id: newId("r_"),
      orderId,
      serviceId: o.serviceId,
      sellerId: o.sellerId,
      buyerId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    const [agg] = await tx.select({ a: avg(review.rating), c: count() }).from(review).where(eq(review.serviceId, o.serviceId));
    await tx
      .update(service)
      .set({ ratingAvg: Number(agg.a ?? 0), ratingCount: Number(agg.c ?? 0) })
      .where(eq(service.id, o.serviceId));
  });
  await notify(o.sellerId, { title: "وصلك تقييم جديد", body: `${parsed.data.rating} من 5`, href: `/orders/${orderId}` });
  return done(orderId);
}
