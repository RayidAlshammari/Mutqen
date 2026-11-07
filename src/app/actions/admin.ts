"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

/** Approve or reject a freelancer. Only profiles waiting for review can be decided. */
export async function reviewSellerAction(userId: string, decision: "approved" | "rejected") {
  await requireRole("admin", "/admin");
  await db
    .update(schema.sellerProfile)
    .set({ status: decision, reviewedAt: new Date() })
    .where(and(eq(schema.sellerProfile.userId, userId), eq(schema.sellerProfile.status, "pending")));
  revalidatePath("/admin");
}
