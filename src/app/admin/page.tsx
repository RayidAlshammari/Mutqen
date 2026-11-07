import Link from "next/link";
import { Container, PageHeader, Stat, Card, Badge, Button, ToolChip, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/session";
import { platformStats, pendingSellers, recentOrdersAdmin, recentWaitlist } from "@/lib/queries";
import { reviewSellerAction } from "@/app/actions/admin";
import { CATEGORIES, ORDER_STATUS } from "@/lib/constants";
import { aiConfigured } from "@/lib/ai";
import { num, relativeTime, sar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة الإدارة" };

export default async function AdminPage() {
  await requireRole("admin", "/admin");
  const [s, pending, orders, waitlist] = await Promise.all([platformStats(), pendingSellers(), recentOrdersAdmin(), recentWaitlist()]);
  const takeRate = s.gmv ? (s.revenue / s.gmv) * 100 : 0;
  const repeat = s.buyers ? (s.repeatBuyers / s.buyers) * 100 : 0;

  return (
    <Container className="py-10">
      <PageHeader title="لوحة الإدارة" subtitle="مؤشرات المنصة ومراجعة المستقلين" actions={<Badge tone={aiConfigured() ? "green" : "gray"}>{aiConfigured() ? "الذكاء الاصطناعي متصل" : "الذكاء الاصطناعي: وضع بدون اتصال"}</Badge>} />

      <h2 className="mb-3 font-bold text-stone-700">الطلبات والإيراد</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="إجمالي قيمة الطلبات (GMV)" value={sar(s.gmv)} />
        <Stat label="إيراد المنصة (طلبات مكتملة)" value={sar(s.revenue)} hint={`Take rate فعلي ≈ ${num(Math.round(takeRate))}٪`} />
        <Stat label="مبالغ محجوزة (Escrow)" value={sar(s.escrow)} />
        <Stat label="الطلبات" value={`${num(s.completed)} / ${num(s.orders)}`} hint="مكتملة / الكل" />
      </div>
      <h2 className="mb-3 mt-8 font-bold text-stone-700">العرض والطلب</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="مستقلون موثقون" value={num(s.approved)} hint={`${num(s.pending)} بانتظار المراجعة`} />
        <Stat label="المستخدمون" value={num(s.users)} />
        <Stat label="العملاء المتكررون" value={`${num(Math.round(repeat))}٪`} hint="عملاء طلبوا أكثر من مرة" />
        <Stat label="قائمة الانتظار" value={num(s.waitlist)} hint={`متوسط التقييم ${s.avgRating ? s.avgRating.toFixed(1) : "—"}`} />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold">مستقلون بانتظار المراجعة ({num(pending.length)})</h2>
      {pending.length === 0 ? (
        <EmptyState title="ما فيه طلبات توثيق حالياً" />
      ) : (
        <div className="space-y-4">
          {pending.map(({ profile: p, email }) => (
            <Card key={p.userId} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold">{p.displayName}</p>
                  <p className="text-sm text-stone-600">{p.headline} · <span className="ltr">{email}</span></p>
                  <div className="mt-2 flex flex-wrap gap-1">{p.aiTools.map((t) => <ToolChip key={t} name={t} />)}</div>
                </div>
                <div className="text-left">
                  <p className="text-3xl font-bold text-brand-800">{num(p.verificationScore ?? 0)}<span className="text-base text-stone-400">/100</span></p>
                  <p className="text-xs text-stone-500">تقييم آلي · {p.verificationCategory && CATEGORIES[p.verificationCategory as keyof typeof CATEGORIES].label}</p>
                </div>
              </div>
              <details className="mt-4 rounded-xl bg-sand-50 p-4 ring-1 ring-sand-200">
                <summary className="cursor-pointer text-sm font-semibold">إجابة مهمة التحقق</summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-700">{p.verificationAnswer}</p>
                {p.verificationFeedback && <p className="mt-3 rounded-lg bg-white p-3 text-sm text-brand-900 ring-1 ring-sand-200">ملاحظة المقيّم الآلي: {p.verificationFeedback}</p>}
              </details>
              <div className="mt-4 flex gap-2">
                <form action={reviewSellerAction.bind(null, p.userId, "approved")}><Button size="sm">✓ وثّق</Button></form>
                <form action={reviewSellerAction.bind(null, p.userId, "rejected")}><Button size="sm" variant="secondary">رفض</Button></form>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 className="text-lg font-bold">أحدث الطلبات</h2>
        <Link href="/admin/orders" className="text-sm font-semibold text-brand-700 hover:underline">كل الطلبات ←</Link>
      </div>
      <ul className="divide-y divide-sand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-sand-200">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-3 p-4 text-sm hover:bg-sand-50">
              <span className="min-w-0 flex-1 truncate font-semibold">{o.serviceTitle}</span>
              <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
              <span className="w-24 text-left">{sar(o.price)}</span>
              <span className="w-24 text-left text-brand-700">+{sar(o.revenue)}</span>
              <span className="w-20 text-left text-xs text-stone-400">{relativeTime(o.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-10 text-lg font-bold">قائمة الانتظار ({num(s.waitlist)})</h2>
      {waitlist.length === 0 ? (
        <EmptyState title="ما فيه تسجيلات بعد" />
      ) : (
        <ul className="divide-y divide-sand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-sand-200">
          {waitlist.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="ltr min-w-0 flex-1 truncate font-semibold">{w.email}</span>
              <Badge tone={w.side === "seller" ? "violet" : "brand"}>{w.side === "seller" ? "مستقل" : "عميل"}</Badge>
              <span className="w-24 text-left text-xs text-stone-400">{relativeTime(w.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
