"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, avg, count, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { StructuredBrief } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { computeFees } from "@/lib/constants";
import { newId } from "@/lib/id";
import { httpUrl } from "@/lib/validation";
import { completeOrder } from "@/lib/order-lifecycle";

const { order, orderEvent, service, review, sellerProfile } = schema;

export type ActionState = { error?: string; ok?: boolean } | undefined;

/* ───────────── Create order (simulated payment → escrow) ───────────── */

const createSchema = z.object({
  serviceId: z.string().min(1),
  tier: z.enum(["basic", "standard", "premium"]),
  brief: z.string().trim().min(15, "اكتب تفاصيل طلبك بشكل أوضح (15 حرف على الأقل)").max(4000),
  structuredBrief: z.string().optional(),
  paymentMethod: z.enum(["mada", "applepay", "card"]),
  agree: z.literal("on", { message: "لازم توافق على شروط الضمان المالي" }),
});

export async function createOrderAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { serviceId, tier, brief, paymentMethod } = parsed.data;

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

  let structured: StructuredBrief | null = null;
  if (parsed.data.structuredBrief) {
    try {
      structured = JSON.parse(parsed.data.structuredBrief) as StructuredBrief;
    } catch {
      structured = null;
    }
  }

  const fees = computeFees(pkg.price);
  const id = newId("o_");
  const paymentRef = `TEST-${paymentMethod.toUpperCase()}-${newId().slice(0, 8)}`;
  const due = new Date(Date.now() + pkg.deliveryDays * 24 * 3600 * 1000);

  await db.transaction(async (tx) => {
    await tx.insert(order).values({
      id,
      serviceId,
      buyerId: user.id,
      sellerId: row.s.sellerId,
      packageTier: pkg.tier,
      packageName: pkg.name,
      price: fees.price,
      buyerFee: fees.buyerFee,
      platformCommission: fees.platformCommission,
      sellerEarning: fees.sellerEarning,
      brief,
      structuredBrief: structured,
      status: "in_progress",
      paymentRef,
      revisionsLeft: pkg.revisions,
      dueAt: due,
    });
    await tx.insert(orderEvent).values([
      { id: newId("e_"), orderId: id, actorId: user.id, type: "created", message: brief },
      {
        id: newId("e_"),
        orderId: id,
        actorId: null,
        type: "payment_held",
        message: `تم حجز ${fees.total} ر.س لدى متقن (مرجع الدفع التجريبي ${paymentRef}). لن يُحوَّل المبلغ للمستقل إلا بعد موافقتك على التسليم.`,
      },
    ]);
    await tx.update(service).set({ ordersCount: sql`${service.ordersCount} + 1` }).where(eq(service.id, serviceId));
  });

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
const urlSchema = httpUrl().optional().or(z.literal(""));

/**
 * Moves an order between states atomically: the UPDATE only matches when the order is
 * still in one of the expected states, so double clicks or two tabs can't apply it twice.
 */
class StaleOrderError extends Error {}
const STALE = "حالة الطلب تغيّرت، حدّث الصفحة.";

/* ───────────── Seller delivers ───────────── */

export async function deliverOrderAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isSeller } = await loadOrderFor(orderId);
  if (!o || !isSeller) return { error: "غير مصرح." };
  const message = msgSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: message.error.issues[0].message };
  const url = urlSchema.safeParse(formData.get("url") ?? "");
  if (!url.success) return { error: url.error.issues[0].message };
  try {
    await db.transaction(async (tx) => {
      const moved = await tx
        .update(order)
        .set({ status: "delivered", deliveredAt: new Date() })
        .where(and(eq(order.id, orderId), inArray(order.status, ["in_progress", "revision_requested"])))
        .returning({ id: order.id });
      if (!moved.length) throw new StaleOrderError();
      await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "delivered", message: message.data, attachmentUrl: url.data || null });
    });
  } catch (e) {
    if (e instanceof StaleOrderError) return { error: "ما يمكن التسليم في هذي المرحلة." };
    throw e;
  }
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

/* ───────────── Buyer requests revision ───────────── */

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
        .set({ status: "revision_requested", revisionsLeft: sql`${order.revisionsLeft} - 1` })
        .where(and(eq(order.id, orderId), eq(order.status, "delivered"), gt(order.revisionsLeft, 0)))
        .returning({ id: order.id });
      if (!moved.length) throw new StaleOrderError();
      await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "revision_requested", message: message.data });
    });
  } catch (e) {
    if (e instanceof StaleOrderError) return { error: STALE };
    throw e;
  }
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

/* ───────────── Buyer accepts → funds released ───────────── */

export async function acceptOrderAction(orderId: string): Promise<void> {
  const { user, o, isBuyer } = await loadOrderFor(orderId);
  if (!o || !isBuyer) return;
  await completeOrder(orderId, user.id, "وافق العميل على التسليم.");
  revalidatePath(`/orders/${orderId}`);
}

/* ───────────── Cancel & refund ───────────── */

/**
 * Buyer: only when the order is still in progress and past its due date.
 * Admin: any order that is not finished yet (never a completed or already-cancelled one).
 */
export async function cancelOrderAction(orderId: string): Promise<void> {
  const { user, o, isBuyer, isAdmin } = await loadOrderFor(orderId);
  if (!o || !(isBuyer || isAdmin)) return;
  const where = isAdmin
    ? and(eq(order.id, orderId), inArray(order.status, ["in_progress", "delivered", "revision_requested"]))
    : and(eq(order.id, orderId), eq(order.buyerId, user.id), eq(order.status, "in_progress"), lt(order.dueAt, new Date()));
  try {
    await db.transaction(async (tx) => {
      const moved = await tx.update(order).set({ status: "cancelled" }).where(where).returning({ id: order.id });
      if (!moved.length) throw new StaleOrderError();
      await tx.insert(orderEvent).values({
        id: newId("e_"),
        orderId,
        actorId: user.id,
        type: "cancelled",
        message: `أُلغي الطلب وأُعيد المبلغ كاملاً (${o.price + o.buyerFee} ر.س) للعميل.`,
      });
    });
  } catch (e) {
    if (!(e instanceof StaleOrderError)) throw e;
  }
  revalidatePath(`/orders/${orderId}`);
}

/* ───────────── Messages ───────────── */

export async function sendMessageAction(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, o, isBuyer, isSeller } = await loadOrderFor(orderId);
  if (!o || !(isBuyer || isSeller)) return { error: "غير مصرح." };
  if (["completed", "cancelled"].includes(o.status)) return { error: "الطلب مغلق." };
  const message = msgSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: message.error.issues[0].message };
  await db.insert(orderEvent).values({ id: newId("e_"), orderId, actorId: user.id, type: "message", message: message.data });
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
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
    const [agg] = await tx
      .select({ a: avg(review.rating), c: count() })
      .from(review)
      .where(and(eq(review.serviceId, o.serviceId)));
    await tx
      .update(service)
      .set({ ratingAvg: Number(agg.a ?? 0), ratingCount: Number(agg.c ?? 0) })
      .where(eq(service.id, o.serviceId));
  });
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
