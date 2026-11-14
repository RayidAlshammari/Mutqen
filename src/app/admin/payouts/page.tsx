import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Badge, Card, Container, EmptyState, PageHeader } from "@/components/ui";
import { MarkPaidForm } from "@/components/admin-forms";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { formatDate, num, sar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "التحويلات المستحقة" };

export default async function AdminPayoutsPage() {
  await requireRole("admin", "/admin/payouts");
  const { order, sellerProfile, service } = schema;
  const due = await db
    .select({ id: order.id, earning: order.sellerEarning, completedAt: order.completedAt, title: service.title, p: sellerProfile })
    .from(order)
    .innerJoin(service, eq(service.id, order.serviceId))
    .innerJoin(sellerProfile, eq(sellerProfile.userId, order.sellerId))
    .where(and(eq(order.status, "completed"), eq(order.payoutStatus, "due")))
    .orderBy(desc(order.completedAt));
  const recent = await db
    .select({ id: order.id, earning: order.sellerEarning, paidOutAt: order.paidOutAt, ref: order.payoutRef, name: sellerProfile.displayName })
    .from(order)
    .innerJoin(sellerProfile, eq(sellerProfile.userId, order.sellerId))
    .where(eq(order.payoutStatus, "paid"))
    .orderBy(desc(order.paidOutAt))
    .limit(10);

  const bySeller = new Map<string, { p: (typeof due)[number]["p"]; rows: typeof due }>();
  for (const r of due) {
    const g = bySeller.get(r.p.userId) ?? { p: r.p, rows: [] };
    g.rows.push(r);
    bySeller.set(r.p.userId, g);
  }
  const total = due.reduce((a, r) => a + r.earning, 0);

  return (
    <Container className="max-w-4xl py-10">
      <PageHeader
        title="التحويلات المستحقة"
        subtitle={`طلبات اعتمدها العملاء ولم تُحوَّل بعد: ${sar(total)} لـ${num(bySeller.size)} مستقل. حوّل من حساب المنصة البنكي ثم سجّل التحويل هنا، فيوصل المستقل إشعار.`}
      />
      {bySeller.size === 0 ? (
        <EmptyState title="ما فيه مبالغ مستحقة" />
      ) : (
        <div className="space-y-4">
          {[...bySeller.values()].map(({ p, rows }) => {
            const sum = rows.reduce((a, r) => a + r.earning, 0);
            return (
              <Card key={p.userId} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/freelancers/${p.userId}`} className="text-lg font-bold hover:text-brand-700">{p.displayName}</Link>
                    <p className="mt-1 text-sm text-stone-600">
                      {p.payoutName ?? "—"} · <span className="ltr font-mono">{p.iban ?? "بدون آيبان"}</span>
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-brand-900">{sar(sum)}</p>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {rows.map((r) => (
                    <li key={r.id} className="flex justify-between gap-3">
                      <Link href={`/orders/${r.id}`} className="truncate hover:text-brand-700">{r.title}</Link>
                      <span className="shrink-0 text-stone-600">{sar(r.earning)} · اكتمل {r.completedAt ? formatDate(r.completedAt) : ""}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-sand-200 pt-4">
                  <MarkPaidForm sellerId={p.userId} total={sar(sum)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {recent.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-lg font-bold">آخر التحويلات</h2>
          <ul className="divide-y divide-sand-100 overflow-hidden rounded-2xl bg-white text-sm ring-1 ring-sand-200">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex-1 font-semibold">{r.name}</span>
                {r.ref && <Badge>{r.ref}</Badge>}
                <span>{sar(r.earning)}</span>
                <span className="w-24 text-left text-xs text-stone-500">{r.paidOutAt ? formatDate(r.paidOutAt) : ""}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}
