import { notFound } from "next/navigation";
import { Container, Card, Avatar, VerifiedBadge, ToolChip, Badge, Stars } from "@/components/ui";
import { ServiceCard } from "@/components/service-card";
import { getSeller } from "@/lib/queries";
import { CATEGORIES } from "@/lib/constants";
import { num, relativeTime } from "@/lib/utils";
import { recordLines, sellerRecords } from "@/lib/match";

export const dynamic = "force-dynamic";

export default async function FreelancerPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getSeller((await params).id);
  if (!data || data.profile.status !== "approved") notFound();
  const { profile: p, services, reviews, ratingAvg, completed } = data;
  const record = (await sellerRecords([p.userId])).get(p.userId)!;
  const facts = recordLines(record, undefined, p.gender);

  return (
    <Container className="py-10">
      <Card className="overflow-hidden">
        <div className="pattern-dots h-28 bg-brand-800" />
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
          <div className="flex items-end gap-4">
            <span className="rounded-full ring-4 ring-white">
              <Avatar name={p.displayName} size={96} />
            </span>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-brand-950">{p.displayName}</h1>
                <VerifiedBadge />
              </div>
              <p className="text-stone-600">{p.headline}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            {p.city && <Badge>📍 {p.city}</Badge>}
            {p.identityVerified && <Badge tone="green">الهوية موثّقة</Badge>}
            {p.freelanceDocNumber && <Badge tone="gray"><span title="أدخلها المستقل">وثيقة عمل حر (مُعلنة)</span></Badge>}
            {p.categories.map((c) => (
              <Badge key={c} tone="brand">
                {CATEGORIES[c].icon} {CATEGORIES[c].label}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="grid grid-cols-3 divide-x divide-x-reverse divide-sand-200 p-4 text-center">
            <div>
              <p className="text-xl font-bold">{ratingAvg ? ratingAvg.toFixed(1) : "—"}</p>
              <p className="text-xs text-stone-500">التقييم</p>
            </div>
            <div>
              <p className="text-xl font-bold">{num(completed)}</p>
              <p className="text-xs text-stone-500">مكتمل</p>
            </div>
            <div>
              <p className="text-xl font-bold">{record.onTimeRate !== null ? `${num(Math.round(record.onTimeRate * 100))}٪` : "—"}</p>
              <p className="text-xs text-stone-500">في الموعد</p>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">{p.gender === "f" ? "سجلها على متقن" : "سجله على متقن"}</h2>
            {facts.length ? (
              <ul className="mt-3 space-y-1.5 text-sm leading-6">
                {facts.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-brand-600">✓</span>{f}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-stone-600">{p.gender === "f" ? "جديدة على متقن. اجتازت الاختبار العملي وراجع الفريق شغلها، وما عندها طلبات مكتملة بعد." : "جديد على متقن. اجتاز الاختبار العملي وراجع الفريق شغله، وما عنده طلبات مكتملة بعد."}</p>
            )}
            <p className="mt-3 text-xs leading-5 text-stone-500">الأرقام محسوبة من الطلبات الفعلية على المنصة، وما يقدر المستقل يعدّلها.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">نبذة</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-700">{p.bio || "—"}</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">🤖 أدوات الذكاء الاصطناعي</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.aiTools.map((t) => (
                <ToolChip key={t} name={t} />
              ))}
            </div>
            {p.verificationScore != null && (
              <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
                اجتاز اختبار متقن العملي بنتيجة <strong>{num(p.verificationScore)}/100</strong>
              </div>
            )}
          </Card>
        </div>

        <div>
          {p.portfolio.length > 0 && (
            <>
              <h2 className="mb-4 text-lg font-bold text-brand-950">{p.gender === "f" ? "أعمالها" : "أعماله"}</h2>
              <ul className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {p.portfolio.map((it) => (
                  <li key={it.title}>
                    <Card className="overflow-hidden">
                      {it.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt={it.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                      )}
                      <div className="p-4">
                        {it.url ? (
                          <a href={it.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 hover:underline">{it.title} ↗</a>
                        ) : (
                          <p className="font-semibold">{it.title}</p>
                        )}
                        {it.description && <p className="mt-1 text-sm leading-6 text-stone-600">{it.description}</p>}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2 className="mb-4 text-lg font-bold text-brand-950">{p.gender === "f" ? "خدماتها" : "خدماته"} ({num(services.length)})</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <ServiceCard key={s.id} {...s} sellerName={p.displayName} sellerStatus={p.status} />
            ))}
          </div>

          <h2 className="mb-4 mt-10 text-lg font-bold text-brand-950">آراء العملاء</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-stone-500">ما فيه تقييمات بعد.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Avatar name={r.buyerName} size={28} /> {r.buyerName}
                        <Stars value={r.rating} />
                      </div>
                      <span className="text-xs text-stone-500">{relativeTime(r.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{r.serviceTitle}</p>
                    {r.comment && <p className="mt-2 text-sm leading-7 text-stone-700">{r.comment}</p>}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}
