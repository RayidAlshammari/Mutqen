import "server-only";
import { and, asc, desc, eq, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import { autoCompleteStaleOrders } from "./order-lifecycle";
import type { Category, OrderStatus } from "@/db/schema";

const { service, sellerProfile, user, review, order, orderEvent } = schema;

export type ServiceFilters = {
  category?: Category;
  q?: string;
  maxPrice?: number;
  maxDays?: number;
  tool?: string;
  sort?: "popular" | "rating" | "price_asc" | "price_desc" | "newest";
};

const serviceCardFields = {
  id: service.id,
  title: service.title,
  category: service.category,
  aiTools: service.aiTools,
  minPrice: service.minPrice,
  minDeliveryDays: service.minDeliveryDays,
  ratingAvg: service.ratingAvg,
  ratingCount: service.ratingCount,
  ordersCount: service.ordersCount,
  sellerId: service.sellerId,
  sellerName: sellerProfile.displayName,
  sellerHeadline: sellerProfile.headline,
  sellerStatus: sellerProfile.status,
};

export type ServiceCardData = Awaited<ReturnType<typeof listServices>>[number];

export async function listServices(f: ServiceFilters = {}, limit = 60) {
  const where: SQL[] = [eq(service.active, true), eq(sellerProfile.status, "approved")];
  if (f.category) where.push(eq(service.category, f.category));
  if (f.maxPrice) where.push(lte(service.minPrice, f.maxPrice));
  if (f.maxDays) where.push(lte(service.minDeliveryDays, f.maxDays));
  if (f.tool) where.push(sql`${service.aiTools} @> ${JSON.stringify([f.tool])}::jsonb`);
  if (f.q) {
    const terms = f.q.trim().split(/\s+/).filter(Boolean).slice(0, 5);
    const ors = terms.flatMap((t) => [ilike(service.title, `%${t}%`), ilike(service.description, `%${t}%`), ilike(sellerProfile.headline, `%${t}%`)]);
    if (ors.length) where.push(or(...ors)!);
  }
  const order =
    f.sort === "rating"
      ? [desc(service.ratingAvg), desc(service.ratingCount)]
      : f.sort === "price_asc"
        ? [asc(service.minPrice)]
        : f.sort === "price_desc"
          ? [desc(service.minPrice)]
          : f.sort === "newest"
            ? [desc(service.createdAt)]
            : [desc(service.ordersCount), desc(service.ratingAvg)];
  return db
    .select(serviceCardFields)
    .from(service)
    .innerJoin(sellerProfile, eq(sellerProfile.userId, service.sellerId))
    .where(and(...where))
    .orderBy(...order)
    .limit(limit);
}

/** Rank services against free-text keywords from the AI brief assistant. */
export async function matchServices(category: Category, keywords: string[], limit = 4) {
  const pool = await listServices({ category }, 40);
  const kws = keywords.map((k) => k.toLowerCase()).filter((k) => k.length > 1);
  const scored = pool.map((s) => {
    const hay = `${s.title} ${s.sellerHeadline}`.toLowerCase();
    const hits = kws.reduce((n, k) => n + (hay.includes(k) ? 1 : 0), 0);
    return { s, score: hits * 3 + s.ratingAvg + Math.log10(1 + s.ordersCount) };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.s);
}

export async function getService(id: string) {
  const [row] = await db
    .select({ service, seller: sellerProfile })
    .from(service)
    .innerJoin(sellerProfile, eq(sellerProfile.userId, service.sellerId))
    .where(eq(service.id, id))
    .limit(1);
  if (!row) return null;
  const reviews = await db
    .select({ id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt, buyerName: user.name })
    .from(review)
    .innerJoin(user, eq(user.id, review.buyerId))
    .where(eq(review.serviceId, id))
    .orderBy(desc(review.createdAt))
    .limit(20);
  return { ...row, reviews };
}

export async function getSeller(userId: string) {
  const [profile] = await db.select().from(sellerProfile).where(eq(sellerProfile.userId, userId)).limit(1);
  if (!profile) return null;
  const services = await listServicesBySeller(userId, true);
  const reviews = await db
    .select({ id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt, buyerName: user.name, serviceTitle: service.title })
    .from(review)
    .innerJoin(user, eq(user.id, review.buyerId))
    .innerJoin(service, eq(service.id, review.serviceId))
    .where(eq(review.sellerId, userId))
    .orderBy(desc(review.createdAt))
    .limit(20);
  const [stats] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${order.status} = 'completed')`.mapWith(Number),
      onTime: sql<number>`count(*) filter (where ${order.status} = 'completed' and ${order.deliveredAt} <= ${order.dueAt})`.mapWith(Number),
    })
    .from(order)
    .where(eq(order.sellerId, userId));
  const ratingAvg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return { profile, services, reviews, ratingAvg, completed: stats?.completed ?? 0, onTime: stats?.onTime ?? 0 };
}

export async function listServicesBySeller(sellerId: string, activeOnly = false) {
  const where = activeOnly ? and(eq(service.sellerId, sellerId), eq(service.active, true)) : eq(service.sellerId, sellerId);
  return db.select().from(service).where(where).orderBy(desc(service.createdAt));
}

export async function getSellerProfile(userId: string) {
  const [p] = await db.select().from(sellerProfile).where(eq(sellerProfile.userId, userId)).limit(1);
  return p ?? null;
}

export async function listOrdersForUser(userId: string, as: "buyer" | "seller") {
  await autoCompleteStaleOrders();
  const counterpart = as === "buyer" ? order.sellerId : order.buyerId;
  return db
    .select({
      id: order.id,
      status: order.status,
      heldForReview: order.heldForReview,
      price: order.price,
      buyerFee: order.buyerFee,
      sellerEarning: order.sellerEarning,
      packageName: order.packageName,
      dueAt: order.dueAt,
      createdAt: order.createdAt,
      serviceTitle: service.title,
      category: service.category,
      counterpartName: user.name,
    })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .innerJoin(user, eq(user.id, counterpart))
    .where(eq(as === "buyer" ? order.buyerId : order.sellerId, userId))
    .orderBy(desc(order.createdAt));
}

export async function getOrder(id: string) {
  await autoCompleteStaleOrders();
  const [o] = await db
    .select({ order, serviceTitle: service.title, category: service.category })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .where(eq(order.id, id))
    .limit(1);
  if (!o) return null;
  const people = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, [o.order.buyerId, o.order.sellerId]));
  const events = await db
    .select({ e: orderEvent, actorName: user.name })
    .from(orderEvent)
    .leftJoin(user, eq(user.id, orderEvent.actorId))
    .where(eq(orderEvent.orderId, id))
    .orderBy(asc(orderEvent.createdAt));
  const [rev] = await db.select().from(review).where(eq(review.orderId, id)).limit(1);
  const name = (uid: string) => people.find((p) => p.id === uid)?.name ?? "";
  return {
    ...o,
    buyerName: name(o.order.buyerId),
    sellerName: name(o.order.sellerId),
    events,
    review: rev ?? null,
  };
}

export async function platformStats() {
  await autoCompleteStaleOrders();
  const [o] = await db
    .select({
      orders: sql<number>`count(*)`.mapWith(Number),
      completed: sql<number>`count(*) filter (where ${order.status} = 'completed')`.mapWith(Number),
      gmv: sql<number>`coalesce(sum(${order.price}) filter (where ${order.status} <> 'cancelled'), 0)`.mapWith(Number),
      completedGmv: sql<number>`coalesce(sum(${order.price}) filter (where ${order.status} = 'completed'), 0)`.mapWith(Number),
      revenue: sql<number>`coalesce(sum(${order.buyerFee} + ${order.platformCommission} + ${order.managedFee}) filter (where ${order.status} = 'completed'), 0)`.mapWith(Number),
      escrow: sql<number>`coalesce(sum(${order.price} + ${order.buyerFee} + ${order.managedFee}) filter (where ${order.status} not in ('completed','cancelled')), 0)`.mapWith(Number),
      repeatBuyers: sql<number>`(select count(*) from (select buyer_id from "order" group by buyer_id having count(*) > 1) t)`.mapWith(Number),
      buyers: sql<number>`count(distinct ${order.buyerId})`.mapWith(Number),
    })
    .from(order);
  const [u] = await db
    .select({
      users: sql<number>`count(*)`.mapWith(Number),
      sellers: sql<number>`count(*) filter (where ${user.role} = 'seller')`.mapWith(Number),
    })
    .from(user);
  const [sp] = await db
    .select({
      approved: sql<number>`count(*) filter (where ${sellerProfile.status} = 'approved')`.mapWith(Number),
      pending: sql<number>`count(*) filter (where ${sellerProfile.status} = 'pending')`.mapWith(Number),
    })
    .from(sellerProfile);
  const [w] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(schema.waitlist);
  const [rv] = await db.select({ avg: sql<number>`coalesce(avg(${review.rating}), 0)`.mapWith(Number) }).from(review);
  return { ...o, ...u, ...sp, waitlist: w.n, avgRating: rv.avg };
}

export async function pendingSellers() {
  return db
    .select({ profile: sellerProfile, email: user.email })
    .from(sellerProfile)
    .innerJoin(user, eq(user.id, sellerProfile.userId))
    .where(eq(sellerProfile.status, "pending"))
    .orderBy(asc(sellerProfile.createdAt));
}

export async function recentOrdersAdmin(limit = 15) {
  return db
    .select({
      id: order.id,
      status: order.status,
      heldForReview: order.heldForReview,
      price: order.price,
      revenue: sql<number>`${order.buyerFee} + ${order.platformCommission}`.mapWith(Number),
      createdAt: order.createdAt,
      serviceTitle: service.title,
    })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .orderBy(desc(order.createdAt))
    .limit(limit);
}

export async function categoryCounts() {
  const rows = await db
    .select({ category: service.category, n: sql<number>`count(*)`.mapWith(Number) })
    .from(service)
    .innerJoin(sellerProfile, eq(sellerProfile.userId, service.sellerId))
    .where(and(eq(service.active, true), eq(sellerProfile.status, "approved")))
    .groupBy(service.category);
  return Object.fromEntries(rows.map((r) => [r.category, r.n])) as Partial<Record<Category, number>>;
}


export async function listAllOrders(status?: string, limit = 200) {
  await autoCompleteStaleOrders();
  const buyer = alias(user, "buyer");
  const seller = alias(user, "seller");
  return db
    .select({
      id: order.id,
      status: order.status,
      heldForReview: order.heldForReview,
      price: order.price,
      revenue: sql<number>`${order.buyerFee} + ${order.platformCommission}`.mapWith(Number),
      dueAt: order.dueAt,
      createdAt: order.createdAt,
      serviceTitle: service.title,
      category: service.category,
      buyerName: buyer.name,
      sellerName: seller.name,
    })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .innerJoin(buyer, eq(buyer.id, order.buyerId))
    .innerJoin(seller, eq(seller.id, order.sellerId))
    .where(status ? eq(order.status, status as OrderStatus) : undefined)
    .orderBy(desc(order.createdAt))
    .limit(limit);
}

export async function orderStatusCounts() {
  const rows = await db.select({ status: order.status, n: sql<number>`count(*)`.mapWith(Number) }).from(order).groupBy(order.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}

export async function getBillingProfile(userId: string) {
  const [b] = await db.select().from(schema.billingProfile).where(eq(schema.billingProfile.userId, userId)).limit(1);
  return b ?? null;
}

export async function recentWaitlist(limit = 20) {
  return db.select().from(schema.waitlist).orderBy(desc(schema.waitlist.createdAt)).limit(limit);
}

/** Orders past their deadline that are still with the freelancer. */
export async function lateOrders(limit = 10) {
  return db
    .select({ id: order.id, status: order.status, dueAt: order.dueAt, serviceTitle: service.title, sellerName: user.name })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .innerJoin(user, eq(user.id, order.sellerId))
    .where(and(inArray(order.status, ["in_progress", "revision_requested"]), sql`${order.dueAt} < now()`))
    .orderBy(asc(order.dueAt))
    .limit(limit);
}

export async function disputedOrders() {
  return db
    .select({ id: order.id, price: order.price, reason: order.disputeReason, serviceTitle: service.title, buyerName: user.name, createdAt: order.createdAt })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .innerJoin(user, eq(user.id, order.buyerId))
    .where(eq(order.status, "disputed"))
    .orderBy(asc(order.createdAt));
}

export async function managedRequests() {
  const { managedRequest, brief } = schema;
  return db
    .select({ m: managedRequest, brief, buyerName: user.name })
    .from(managedRequest)
    .innerJoin(brief, eq(brief.id, managedRequest.briefId))
    .innerJoin(user, eq(user.id, managedRequest.buyerId))
    .where(inArray(managedRequest.status, ["new", "offered"]))
    .orderBy(asc(managedRequest.createdAt));
}

export async function approvedSellers() {
  return db
    .select({ profile: sellerProfile, email: user.email })
    .from(sellerProfile)
    .innerJoin(user, eq(user.id, sellerProfile.userId))
    .where(eq(sellerProfile.status, "approved"))
    .orderBy(desc(sellerProfile.reviewedAt));
}

/** Brief → order funnel, plus the two money/quality queues the admin works every day. */
export async function funnelStats() {
  const { brief } = schema;
  const [b] = await db
    .select({
      started: sql<number>`count(*)`.mapWith(Number),
      ready: sql<number>`count(*) filter (where ${brief.structured} is not null)`.mapWith(Number),
    })
    .from(brief);
  const [o] = await db
    .select({
      ordered: sql<number>`count(distinct ${order.briefId}) filter (where ${order.briefId} is not null)`.mapWith(Number),
      repeatBuyers: sql<number>`(select count(*) from (select buyer_id from "order" where status <> 'cancelled' group by buyer_id having count(*) > 1) t)`.mapWith(Number),
      payoutsDue: sql<number>`count(distinct ${order.sellerId}) filter (where ${order.status} = 'completed' and ${order.payoutStatus} = 'due')`.mapWith(Number),
      heldForReview: sql<number>`count(*) filter (where ${order.heldForReview} and ${order.status} in ('sample_review','delivered'))`.mapWith(Number),
    })
    .from(order);
  return { ...b, ...o };
}

export async function heldOrders() {
  return db
    .select({ id: order.id, status: order.status, serviceTitle: service.title, sellerName: user.name, at: sql<Date>`coalesce(${order.deliveredAt}, ${order.sampleDeliveredAt})` })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .innerJoin(user, eq(user.id, order.sellerId))
    .where(and(eq(order.heldForReview, true), inArray(order.status, ["sample_review", "delivered"])));
}
