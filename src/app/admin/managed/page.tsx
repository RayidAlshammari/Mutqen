import { Container, PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { BriefCard } from "@/components/brief-card";
import { ManagedOfferForm, type OfferOption } from "@/components/admin-forms";
import { requireRole } from "@/lib/session";
import { managedRequests } from "@/lib/queries";
import { recommendFor } from "@/lib/match";
import { MANAGED_FEE } from "@/lib/constants";
import { relativeTime, sar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "الطلبات المُدارة" };

export default async function AdminManagedPage() {
  await requireRole("admin", "/admin/managed");
  const rows = await managedRequests();
  const withOptions = await Promise.all(
    rows.map(async (r) => {
      const recs = r.brief.structured ? await recommendFor(r.brief.structured, { excludeUserId: r.m.buyerId, limit: 5 }) : [];
      const options: OfferOption[] = recs.flatMap((rec) =>
        rec.service.packages.map((p) => ({
          serviceId: rec.service.id,
          tier: p.tier,
          label: `${rec.sellerName} — ${p.name} — ${p.price} ر.س${r.m.budget && p.price + MANAGED_FEE > r.m.budget ? " (فوق الميزانية)" : ""}`,
        })),
      );
      return { ...r, recs, options };
    }),
  );
  return (
    <Container className="max-w-4xl py-10">
      <PageHeader title="الطلبات المُدارة" subtitle={`العميل طلب إن فريق متقن يختار المستقل ويتابع الطلب. رسوم الإدارة ${sar(MANAGED_FEE)} تُدفع مع الطلب إذا وافق على الترشيح.`} />
      {withOptions.length === 0 ? (
        <EmptyState title="ما فيه طلبات مُدارة مفتوحة" />
      ) : (
        <div className="space-y-6">
          {withOptions.map(({ m, brief, buyerName, recs, options }) => (
            <Card key={m.id} className="p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{buyerName}</p>
                <div className="flex items-center gap-2">
                  {m.budget && <Badge>الميزانية {sar(m.budget)}</Badge>}
                  <Badge tone={m.status === "new" ? "amber" : "blue"}>{m.status === "new" ? "ينتظر ترشيح" : "بانتظار موافقة العميل"}</Badge>
                  <span className="text-xs text-stone-500">{relativeTime(m.createdAt)}</span>
                </div>
              </div>
              {brief.structured && <BriefCard b={brief.structured} />}
              {m.note && m.status === "new" && <p className="mt-4 rounded-xl bg-sand-50 p-3 text-sm leading-7 ring-1 ring-sand-200">ملاحظة العميل: {m.note}</p>}
              <div className="mt-5 border-t border-sand-200 pt-4">
                <p className="mb-2 text-sm font-semibold text-stone-600">أقرب المستقلين لهذا الطلب</p>
                <ul className="mb-4 space-y-1.5 text-sm leading-6">
                  {recs.map((r) => (
                    <li key={r.sellerId}>
                      <a href={`/freelancers/${r.sellerId}`} target="_blank" className="font-semibold text-brand-700 hover:underline">{r.sellerName}</a>
                      <span className="text-stone-600"> — {r.reasons.slice(0, 3).join(" · ")}</span>
                    </li>
                  ))}
                  {!recs.length && <li className="text-stone-500">ما فيه مستقل موثّق في هذا المجال حالياً.</li>}
                </ul>
                <ManagedOfferForm requestId={m.id} options={options} current={m.status === "offered" && m.offeredServiceId ? `${m.offeredServiceId}|${m.offeredTier}` : undefined} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
