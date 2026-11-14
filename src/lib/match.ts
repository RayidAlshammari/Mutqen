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

export type Gender = "m" | "f";

/** Arabic verbs and pronouns that follow the freelancer's gender. */
export const g = (gender: Gender | null | undefined, m: string, f: string) => (gender === "f" ? f : m);

/**
 * Minimum bar to be recommended. A freelancer with a record must keep it; a new one may be
 * shown, marked as new, because every marketplace needs a way in for good newcomers.
 */
export const RECOMMEND_FLOOR = { onTimeRate: 0.8, rating: 4, minHits: 2, recordFrom: 2 };

export type Recommendation = {
  sellerId: string;
  sellerName: string;
  gender: Gender;
  headline: string;
  city: string | null;
  portfolio: PortfolioItem[];
  verificationScore: number | null;
  service: { id: string; title: string; packages: ServicePackage[]; aiTools: string[]; minPrice: number; minDeliveryDays: number };
  record: SellerRecord;
  reasons: string[];
  score: number;
};

const STOP = new Set([
  "في", "من", "على", "الى", "إلى", "عن", "مع", "او", "أو", "ابي", "أبي", "ابغى", "أبغى", "احتاج", "أحتاج", "لي", "عندي", "هذا", "هذي", "اللي", "وش", "كل", "بدون", "جاهزة", "جاهز", "واحد",
  // Words every request and every service share; they say nothing about fit.
  "محتوى", "خدمة", "طلب", "عمل", "شغل", "جديد", "جديدة", "احترافي", "احترافية", "سعودي", "سعودية", "عربي", "عربية", "عملاء", "عملاؤنا", "عملاؤه", "زيادة", "اقتراح", "متقن", "تعدله", "تقدر", "ادري", "أدري", "اقترحوا", "علي",
]);

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

export function recordLines(rec: SellerRecord, categoryLabel?: string, gender: Gender = "m"): string[] {
  const lines: string[] = [];
  const did = g(gender, "أنجز", "أنجزت");
  if (rec.similar > 0 && categoryLabel) lines.push(`${did} ${arCount(rec.similar, COUNT.orders)} في ${categoryLabel} على متقن`);
  else if (rec.completed > 0) lines.push(`${did} ${arCount(rec.completed, COUNT.orders)} على متقن`);
  if (rec.onTimeRate !== null && rec.completed >= 2) lines.push(`${g(gender, "سلّم", "سلّمت")} ${num(Math.round(rec.onTimeRate * 100))}٪ من ${g(gender, "طلباته", "طلباتها")} في الموعد`);
  if (rec.acceptHours !== null) {
    const accepts = g(gender, "يقبل", "تقبل");
    lines.push(rec.acceptHours < 1 ? `${accepts} الطلبات خلال أقل من ساعة` : `${accepts} الطلبات خلال ${arCount(Math.max(1, Math.round(rec.acceptHours)), COUNT.hours)} تقريباً`);
  }
  if (rec.repeatClients > 0) lines.push(`${arCount(rec.repeatClients, COUNT.clients)} رجعوا وطلبوا ${g(gender, "منه", "منها")} مرة ثانية`);
  return lines;
}

/** Passes the quality bar: no record yet, or a record that keeps its promises. */
export function meetsFloor(rec: SellerRecord) {
  if (rec.completed < RECOMMEND_FLOOR.recordFrom) return true;
  if (rec.onTimeRate !== null && rec.onTimeRate < RECOMMEND_FLOOR.onTimeRate) return false;
  if (rec.ratingCount > 0 && rec.rating < RECOMMEND_FLOOR.rating) return false;
  return true;
}

/**
 * Up to three freelancers Mutqen would pick for this brief. Only services that fit the request
 * and freelancers above the quality bar are shown: one strong match beats three padded ones.
 * Ranking uses fit first, then the record on the platform.
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
  // The client's own words only: generated deliverables share boilerplate with every service.
  const kws = keywordsOf([b.title, b.goal, ...(b.answers ?? []).map((a) => a.a)].join(" "));
  const categoryLabel = { content: "المحتوى", media: "الميديا", code: "البرمجة" }[b.category];

  const scored = pool.map(({ s, p }) => {
    const rec = records.get(s.sellerId)!;
    const hay = `${s.title} ${s.description} ${p.headline}`.toLowerCase();
    const hits = kws.filter((k) => hay.includes(k));
    const fit = Math.min(hits.length, 6) * 2;
    const proof = Math.log2(1 + rec.similar) * 2 + (rec.onTimeRate ?? 0.7) * 2 + (rec.ratingCount ? rec.rating - 3 : 1) + Math.min(rec.repeatClients, 3) * 0.5;
    const pinned = s.id === opts.pinServiceId ? 100 : 0;
    const gender: Gender = p.gender === "f" ? "f" : "m";
    const reasons: string[] = [];
    if (hits.length >= RECOMMEND_FLOOR.minHits) reasons.push(`${g(gender, "خدمته", "خدمتها")} «${s.title}» تغطي اللي طلبته`);
    reasons.push(...recordLines(rec, categoryLabel, gender));
    if (rec.completed === 0) reasons.push(`${g(gender, "جديد", "جديدة")} على متقن — ${g(gender, "اجتاز", "اجتازت")} الاختبار العملي${p.verificationScore ? ` بدرجة ${num(p.verificationScore)} من ١٠٠` : ""}`);
    return {
      sellerId: s.sellerId,
      sellerName: p.displayName,
      gender,
      hits: hits.length,
      pinned: pinned > 0,
      headline: p.headline,
      city: p.city,
      portfolio: p.portfolio ?? [],
      verificationScore: p.verificationScore,
      service: { id: s.id, title: s.title, packages: s.packages, aiTools: s.aiTools, minPrice: s.minPrice, minDeliveryDays: s.minDeliveryDays },
      record: rec,
      reasons: reasons.slice(0, 4),
      score: fit + proof + pinned,
    } satisfies Recommendation & { hits: number; pinned: boolean };
  });

  // Fit and quality bar. The client's own pick from a service page is always kept.
  const qualified = scored.filter((r) => r.pinned || (r.hits >= RECOMMEND_FLOOR.minHits && meetsFloor(r.record)));
  // Nothing fits well: show at most the single closest match that still passes the quality bar.
  const shortlist = qualified.length ? qualified : scored.filter((r) => r.hits >= 1 && meetsFloor(r.record)).sort((a, b2) => b2.score - a.score).slice(0, 1);

  // One service per freelancer: the client is choosing a person, not browsing a catalogue.
  const best = new Map<string, Recommendation>();
  for (const r of shortlist.sort((a, b2) => b2.score - a.score)) {
    if (best.has(r.sellerId)) continue;
    best.set(r.sellerId, { sellerId: r.sellerId, sellerName: r.sellerName, gender: r.gender, headline: r.headline, city: r.city, portfolio: r.portfolio, verificationScore: r.verificationScore, service: r.service, record: r.record, reasons: r.reasons, score: r.score });
  }
  return [...best.values()].slice(0, opts.limit ?? 3);
}
