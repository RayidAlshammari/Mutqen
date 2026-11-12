import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { ACCEPT_HOURS, AUTO_COMPLETE_DAYS } from "./constants";
import { newId } from "./id";
import { notify } from "./notify";

const { order, orderEvent } = schema;

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

/** The first sample is due after roughly a third of the delivery time (at least one day). */
export const sampleDays = (deliveryDays: number) => Math.max(1, Math.ceil(deliveryDays / 3));

export const acceptDeadline = (from = Date.now()) => new Date(from + ACCEPT_HOURS * HOUR);

/**
 * delivered → completed, then release the freelancer's earning.
 * Atomic: returns false (and writes nothing) if the order is no longer "delivered".
 */
export async function completeOrder(orderId: string, actorId: string | null, note: string) {
  const done = await db.transaction(async (tx) => {
    const [o] = await tx
      .update(order)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(order.id, orderId), eq(order.status, "delivered")))
      .returning({ sellerEarning: order.sellerEarning, sellerId: order.sellerId, buyerId: order.buyerId });
    if (!o) return null;
    const now = Date.now();
    await tx.insert(orderEvent).values([
      { id: newId("e_"), orderId, actorId, type: "completed", message: note, createdAt: new Date(now) },
      {
        id: newId("e_"),
        orderId,
        actorId: null,
        type: "payment_released",
        message: `تحوّل ${o.sellerEarning} ر.س للمستقل بعد خصم عمولة متقن.`,
        createdAt: new Date(now + 1),
      },
    ]);
    return o;
  });
  if (!done) return false;
  await notify(done.sellerId, { title: "اكتمل الطلب وتحوّل مبلغك", body: `تحوّل لك ${done.sellerEarning} ر.س.`, href: `/orders/${orderId}` });
  if (!actorId) await notify(done.buyerId, { title: "اكتمل طلبك تلقائياً", body: note, href: `/orders/${orderId}` });
  return true;
}

/** sample_review → in_progress (full work). Used by the client and by the timeout sweep. */
export async function approveSample(orderId: string, actorId: string | null, note: string) {
  const moved = await db.transaction(async (tx) => {
    const [o] = await tx
      .update(order)
      .set({ status: "in_progress", stage: "full" })
      .where(and(eq(order.id, orderId), eq(order.status, "sample_review")))
      .returning({ sellerId: order.sellerId });
    if (!o) return null;
    await tx.insert(orderEvent).values({ id: newId("e_"), orderId, actorId, type: "sample_approved", message: note });
    return o;
  });
  if (!moved) return false;
  await notify(moved.sellerId, { title: "اعتُمد اتجاه العيّنة", body: "كمّل الشغل كامل على نفس الاتجاه.", href: `/orders/${orderId}` });
  return true;
}

/** awaiting_acceptance → cancelled with a full refund (declined, or nobody answered in time). */
export async function refundUnaccepted(orderId: string, actorId: string | null, note: string) {
  const moved = await db.transaction(async (tx) => {
    const [o] = await tx
      .update(order)
      .set({ status: "cancelled" })
      .where(and(eq(order.id, orderId), eq(order.status, "awaiting_acceptance")))
      .returning({ buyerId: order.buyerId, price: order.price, managedFee: order.managedFee });
    if (!o) return null;
    await tx.insert(orderEvent).values({
      id: newId("e_"),
      orderId,
      actorId,
      type: "cancelled",
      message: `${note} رجع لك المبلغ كامل (${o.price + o.managedFee} ر.س).`,
    });
    return o;
  });
  if (!moved) return false;
  await notify(moved.buyerId, { title: "رجع لك مبلغ الطلب", body: note, href: `/orders/${orderId}` });
  return true;
}

let lastSweep = 0;

/**
 * Nobody's money or time may hang on someone who stopped answering. Runs lazily
 * (at most once a minute per server instance) whenever order data is read:
 *  - a freelancer who doesn't accept in time → full refund to the client
 *  - a sample left unreviewed → the direction is approved so work continues
 *  - a delivery left unreviewed → the order completes and the freelancer is paid
 * Disputed orders are never touched: their timers are paused until the admin decides.
 */
export async function sweepStaleOrders() {
  if (Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  const now = new Date();
  const cutoff = new Date(Date.now() - AUTO_COMPLETE_DAYS * DAY);

  const unaccepted = await db.select({ id: order.id }).from(order).where(and(eq(order.status, "awaiting_acceptance"), lt(order.acceptBy, now))).limit(100);
  for (const { id } of unaccepted) await refundUnaccepted(id, null, `المستقل ما قبل الطلب خلال ${ACCEPT_HOURS} ساعة.`);

  const samples = await db.select({ id: order.id }).from(order).where(and(eq(order.status, "sample_review"), lt(order.sampleDeliveredAt, cutoff))).limit(100);
  for (const { id } of samples) await approveSample(id, null, `اعتُمد اتجاه العيّنة تلقائياً لعدم وجود رد خلال ${AUTO_COMPLETE_DAYS} أيام.`);

  const delivered = await db.select({ id: order.id }).from(order).where(and(eq(order.status, "delivered"), lt(order.deliveredAt, cutoff))).limit(100);
  for (const { id } of delivered) await completeOrder(id, null, `اكتمل الطلب تلقائياً لعدم وجود رد خلال ${AUTO_COMPLETE_DAYS} أيام من التسليم.`);
}

/** @deprecated kept for existing imports */
export const autoCompleteStaleOrders = sweepStaleOrders;
