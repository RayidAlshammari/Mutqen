import { desc, eq } from "drizzle-orm";
import { Container, EmptyState, PageHeader } from "@/components/ui";
import { markAllReadAction, openNotificationAction } from "@/app/actions/notifications";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { emailEnabled } from "@/lib/notify";
import { cn, relativeTime } from "@/lib/utils";

export const metadata = { title: "الإشعارات" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const rows = await db.select().from(schema.notification).where(eq(schema.notification.userId, user.id)).orderBy(desc(schema.notification.createdAt)).limit(60);
  const unread = rows.some((r) => !r.readAt);
  return (
    <Container className="max-w-2xl py-10">
      <PageHeader
        title="الإشعارات"
        subtitle={emailEnabled() ? `نرسل لك نسخة من كل إشعار على ${user.email}.` : "كل ما يخص طلباتك يوصلك هنا."}
        actions={
          unread && (
            <form action={markAllReadAction}>
              <button className="text-sm font-semibold text-brand-700 hover:underline">علّم الكل كمقروء</button>
            </form>
          )
        }
      />
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id}>
              <form action={openNotificationAction}>
                <input type="hidden" name="id" value={n.id} />
                <button className={cn("flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-right ring-1 transition hover:ring-brand-300", n.readAt ? "bg-white ring-sand-200" : "bg-brand-50 ring-brand-200")}>
                  <span>
                    <span className="flex items-center gap-2 font-bold text-brand-950">
                      {!n.readAt && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="جديد" />}
                      {n.title}
                    </span>
                    {n.body && <span className="mt-1 block text-sm leading-6 text-stone-600">{n.body}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">{relativeTime(n.createdAt)}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="ما عندك إشعارات" text="أول ما يصير شي في طلباتك، بتلقاه هنا." />
      )}
    </Container>
  );
}
