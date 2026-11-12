import Link from "next/link";
import { Container, PageHeader, EmptyState, Badge } from "@/components/ui";
import { RevokeSellerForm } from "@/components/admin-forms";
import { requireRole } from "@/lib/session";
import { approvedSellers } from "@/lib/queries";
import { recordLines, sellerRecords } from "@/lib/match";
import { CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "المستقلون الموثّقون" };

export default async function AdminFreelancersPage() {
  await requireRole("admin", "/admin/freelancers");
  const rows = await approvedSellers();
  const records = await sellerRecords(rows.map((r) => r.profile.userId));
  return (
    <Container className="py-10">
      <PageHeader title="المستقلون الموثّقون" subtitle="سجل كل مستقل على المنصة. سحب التوثيق يخفي خدماته ويوصله السبب." />
      {rows.length === 0 ? (
        <EmptyState title="ما فيه مستقلون موثّقون بعد" />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ profile: p, email }) => {
            const rec = records.get(p.userId)!;
            const facts = recordLines(rec);
            return (
              <li key={p.userId} className="rounded-2xl bg-white p-5 ring-1 ring-sand-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/freelancers/${p.userId}`} className="text-lg font-bold hover:text-brand-700">{p.displayName}</Link>
                    <p className="text-sm text-stone-600">{p.headline} · <span className="ltr">{email}</span></p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.categories.map((c) => <Badge key={c} tone="brand">{CATEGORIES[c].label}</Badge>)}
                      <Badge tone={p.iban ? "green" : "amber"}>{p.iban ? "حساب التحويل مضاف" : "بدون حساب تحويل"}</Badge>
                      {rec.ratingCount > 0 && <Badge>التقييم {rec.rating.toFixed(1)}</Badge>}
                    </div>
                  </div>
                  <RevokeSellerForm userId={p.userId} />
                </div>
                <p className="mt-3 text-sm leading-7 text-stone-700">{facts.length ? facts.join(" · ") : "ما عنده طلبات مكتملة بعد."}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
