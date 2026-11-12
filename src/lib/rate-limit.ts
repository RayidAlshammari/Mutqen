import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Fixed-window limiter stored in Postgres, so it holds across serverless instances.
 * One atomic upsert per call: resets the window when it has expired, otherwise increments.
 */
export async function hit(key: string, limit: number, windowSeconds: number) {
  const window = sql.raw(`interval '${Math.floor(windowSeconds)} seconds'`);
  const rows = (await db.execute(sql`
    insert into rate_limit (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limit.window_start < now() - ${window} then 1 else rate_limit.count + 1 end,
      window_start = case when rate_limit.window_start < now() - ${window} then now() else rate_limit.window_start end
    returning count
  `)) as unknown as { count: number }[] | { rows: { count: number }[] };
  const list = Array.isArray(rows) ? rows : rows.rows;
  const count = Number(list[0]?.count ?? 0);
  return { ok: count <= limit, count };
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export const LIMITS = {
  assistantAnon: { limit: 24, window: 3600 }, // per IP per hour; a brief takes two calls and offices share one IP
  assistantUser: { limit: 30, window: 3600 }, // per account per hour
  verification: { limit: 3, window: 3600 }, // AI grading attempts per seller per hour
  waitlist: { limit: 10, window: 3600 }, // per IP per hour
  orders: { limit: 10, window: 3600 }, // new orders per account per hour
};
