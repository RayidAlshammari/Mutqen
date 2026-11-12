import { NextResponse } from "next/server";
import { sweepStaleOrders } from "@/lib/order-lifecycle";

export const dynamic = "force-dynamic";

/**
 * Scheduled job (see vercel.json): refunds orders nobody accepted in time and auto-approves
 * samples and deliveries the client left unanswered. Vercel sends CRON_SECRET as a bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await sweepStaleOrders(true);
  return NextResponse.json({ ok: true });
}
