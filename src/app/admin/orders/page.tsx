import Link from "next/link";
import { Container, PageHeader, Badge, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/session";
import { listAllOrders, orderStatusCounts } from "@/lib/queries";
import { CATEGORIES, ORDER_STATUS } from "@/lib/constants";
import { num, relativeTime, sar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "كل الطلبات" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("admin", "/admin/orders");
  const { status } = await searchParams;
  const valid = status && status in ORDER_STATUS ? status : undefined;
  const [rows, counts] = await Promise.all([listAllOrders(valid), orderStatusCounts()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Container className="py-10">
      <PageHeader title="كل الطلبات" subtitle="كل طلبات المنصة، مع حالة كل طلب والإيراد منه." />
      <div className="mb-5 flex flex-wrap gap-2">
        <Pill href="/admin/orders" active={!valid}>الكل ({num(total)})</Pill>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <Pill key={k} href={`/admin/orders?status=${k}`} active={valid === k}>
            {v.label.split(" — ")[0]} ({num(counts[k] ?? 0)})
          </Pill>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="ما فيه طلبات بهذي الحالة" />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-sand-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-sand-100 text-right text-stone-600">
              <tr>
                <th className="p-3 font-semibold">الخدمة</th>
                <th className="p-3 font-semibold">العميل</th>
                <th className="p-3 font-semibold">المستقل</th>
                <th className="p-3 font-semibold">الحالة</th>
                <th className="p-3 font-semibold">القيمة</th>
                <th className="p-3 font-semibold">إيراد المنصة</th>
                <th className="p-3 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {rows.map((o) => {
                const late = (o.status === "in_progress" || o.status === "revision_requested") && o.dueAt != null && o.dueAt.getTime() < Date.now();
                return (
                  <tr key={o.id} className="hover:bg-sand-50">
                    <td className="p-3">
                      <Link href={`/orders/${o.id}`} className="font-semibold hover:text-brand-700">
                        {CATEGORIES[o.category].icon} {o.serviceTitle}
                      </Link>
                    </td>
                    <td className="p-3">{o.buyerName}</td>
                    <td className="p-3">{o.sellerName}</td>
                    <td className="p-3">
                      <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label.split(" — ")[0]}</Badge>
                      {late && <Badge tone="red" className="mr-1">متأخر</Badge>}
                    </td>
                    <td className="p-3">{sar(o.price)}</td>
                    <td className="p-3 text-brand-700">{sar(o.revenue)}</td>
                    <td className="p-3 text-xs text-stone-500">{relativeTime(o.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${active ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-sand-300 hover:bg-sand-100"}`}>
      {children}
    </Link>
  );
}
