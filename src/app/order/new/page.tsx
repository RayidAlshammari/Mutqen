import { notFound } from "next/navigation";
import Link from "next/link";
import { Container, Card, Avatar, VerifiedBadge, ToolChip } from "@/components/ui";
import { OrderForm } from "@/components/order-form";
import { getService } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { computeFees, CATEGORIES } from "@/lib/constants";
import { daysLabel, sar, num } from "@/lib/utils";

export const metadata = { title: "تأكيد الطلب" };
export const dynamic = "force-dynamic";

type SP = { service?: string; tier?: string; brief?: string; sb?: string };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  await requireUser(`/order/new?${qs}`);
  if (!sp.service) notFound();
  const data = await getService(sp.service);
  if (!data || !data.service.active) notFound();
  const { service: s, seller } = data;
  const pkg = s.packages.find((p) => p.tier === sp.tier) ?? s.packages[0];
  const fees = computeFees(pkg.price);

  return (
    <Container className="py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-950 sm:text-3xl">تأكيد الطلب</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <Card className="p-6 sm:p-8">
          <OrderForm serviceId={s.id} tier={pkg.tier} total={sar(fees.total)} defaultBrief={sp.brief?.slice(0, 4000)} structuredBrief={sp.sb?.slice(0, 6000)} />
        </Card>
        <aside className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold text-stone-500">{CATEGORIES[s.category].icon} {CATEGORIES[s.category].label}</p>
            <Link href={`/services/${s.id}`} className="mt-1 block font-bold leading-7 hover:text-brand-700">{s.title}</Link>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Avatar name={seller.displayName} size={28} /> {seller.displayName} <VerifiedBadge small />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">{s.aiTools.slice(0, 4).map((t) => <ToolChip key={t} name={t} />)}</div>
            <div className="mt-4 rounded-xl bg-sand-50 p-4 text-sm ring-1 ring-sand-200">
              <p className="font-bold">الباقة {pkg.name}</p>
              <p className="mt-1 text-stone-600">التسليم خلال {daysLabel(pkg.deliveryDays)} · {pkg.revisions ? `${num(pkg.revisions)} تعديل` : "بدون تعديلات"}</p>
              <ul className="mt-2 space-y-1 text-stone-700">{pkg.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            </div>
          </Card>
          <Card className="p-5 text-sm">
            <div className="flex justify-between py-1"><span>سعر الباقة</span><span>{sar(fees.price)}</span></div>
            <div className="flex justify-between py-1 text-stone-600"><span>رسوم إضافية</span><span>لا يوجد</span></div>
            <div className="mt-2 flex justify-between border-t border-sand-200 pt-3 text-base font-bold"><span>الإجمالي</span><span>{sar(fees.total)}</span></div>
            <p className="mt-3 text-xs leading-5 text-stone-500">🔒 المبلغ محجوز لدى متقن طوال مدة التنفيذ (Escrow).</p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
