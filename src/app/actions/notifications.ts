"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { safeNextPath } from "@/lib/validation";

const { notification } = schema;

/** Opening a notification marks it read and takes the user to what it is about. */
export async function openNotificationAction(formData: FormData) {
  const user = await requireUser("/notifications");
  const id = String(formData.get("id") ?? "");
  const [n] = await db.select().from(notification).where(and(eq(notification.id, id), eq(notification.userId, user.id))).limit(1);
  if (!n) redirect("/notifications");
  if (!n.readAt) await db.update(notification).set({ readAt: new Date() }).where(eq(notification.id, id));
  revalidatePath("/", "layout");
  redirect(safeNextPath(n.href) ?? "/notifications");
}

export async function markAllReadAction() {
  const user = await requireUser("/notifications");
  await db.update(notification).set({ readAt: new Date() }).where(and(eq(notification.userId, user.id), isNull(notification.readAt)));
  revalidatePath("/", "layout");
}
