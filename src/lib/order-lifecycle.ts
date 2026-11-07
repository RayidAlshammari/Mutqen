import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { AUTO_COMPLETE_DAYS } from "./constants";
import { newId } from "./id";

const { order, orderEvent } = schema;

/**
 * delivered → completed, then release the freelancer's earning.
 * Atomic: returns false (and writes nothing) if the order is no longer "delivered".
 */
export async function completeOrder(orderId: string, actorId: string | null, note: string) {
  return db.transaction(async (tx) => {
    const [o] = await tx
      .update(order)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(order.id, orderId), eq(order.status, "delivered")))
      .returning({ sellerEarning: order.sellerEarning });
    if (!o) return false;
    const now = Date.now();
    await tx.insert(orderEvent).values([
      { id: newId("e_"), orderId, actorId, type: "completed", message: note, createdAt: new Date(now) },
      {
        id: newId("e_"),
        orderId,
        actorId: null,
        type: "payment_released",
        message: `تم تحويل ${o.sellerEarning} ر.س لمحفظة المستقل بعد خصم عمولة المنصة.`,
        createdAt: new Date(now + 1),
      },
    ]);
    return true;
  });
}

let lastSweep = 0;

/**
 * Buyers who never respond must not freeze a freelancer's money: deliveries left
 * unreviewed for AUTO_COMPLETE_DAYS are completed automatically. Runs lazily (at most
 * once a minute per server instance) whenever order data is read.
 */
export async function autoCompleteStaleOrders() {
  if (Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  const cutoff = new Date(Date.now() - AUTO_COMPLETE_DAYS * 24 * 3600 * 1000);
  const stale = await db
    .select({ id: order.id })
    .from(order)
    .where(and(eq(order.status, "delivered"), lt(order.deliveredAt, cutoff)))
    .limit(100);
  for (const { id } of stale) {
    await completeOrder(id, null, `اكتمل الطلب تلقائياً لعدم وجود رد من العميل خلال ${AUTO_COMPLETE_DAYS} أيام من التسليم.`);
  }
}
