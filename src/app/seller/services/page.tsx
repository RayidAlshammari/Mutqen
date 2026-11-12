import Link from "next/link";
import { Container, PageHeader, LinkButton, Badge, EmptyState, Button } from "@/components/ui";
import { requireRole } from "@/lib/session";
import { listServicesBySeller, getSellerProfile } from "@/lib/queries";
import { toggleServiceAction } from "@/app/actions/seller";
import { CATEGORIES } from "@/lib/constants";
import { arCount, COUNT, sar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "خدماتي" };

export default async function MyServicesPage() {
  const user = await requireRole("seller", "/seller/services");
  const [services, profile] = await Promise.all([listServicesBySeller(user.id), getSellerProfile(user.id)]);
  return (
    <Container className="py-10">
      <PageHeader title="خدماتي" actions={<LinkButton href="/seller/services/new">+ خدمة جديدة</LinkButton>} />
      {profile?.status !== "approved" && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">خدماتك ما تظهر للعملاء إلا بعد توثيق ملفك.</p>
      )}
      {services.length === 0 ? (
        <EmptyState title="ما أضفت خدمات بعد" action={<LinkButton href="/seller/services/new">أضف أول خدمة</LinkButton>} />
      ) : (
        <ul className="divide-y divide-sand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-sand-200">
          {services.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 p-4">
              <span className="text-2xl">{CATEGORIES[s.category].icon}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/services/${s.id}`} className="font-semibold hover:text-brand-700">{s.title}</Link>
                <p className="text-xs text-stone-500">من {sar(s.minPrice)} · {s.ordersCount ? arCount(s.ordersCount, COUNT.orders) : "بدون طلبات بعد"}</p>
              </div>
              <Badge tone={s.active ? "green" : "gray"}>{s.active ? "نشطة" : "موقوفة"}</Badge>
              <form action={toggleServiceAction.bind(null, s.id)}>
                <Button size="sm" variant="secondary">{s.active ? "إيقاف" : "تفعيل"}</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
