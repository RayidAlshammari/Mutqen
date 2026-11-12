import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { Container, Card, Avatar, VerifiedBadge, ToolChip } from "@/components/ui";
import { OrderForm } from "@/components/order-form";
import { BriefCard } from "@/components/brief-card";
import { db, schema } from "@/db";
import { loadOwnBrief } from "@/lib/brief-access";
import { getService } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { paymentsLive } from "@/lib/payments";
import { ACCEPT_HOURS, MANAGED_FEE, computeFees, CATEGORIES } from "@/lib/constants";
import { sampleDays } from "@/lib/order-lifecycle";
import { arCount, COUNT, daysLabel, sar } from "@/lib/utils";

export const metadata = { title: "تأكيد الطلب" };
export const dynamic = "force-dynamic";

type SP = { service?: string; tier?: string; brief?: string; managed?: string };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  if (!sp.service) notFound();
  // Ordering always goes through a brief: it is what the freelancer executes and what revisions are judged against.
  if (!sp.brief) redirect(`/brief?service=${encodeURIComponent(sp.service)}${sp.tier ? `&tier=${encodeURIComponent(sp.tier)}` : ""}`);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  // Sign-up happens here, at the moment of payment, not before the client has seen anything.
  const user = await getCurrentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/order/new?${qs}`)}`);

  const own = await loadOwnBrief(sp.brief);
  if (!own?.brief.structured) notFound();
  if (own.brief.status === "ordered") redirect(`/brief/${own.brief.id}`);
  const data = await getService(sp.service);
  if (!data || !data.service.active || data.seller.status !== "approved") notFound();
  const { service: s, seller } = data;
  const pkg = s.packages.find((p) => p.tier === sp.tier) ?? s.packages[0];

  let managedId: string | undefined;
  if (sp.managed) {
    const [m] = await db.select().from(schema.managedRequest).where(eq(schema.managedRequest.id, sp.managed)).limit(1);
    if (m && m.buyerId === user.id && m.status === "offered" && m.offeredServiceId === s.id && m.offeredTier === pkg.tier) managedId = m.id;
  }
  const [{ n: together }] = await db
    .select({ n: count() })
    .from(schema.order)
    .where(and(eq(schema.order.buyerId, user.id), eq(schema.order.sellerId, s.sellerId), eq(schema.order.status, "completed")));
  const fees = computeFees(pkg.price, Number(together));
  const total = fees.total + (managedId ? MANAGED_FEE : 0);
  const blocked = user.role === "admin" ? "حساب الإدارة ما يطلب خدمات. ادخل بحساب عميل." : s.sellerId === user.id ? "ما تقدر تطلب خدمتك أنت." : undefined;

  return (
    <Container className="py-10">
      <h1 className="mb-2 text-2xl font-bold text-brand-950 sm:text-3xl">راجع وادفع</h1>
      <p className="mb-8 text-stone-600">هذا اللي بيوصل المستقل. إذا فيه شي ناقص، ارجع وعدّله قبل الدفع.</p>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-6 sm:p-8">
            <BriefCard b={own.brief.structured} compact />
            <Link href={`/brief/${own.brief.id}`} className="mt-5 inline-block text-sm font-semibold text-brand-700 hover:underline">
              ✎ عدّل الملخص أو غيّر المستقل
            </Link>
          </Card>
          <Card className="p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-bold text-brand-950">وش يصير بعد الدفع</h2>
            <ol className="space-y-3 text-sm leading-6 text-stone-700">
              <li><b className="text-brand-900">١. المستقل يقبل الطلب</b> خلال {arCount(ACCEPT_HOURS, COUNT.hours)}. إذا ما قبل، يرجع لك المبلغ كامل تلقائياً.</li>
              <li><b className="text-brand-900">٢. عيّنة أولى</b> خلال {daysLabel(sampleDays(pkg.deliveryDays))} من القبول. تعتمد الاتجاه أو تطلب تغييره مرة بدون رسوم.</li>
              <li><b className="text-brand-900">٣. التسليم الكامل</b> خلال {daysLabel(pkg.deliveryDays)} من القبول، و{pkg.revisions ? arCount(pkg.revisions, COUNT.revisions) : "بدون تعديلات"} ضمن معايير القبول.</li>
              <li><b className="text-brand-900">٤. تعتمد التسليم</b> فيتحوّل المبلغ للمستقل. وإذا فيه مشكلة، تضغط «عندي مشكلة» ومتقن يفصل.</li>
            </ol>
          </Card>
          <Card className="p-6 sm:p-8">
            {blocked ? <p className="rounded-xl bg-sand-100 p-4 text-center text-sm text-stone-700">{blocked}</p> : <OrderForm serviceId={s.id} tier={pkg.tier} briefId={own.brief.id} managedRequestId={managedId} total={sar(total)} live={paymentsLive()} />}
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold text-stone-500">{CATEGORIES[s.category].icon} {CATEGORIES[s.category].label}</p>
            <Link href={`/services/${s.id}`} className="mt-1 block font-bold leading-7 hover:text-brand-700">{s.title}</Link>
            <Link href={`/freelancers/${seller.userId}`} className="mt-3 flex items-center gap-2 text-sm hover:text-brand-700">
              <Avatar name={seller.displayName} size={28} /> {seller.displayName} <VerifiedBadge small />
            </Link>
            <div className="mt-3 flex flex-wrap gap-1">{s.aiTools.slice(0, 4).map((t) => <ToolChip key={t} name={t} />)}</div>
            <div className="mt-4 rounded-xl bg-sand-50 p-4 text-sm ring-1 ring-sand-200">
              <p className="font-bold">الباقة {pkg.name}</p>
              <ul className="mt-2 space-y-1 text-stone-700">{pkg.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            </div>
          </Card>
          <Card className="p-5 text-sm">
            <div className="flex justify-between py-1"><span>سعر الباقة</span><span>{sar(fees.price)}</span></div>
            {managedId && <div className="flex justify-between py-1"><span>رسوم إدارة الطلب</span><span>{sar(MANAGED_FEE)}</span></div>}
            <div className="flex justify-between py-1 text-stone-600"><span>رسوم على العميل</span><span>لا يوجد</span></div>
            <div className="mt-2 flex justify-between border-t border-sand-200 pt-3 text-base font-bold"><span>الإجمالي</span><span>{sar(total)}</span></div>
            <p className="mt-3 text-xs leading-5 text-stone-500">🔒 المبلغ محجوز لدى متقن طوال التنفيذ، وما يتحوّل للمستقل إلا بعد اعتمادك.</p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
