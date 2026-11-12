import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId } from "./id";
import { getCurrentUser, type CurrentUser } from "./session";

const COOKIE = "mq_brief";

/** Visitors build a brief before they have an account; a cookie ties the draft to their browser. */
export async function readBriefKey() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only callable from a Server Action or Route Handler (it may set the cookie). */
export async function ensureBriefKey() {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;
  const key = newId("k_") + newId("");
  jar.set(COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return key;
}

export type BriefRow = typeof schema.brief.$inferSelect;

/**
 * Loads a brief only for its owner: the signed-in account, or the browser that created it.
 * A draft made before signing up is attached to the account the first time it is opened signed in.
 */
export async function loadOwnBrief(id: string): Promise<{ brief: BriefRow; user: CurrentUser | null } | null> {
  const [b] = await db.select().from(schema.brief).where(eq(schema.brief.id, id)).limit(1);
  if (!b) return null;
  const user = await getCurrentUser();
  if (b.ownerId) return user && (user.id === b.ownerId || user.role === "admin") ? { brief: b, user } : null;
  const key = await readBriefKey();
  if (!key || key !== b.ownerKey) return user?.role === "admin" ? { brief: b, user } : null;
  if (user && user.role !== "admin") {
    await db.update(schema.brief).set({ ownerId: user.id }).where(eq(schema.brief.id, id));
    return { brief: { ...b, ownerId: user.id }, user };
  }
  return { brief: b, user };
}
