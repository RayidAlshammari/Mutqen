import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Category, PortfolioItem, ServicePackage, StructuredBrief } from "@/db/schema";
import { arCount, COUNT, num } from "./utils";

const { service, sellerProfile, order, review } = schema;

export type SellerRecord = {
  completed: number;
  similar: number;
  onTimeRate: number | null;
  acceptHours: number | null;
  rating: number;
  ratingCount: number;
  repeatClients: number;
};

export type Recommendation = {
  sellerId: string;
  sellerName: string;
  headline: string;
  city: string | null;
  portfolio: PortfolioItem[];
  verificationScore: number | null;
  service: { id: string; title: string; packages: ServicePackage[]; aiTools: string[]; minPrice: number; minDeliveryDays: number };
  record: SellerRecord;
  reasons: string[];
  score: number;
};

const STOP = new Set(["في", "من", "على", "الى", "إلى", "عن", "مع", "او", "أو", "ابي", "أبي", "ابغى", "أبغى", "احتاج", "أحتاج", "لي", "عندي", "هذا", "هذي", "اللي", "وش", "كل", "بدون", "جاهزة", "جاهز", "واحد"]);

export function keywordsOf(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^؀-ۿa-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^(وال|بال|لل|ال)/, ""))
    .filter((w) => w.length > 2 && !STOP.has(w));
  return [...new Set(words)].slice(0, 30);
}

/** What the freelancer has actually done on Mutqen. Self-declared claims are never used here. */
export async function sellerRecords(sellerIds: string[], category?: Category): Promise<Map<string, SellerRecord>> {
  const out = new Map<string, SellerRecord>();
  if (!sellerIds.length) return out;
  const cat = category ?? "content";
  const rows = await db
    .select({
      sellerId: order.sellerId,
      completed: sql<number>`count(*) filter (where ${order.status} = 'completed')`.mapWith(Number),
      similar: sql<number>`count(*) filter (where ${order.status} = 'completed' and ${service.category} = ${cat})`.mapWith(Number),
      measured: sql<number>`count(*) filter (where ${order.status} = 'completed' and ${order.dueAt} is not null and ${order.deliveredAt} is not null)`.mapWith(Number),
      onTime: sql<number>`count(*) filter (where ${order.status} = 'completed' and ${order.deliveredAt} <= ${order.dueAt})`.mapWith(Number),
      acceptHours: sql<number | null>`avg(extract(epoch from (${order.acceptedAt} - ${order.createdAt})) / 3600) filter (where ${order.acceptedAt} is not null)`,
      repeatClients: sql<number>`(select count(*) from (select 1 from "order" o2 where o2.seller_id = ${order.sellerId} and o2.status = 'completed' group by o2.buyer_id having count(*) > 1) t)`.mapWith(Number),
    })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .where(inArray(order.sellerId, sellerIds))
    .groupBy(order.sellerId);
  const ratings = await db
    .select({ sellerId: review.sellerId, avg: sql<number>`avg(${review.rating})`.mapWith(Number), n: sql<number>`count(*)`.mapWith(Number) })
    .from(review)
    .where(inArray(review.sellerId, sellerIds))
    .groupBy(review.sellerId);
  for (const id of sellerIds) {
    const r = rows.find((x) => x.sellerId === id);
    const rt = ratings.find((x) => x.sellerId === id);
    out.set(id, {
      completed: r?.completed ?? 0,
      similar: category ? (r?.similar ?? 0) : 0,
      onTimeRate: r && r.measured > 0 ? r.onTime / r.measured : null,
      acceptHours: r?.acceptHours == null ? null : Number(r.acceptHours),
      rating: rt?.avg ?? 0,
      ratingCount: rt?.n ?? 0,
      repeatClients: r?.repeatClients ?? 0,
    });
  }
  return out;
}

export function recordLines(rec: SellerRecord, categoryLabel?: string): string[] {
  const lines: string[] = [];
  if (rec.similar > 0 && categoryLabel) lines.push(`أنجز ${arCount(rec.similar, COUNT.orders)} في ${categoryLabel} على متقن`);
  else if (rec.completed > 0) lines.push(`أنجز ${arCount(rec.completed, COUNT.orders)} على متقن`);
  if (rec.onTimeRate !== null && rec.completed >= 2) lines.push(`سلّم ${num(Math.round(rec.onTimeRate * 100))}٪ من طلباته في الموعد`);
  if (rec.acceptHours !== null) lines.push(rec.acceptHours < 1 ? "يقبل الطلبات خلال أقل من ساعة" : `يقبل الطلبات خلال ${arCount(Math.max(1, Math.round(rec.acceptHours)), COUNT.hours)} تقريباً`);
  if (rec.repeatClients > 0) lines.push(`${arCount(rec.repeatClients, COUNT.clients)} رجعوا وطلبوا منه مرة ثانية`);
  return lines;
}

/**
 * The three freelancers Mutqen would pick for this brief. Ranking uses how well the service
 * fits the request and what the freelancer has delivered on the platform, in that order.
 */
export async function recommendFor(b: StructuredBrief, opts: { excludeUserId?: string; pinServiceId?: string | null; limit?: number } = {}): Promise<Recommendation[]> {
  const rows = await db
    .select({ s: service, p: sellerProfile })
    .from(service)
    .innerJoin(sellerProfile, eq(sellerProfile.userId, service.sellerId))
    .where(and(eq(service.active, true), eq(sellerProfile.status, "approved"), eq(service.category, b.category)));
  const pool = rows.filter((r) => r.s.sellerId !== opts.excludeUserId);
  if (!pool.length) return [];
  const records = await sellerRecords([...new Set(pool.map((r) => r.s.sellerId))], b.category);
  const kws = keywordsOf([b.title, b.goal, ...(b.deliverables ?? []), ...(b.answers ?? []).map((a) => a.a)].join(" "));
  const categoryLabel = { content: "المحتوى", media: "الميديا", code: "البرمجة" }[b.category];

  const scored = pool.map(({ s, p }) => {
    const rec = records.get(s.sellerId)!;
    const hay = `${s.title} ${s.description} ${p.headline}`.toLowerCase();
    const hits = kws.filter((k) => hay.includes(k));
    const fit = Math.min(hits.length, 6) * 2;
    const proof = Math.log2(1 + rec.similar) * 2 + (rec.onTimeRate ?? 0.7) * 2 + (rec.ratingCount ? rec.rating - 3 : 1) + Math.min(rec.repeatClients, 3) * 0.5;
    const pinned = s.id === opts.pinServiceId ? 100 : 0;
    const reasons: string[] = [];
    if (hits.length >= 2) reasons.push(`خدمته «${s.title}» تغطي اللي طلبته`);
    reasons.push(...recordLines(rec, categoryLabel));
    if (rec.completed === 0) reasons.push(`جديد على متقن — اجتاز الاختبار العملي${p.verificationScore ? ` بدرجة ${num(p.verificationScore)} من ١٠٠` : ""}`);
    return {
      sellerId: s.sellerId,
      sellerName: p.displayName,
      headline: p.headline,
      city: p.city,
      portfolio: p.portfolio ?? [],
      verificationScore: p.verificationScore,
      service: { id: s.id, title: s.title, packages: s.packages, aiTools: s.aiTools, minPrice: s.minPrice, minDeliveryDays: s.minDeliveryDays },
      record: rec,
      reasons: reasons.slice(0, 4),
      score: fit + proof + pinned,
    } satisfies Recommendation;
  });

  // One service per freelancer: the client is choosing a person, not browsing a catalogue.
  const best = new Map<string, Recommendation>();
  for (const r of scored.sort((a, b2) => b2.score - a.score)) if (!best.has(r.sellerId)) best.set(r.sellerId, r);
  return [...best.values()].slice(0, opts.limit ?? 3);
}
