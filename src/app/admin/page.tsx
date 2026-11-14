import Link from "next/link";
import { Container, PageHeader, Stat, Card, Badge, ToolChip, EmptyState } from "@/components/ui";
import { ReviewSellerForm } from "@/components/admin-forms";
import { requireRole } from "@/lib/session";
import { platformStats, pendingSellers, recentOrdersAdmin, disputedOrders, managedRequests, lateOrders, funnelStats, heldOrders } from "@/lib/queries";
import { CATEGORIES, ORDER_STATUS } from "@/lib/constants";
import { CONDUCT_PASS } from "@/lib/conduct";
import { num, relativeTime, sar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة الإدارة" };

function Queue({ href, label, n, tone }: { href: string; label: string; n: number; tone: "red" | "amber" | "brand" }) {
  const color = n === 0 ? "bg-white ring-sand-200 text-stone-500" : tone === "red" ? "bg-red-50 ring-red-200 text-red-800" : tone === "amber" ? "bg-amber-50 ring-amber-200 text-amber-900" : "bg-brand-50 ring-brand-200 text-brand-900";
  return (
    <Link href={href} className={`block rounded-2xl p-5 ring-1 transition hover:ring-2 ${color}`}>
      <p className="text-3xl font-bold">{num(n)}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
    </Link>
  );
}

export default async function AdminPage() {
  await requireRole("admin", "/admin");
  const [s, pending, orders, disputes, managed, late, f, held] = await Promise.all([
    platformStats(),
    pendingSellers(),
    recentOrdersAdmin(8),
    disputedOrders(),
    managedRequests(),
    lateOrders(),
    funnelStats(),
    heldOrders(),
  ]);
  const pct = (a: number, b: number) => (b ? `${num(Math.round((a / b) * 100))}٪` : "—");
  const takeRate = s.completedGmv ? (s.revenue / s.completedGmv) * 100 : 0;
  const repeat = s.buyers ? (s.repeatBuyers / s.buyers) * 100 : 0;
  const waitingOffer = managed.filter((m) => m.m.status === "new").length;

  return (
    <Container className="py-10">
      <PageHeader title="لوحة الإدارة" subtitle="اللي يحتاج قرارك أولاً، ثم مؤشرات المنصة." />

      <h2 className="mb-3 font-bold text-stone-700">يحتاج تصرف</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Queue href="#disputes" label="خلافات تنتظر قرار" n={disputes.length} tone="red" />
        <Queue href="/admin/managed" label="طلبات مُدارة تنتظر ترشيح" n={waitingOffer} tone="amber" />
        <Queue href="#verification" label="مستقلون بانتظار التوثيق" n={pending.length} tone="brand" />
        <Queue href="#late" label="طلبات متأخرة عن موعدها" n={late.length} tone="amber" />
        <Queue href="#held" label="تسليمات مُدارة تنتظر مراجعتك" n={f.heldForReview} tone="red" />
        <Queue href="/admin/payouts" label="مستقلون لهم تحويل مستحق" n={f.payoutsDue} tone="brand" />
      </div>

      {held.length > 0 && (
        <>
          <h2 id="held" className="mb-3 mt-10 scroll-mt-24 text-lg font-bold">تسليمات تنتظر مراجعة الفريق ({num(held.length)})</h2>
          <ul className="space-y-3">
            {held.map((h) => (
              <li key={h.id}>
                <Link href={`/orders/${h.id}`} className="block rounded-2xl bg-white p-5 ring-1 ring-red-200 hover:ring-2">
                  <p className="font-bold">{h.serviceTitle}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {h.status === "sample_review" ? "عيّنة" : "تسليم كامل"} من {h.sellerName}
                    {h.at ? ` · ${relativeTime(new Date(h.at))}` : ""}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-700">راجعه ووصّله للعميل ←</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-3 mt-10 font-bold text-stone-700">من الملخص إلى الطلب</h2>
      <p className="mb-3 text-sm text-stone-500">وين يوقف العملاء: كل رقم نسبته من اللي قبله.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="بدأوا ملخص" value={num(f.started)} />
        <Stat label="وصلوا لملخص جاهز" value={num(f.ready)} hint={pct(f.ready, f.started)} />
        <Stat label="ملخصات صارت طلب" value={num(f.ordered)} hint={pct(f.ordered, f.ready)} />
        <Stat label="عملاء رجعوا وطلبوا مرة ثانية" value={num(f.repeatBuyers)} hint={`من ${num(s.buyers)} عميل`} />
      </div>

      <h2 id="disputes" className="mb-3 mt-10 scroll-mt-24 text-lg font-bold">الخلافات ({num(disputes.length)})</h2>
      {disputes.length === 0 ? (
        <EmptyState title="ما فيه خلافات مفتوحة" />
      ) : (
        <ul className="space-y-3">
          {disputes.map((d) => (
            <li key={d.id}>
              <Link href={`/orders/${d.id}`} className="block rounded-2xl bg-white p-5 ring-1 ring-red-200 hover:ring-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{d.serviceTitle}</p>
                  <span className="text-sm font-semibold">{sar(d.price)} محجوزة</span>
                </div>
                <p className="mt-1 text-sm text-stone-600">العميل: {d.buyerName}</p>
                {d.reason && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm leading-7 text-red-900">{d.reason}</p>}
                <p className="mt-2 text-sm font-semibold text-brand-700">افتح الطلب واتخذ القرار ←</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-3 mt-10 flex scroll-mt-24 items-center justify-between" id="verification">
        <h2 className="text-lg font-bold">مستقلون بانتظار التوثيق ({num(pending.length)})</h2>
        <Link href="/admin/freelancers" className="text-sm font-semibold text-brand-700 hover:underline">المستقلون الموثّقون ←</Link>
      </div>
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
                <div className="flex gap-6 text-left">
                  <div>
                    <p className="text-3xl font-bold text-brand-800">{num(p.verificationScore ?? 0)}<span className="text-base text-stone-400">/100</span></p>
                    <p className="text-xs text-stone-500">الاختبار العملي · {p.verificationCategory && CATEGORIES[p.verificationCategory as keyof typeof CATEGORIES].label}</p>
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${(p.conductScore ?? 0) >= CONDUCT_PASS ? "text-brand-800" : "text-red-700"}`}>{num(p.conductScore ?? 0)}<span className="text-base text-stone-400">/100</span></p>
                    <p className="text-xs text-stone-500">التعامل مع العملاء</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <p className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">الهوية: <span className="ltr font-semibold">{p.nationalId ? `••••••${p.nationalId.slice(-4)}` : "لم تُدخل"}</span></p>
                <p className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">وثيقة العمل الحر: <span className="ltr font-semibold">{p.freelanceDocNumber ?? "—"}</span></p>
                <p className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
                  ناتج المهمة:{" "}
                  {p.verificationUrl ? (
                    <a href={p.verificationUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 hover:underline">افتح الملف ↗</a>
                  ) : (
                    <span className="font-semibold text-red-700">ما أرفق ناتج</span>
                  )}
                </p>
              </div>
              <details className="mt-3 rounded-xl bg-sand-50 p-4 ring-1 ring-sand-200">
                <summary className="cursor-pointer text-sm font-semibold">شرح المستقل لطريقة شغله</summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-700">{p.verificationAnswer}</p>
                {p.verificationFeedback && <p className="mt-3 rounded-lg bg-white p-3 text-sm text-brand-900 ring-1 ring-sand-200">ملاحظة المقيّم الآلي: {p.verificationFeedback}</p>}
              </details>
              {p.portfolio.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                  {p.portfolio.map((it) => (
                    <li key={it.title} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-sand-200">
                      {it.url ? <a href={it.url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline">{it.title} ↗</a> : it.title}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 border-t border-sand-200 pt-4">
                <ReviewSellerForm userId={p.userId} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 id="late" className="mb-3 mt-10 scroll-mt-24 text-lg font-bold">طلبات متأخرة ({num(late.length)})</h2>
      {late.length === 0 ? (
        <EmptyState title="كل الطلبات الجارية في موعدها" />
      ) : (
        <ul className="divide-y divide-sand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-sand-200">
          {late.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-3 p-4 text-sm hover:bg-sand-50">
                <span className="min-w-0 flex-1 truncate font-semibold">{o.serviceTitle}</span>
                <span className="text-stone-600">{o.sellerName}</span>
                <Badge tone="red">الموعد كان {o.dueAt ? relativeTime(o.dueAt) : "—"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-10 font-bold text-stone-700">الطلبات والإيراد</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="إجمالي قيمة الطلبات" value={sar(s.gmv)} hint="كل الطلبات غير الملغاة" />
        <Stat label="إيراد المنصة" value={sar(s.revenue)} hint={`العمولة + رسوم الإدارة · ${num(Math.round(takeRate))}٪ من قيمة المكتمل`} />
        <Stat label="مبالغ محجوزة الآن" value={sar(s.escrow)} hint="طلبات لم تكتمل بعد" />
        <Stat label="الطلبات" value={`${num(s.completed)} / ${num(s.orders)}`} hint="مكتملة / الكل" />
      </div>
      <h2 className="mb-3 mt-8 font-bold text-stone-700">العرض والطلب</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="مستقلون موثّقون" value={num(s.approved)} hint={`${num(s.pending)} بانتظار المراجعة`} />
        <Stat label="الحسابات" value={num(s.users)} />
        <Stat label="العملاء المتكررون" value={`${num(Math.round(repeat))}٪`} hint={`${num(s.repeatBuyers)} من ${num(s.buyers)} طلبوا أكثر من مرة`} />
        <Stat label="متوسط التقييم" value={s.avgRating ? s.avgRating.toFixed(1) : "—"} />
      </div>

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
              <span className="w-20 text-left text-xs text-stone-400">{relativeTime(o.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
